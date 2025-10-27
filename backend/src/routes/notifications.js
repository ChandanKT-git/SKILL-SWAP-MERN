const express = require('express');
const NotificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

const router = express.Router();

// Apply authentication to all notification routes
router.use(authenticateToken);

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications with filtering and pagination
 * @access  Private
 */
router.get('/',
    [
        query('category').optional().isIn(['session', 'review', 'system', 'social']),
        query('type').optional().isString().trim(),
        query('isRead').optional().isBoolean(),
        query('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('sortBy').optional().isIn(['createdAt', 'priority', 'isRead']),
        query('sortOrder').optional().isIn(['asc', 'desc']),
        query('includeArchived').optional().isBoolean()
    ],
    validateRequest,
    NotificationController.getNotifications
);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread-count',
    [
        query('category').optional().isIn(['session', 'review', 'system', 'social'])
    ],
    validateRequest,
    NotificationController.getUnreadCount
);

/**
 * @route   GET /api/notifications/unread-counts-by-category
 * @desc    Get unread notification counts by category
 * @access  Private
 */
router.get('/unread-counts-by-category',
    NotificationController.getUnreadCountsByCategory
);

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get user notification preferences
 * @access  Private
 */
router.get('/preferences',
    NotificationController.getNotificationPreferences
);

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Update user notification preferences
 * @access  Private
 */
router.put('/preferences',
    [
        body('preferences').isObject().withMessage('Preferences must be an object'),
        body('preferences.*.inApp').optional().isBoolean(),
        body('preferences.*.email').optional().isBoolean(),
        body('preferences.*.sms').optional().isBoolean(),
        body('preferences.*.push').optional().isBoolean()
    ],
    validateRequest,
    NotificationController.updateNotificationPreferences
);

/**
 * @route   PUT /api/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:notificationId/read',
    [
        param('notificationId').isMongoId().withMessage('Invalid notification ID')
    ],
    validateRequest,
    NotificationController.markAsRead
);

/**
 * @route   PUT /api/notifications/mark-multiple-read
 * @desc    Mark multiple notifications as read
 * @access  Private
 */
router.put('/mark-multiple-read',
    [
        body('notificationIds')
            .isArray({ min: 1, max: 100 })
            .withMessage('notificationIds must be an array with 1-100 items'),
        body('notificationIds.*')
            .isMongoId()
            .withMessage('Each notification ID must be valid')
    ],
    validateRequest,
    NotificationController.markMultipleAsRead
);

/**
 * @route   PUT /api/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/mark-all-read',
    [
        body('category').optional().isIn(['session', 'review', 'system', 'social'])
    ],
    validateRequest,
    NotificationController.markAllAsRead
);

/**
 * @route   PUT /api/notifications/:notificationId/archive
 * @desc    Archive notification
 * @access  Private
 */
router.put('/:notificationId/archive',
    [
        param('notificationId').isMongoId().withMessage('Invalid notification ID')
    ],
    validateRequest,
    NotificationController.archiveNotification
);

/**
 * @route   POST /api/notifications/test
 * @desc    Create a test notification (development only)
 * @access  Private
 */
router.post('/test',
    [
        body('title').optional().isString().trim().isLength({ max: 200 }),
        body('message').optional().isString().trim().isLength({ max: 1000 }),
        body('type').optional().isString().trim(),
        body('category').optional().isIn(['session', 'review', 'system', 'social']),
        body('priority').optional().isIn(['low', 'normal', 'high', 'urgent'])
    ],
    validateRequest,
    NotificationController.createTestNotification
);

// Admin routes
/**
 * @route   GET /api/notifications/admin/stats
 * @desc    Get notification statistics (admin only)
 * @access  Private (Admin)
 */
router.get('/admin/stats',
    [
        query('startDate').optional().isISO8601(),
        query('endDate').optional().isISO8601()
    ],
    validateRequest,
    NotificationController.getNotificationStats
);

/**
 * @route   POST /api/notifications/admin/process-scheduled
 * @desc    Process scheduled notifications (admin only)
 * @access  Private (Admin)
 */
router.post('/admin/process-scheduled',
    NotificationController.processScheduledNotifications
);

/**
 * @route   DELETE /api/notifications/admin/cleanup
 * @desc    Clean up old notifications (admin only)
 * @access  Private (Admin)
 */
router.delete('/admin/cleanup',
    [
        body('daysOld').optional().isInt({ min: 30 }).withMessage('daysOld must be at least 30')
    ],
    validateRequest,
    NotificationController.cleanupOldNotifications
);

module.exports = router;