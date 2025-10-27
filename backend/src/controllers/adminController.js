const User = require('../models/User');
const Session = require('../models/Session');
const Review = require('../models/Review');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');
const mongoose = require('mongoose');

/**
 * Admin Controller
 * Handles admin-specific operations for user management and platform monitoring
 */
class AdminController {
    /**
     * Get admin dashboard overview
     */
    static async getDashboardStats(req, res, next) {
        try {
            const [
                totalUsers,
                activeUsers,
                totalSessions,
                completedSessions,
                totalReviews,
                flaggedReviews,
                recentUsers,
                recentSessions
            ] = await Promise.all([
                // Total users count
                User.countDocuments(),

                // Active users (logged in within last 30 days)
                User.countDocuments({
                    lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                }),

                // Total sessions
                Session.countDocuments(),

                // Completed sessions
                Session.countDocuments({ status: 'completed' }),

                // Total reviews
                Review.countDocuments(),

                // Flagged reviews
                Review.countDocuments({ isFlagged: true }),

                // Recent users (last 7 days)
                User.find({
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                }).select('firstName lastName email createdAt').limit(10),

                // Recent sessions
                Session.find()
                    .populate('requester', 'firstName lastName')
                    .populate('provider', 'firstName lastName')
                    .populate('skill', 'name')
                    .sort({ createdAt: -1 })
                    .limit(10)
            ]);

            // Calculate growth rates (comparing to previous period)
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

            const [previousPeriodUsers, previousPeriodSessions] = await Promise.all([
                User.countDocuments({
                    createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
                }),
                Session.countDocuments({
                    createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
                })
            ]);

            const currentPeriodUsers = await User.countDocuments({
                createdAt: { $gte: thirtyDaysAgo }
            });
            const currentPeriodSessions = await Session.countDocuments({
                createdAt: { $gte: thirtyDaysAgo }
            });

            const userGrowthRate = previousPeriodUsers > 0
                ? ((currentPeriodUsers - previousPeriodUsers) / previousPeriodUsers * 100).toFixed(1)
                : 0;

            const sessionGrowthRate = previousPeriodSessions > 0
                ? ((currentPeriodSessions - previousPeriodSessions) / previousPeriodSessions * 100).toFixed(1)
                : 0;

            res.json({
                success: true,
                data: {
                    overview: {
                        totalUsers,
                        activeUsers,
                        totalSessions,
                        completedSessions,
                        totalReviews,
                        flaggedReviews,
                        userGrowthRate: parseFloat(userGrowthRate),
                        sessionGrowthRate: parseFloat(sessionGrowthRate)
                    },
                    recentActivity: {
                        recentUsers,
                        recentSessions
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all users with filtering and pagination
     */
    static async getUsers(req, res, next) {
        try {
            const {
                page = 1,
                limit = 20,
                status,
                role,
                search,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = req.query;

            // Build query
            const query = {};

            if (status) query.status = status;
            if (role) query.role = role;

            if (search) {
                query.$or = [
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ];
            }

            // Pagination
            const skip = (page - 1) * limit;
            const sort = {};
            sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

            const [users, totalUsers] = await Promise.all([
                User.find(query)
                    .select('-password -otp -emailVerificationToken -passwordResetToken')
                    .sort(sort)
                    .skip(skip)
                    .limit(parseInt(limit)),
                User.countDocuments(query)
            ]);

            res.json({
                success: true,
                data: {
                    users,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(totalUsers / limit),
                        totalUsers,
                        hasNext: skip + users.length < totalUsers,
                        hasPrev: page > 1
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get detailed user information
     */
    static async getUserDetails(req, res, next) {
        try {
            const { userId } = req.params;

            const user = await User.findById(userId)
                .select('-password -otp -emailVerificationToken -passwordResetToken');

            if (!user) {
                throw new NotFoundError('User not found');
            }

            // Get user's sessions and reviews
            const [userSessions, userReviews, reviewsReceived] = await Promise.all([
                Session.find({
                    $or: [{ requester: userId }, { provider: userId }]
                })
                    .populate('requester', 'firstName lastName')
                    .populate('provider', 'firstName lastName')
                    .populate('skill', 'name')
                    .sort({ createdAt: -1 })
                    .limit(10),

                Review.find({ reviewer: userId })
                    .populate('reviewee', 'firstName lastName')
                    .populate('skillReviewed', 'name')
                    .sort({ createdAt: -1 })
                    .limit(10),

                Review.find({ reviewee: userId })
                    .populate('reviewer', 'firstName lastName')
                    .populate('skillReviewed', 'name')
                    .sort({ createdAt: -1 })
                    .limit(10)
            ]);

            res.json({
                success: true,
                data: {
                    user,
                    activity: {
                        sessions: userSessions,
                        reviewsGiven: userReviews,
                        reviewsReceived
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update user status (activate/suspend)
     */
    static async updateUserStatus(req, res, next) {
        try {
            const { userId } = req.params;
            const { status, reason } = req.body;

            if (!['active', 'suspended', 'deactivated'].includes(status)) {
                throw new ValidationError('Invalid status. Must be active, suspended, or deactivated');
            }

            const user = await User.findById(userId);
            if (!user) {
                throw new NotFoundError('User not found');
            }

            // Prevent admins from changing their own status
            if (user._id.toString() === req.user.id) {
                throw new ValidationError('Cannot change your own account status');
            }

            // Prevent non-super-admins from changing other admin statuses
            if (user.role === 'admin' && req.user.role !== 'super-admin') {
                throw new ValidationError('Cannot change admin account status');
            }

            const previousStatus = user.status;
            user.status = status;

            // Add status change to user's history (if we implement audit log)
            await user.save();

            // Log the status change
            console.log(`Admin ${req.user.email} changed user ${user.email} status from ${previousStatus} to ${status}`, {
                reason,
                timestamp: new Date().toISOString()
            });

            res.json({
                success: true,
                message: `User status updated to ${status}`,
                data: {
                    userId: user._id,
                    email: user.email,
                    previousStatus,
                    newStatus: status,
                    reason
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get flagged reviews for moderation
     */
    static async getFlaggedReviews(req, res, next) {
        try {
            const {
                page = 1,
                limit = 20,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = req.query;

            const skip = (page - 1) * limit;
            const sort = {};
            sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

            const [flaggedReviews, totalFlagged] = await Promise.all([
                Review.find({ isFlagged: true })
                    .populate('reviewer', 'firstName lastName email')
                    .populate('reviewee', 'firstName lastName email')
                    .populate('skillReviewed', 'name')
                    .sort(sort)
                    .skip(skip)
                    .limit(parseInt(limit)),
                Review.countDocuments({ isFlagged: true })
            ]);

            res.json({
                success: true,
                data: {
                    reviews: flaggedReviews,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(totalFlagged / limit),
                        totalFlagged,
                        hasNext: skip + flaggedReviews.length < totalFlagged,
                        hasPrev: page > 1
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Moderate flagged review (approve/remove)
     */
    static async moderateReview(req, res, next) {
        try {
            const { reviewId } = req.params;
            const { action, reason } = req.body;

            if (!['approve', 'remove', 'warn'].includes(action)) {
                throw new ValidationError('Invalid action. Must be approve, remove, or warn');
            }

            const review = await Review.findById(reviewId)
                .populate('reviewer', 'firstName lastName email')
                .populate('reviewee', 'firstName lastName email');

            if (!review) {
                throw new NotFoundError('Review not found');
            }

            switch (action) {
                case 'approve':
                    review.isFlagged = false;
                    review.moderationStatus = 'approved';
                    break;

                case 'remove':
                    review.moderationStatus = 'removed';
                    review.isVisible = false;
                    break;

                case 'warn':
                    review.isFlagged = false;
                    review.moderationStatus = 'warned';
                    // Could send warning notification to reviewer
                    break;
            }

            review.moderatedBy = req.user.id;
            review.moderatedAt = new Date();
            review.moderationReason = reason;

            await review.save();

            // Log moderation action
            console.log(`Admin ${req.user.email} ${action}ed review ${reviewId}`, {
                reviewId,
                reviewer: review.reviewer.email,
                reviewee: review.reviewee.email,
                action,
                reason,
                timestamp: new Date().toISOString()
            });

            res.json({
                success: true,
                message: `Review ${action}ed successfully`,
                data: {
                    reviewId: review._id,
                    action,
                    moderatedBy: req.user.email,
                    reason
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get platform analytics
     */
    static async getAnalytics(req, res, next) {
        try {
            const { period = '30d' } = req.query;

            // Calculate date range based on period
            let startDate;
            switch (period) {
                case '7d':
                    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                    break;
                case '90d':
                    startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                    break;
                case '1y':
                    startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            }

            // User analytics
            const userAnalytics = await User.aggregate([
                {
                    $match: { createdAt: { $gte: startDate } }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' },
                            day: { $dayOfMonth: '$createdAt' }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
            ]);

            // Session analytics
            const sessionAnalytics = await Session.aggregate([
                {
                    $match: { createdAt: { $gte: startDate } }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' },
                            day: { $dayOfMonth: '$createdAt' },
                            status: '$status'
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
            ]);

            // Top skills
            const topSkills = await Session.aggregate([
                {
                    $match: { createdAt: { $gte: startDate } }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'provider',
                        foreignField: '_id',
                        as: 'providerData'
                    }
                },
                { $unwind: '$providerData' },
                { $unwind: '$providerData.skills' },
                {
                    $group: {
                        _id: '$providerData.skills.name',
                        sessionCount: { $sum: 1 },
                        category: { $first: '$providerData.skills.category' }
                    }
                },
                { $sort: { sessionCount: -1 } },
                { $limit: 10 }
            ]);

            // User engagement metrics
            const engagementMetrics = await User.aggregate([
                {
                    $group: {
                        _id: null,
                        totalUsers: { $sum: 1 },
                        verifiedUsers: {
                            $sum: { $cond: ['$isEmailVerified', 1, 0] }
                        },
                        activeUsers: {
                            $sum: {
                                $cond: [
                                    { $gte: ['$lastLogin', startDate] },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]);

            res.json({
                success: true,
                data: {
                    period,
                    userGrowth: userAnalytics,
                    sessionActivity: sessionAnalytics,
                    topSkills,
                    engagement: engagementMetrics[0] || {
                        totalUsers: 0,
                        verifiedUsers: 0,
                        activeUsers: 0
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get system health and performance metrics
     */
    static async getSystemHealth(req, res, next) {
        try {
            const dbStats = await mongoose.connection.db.stats();

            // Get collection stats
            const collections = ['users', 'sessions', 'reviews'];
            const collectionStats = {};

            for (const collection of collections) {
                try {
                    const stats = await mongoose.connection.db.collection(collection).stats();
                    collectionStats[collection] = {
                        count: stats.count,
                        size: stats.size,
                        avgObjSize: stats.avgObjSize
                    };
                } catch (error) {
                    collectionStats[collection] = { error: 'Unable to fetch stats' };
                }
            }

            // System metrics
            const systemMetrics = {
                database: {
                    connected: mongoose.connection.readyState === 1,
                    collections: mongoose.connection.db.databaseName,
                    stats: {
                        dataSize: dbStats.dataSize,
                        storageSize: dbStats.storageSize,
                        indexes: dbStats.indexes,
                        objects: dbStats.objects
                    }
                },
                collections: collectionStats,
                server: {
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    nodeVersion: process.version,
                    platform: process.platform
                }
            };

            res.json({
                success: true,
                data: systemMetrics
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Export user data (for admin reports)
     */
    static async exportUserData(req, res, next) {
        try {
            const { format = 'json', fields } = req.query;

            let selectFields = 'firstName lastName email status role createdAt lastLogin';
            if (fields) {
                selectFields = fields.split(',').join(' ');
            }

            const users = await User.find()
                .select(selectFields)
                .lean();

            if (format === 'csv') {
                // Convert to CSV format
                const csv = convertToCSV(users);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename=users-export.csv');
                res.send(csv);
            } else {
                res.json({
                    success: true,
                    data: {
                        users,
                        exportedAt: new Date().toISOString(),
                        totalCount: users.length
                    }
                });
            }
        } catch (error) {
            next(error);
        }
    }
}

/**
 * Helper function to convert JSON to CSV
 */
function convertToCSV(data) {
    if (!data.length) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');

    const csvRows = data.map(row =>
        headers.map(header => {
            const value = row[header];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',')
    );

    return [csvHeaders, ...csvRows].join('\n');
}

module.exports = AdminController;