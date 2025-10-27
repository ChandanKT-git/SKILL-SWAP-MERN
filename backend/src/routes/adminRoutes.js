const express = require('express');
const AdminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireAdmin, logAdminAction, adminRateLimit } = require('../middleware/adminAuth');
const { validateRequest } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

const router = express.Router();

// Apply authentication and admin role check to all admin routes
router.use(authenticateToken);
router.use(requireAdmin);
router.use(adminRateLimit);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard overview with key metrics
 * @access  Private (Admin)
 */
router.get('/dashboard',
    logAdminAction('view_dashboard'),
    AdminController.getDashboardStats
);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filtering and pagination
 * @access  Private (Admin)
 */
router.get('/users',
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('status').optional().isIn(['active', 'suspended', 'deactivated']),
        query('role').optional().isIn(['user', 'admin']),
        query('search').optional().isString().trim(),
        query('sortBy').optional().isIn(['createdAt', 'firstName', 'lastName', 'email', 'lastLogin']),
        query('sortOrder').optional().isIn(['asc', 'desc'])
    ],
    validateRequest,
    logAdminAction('view_users'),
    AdminController.getUsers
);

/**
 * @route   GET /api/admin/users/:userId
 * @desc    Get detailed user information
 * @access  Private (Admin)
 */
router.get('/users/:userId',
    [
        param('userId').isMongoId().withMessage('Invalid user ID')
    ],
    validateRequest,
    logAdminAction('view_user_details'),
    AdminController.getUserDetails
);

/**
 * @route   PUT /api/admin/users/:userId/status
 * @desc    Update user status (activate/suspend/deactivate)
 * @access  Private (Admin)
 */
router.put('/users/:userId/status',
    [
        param('userId').isMongoId().withMessage('Invalid user ID'),
        body('status')
            .isIn(['active', 'suspended', 'deactivated'])
            .withMessage('Status must be active, suspended, or deactivated'),
        body('reason')
            .optional()
            .isString()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Reason must be a string with max 500 characters')
    ],
    validateRequest,
    logAdminAction('update_user_status'),
    AdminController.updateUserStatus
);

/**
 * @route   GET /api/admin/reviews/flagged
 * @desc    Get flagged reviews for moderation
 * @access  Private (Admin)
 */
router.get('/reviews/flagged',
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('sortBy').optional().isIn(['createdAt', 'rating', 'flaggedAt']),
        query('sortOrder').optional().isIn(['asc', 'desc'])
    ],
    validateRequest,
    logAdminAction('view_flagged_reviews'),
    AdminController.getFlaggedReviews
);

/**
 * @route   PUT /api/admin/reviews/:reviewId/moderate
 * @desc    Moderate flagged review (approve/remove/warn)
 * @access  Private (Admin)
 */
router.put('/reviews/:reviewId/moderate',
    [
        param('reviewId').isMongoId().withMessage('Invalid review ID'),
        body('action')
            .isIn(['approve', 'remove', 'warn'])
            .withMessage('Action must be approve, remove, or warn'),
        body('reason')
            .optional()
            .isString()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Reason must be a string with max 500 characters')
    ],
    validateRequest,
    logAdminAction('moderate_review'),
    AdminController.moderateReview
);

/**
 * @route   GET /api/admin/analytics
 * @desc    Get platform analytics and metrics
 * @access  Private (Admin)
 */
router.get('/analytics',
    [
        query('period').optional().isIn(['7d', '30d', '90d', '1y'])
    ],
    validateRequest,
    logAdminAction('view_analytics'),
    AdminController.getAnalytics
);

/**
 * @route   GET /api/admin/system/health
 * @desc    Get system health and performance metrics
 * @access  Private (Admin)
 */
router.get('/system/health',
    logAdminAction('view_system_health'),
    AdminController.getSystemHealth
);

/**
 * @route   GET /api/admin/export/users
 * @desc    Export user data for reports
 * @access  Private (Admin)
 */
router.get('/export/users',
    [
        query('format').optional().isIn(['json', 'csv']),
        query('fields').optional().isString()
    ],
    validateRequest,
    logAdminAction('export_user_data'),
    AdminController.exportUserData
);

module.exports = router;