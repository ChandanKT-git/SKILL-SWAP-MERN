const Notification = require('../models/Notification');
const User = require('../models/User');
const EmailService = require('./emailService');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');

/**
 * Notification Service
 * Handles notification creation, delivery, and management
 */
class NotificationService {
    /**
     * Create a new notification
     */
    static async createNotification(notificationData) {
        const {
            recipientId,
            senderId,
            title,
            message,
            type,
            category,
            priority = 'normal',
            relatedEntity,
            actionData,
            scheduledFor,
            deliveryChannels
        } = notificationData;

        // Validate recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            throw new NotFoundError('Recipient not found');
        }

        // Get user's notification preferences
        const preferences = recipient.notificationPreferences || {};
        const categoryPrefs = preferences[category] || {};

        // Determine delivery channels based on user preferences
        const channels = {
            inApp: {
                enabled: deliveryChannels?.inApp ?? true // In-app always enabled by default
            },
            email: {
                enabled: deliveryChannels?.email ?? (categoryPrefs.email !== false)
            },
            sms: {
                enabled: deliveryChannels?.sms ?? (categoryPrefs.sms === true)
            },
            push: {
                enabled: deliveryChannels?.push ?? (categoryPrefs.push !== false)
            }
        };

        // Create notification
        const notification = new Notification({
            recipient: recipientId,
            sender: senderId,
            title,
            message,
            type,
            category,
            priority,
            relatedEntity,
            actionData,
            scheduledFor,
            deliveryChannels: channels,
            metadata: {
                source: 'system',
                locale: recipient.locale || 'en',
                timezone: recipient.timezone || 'UTC'
            }
        });

        await notification.save();

        // If not scheduled, process immediately
        if (!scheduledFor || scheduledFor <= new Date()) {
            await this.processNotification(notification._id);
        }

        return notification;
    }

    /**
     * Create session-related notifications
     */
    static async createSessionNotification(sessionData, type, additionalData = {}) {
        const { session, recipientId, senderId } = sessionData;

        const notificationMap = {
            session_request: {
                title: 'New Session Request',
                message: `${session.requester?.firstName || 'Someone'} has requested a ${session.skill.name} session with you.`,
                actionData: {
                    actionType: 'respond',
                    actionUrl: `/sessions/${session._id}`,
                    actionText: 'Respond'
                }
            },
            session_accepted: {
                title: 'Session Request Accepted',
                message: `${session.provider?.firstName || 'Your session provider'} has accepted your ${session.skill.name} session request.`,
                actionData: {
                    actionType: 'view',
                    actionUrl: `/sessions/${session._id}`,
                    actionText: 'View Details'
                }
            },
            session_declined: {
                title: 'Session Request Declined',
                message: `${session.provider?.firstName || 'Your session provider'} has declined your ${session.skill.name} session request.`,
                actionData: {
                    actionType: 'view',
                    actionUrl: `/sessions/${session._id}`,
                    actionText: 'View Details'
                }
            },
            session_cancelled: {
                title: 'Session Cancelled',
                message: `Your ${session.skill.name} session has been cancelled.`,
                actionData: {
                    actionType: 'view',
                    actionUrl: `/sessions/${session._id}`,
                    actionText: 'View Details'
                }
            },
            session_reminder: {
                title: 'Session Reminder',
                message: `Your ${session.skill.name} session is starting in ${additionalData.timeUntil || '1 hour'}.`,
                actionData: {
                    actionType: 'view',
                    actionUrl: `/sessions/${session._id}`,
                    actionText: 'Join Session'
                }
            },
            session_completed: {
                title: 'Session Completed',
                message: `Your ${session.skill.name} session has been completed. Please leave a review.`,
                actionData: {
                    actionType: 'review',
                    actionUrl: `/sessions/${session._id}/review`,
                    actionText: 'Leave Review'
                }
            },
            alternative_time_proposed: {
                title: 'Alternative Time Proposed',
                message: `${session.provider?.firstName || 'Your session provider'} has proposed an alternative time for your ${session.skill.name} session.`,
                actionData: {
                    actionType: 'respond',
                    actionUrl: `/sessions/${session._id}`,
                    actionText: 'Respond'
                }
            }
        };

        const notificationData = notificationMap[type];
        if (!notificationData) {
            throw new ValidationError(`Invalid session notification type: ${type}`);
        }

        return await this.createNotification({
            recipientId,
            senderId,
            title: notificationData.title,
            message: notificationData.message,
            type,
            category: 'session',
            priority: type.includes('reminder') ? 'high' : 'normal',
            relatedEntity: {
                entityType: 'session',
                entityId: session._id
            },
            actionData: notificationData.actionData,
            scheduledFor: additionalData.scheduledFor
        });
    }

    /**
     * Create review-related notifications
     */
    static async createReviewNotification(reviewData, type, additionalData = {}) {
        const { review, recipientId, senderId } = reviewData;

        const notificationMap = {
            review_received: {
                title: 'New Review Received',
                message: `${review.reviewer?.firstName || 'Someone'} has left you a ${review.rating}-star review for ${review.skillReviewed.name}.`,
                actionData: {
                    actionType: 'view',
                    actionUrl: `/reviews/${review._id}`,
                    actionText: 'View Review'
                }
            },
            review_response: {
                title: 'Review Response',
                message: `${review.reviewee?.firstName || 'Someone'} has responded to your review.`,
                actionData: {
                    actionType: 'view',
                    actionUrl: `/reviews/${review._id}`,
                    actionText: 'View Response'
                }
            },
            review_flagged: {
                title: 'Review Flagged',
                message: 'One of your reviews has been flagged for moderation.',
                actionData: {
                    actionType: 'view',
                    actionUrl: `/reviews/${review._id}`,
                    actionText: 'View Details'
                }
            }
        };

        const notificationData = notificationMap[type];
        if (!notificationData) {
            throw new ValidationError(`Invalid review notification type: ${type}`);
        }

        return await this.createNotification({
            recipientId,
            senderId,
            title: notificationData.title,
            message: notificationData.message,
            type,
            category: 'review',
            priority: 'normal',
            relatedEntity: {
                entityType: 'review',
                entityId: review._id
            },
            actionData: notificationData.actionData
        });
    }

    /**
     * Create system notifications
     */
    static async createSystemNotification(userData, type, additionalData = {}) {
        const { userId } = userData;

        const notificationMap = {
            account_verified: {
                title: 'Account Verified',
                message: 'Your account has been successfully verified. Welcome to SkillSwap!',
                priority: 'normal'
            },
            password_changed: {
                title: 'Password Changed',
                message: 'Your password has been successfully changed.',
                priority: 'high'
            },
            security_alert: {
                title: 'Security Alert',
                message: additionalData.message || 'Unusual activity detected on your account.',
                priority: 'urgent'
            },
            maintenance_notice: {
                title: 'Maintenance Notice',
                message: additionalData.message || 'Scheduled maintenance will occur soon.',
                priority: 'normal'
            },
            system_update: {
                title: 'System Update',
                message: additionalData.message || 'New features and improvements are now available.',
                priority: 'low'
            }
        };

        const notificationData = notificationMap[type];
        if (!notificationData) {
            throw new ValidationError(`Invalid system notification type: ${type}`);
        }

        return await this.createNotification({
            recipientId: userId,
            title: notificationData.title,
            message: notificationData.message,
            type,
            category: 'system',
            priority: notificationData.priority,
            scheduledFor: additionalData.scheduledFor
        });
    }

    /**
     * Process a notification for delivery
     */
    static async processNotification(notificationId) {
        const notification = await Notification.findById(notificationId)
            .populate('recipient', 'firstName lastName email phone notificationPreferences')
            .populate('sender', 'firstName lastName');

        if (!notification) {
            throw new NotFoundError('Notification not found');
        }

        if (notification.status !== 'pending') {
            return notification; // Already processed
        }

        const deliveryPromises = [];

        // Process in-app notification
        if (notification.deliveryChannels.inApp.enabled) {
            deliveryPromises.push(this.deliverInApp(notification));
        }

        // Process email notification
        if (notification.deliveryChannels.email.enabled && notification.recipient.email) {
            deliveryPromises.push(this.deliverEmail(notification));
        }

        // Process SMS notification (placeholder for future implementation)
        if (notification.deliveryChannels.sms.enabled && notification.recipient.phone) {
            deliveryPromises.push(this.deliverSMS(notification));
        }

        // Process push notification (placeholder for future implementation)
        if (notification.deliveryChannels.push.enabled) {
            deliveryPromises.push(this.deliverPush(notification));
        }

        // Wait for all delivery attempts
        await Promise.allSettled(deliveryPromises);

        return notification;
    }

    /**
     * Deliver in-app notification
     */
    static async deliverInApp(notification) {
        try {
            await notification.markChannelSent('inApp');
            await notification.markChannelDelivered('inApp');
            return { success: true, channel: 'inApp' };
        } catch (error) {
            await notification.markChannelFailed('inApp', error.message);
            throw error;
        }
    }

    /**
     * Deliver email notification
     */
    static async deliverEmail(notification) {
        try {
            const emailData = {
                to: notification.recipient.email,
                subject: notification.title,
                template: this.getEmailTemplate(notification.type),
                data: {
                    recipientName: notification.recipient.firstName,
                    senderName: notification.sender?.firstName,
                    title: notification.title,
                    message: notification.message,
                    actionUrl: notification.actionData?.actionUrl,
                    actionText: notification.actionData?.actionText
                }
            };

            const emailResult = await EmailService.sendNotificationEmail(emailData);
            await notification.markChannelSent('email', emailResult.messageId);

            // Mark as delivered immediately for now (in production, use webhooks)
            await notification.markChannelDelivered('email');

            return { success: true, channel: 'email', messageId: emailResult.messageId };
        } catch (error) {
            await notification.markChannelFailed('email', error.message);
            throw error;
        }
    }

    /**
     * Deliver SMS notification (placeholder)
     */
    static async deliverSMS(notification) {
        try {
            // Placeholder for SMS delivery implementation
            console.log(`SMS delivery not implemented yet for notification ${notification._id}`);
            await notification.markChannelSent('sms', 'placeholder-sms-id');
            await notification.markChannelDelivered('sms');
            return { success: true, channel: 'sms' };
        } catch (error) {
            await notification.markChannelFailed('sms', error.message);
            throw error;
        }
    }

    /**
     * Deliver push notification (placeholder)
     */
    static async deliverPush(notification) {
        try {
            // Placeholder for push notification implementation
            console.log(`Push delivery not implemented yet for notification ${notification._id}`);
            await notification.markChannelSent('push', 'placeholder-push-id');
            await notification.markChannelDelivered('push');
            return { success: true, channel: 'push' };
        } catch (error) {
            await notification.markChannelFailed('push', error.message);
            throw error;
        }
    }

    /**
     * Get email template based on notification type
     */
    static getEmailTemplate(type) {
        const templateMap = {
            session_request: 'session-request',
            session_accepted: 'session-accepted',
            session_declined: 'session-declined',
            session_cancelled: 'session-cancelled',
            session_reminder: 'session-reminder',
            session_completed: 'session-completed',
            alternative_time_proposed: 'alternative-time-proposed',
            review_received: 'review-received',
            review_response: 'review-response',
            account_verified: 'account-verified',
            password_changed: 'password-changed',
            security_alert: 'security-alert'
        };

        return templateMap[type] || 'default-notification';
    }

    /**
     * Get user notifications with filtering and pagination
     */
    static async getUserNotifications(userId, options = {}) {
        return await Notification.getUserNotifications(userId, options);
    }

    /**
     * Get unread notification count
     */
    static async getUnreadCount(userId, category = null) {
        return await Notification.getUnreadCount(userId, category);
    }

    /**
     * Mark notification as read
     */
    static async markAsRead(notificationId, userId) {
        const notification = await Notification.findOne({
            _id: notificationId,
            recipient: userId
        });

        if (!notification) {
            throw new NotFoundError('Notification not found');
        }

        return await notification.markAsRead();
    }

    /**
     * Mark multiple notifications as read
     */
    static async markMultipleAsRead(notificationIds, userId) {
        return await Notification.markMultipleAsRead(userId, notificationIds);
    }

    /**
     * Archive notification
     */
    static async archiveNotification(notificationId, userId) {
        const notification = await Notification.findOne({
            _id: notificationId,
            recipient: userId
        });

        if (!notification) {
            throw new NotFoundError('Notification not found');
        }

        return await notification.archive();
    }

    /**
     * Process scheduled notifications
     */
    static async processScheduledNotifications() {
        const notifications = await Notification.getNotificationsForDelivery();

        const processPromises = notifications.map(notification =>
            this.processNotification(notification._id).catch(error => {
                console.error(`Failed to process notification ${notification._id}:`, error);
                return null;
            })
        );

        const results = await Promise.allSettled(processPromises);

        return {
            processed: results.filter(r => r.status === 'fulfilled' && r.value).length,
            failed: results.filter(r => r.status === 'rejected').length,
            total: notifications.length
        };
    }

    /**
     * Clean up old notifications
     */
    static async cleanupOldNotifications(daysOld = 90) {
        return await Notification.cleanupOldNotifications(daysOld);
    }

    /**
     * Update user notification preferences
     */
    static async updateNotificationPreferences(userId, preferences) {
        const user = await User.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        user.notificationPreferences = {
            ...user.notificationPreferences,
            ...preferences
        };

        await user.save();
        return user.notificationPreferences;
    }

    /**
     * Get notification statistics for admin
     */
    static async getNotificationStats(dateRange = {}) {
        const { startDate, endDate } = dateRange;
        const matchStage = {};

        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) matchStage.createdAt.$lte = new Date(endDate);
        }

        const stats = await Notification.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    byCategory: {
                        $push: {
                            category: '$category',
                            type: '$type',
                            status: '$status'
                        }
                    },
                    byStatus: {
                        $push: '$status'
                    },
                    byPriority: {
                        $push: '$priority'
                    }
                }
            },
            {
                $project: {
                    total: 1,
                    categoryStats: {
                        $reduce: {
                            input: '$byCategory',
                            initialValue: {},
                            in: {
                                $mergeObjects: [
                                    '$$value',
                                    {
                                        $arrayToObject: [[{
                                            k: '$$this.category',
                                            v: { $add: [{ $ifNull: [{ $getField: { field: '$$this.category', input: '$$value' } }, 0] }, 1] }
                                        }]]
                                    }
                                ]
                            }
                        }
                    },
                    statusStats: {
                        $reduce: {
                            input: '$byStatus',
                            initialValue: {},
                            in: {
                                $mergeObjects: [
                                    '$$value',
                                    {
                                        $arrayToObject: [[{
                                            k: '$$this',
                                            v: { $add: [{ $ifNull: [{ $getField: { field: '$$this', input: '$$value' } }, 0] }, 1] }
                                        }]]
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        ]);

        return stats[0] || { total: 0, categoryStats: {}, statusStats: {} };
    }
}

module.exports = NotificationService;