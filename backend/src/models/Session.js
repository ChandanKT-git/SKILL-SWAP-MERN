const mongoose = require('mongoose');
const { Schema } = mongoose;

const sessionSchema = new Schema({
    // Session participants
    requester: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Session requester is required'],
    },
    provider: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Session provider is required'],
    },

    // Session details
    skill: {
        name: {
            type: String,
            required: [true, 'Skill name is required'],
            trim: true,
        },
        category: {
            type: String,
            required: [true, 'Skill category is required'],
            trim: true,
        },
        level: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced', 'expert'],
            required: [true, 'Skill level is required'],
        },
    },

    // Scheduling
    scheduledDate: {
        type: Date,
        required: [true, 'Scheduled date is required'],
        validate: {
            validator: function (date) {
                // Skip validation in test environment
                if (process.env.NODE_ENV === 'test') {
                    return true;
                }

                // Only validate future dates for new sessions or when status is pending
                if (this.isNew || this.status === 'pending') {
                    return date > new Date();
                }
                return true; // Allow past dates for completed/cancelled sessions
            },
            message: 'Scheduled date must be in the future'
        }
    },
    duration: {
        type: Number, // Duration in minutes
        required: [true, 'Session duration is required'],
        min: [15, 'Session duration must be at least 15 minutes'],
        max: [480, 'Session duration cannot exceed 8 hours'],
    },
    timezone: {
        type: String,
        default: 'UTC',
    },

    // Session status and management
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed', 'no-show'],
        default: 'pending',
    },

    // Messages and communication
    requestMessage: {
        type: String,
        maxlength: [500, 'Request message cannot exceed 500 characters'],
        trim: true,
    },
    responseMessage: {
        type: String,
        maxlength: [500, 'Response message cannot exceed 500 characters'],
        trim: true,
    },

    // Session type and format
    sessionType: {
        type: String,
        enum: ['online', 'in-person', 'hybrid'],
        default: 'online',
    },
    location: {
        type: String,
        maxlength: [200, 'Location cannot exceed 200 characters'],
        trim: true,
    },
    meetingLink: {
        type: String,
        trim: true,
        validate: {
            validator: function (link) {
                if (!link) return true; // Optional field
                const urlRegex = /^https?:\/\/.+/;
                return urlRegex.test(link);
            },
            message: 'Meeting link must be a valid URL'
        }
    },

    // Response tracking
    respondedAt: {
        type: Date,
    },
    completedAt: {
        type: Date,
    },
    cancelledAt: {
        type: Date,
    },
    cancelledBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    cancellationReason: {
        type: String,
        maxlength: [300, 'Cancellation reason cannot exceed 300 characters'],
        trim: true,
    },

    // Reminders and notifications
    remindersSent: {
        requester: {
            type: Boolean,
            default: false,
        },
        provider: {
            type: Boolean,
            default: false,
        },
    },

    // Session notes (for post-session)
    notes: {
        requester: {
            type: String,
            maxlength: [1000, 'Session notes cannot exceed 1000 characters'],
            trim: true,
        },
        provider: {
            type: String,
            maxlength: [1000, 'Session notes cannot exceed 1000 characters'],
            trim: true,
        },
    },

    // Rating and review references (will be populated after session completion)
    reviews: [{
        type: Schema.Types.ObjectId,
        ref: 'Review',
    }],

    // Metadata
    metadata: {
        ipAddress: String,
        userAgent: String,
        source: {
            type: String,
            enum: ['web', 'mobile', 'api'],
            default: 'web',
        },
    },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            // Remove sensitive metadata from JSON output
            delete ret.metadata;
            return ret;
        },
    },
    toObject: { virtuals: true },
});

// Indexes for performance
sessionSchema.index({ requester: 1, createdAt: -1 });
sessionSchema.index({ provider: 1, createdAt: -1 });
sessionSchema.index({ status: 1, scheduledDate: 1 });
sessionSchema.index({ scheduledDate: 1 });
sessionSchema.index({ 'skill.name': 1, 'skill.category': 1 });

// Compound index for conflict detection
sessionSchema.index({
    requester: 1,
    scheduledDate: 1,
    duration: 1,
    status: 1
});
sessionSchema.index({
    provider: 1,
    scheduledDate: 1,
    duration: 1,
    status: 1
});

// Virtual for session end time
sessionSchema.virtual('endTime').get(function () {
    if (this.scheduledDate && this.duration) {
        return new Date(this.scheduledDate.getTime() + (this.duration * 60 * 1000));
    }
    return null;
});

// Virtual for session duration in hours
sessionSchema.virtual('durationHours').get(function () {
    return this.duration ? (this.duration / 60).toFixed(1) : 0;
});

// Virtual for time until session
sessionSchema.virtual('timeUntilSession').get(function () {
    if (this.scheduledDate) {
        const now = new Date();
        const timeDiff = this.scheduledDate.getTime() - now.getTime();
        return Math.max(0, timeDiff);
    }
    return 0;
});

// Virtual for session participants
sessionSchema.virtual('participants').get(function () {
    return [this.requester, this.provider];
});

// Instance method to check if user is participant
sessionSchema.methods.isParticipant = function (userId) {
    return this.requester.toString() === userId.toString() ||
        this.provider.toString() === userId.toString();
};

// Instance method to get the other participant
sessionSchema.methods.getOtherParticipant = function (userId) {
    if (this.requester.toString() === userId.toString()) {
        return this.provider;
    } else if (this.provider.toString() === userId.toString()) {
        return this.requester;
    }
    return null;
};

// Instance method to check for scheduling conflicts
sessionSchema.methods.hasConflictWith = function (otherSession) {
    if (this.status === 'cancelled' || this.status === 'rejected' ||
        otherSession.status === 'cancelled' || otherSession.status === 'rejected') {
        return false;
    }

    const thisStart = this.scheduledDate;
    const thisEnd = this.endTime;
    const otherStart = otherSession.scheduledDate;
    const otherEnd = otherSession.endTime;

    // Check if sessions overlap
    return thisStart < otherEnd && otherStart < thisEnd;
};

// Instance method to check if session can be cancelled
sessionSchema.methods.canBeCancelled = function () {
    const validStatuses = ['pending', 'accepted'];
    const now = new Date();
    const timeUntilSession = this.scheduledDate.getTime() - now.getTime();
    const minCancellationTime = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

    return validStatuses.includes(this.status) && timeUntilSession > minCancellationTime;
};

// Instance method to check if session can be completed
sessionSchema.methods.canBeCompleted = function () {
    return this.status === 'accepted' && new Date() >= this.scheduledDate;
};

// Static method to find conflicting sessions
sessionSchema.statics.findConflictingSessions = function (userId, scheduledDate, duration, excludeSessionId = null) {
    const startTime = new Date(scheduledDate);
    const endTime = new Date(startTime.getTime() + (duration * 60 * 1000));

    const query = {
        $and: [
            {
                $or: [
                    { requester: userId },
                    { provider: userId }
                ]
            },
            {
                status: { $in: ['pending', 'accepted'] }
            },
            {
                $or: [
                    // Session starts during the proposed time
                    {
                        scheduledDate: {
                            $gte: startTime,
                            $lt: endTime
                        }
                    },
                    // Session ends during the proposed time
                    {
                        $expr: {
                            $and: [
                                { $lt: ['$scheduledDate', endTime] },
                                { $gt: [{ $add: ['$scheduledDate', { $multiply: ['$duration', 60000] }] }, startTime] }
                            ]
                        }
                    }
                ]
            }
        ]
    };

    if (excludeSessionId) {
        query._id = { $ne: excludeSessionId };
    }

    return this.find(query);
};

// Static method to find upcoming sessions
sessionSchema.statics.findUpcomingSessions = function (userId, limit = 10) {
    const now = new Date();

    return this.find({
        $or: [
            { requester: userId },
            { provider: userId }
        ],
        status: { $in: ['pending', 'accepted'] },
        scheduledDate: { $gte: now }
    })
        .populate('requester', 'firstName lastName profileImage')
        .populate('provider', 'firstName lastName profileImage')
        .sort({ scheduledDate: 1 })
        .limit(limit);
};

// Static method to find sessions by status
sessionSchema.statics.findByStatus = function (userId, status, options = {}) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const skip = (page - 1) * limit;

    const query = {
        $or: [
            { requester: userId },
            { provider: userId }
        ]
    };

    if (Array.isArray(status)) {
        query.status = { $in: status };
    } else {
        query.status = status;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    return this.find(query)
        .populate('requester', 'firstName lastName profileImage rating')
        .populate('provider', 'firstName lastName profileImage rating')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit);
};

// Pre-save middleware for validation
sessionSchema.pre('save', function (next) {
    // Ensure requester and provider are different
    if (this.requester.toString() === this.provider.toString()) {
        return next(new Error('Requester and provider cannot be the same user'));
    }

    // Set response timestamp when status changes
    if (this.isModified('status') && this.status !== 'pending' && !this.respondedAt) {
        this.respondedAt = new Date();
    }

    // Set completion timestamp
    if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
        this.completedAt = new Date();
    }

    // Set cancellation timestamp
    if (this.isModified('status') && this.status === 'cancelled' && !this.cancelledAt) {
        this.cancelledAt = new Date();
    }

    next();
});

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;