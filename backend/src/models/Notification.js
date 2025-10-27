const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Notification Schema for managing user notifications
 * Handles real-time notifications, preferences, and delivery tracking
 */
const notificationSchema = new Schema({
    // Recipient information
    recipient: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Recipient is required'],
        index: true
    },

    // Sender information (optional for system notifications)
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // Notification content
    title: {
        type: String,
        required: [true, 'Notification title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },

    message: {
        type: String,
        required: [true, 'Notification message is required'],
        trim: true,
        maxlength: [1000, 'Message cannot exceed 1000 characters']
    },

    // Notification type and category
    type: {
        type: String,
        enum: [
            // Session-related
            'session_request',
            'session_accepted',
            'session_declined',
            'session_cancelled',
            'session_reminder',
            'session_completed',
            'alternative_time_proposed',

            // Review-related
            'review_received',
            'review_response',
            'review_flagged',

            // System-related
            'account_verified',
            'password_changed',
            'security_alert',
            'maintenance_notice',
            'system_update',

            // Social-related
            'connection_request',
            'connection_accepted',
            'skill_endorsed',
            'profile_viewed',
            'community_update'
        ],
        required: [true, 'Notification type is required'],
        index: true
    },

    category: {
        type: String,
        enum: ['session', 'review', 'system', 'social'],
        required: [true, 'Notification category is required'],
        index: true
    },

    // Priority level
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal',
        index: true
    },

    // Status tracking
    status: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'read', 'archived', 'failed'],
        default: 'pending',
        index: true
    },

    // Read status
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },

    readAt: {
        type: Date
    },

    // Related entities
    relatedEntity: {
        entityType: {
            type: String,
            enum: ['session', 'review', 'user', 'system']
        },
        entityId: {
            type: Schema.Types.ObjectId
        }
    },

    // Action data (for actionable notifications)
    actionData: {
        actionType: {
            type: String,
            enum: ['view', 'accept', 'decline', 'respond', 'review', 'none'],
            default: 'none'
        },
        actionUrl: {
            type: String,
            maxlength: 500
        },
        actionText: {
            type: String,
            maxlength: 50
        }
    },

    // Delivery channels
    deliveryChannels: {
        inApp: {
            enabled: { type: Boolean, default: true },
            sentAt: Date,
            deliveredAt: Date
        },
        email: {
            enabled: { type: Boolean, default: false },
            sentAt: Date,
            deliveredAt: Date,
            emailId: String, // External email service ID
            bounced: { type: Boolean, default: false },
            opened: { type: Boolean, default: false },
            clicked: { type: Boolean, default: false }
        },
        sms: {
            enabled: { type: Boolean, default: false },
            sentAt: Date,
            deliveredAt: Date,
            smsId: String, // External SMS service ID
            failed: { type: Boolean, default: false }
        },
        push: {
            enabled: { type: Boolean, default: false },
            sentAt: Date,
            deliveredAt: Date,
            pushId: String, // Push notification service ID
            failed: { type: Boolean, default: false }
        }
    },

    // Scheduling
    scheduledFor: {
        type: Date,
        index: true
    },

    expiresAt: {
        type: Date,
        index: { expireAfterSeconds: 0 } // TTL index for auto-cleanup
    },

    // Retry logic
    retryCount: {
        type: Number,
        default: 0,
        max: 3
    },

    lastRetryAt: Date,

    failureReason: {
        type: String,
        maxlength: 500
    },

    // Metadata
    metadata: {
        source: {
            type: String,
            enum: ['system', 'user_action', 'scheduled', 'webhook'],
            default: 'system'
        },
        templateId: String,
        templateVersion: String,
        locale: {
            type: String,
            default: 'en'
        },
        timezone: {
            type: String,
            default: 'UTC'
        }
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            // Remove sensitive metadata from JSON output
            delete ret.metadata;
            delete ret.deliveryChannels.email.emailId;
            delete ret.deliveryChannels.sms.smsId;
            delete ret.deliveryChannels.push.pushId;
            return ret;
        }
    },
    toObject: { virtuals: true }
});

// Indexes for performance
notificationSchema.index({ recipient: 1, createdAt: -1 }); // User notifications
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 }); // Unread notifications
notificationSchema.index({ recipient: 1, category: 1, createdAt: -1 }); // Category filtering
notificationSchema.index({ status: 1, scheduledFor: 1 }); // Delivery processing
notificationSchema.index({ type: 1, createdAt: -1 }); // Type-based queries
notificationSchema.index({ priority: 1, status: 1, scheduledFor: 1 }); // Priority processing

// Virtual for time since creation
notificationSchema.virtual('timeAgo').get(function () {
    const now = new Date();
    const diff = now - this.createdAt;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
});

// Virtual to check if notification is actionable
notificationSchema.virtual('isActionable').get(function () {
    return this.actionData && this.actionData.actionType !== 'none';
});

// Virtual to check if notification is expired
notificationSchema.virtual('isExpired').get(function () {
    return this.expiresAt && this.expiresAt < new Date();
});

// Virtual to check if notification should be retried
notificationSchema.virtual('shouldRetry').get(function () {
    return this.status === 'failed' &&
        this.retryCount < 3 &&
        (!this.lastRetryAt || (new Date() - this.lastRetryAt) > 300000); // 5 minutes
});

// Virtual for delivery status summary
notificationSchema.virtual('deliveryStatus').get(function () {
    const channels = this.deliveryChannels;
    const status = {
        total: 0,
        sent: 0,
        delivered: 0,
        failed: 0
    };

    ['inApp', 'email', 'sms', 'push'].forEach(channel => {
        if (channels[channel].enabled) {
            status.total++;
            if (channels[channel].sentAt) status.sent++;
            if (channels[channel].deliveredAt) status.delivered++;
            if (channels[channel].failed || channels[channel].bounced) status.failed++;
        }
    });

    return status;
});

// Instance method to mark as read
notificationSchema.methods.markAsRead = function () {
    if (!this.isRead) {
        this.isRead = true;
        this.readAt = new Date();
        this.status = 'read';
    }
    return this.save();
};

// Instance method to mark as unread
notificationSchema.methods.markAsUnread = function () {
    if (this.isRead) {
        this.isRead = false;
        this.readAt = undefined;
        this.status = this.deliveryStatus.delivered > 0 ? 'delivered' : 'sent';
    }
    return this.save();
};

// Instance method to archive notification
notificationSchema.methods.archive = function () {
    this.status = 'archived';
    return this.save();
};

// Instance method to schedule delivery
notificationSchema.methods.scheduleDelivery = function (deliveryTime) {
    this.scheduledFor = deliveryTime;
    this.status = 'pending';
    return this.save();
};

// Instance method to mark delivery channel as sent
notificationSchema.methods.markChannelSent = function (channel, externalId) {
    if (this.deliveryChannels[channel]) {
        this.deliveryChannels[channel].sentAt = new Date();
        if (externalId) {
            this.deliveryChannels[channel][`${channel}Id`] = externalId;
        }

        // Update overall status
        if (this.status === 'pending') {
            this.status = 'sent';
        }
    }
    return this.save();
};

// Instance method to mark delivery channel as delivered
notificationSchema.methods.markChannelDelivered = function (channel) {
    if (this.deliveryChannels[channel]) {
        this.deliveryChannels[channel].deliveredAt = new Date();

        // Update overall status if all enabled channels are delivered
        const allDelivered = ['inApp', 'email', 'sms', 'push'].every(ch =>
            !this.deliveryChannels[ch].enabled || this.deliveryChannels[ch].deliveredAt
        );

        if (allDelivered && this.status !== 'read') {
            this.status = 'delivered';
        }
    }
    return this.save();
};

// Instance method to mark delivery channel as failed
notificationSchema.methods.markChannelFailed = function (channel, reason) {
    if (this.deliveryChannels[channel]) {
        this.deliveryChannels[channel].failed = true;
        this.failureReason = reason;

        // Increment retry count
        this.retryCount++;
        this.lastRetryAt = new Date();

        // Mark as failed if max retries exceeded
        if (this.retryCount >= 3) {
            this.status = 'failed';
        }
    }
    return this.save();
};

// Static method to get user notifications with filtering
notificationSchema.statics.getUserNotifications = function (userId, options = {}) {
    const {
        category,
        type,
        isRead,
        priority,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = options;

    const query = { recipient: userId };

    if (category) query.category = category;
    if (type) query.type = type;
    if (typeof isRead === 'boolean') query.isRead = isRead;
    if (priority) query.priority = priority;

    // Exclude archived notifications by default
    if (options.includeArchived !== true) {
        query.status = { $ne: 'archived' };
    }

    const skip = (page - 1) * limit;
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    return this.find(query)
        .populate('sender', 'firstName lastName profileImage')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function (userId, category) {
    const query = {
        recipient: userId,
        isRead: false,
        status: { $ne: 'archived' }
    };

    if (category) query.category = category;

    return this.countDocuments(query);
};

// Static method to mark multiple notifications as read
notificationSchema.statics.markMultipleAsRead = function (userId, notificationIds) {
    const query = {
        recipient: userId,
        _id: { $in: notificationIds },
        isRead: false
    };

    return this.updateMany(query, {
        $set: {
            isRead: true,
            readAt: new Date(),
            status: 'read'
        }
    });
};

// Static method to get notifications ready for delivery
notificationSchema.statics.getNotificationsForDelivery = function (limit = 100) {
    const now = new Date();

    return this.find({
        status: 'pending',
        $or: [
            { scheduledFor: { $lte: now } },
            { scheduledFor: { $exists: false } }
        ],
        retryCount: { $lt: 3 }
    })
        .populate('recipient', 'firstName lastName email phone notificationPreferences')
        .populate('sender', 'firstName lastName')
        .sort({ priority: -1, createdAt: 1 })
        .limit(limit);
};

// Static method to clean up old notifications
notificationSchema.statics.cleanupOldNotifications = function (daysOld = 90) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    return this.deleteMany({
        createdAt: { $lt: cutoffDate },
        status: { $in: ['read', 'archived'] }
    });
};

// Pre-save middleware
notificationSchema.pre('save', function (next) {
    // Set expiration date for non-critical notifications
    if (!this.expiresAt && this.priority !== 'urgent') {
        const expirationDays = this.priority === 'high' ? 30 : 7;
        this.expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);
    }

    // Set category based on type if not provided
    if (!this.category) {
        if (this.type.startsWith('session_')) {
            this.category = 'session';
        } else if (this.type.startsWith('review_')) {
            this.category = 'review';
        } else if (['connection_', 'skill_', 'profile_', 'community_'].some(prefix => this.type.startsWith(prefix))) {
            this.category = 'social';
        } else {
            this.category = 'system';
        }
    }

    next();
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;