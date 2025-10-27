const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Review Schema for user ratings and feedback after skill exchange sessions
 * Handles rating submission, duplicate prevention, and content moderation
 */
const reviewSchema = new Schema({
    // Review participants
    reviewer: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Reviewer is required'],
        index: true
    },
    reviewee: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Reviewee is required'],
        index: true
    },

    // Associated session
    session: {
        type: Schema.Types.ObjectId,
        ref: 'Session',
        required: [true, 'Session reference is required'],
        index: true
    },

    // Rating and feedback
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5'],
        validate: {
            validator: function (value) {
                return Number.isInteger(value);
            },
            message: 'Rating must be a whole number'
        }
    },

    comment: {
        type: String,
        required: [true, 'Review comment is required'],
        trim: true,
        minlength: [10, 'Review comment must be at least 10 characters'],
        maxlength: [1000, 'Review comment cannot exceed 1000 characters']
    },

    // Skill context
    skillReviewed: {
        name: {
            type: String,
            required: [true, 'Skill name is required'],
            trim: true,
            maxlength: 100
        },
        category: {
            type: String,
            required: [true, 'Skill category is required'],
            trim: true,
            maxlength: 50
        }
    },

    // Review type based on session context
    reviewType: {
        type: String,
        enum: ['teaching', 'learning', 'exchange'],
        required: [true, 'Review type is required']
    },

    // Moderation and status
    status: {
        type: String,
        enum: ['active', 'flagged', 'hidden', 'removed'],
        default: 'active',
        index: true
    },

    // Moderation details
    moderation: {
        flaggedBy: [{
            user: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            reason: {
                type: String,
                enum: ['inappropriate', 'spam', 'fake', 'offensive', 'other'],
                required: true
            },
            details: {
                type: String,
                maxlength: 500
            },
            flaggedAt: {
                type: Date,
                default: Date.now
            }
        }],

        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        reviewedAt: Date,
        moderationNotes: {
            type: String,
            maxlength: 1000
        }
    },

    // Admin moderation fields
    isFlagged: {
        type: Boolean,
        default: false,
        index: true
    },

    moderationStatus: {
        type: String,
        enum: ['pending', 'approved', 'removed', 'warned'],
        default: 'pending'
    },

    moderatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    moderatedAt: Date,

    moderationReason: {
        type: String,
        maxlength: 500
    },

    isVisible: {
        type: Boolean,
        default: true
    },

    // Helpfulness tracking
    helpfulness: {
        helpful: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }],
        notHelpful: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }]
    },

    // Response from reviewee
    response: {
        comment: {
            type: String,
            trim: true,
            maxlength: 500
        },
        respondedAt: Date
    },

    // Metadata
    metadata: {
        ipAddress: String,
        userAgent: String,
        source: {
            type: String,
            enum: ['web', 'mobile', 'api'],
            default: 'web'
        }
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            // Remove sensitive metadata from JSON output
            delete ret.metadata;
            return ret;
        }
    },
    toObject: { virtuals: true }
});

// Compound indexes for performance and uniqueness
reviewSchema.index({ reviewer: 1, session: 1 }, { unique: true }); // Prevent duplicate reviews per session
reviewSchema.index({ reviewee: 1, createdAt: -1 }); // For fetching user reviews
reviewSchema.index({ session: 1, reviewer: 1 }); // For session-based queries
reviewSchema.index({ status: 1, createdAt: -1 }); // For moderation queries
reviewSchema.index({ 'skillReviewed.name': 1, 'skillReviewed.category': 1 }); // For skill-based queries

// Virtual for helpfulness score
reviewSchema.virtual('helpfulnessScore').get(function () {
    const helpful = this.helpfulness.helpful.length;
    const notHelpful = this.helpfulness.notHelpful.length;
    const total = helpful + notHelpful;

    if (total === 0) return 0;
    return Math.round((helpful / total) * 100);
});

// Virtual for net helpfulness
reviewSchema.virtual('netHelpfulness').get(function () {
    return this.helpfulness.helpful.length - this.helpfulness.notHelpful.length;
});

// Virtual to check if review has flags (keeping for backward compatibility)
reviewSchema.virtual('hasFlaggedBy').get(function () {
    return this.moderation.flaggedBy && this.moderation.flaggedBy.length > 0;
});

// Virtual for flag count
reviewSchema.virtual('flagCount').get(function () {
    return this.moderation.flaggedBy ? this.moderation.flaggedBy.length : 0;
});

// Instance method to check if user can flag this review
reviewSchema.methods.canBeFlaggedBy = function (userId) {
    // Users cannot flag their own reviews
    if (this.reviewer.toString() === userId.toString()) {
        return false;
    }

    // Check if user already flagged this review
    const alreadyFlagged = this.moderation.flaggedBy.some(flag =>
        flag.user.toString() === userId.toString()
    );

    return !alreadyFlagged && this.status === 'active';
};

// Instance method to flag review
reviewSchema.methods.flagReview = function (userId, reason, details) {
    if (!this.canBeFlaggedBy(userId)) {
        throw new Error('User cannot flag this review');
    }

    this.moderation.flaggedBy.push({
        user: userId,
        reason,
        details,
        flaggedAt: new Date()
    });

    // Auto-hide if flagged by multiple users
    if (this.moderation.flaggedBy.length >= 3) {
        this.status = 'flagged';
    }

    return this.save();
};

// Instance method to mark as helpful/not helpful
reviewSchema.methods.markHelpfulness = function (userId, isHelpful) {
    // Remove user from both arrays first
    this.helpfulness.helpful = this.helpfulness.helpful.filter(
        id => id.toString() !== userId.toString()
    );
    this.helpfulness.notHelpful = this.helpfulness.notHelpful.filter(
        id => id.toString() !== userId.toString()
    );

    // Add to appropriate array
    if (isHelpful) {
        this.helpfulness.helpful.push(userId);
    } else {
        this.helpfulness.notHelpful.push(userId);
    }

    return this.save();
};

// Instance method to add response
reviewSchema.methods.addResponse = function (responseComment) {
    this.response = {
        comment: responseComment,
        respondedAt: new Date()
    };

    return this.save();
};

// Static method to get user's average rating
reviewSchema.statics.getUserAverageRating = async function (userId) {
    const result = await this.aggregate([
        {
            $match: {
                reviewee: userId,
                status: 'active'
            }
        },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 },
                ratingDistribution: {
                    $push: '$rating'
                }
            }
        }
    ]);

    if (result.length === 0) {
        return {
            averageRating: 0,
            totalReviews: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
    }

    const data = result[0];

    // Calculate rating distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    data.ratingDistribution.forEach(rating => {
        distribution[rating]++;
    });

    return {
        averageRating: Math.round(data.averageRating * 10) / 10, // Round to 1 decimal
        totalReviews: data.totalReviews,
        ratingDistribution: distribution
    };
};

// Static method to get skill-specific ratings
reviewSchema.statics.getSkillRating = async function (userId, skillName, skillCategory) {
    const result = await this.aggregate([
        {
            $match: {
                reviewee: userId,
                'skillReviewed.name': skillName,
                'skillReviewed.category': skillCategory,
                status: 'active'
            }
        },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 }
            }
        }
    ]);

    if (result.length === 0) {
        return { averageRating: 0, totalReviews: 0 };
    }

    return {
        averageRating: Math.round(result[0].averageRating * 10) / 10,
        totalReviews: result[0].totalReviews
    };
};

// Static method to find reviews for a user
reviewSchema.statics.findUserReviews = function (userId, options = {}) {
    const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        status = 'active',
        includeResponse = false
    } = options;

    const skip = (page - 1) * limit;
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    let query = {
        reviewee: userId,
        status: status
    };

    let populateFields = 'reviewer';
    if (includeResponse) {
        populateFields += ' session';
    }

    return this.find(query)
        .populate('reviewer', 'firstName lastName profileImage')
        .populate('session', 'skill scheduledDate')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();
};

// Static method to check if review exists for session
reviewSchema.statics.reviewExistsForSession = async function (sessionId, reviewerId) {
    const review = await this.findOne({
        session: sessionId,
        reviewer: reviewerId
    });

    return !!review;
};

// Static method to get reviews requiring moderation
reviewSchema.statics.getReviewsForModeration = function (options = {}) {
    const {
        page = 1,
        limit = 20,
        status = 'flagged'
    } = options;

    const skip = (page - 1) * limit;

    return this.find({ status })
        .populate('reviewer reviewee', 'firstName lastName email')
        .populate('session', 'skill scheduledDate')
        .sort({ 'moderation.flaggedBy.0.flaggedAt': -1 })
        .skip(skip)
        .limit(limit);
};

// Pre-save middleware
reviewSchema.pre('save', function (next) {
    // Ensure reviewer and reviewee are different
    if (this.reviewer.toString() === this.reviewee.toString()) {
        return next(new Error('Users cannot review themselves'));
    }

    next();
});

// Post-save middleware to update user rating
reviewSchema.post('save', async function (doc) {
    try {
        // Update the reviewee's overall rating in the User model
        const User = mongoose.model('User');
        const ratingData = await this.constructor.getUserAverageRating(doc.reviewee);

        await User.findByIdAndUpdate(doc.reviewee, {
            'rating.average': ratingData.averageRating,
            'rating.count': ratingData.totalReviews
        });
    } catch (error) {
        console.error('Error updating user rating:', error);
    }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;