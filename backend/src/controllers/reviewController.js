const Review = require('../models/Review');
const Session = require('../models/Session');
const User = require('../models/User');
const { ValidationError, NotFoundError, ConflictError, AuthorizationError } = require('../middleware/errorHandler');
const { RequestLogger } = require('../middleware/logging');

/**
 * Review Controller
 * Handles review submission, display, moderation, and rating calculations
 */
class ReviewController {
    /**
     * Submit a review for a completed session
     * @route POST /api/reviews
     */
    static async submitReview(req, res, next) {
        try {
            const {
                sessionId,
                revieweeId,
                rating,
                comment,
                reviewType
            } = req.body;

            const reviewerId = req.user.id;

            // Check if session exists and is completed
            const session = await Session.findById(sessionId);
            if (!session) {
                throw new NotFoundError('Session not found');
            }

            if (session.status !== 'completed') {
                throw new ValidationError('Can only review completed sessions');
            }

            // Verify user was part of the session
            const isParticipant = session.requester.toString() === reviewerId ||
                session.provider.toString() === reviewerId;

            if (!isParticipant) {
                throw new AuthorizationError('You can only review sessions you participated in');
            }

            // Verify reviewee was the other participant
            const otherParticipant = session.requester.toString() === reviewerId ?
                session.provider.toString() : session.requester.toString();

            if (otherParticipant !== revieweeId) {
                throw new ValidationError('Invalid reviewee for this session');
            }

            // Check if review already exists
            const existingReview = await Review.reviewExistsForSession(sessionId, reviewerId);
            if (existingReview) {
                throw new ConflictError('You have already reviewed this session');
            }

            // Determine review type based on session context
            let determinedReviewType = reviewType;
            if (!determinedReviewType) {
                // Auto-determine based on session type and user role
                if (session.sessionType === 'exchange') {
                    determinedReviewType = 'exchange';
                } else if (session.requester.toString() === reviewerId) {
                    determinedReviewType = 'learning'; // Requester learned from provider
                } else {
                    determinedReviewType = 'teaching'; // Provider taught requester
                }
            }

            // Create the review
            const review = new Review({
                reviewer: reviewerId,
                reviewee: revieweeId,
                session: sessionId,
                rating,
                comment,
                skillReviewed: {
                    name: session.skill.name,
                    category: session.skill.category
                },
                reviewType: determinedReviewType,
                metadata: {
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    source: 'web'
                }
            });

            await review.save();

            // Populate the review for response
            await review.populate('reviewer reviewee', 'firstName lastName profileImage');
            await review.populate('session', 'skill scheduledDate');

            RequestLogger.logDatabaseOperation('submit_review', 'reviews', true);

            res.status(201).json({
                success: true,
                data: review,
                message: 'Review submitted successfully'
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('submit_review', 'reviews', false, error);
            next(error);
        }
    }

    /**
     * Get reviews for a specific user
     * @route GET /api/reviews/user/:userId
     */
    static async getUserReviews(req, res, next) {
        try {
            const { userId } = req.params;
            const {
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                includeResponse = false
            } = req.query;

            // Check if user exists
            const user = await User.findById(userId);
            if (!user) {
                throw new NotFoundError('User not found');
            }

            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                sortBy,
                sortOrder,
                includeResponse: includeResponse === 'true'
            };

            const [reviews, totalCount, ratingData] = await Promise.all([
                Review.findUserReviews(userId, options),
                Review.countDocuments({ reviewee: userId, status: 'active' }),
                Review.getUserAverageRating(userId)
            ]);

            const totalPages = Math.ceil(totalCount / parseInt(limit));

            RequestLogger.logDatabaseOperation('get_user_reviews', 'reviews', true);

            res.status(200).json({
                success: true,
                data: {
                    reviews,
                    ratingData,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages,
                        totalCount,
                        hasNextPage: page < totalPages,
                        hasPrevPage: page > 1,
                        limit: parseInt(limit)
                    }
                },
                message: `Found ${reviews.length} reviews`
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('get_user_reviews', 'reviews', false, error);
            next(error);
        }
    }

    /**
     * Get a specific review by ID
     * @route GET /api/reviews/:reviewId
     */
    static async getReview(req, res, next) {
        try {
            const { reviewId } = req.params;

            const review = await Review.findById(reviewId)
                .populate('reviewer reviewee', 'firstName lastName profileImage rating')
                .populate('session', 'skill scheduledDate sessionType');

            if (!review) {
                throw new NotFoundError('Review not found');
            }

            // Check if review is accessible (not hidden/removed unless user is admin or participant)
            if (['hidden', 'removed'].includes(review.status)) {
                const isParticipant = review.reviewer._id.toString() === req.user.id ||
                    review.reviewee._id.toString() === req.user.id;
                const isAdmin = req.user.role === 'admin';

                if (!isParticipant && !isAdmin) {
                    throw new NotFoundError('Review not found');
                }
            }

            RequestLogger.logDatabaseOperation('get_review', 'reviews', true);

            res.status(200).json({
                success: true,
                data: review,
                message: 'Review retrieved successfully'
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('get_review', 'reviews', false, error);
            next(error);
        }
    }

    /**
     * Flag a review for moderation
     * @route POST /api/reviews/:reviewId/flag
     */
    static async flagReview(req, res, next) {
        try {
            const { reviewId } = req.params;
            const { reason, details } = req.body;
            const userId = req.user.id;

            const review = await Review.findById(reviewId);
            if (!review) {
                throw new NotFoundError('Review not found');
            }

            if (!review.canBeFlaggedBy(userId)) {
                throw new ValidationError('You cannot flag this review');
            }

            await review.flagReview(userId, reason, details);

            RequestLogger.logDatabaseOperation('flag_review', 'reviews', true);

            res.status(200).json({
                success: true,
                message: 'Review flagged for moderation'
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('flag_review', 'reviews', false, error);
            next(error);
        }
    }

    /**
     * Mark review as helpful or not helpful
     * @route POST /api/reviews/:reviewId/helpfulness
     */
    static async markHelpfulness(req, res, next) {
        try {
            const { reviewId } = req.params;
            const { isHelpful } = req.body;
            const userId = req.user.id;

            const review = await Review.findById(reviewId);
            if (!review) {
                throw new NotFoundError('Review not found');
            }

            if (review.status !== 'active') {
                throw new ValidationError('Cannot rate helpfulness of inactive reviews');
            }

            // Users cannot rate helpfulness of their own reviews
            if (review.reviewer.toString() === userId) {
                throw new ValidationError('You cannot rate the helpfulness of your own review');
            }

            await review.markHelpfulness(userId, isHelpful);

            RequestLogger.logDatabaseOperation('mark_helpfulness', 'reviews', true);

            res.status(200).json({
                success: true,
                data: {
                    helpfulnessScore: review.helpfulnessScore,
                    netHelpfulness: review.netHelpfulness
                },
                message: 'Helpfulness rating updated'
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('mark_helpfulness', 'reviews', false, error);
            next(error);
        }
    }

    /**
     * Add a response to a review (reviewee only)
     * @route POST /api/reviews/:reviewId/response
     */
    static async addResponse(req, res, next) {
        try {
            const { reviewId } = req.params;
            const { comment } = req.body;
            const userId = req.user.id;

            const review = await Review.findById(reviewId);
            if (!review) {
                throw new NotFoundError('Review not found');
            }

            // Only the reviewee can respond
            if (review.reviewee.toString() !== userId) {
                throw new AuthorizationError('Only the reviewed user can respond to this review');
            }

            if (review.response && review.response.comment) {
                throw new ConflictError('You have already responded to this review');
            }

            await review.addResponse(comment);
            await review.populate('reviewer reviewee', 'firstName lastName profileImage');

            RequestLogger.logDatabaseOperation('add_review_response', 'reviews', true);

            res.status(200).json({
                success: true,
                data: review,
                message: 'Response added successfully'
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('add_review_response', 'reviews', false, error);
            next(error);
        }
    }

    /**
     * Get user's rating statistics
     * @route GET /api/reviews/user/:userId/stats
     */
    static async getUserRatingStats(req, res, next) {
        try {
            const { userId } = req.params;

            // Check if user exists
            const user = await User.findById(userId);
            if (!user) {
                throw new NotFoundError('User not found');
            }

            const ratingData = await Review.getUserAverageRating(userId);

            // Get recent reviews count
            const recentReviewsCount = await Review.countDocuments({
                reviewee: userId,
                status: 'active',
                createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
            });

            // Get reviews by type
            const reviewsByType = await Review.aggregate([
                {
                    $match: {
                        reviewee: userId,
                        status: 'active'
                    }
                },
                {
                    $group: {
                        _id: '$reviewType',
                        count: { $sum: 1 },
                        averageRating: { $avg: '$rating' }
                    }
                }
            ]);

            const typeStats = {};
            reviewsByType.forEach(stat => {
                typeStats[stat._id] = {
                    count: stat.count,
                    averageRating: Math.round(stat.averageRating * 10) / 10
                };
            });

            RequestLogger.logDatabaseOperation('get_user_rating_stats', 'reviews', true);

            res.status(200).json({
                success: true,
                data: {
                    ...ratingData,
                    recentReviewsCount,
                    reviewsByType: typeStats
                },
                message: 'Rating statistics retrieved successfully'
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('get_user_rating_stats', 'reviews', false, error);
            next(error);
        }
    }

    /**
     * Get skill-specific rating for a user
     * @route GET /api/reviews/user/:userId/skill/:skillName
     */
    static async getSkillRating(req, res, next) {
        try {
            const { userId, skillName } = req.params;
            const { category } = req.query;

            if (!category) {
                throw new ValidationError('Skill category is required');
            }

            const skillRating = await Review.getSkillRating(userId, skillName, category);

            RequestLogger.logDatabaseOperation('get_skill_rating', 'reviews', true);

            res.status(200).json({
                success: true,
                data: {
                    skill: { name: skillName, category },
                    ...skillRating
                },
                message: 'Skill rating retrieved successfully'
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('get_skill_rating', 'reviews', false, error);
            next(error);
        }
    }

    /**
     * Get reviews that can be submitted by the current user
     * @route GET /api/reviews/pending
     */
    static async getPendingReviews(req, res, next) {
        try {
            const userId = req.user.id;

            // Find completed sessions where user hasn't submitted a review yet
            const completedSessions = await Session.find({
                $or: [
                    { requester: userId },
                    { provider: userId }
                ],
                status: 'completed',
                completedAt: { $exists: true }
            }).populate('requester provider', 'firstName lastName profileImage');

            // Filter out sessions that already have reviews from this user
            const pendingReviews = [];

            for (const session of completedSessions) {
                const hasReview = await Review.reviewExistsForSession(session._id, userId);

                if (!hasReview) {
                    const otherParticipant = session.requester._id.toString() === userId ?
                        session.provider : session.requester;

                    pendingReviews.push({
                        session: {
                            _id: session._id,
                            skill: session.skill,
                            scheduledDate: session.scheduledDate,
                            completedAt: session.completedAt,
                            sessionType: session.sessionType
                        },
                        reviewee: otherParticipant
                    });
                }
            }

            RequestLogger.logDatabaseOperation('get_pending_reviews', 'reviews', true);

            res.status(200).json({
                success: true,
                data: pendingReviews,
                message: `Found ${pendingReviews.length} pending reviews`
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('get_pending_reviews', 'reviews', false, error);
            next(error);
        }
    }

    /**
     * Admin: Get reviews for moderation
     * @route GET /api/reviews/moderation
     */
    static async getReviewsForModeration(req, res, next) {
        try {
            const {
                page = 1,
                limit = 20,
                status = 'flagged'
            } = req.query;

            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                status
            };

            const [reviews, totalCount] = await Promise.all([
                Review.getReviewsForModeration(options),
                Review.countDocuments({ status })
            ]);

            const totalPages = Math.ceil(totalCount / parseInt(limit));

            RequestLogger.logDatabaseOperation('get_reviews_for_moderation', 'reviews', true);

            res.status(200).json({
                success: true,
                data: {
                    reviews,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages,
                        totalCount,
                        hasNextPage: page < totalPages,
                        hasPrevPage: page > 1,
                        limit: parseInt(limit)
                    }
                },
                message: `Found ${reviews.length} reviews for moderation`
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('get_reviews_for_moderation', 'reviews', false, error);
            next(error);
        }
    }

    /**
     * Admin: Moderate a review (approve, hide, remove)
     * @route PUT /api/reviews/:reviewId/moderate
     */
    static async moderateReview(req, res, next) {
        try {
            const { reviewId } = req.params;
            const { action, notes } = req.body;
            const adminId = req.user.id;

            const review = await Review.findById(reviewId);
            if (!review) {
                throw new NotFoundError('Review not found');
            }

            const validActions = ['approve', 'hide', 'remove'];
            if (!validActions.includes(action)) {
                throw new ValidationError('Invalid moderation action');
            }

            // Update review status based on action
            switch (action) {
                case 'approve':
                    review.status = 'active';
                    break;
                case 'hide':
                    review.status = 'hidden';
                    break;
                case 'remove':
                    review.status = 'removed';
                    break;
            }

            // Update moderation details
            review.moderation.reviewedBy = adminId;
            review.moderation.reviewedAt = new Date();
            if (notes) {
                review.moderation.moderationNotes = notes;
            }

            await review.save();

            RequestLogger.logDatabaseOperation('moderate_review', 'reviews', true);

            res.status(200).json({
                success: true,
                data: review,
                message: `Review ${action}d successfully`
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('moderate_review', 'reviews', false, error);
            next(error);
        }
    }
}

module.exports = ReviewController;