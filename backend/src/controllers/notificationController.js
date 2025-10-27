const NotificationService = require('../services/notificationService');
const { ValidationError } = require('../middleware/errorHandler');

/**
 * Notification Controller
 * Handles notification-related API endpoints
 */
class NotificationController {
    /**
     * Get user notifications with filtering and pagination
     */
    static async getNotifications(req, res, next) {
        try {
            const userId = req.user.id;
            const {
                category,
                type,
                isRead,
                priority,
                page = 1,
                limit = 20,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                includeArchived = false
            } = req.query;

            // Validate query parameters
            if (page < 1 || limit < 1 || limit > 100) {
                throw new ValidationError('Invalid pagination parameters');
            }

            const options = {
                category,
                type,
                isRead: isRead !== undefined ? isRead === 'true' : undefined,
                priority,
                page: parseInt(page),
                limit: parseInt(limit),
                sortBy,
                sortOrder,
                includeArchived: includeArchived === 'true'
            };

            const notifications = await NotificationService.getUserNotifications(userId, options);

            res.json({
                success: true,
                data: notifications,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    hasMore: notifications.length === parseInt(limit)
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get unread notification count
     */
    static async getUnreadCount(req, res, next) {
        try {
            const userId = req.user.id;
            const { category } = req.query;

            const count = await NotificationService.getUnreadCount(userId, category);

            res.json({
                success: true,
                data: { count }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get unread counts by category
     */
    static async getUnreadCountsByCategory(req, res, next) {
        try {
            const userId = req.user.id;

            const categories = ['session', 'review', 'system', 'social'];
            const counts = {};

            for (const category of categories) {
                counts[category] = await NotificationService.getUnreadCount(userId, category);
            }

            counts.total = Object.values(counts).reduce((sum, count) => sum + count, 0);

            res.json({
                success: true,
                data: counts
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Mark notification as read
     */
    static async markAsRead(req, res, next) {
        try {
            const userId = req.user.id;
            const { notificationId } = req.params;

            const notification = await NotificationService.markAsRead(notificationId, userId);

            res.json({
                success: true,
                message: 'Notification marked as read',
                data: notification
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Mark multiple notifications as read
     */
    static async markMultipleAsRead(req, res, next) {
        try {
            const userId = req.user.id;
            const { notificationIds } = req.body;

            if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
                throw new ValidationError('notificationIds must be a non-empty array');
            }

            if (notificationIds.length > 100) {
                throw new ValidationError('Cannot mark more than 100 notifications at once');
            }

            const result = await NotificationService.markMultipleAsRead(notificationIds, userId);

            res.json({
                success: true,
                message: `${result.modifiedCount} notifications marked as read`,
                data: { modifiedCount: result.modifiedCount }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Mark all notifications as read
     */
    static async markAllAsRead(req, res, next) {
        try {
            const userId = req.user.id;
            const { category } = req.body;

            // Get all unread notification IDs for the user
            const notifications = await NotificationService.getUserNotifications(userId, {
                isRead: false,
                category,
                limit: 1000 // Large limit to get all unread
            });

            const notificationIds = notifications.map(n => n._id);

            if (notificationIds.length === 0) {
                return res.json({
                    success: true,
                    message: 'No unread notifications found',
                    data: { modifiedCount: 0 }
                });
            }

            const result = await NotificationService.markMultipleAsRead(notificationIds, userId);

            res.json({
                success: true,
                message: `${result.modifiedCount} notifications marked as read`,
                data: { modifiedCount: result.modifiedCount }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Archive notification
     */
    static async archiveNotification(req, res, next) {
        try {
            const userId = req.user.id;
            const { notificationId } = req.params;

            const notification = await NotificationService.archiveNotification(notificationId, userId);

            res.json({
                success: true,
                message: 'Notification archived',
                data: notification
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get notification preferences
     */
    static async getNotificationPreferences(req, res, next) {
        try {
            const userId = req.user.id;
            const user = await require('../models/User').findById(userId).select('notificationPreferences');

            const defaultPreferences = {
                session: {
                    inApp: true,
                    email: true,
                    sms: false,
                    push: true
                },
                review: {
                    inApp: true,
                    email: true,
                    sms: false,
                    push: true
                },
                system: {
                    inApp: true,
                    email: true,
                    sms: false,
                    push: false
                },
                social: {
                    inApp: true,
                    email: false,
                    sms: false,
                    push: true
                }
            };

            const preferences = {
                ...defaultPreferences,
                ...user.notificationPreferences
            };

            res.json({
                success: true,
                data: preferences
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update notification preferences
     */
    static async updateNotificationPreferences(req, res, next) {
        try {
            const userId = req.user.id;
            const { preferences } = req.body;

            if (!preferences || typeof preferences !== 'object') {
                throw new ValidationError('Preferences object is required');
            }

            // Validate preferences structure
            const validCategories = ['session', 'review', 'system', 'social'];
            const validChannels = ['inApp', 'email', 'sms', 'push'];

            for (const [category, categoryPrefs] of Object.entries(preferences)) {
                if (!validCategories.includes(category)) {
                    throw new ValidationError(`Invalid category: ${category}`);
                }

                if (typeof categoryPrefs !== 'object') {
                    throw new ValidationError(`Category preferences must be an object for ${category}`);
                }

                for (const [channel, enabled] of Object.entries(categoryPrefs)) {
                    if (!validChannels.includes(channel)) {
                        throw new ValidationError(`Invalid channel: ${channel}`);
                    }

                    if (typeof enabled !== 'boolean') {
                        throw new ValidationError(`Channel preference must be boolean for ${category}.${channel}`);
                    }
                }
            }

            const updatedPreferences = await NotificationService.updateNotificationPreferences(userId, preferences);

            res.json({
                success: true,
                message: 'Notification preferences updated',
                data: updatedPreferences
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create a test notification (for development/testing)
     */
    static async createTestNotification(req, res, next) {
        try {
            // Only allow in development environment
            if (process.env.NODE_ENV === 'production') {
                throw new ValidationError('Test notifications not allowed in production');
            }

            const userId = req.user.id;
            const {
                title = 'Test Notification',
                message = 'This is a test notification',
                type = 'system_update',
                category = 'system',
                priority = 'normal'
            } = req.body;

            const notification = await NotificationService.createNotification({
                recipientId: userId,
                title,
                message,
                type,
                category,
                priority
            });

            res.json({
                success: true,
                message: 'Test notification created',
                data: notification
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get notification statistics (admin only)
     */
    static async getNotificationStats(req, res, next) {
        try {
            // Check if user is admin
            if (req.user.role !== 'admin') {
                throw new ValidationError('Admin access required');
            }

            const { startDate, endDate } = req.query;
            const dateRange = {};

            if (startDate) dateRange.startDate = startDate;
            if (endDate) dateRange.endDate = endDate;

            const stats = await NotificationService.getNotificationStats(dateRange);

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Process scheduled notifications (admin only)
     */
    static async processScheduledNotifications(req, res, next) {
        try {
            // Check if user is admin
            if (req.user.role !== 'admin') {
                throw new ValidationError('Admin access required');
            }

            const result = await NotificationService.processScheduledNotifications();

            res.json({
                success: true,
                message: 'Scheduled notifications processed',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Clean up old notifications (admin only)
     */
    static async cleanupOldNotifications(req, res, next) {
        try {
            // Check if user is admin
            if (req.user.role !== 'admin') {
                throw new ValidationError('Admin access required');
            }

            const { daysOld = 90 } = req.body;

            if (daysOld < 30) {
                throw new ValidationError('Cannot delete notifications newer than 30 days');
            }

            const result = await NotificationService.cleanupOldNotifications(daysOld);

            res.json({
                success: true,
                message: `${result.deletedCount} old notifications cleaned up`,
                data: { deletedCount: result.deletedCount }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = NotificationController;