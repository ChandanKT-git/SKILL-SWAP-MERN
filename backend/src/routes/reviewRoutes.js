const express = require('express');
const ReviewController = require('../controllers/reviewController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');
const { handleJoiError } = require('../middleware/errorHandler');
const { reviewLimiter } = require('../middleware/rateLimiter');
const Joi = require('joi');

const router = express.Router();

/**
 * Validation schemas for review endpoints
 */
const submitReviewSchema = Joi.object({
    sessionId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
        .messages({
            'string.pattern.base': 'Invalid session ID format'
        }),
    revieweeId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
        .messages({
            'string.pattern.base': 'Invalid reviewee ID format'
        }),
    rating: Joi.number().integer().min(1).max(5).required()
        .messages({
            'number.min': 'Rating must be at least 1',
            'number.max': 'Rating cannot exceed 5'
        }),
    comment: Joi.string().trim().min(10).max(1000).required()
        .messages({
            'string.min': 'Review comment must be at least 10 characters',
            'string.max': 'Review comment cannot exceed 1000 characters'
        }),
    reviewType: Joi.string().valid('teaching', 'learning', 'exchange').optional()
});

const flagReviewSchema = Joi.object({
    reason: Joi.string().valid('inappropriate', 'spam', 'fake', 'offensive', 'other').required(),
    details: Joi.string().max(500).optional()
});

const helpfulnessSchema = Joi.object({
    isHelpful: Joi.boolean().required()
});

const responseSchema = Joi.object({
    comment: Joi.string().trim().min(5).max(500).required()
        .messages({
            'string.min': 'Response must be at least 5 characters',
            'string.max': 'Response cannot exceed 500 characters'
        })
});

const moderateReviewSchema = Joi.object({
    action: Joi.string().valid('approve', 'hide', 'remove').required(),
    notes: Joi.string().max(1000).optional()
});

const getUserReviewsSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(50).default(10).optional(),
    sortBy: Joi.string().valid('createdAt', 'rating', 'helpfulnessScore').default('createdAt').optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc').optional(),
    includeResponse: Joi.boolean().default(false).optional()
});

const getModerationReviewsSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(50).default(20).optional(),
    status: Joi.string().valid('flagged', 'hidden', 'removed').default('flagged').optional()
});

const getSkillRatingSchema = Joi.object({
    category: Joi.string().trim().min(2).max(50).required()
});

const objectIdSchema = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

/**
 * Validation middleware
 */
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body);
        if (error) {
            return handleJoiError(error, req, res, next);
        }
        req.body = value;
        next();
    };
};

const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query);
        if (error) {
            return handleJoiError(error, req, res, next);
        }
        req.query = value;
        next();
    };
};

const validateObjectId = (paramName) => {
    return (req, res, next) => {
        const { error } = objectIdSchema.validate(req.params[paramName]);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ID format',
                errors: [{
                    field: paramName,
                    message: error.details[0].message
                }]
            });
        }
        next();
    };
};

/**
 * Review Routes
 * All routes require authentication
 */

// @route   POST /api/reviews
// @desc    Submit a review for a completed session
// @access  Private
router.post('/',
    authenticateToken,
    reviewLimiter,
    validate(submitReviewSchema),
    ReviewController.submitReview
);

// @route   GET /api/reviews/pending
// @desc    Get reviews that can be submitted by the current user
// @access  Private
router.get('/pending',
    authenticateToken,
    ReviewController.getPendingReviews
);

// @route   GET /api/reviews/moderation
// @desc    Get reviews for moderation (Admin only)
// @access  Private (Admin)
router.get('/moderation',
    authenticateToken,
    authorize('admin'),
    validateQuery(getModerationReviewsSchema),
    ReviewController.getReviewsForModeration
);

// @route   GET /api/reviews/user/:userId
// @desc    Get reviews for a specific user
// @access  Private
router.get('/user/:userId',
    authenticateToken,
    validateObjectId('userId'),
    validateQuery(getUserReviewsSchema),
    ReviewController.getUserReviews
);

// @route   GET /api/reviews/user/:userId/stats
// @desc    Get user's rating statistics
// @access  Private
router.get('/user/:userId/stats',
    authenticateToken,
    validateObjectId('userId'),
    ReviewController.getUserRatingStats
);

// @route   GET /api/reviews/user/:userId/skill/:skillName
// @desc    Get skill-specific rating for a user
// @access  Private
router.get('/user/:userId/skill/:skillName',
    authenticateToken,
    validateObjectId('userId'),
    validateQuery(getSkillRatingSchema),
    ReviewController.getSkillRating
);

// @route   GET /api/reviews/:reviewId
// @desc    Get a specific review by ID
// @access  Private
router.get('/:reviewId',
    authenticateToken,
    validateObjectId('reviewId'),
    ReviewController.getReview
);

// @route   POST /api/reviews/:reviewId/flag
// @desc    Flag a review for moderation
// @access  Private
router.post('/:reviewId/flag',
    authenticateToken,
    validateObjectId('reviewId'),
    validate(flagReviewSchema),
    ReviewController.flagReview
);

// @route   POST /api/reviews/:reviewId/helpfulness
// @desc    Mark review as helpful or not helpful
// @access  Private
router.post('/:reviewId/helpfulness',
    authenticateToken,
    validateObjectId('reviewId'),
    validate(helpfulnessSchema),
    ReviewController.markHelpfulness
);

// @route   POST /api/reviews/:reviewId/response
// @desc    Add a response to a review (reviewee only)
// @access  Private
router.post('/:reviewId/response',
    authenticateToken,
    validateObjectId('reviewId'),
    validate(responseSchema),
    ReviewController.addResponse
);

// @route   PUT /api/reviews/:reviewId/moderate
// @desc    Moderate a review (Admin only)
// @access  Private (Admin)
router.put('/:reviewId/moderate',
    authenticateToken,
    authorize('admin'),
    validateObjectId('reviewId'),
    validate(moderateReviewSchema),
    ReviewController.moderateReview
);

module.exports = router;