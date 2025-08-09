const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema } = mongoose;

const userSchema = new Schema({
    // Basic Information
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            'Please provide a valid email address',
        ],
    },

    // Authentication Fields
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
        select: false, // Don't include password in queries by default
    },

    // Email Verification
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    emailVerificationToken: {
        type: String,
        select: false,
    },
    emailVerificationExpires: {
        type: Date,
        select: false,
    },

    // OTP for verification
    otp: {
        code: {
            type: String,
        },
        expires: {
            type: Date,
        },
        attempts: {
            type: Number,
            default: 0,
        },
        generatedAt: {
            type: Date,
        },
    },

    // Profile Information
    profileImage: {
        url: String,
        publicId: String, // Cloudinary public ID for deletion
    },
    bio: {
        type: String,
        maxlength: [500, 'Bio cannot exceed 500 characters'],
        trim: true,
    },
    location: {
        city: String,
        state: String,
        country: String,
        coordinates: {
            type: [Number], // [longitude, latitude]
            index: '2dsphere',
        },
    },

    // Skills
    skills: [{
        name: {
            type: String,
            required: true,
            trim: true,
        },
        level: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced', 'expert'],
            required: true,
        },
        category: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            maxlength: [200, 'Skill description cannot exceed 200 characters'],
        },
        yearsOfExperience: {
            type: Number,
            min: 0,
            max: 50,
        },
    }],

    // Availability
    availability: {
        timezone: {
            type: String,
            default: 'UTC',
        },
        preferredDays: [{
            type: String,
            enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        }],
        preferredTimes: [{
            start: String, // Format: "HH:MM"
            end: String,   // Format: "HH:MM"
        }],
        isAvailable: {
            type: Boolean,
            default: true,
        },
    },

    // Rating and Reviews
    rating: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        count: {
            type: Number,
            default: 0,
        },
    },

    // Account Status
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'deactivated'],
        default: 'active',
    },

    // Security
    passwordResetToken: {
        type: String,
        select: false,
    },
    passwordResetExpires: {
        type: Date,
        select: false,
    },
    passwordChangedAt: {
        type: Date,
        select: false,
    },

    // Login tracking
    lastLogin: Date,
    loginAttempts: {
        type: Number,
        default: 0,
        select: false,
    },
    lockUntil: {
        type: Date,
        select: false,
    },

    // Social connections (for future use)
    socialProfiles: {
        linkedin: String,
        github: String,
        website: String,
    },

    // Preferences
    preferences: {
        emailNotifications: {
            type: Boolean,
            default: true,
        },
        sessionReminders: {
            type: Boolean,
            default: true,
        },
        marketingEmails: {
            type: Boolean,
            default: false,
        },
    },
}, {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            // Remove sensitive fields from JSON output
            delete ret.password;
            delete ret.otp;
            delete ret.emailVerificationToken;
            delete ret.passwordResetToken;
            delete ret.loginAttempts;
            delete ret.lockUntil;
            return ret;
        },
    },
    toObject: { virtuals: true },
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ 'skills.name': 1 });
userSchema.index({ 'skills.category': 1 });
userSchema.index({ 'location.coordinates': '2dsphere' });
userSchema.index({ status: 1, role: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();

    try {
        // Hash the password with cost of 12
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
        this.password = await bcrypt.hash(this.password, saltRounds);

        // Set password changed timestamp
        if (!this.isNew) {
            this.passwordChangedAt = new Date();
        }

        next();
    } catch (error) {
        next(error);
    }
});

// Instance method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Password comparison failed');
    }
};

// Instance method to check if password was changed after JWT was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = function () {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 },
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };

    // Lock account after 5 failed attempts for 2 hours
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
    }

    return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
    return this.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 },
    });
};

// Static method to find user by email (including password for authentication)
userSchema.statics.findByEmailWithPassword = function (email) {
    return this.findOne({ email }).select('+password +loginAttempts +lockUntil');
};

// Static method to find users by skill
userSchema.statics.findBySkill = function (skillName, options = {}) {
    const query = { 'skills.name': new RegExp(skillName, 'i') };

    if (options.level) {
        query['skills.level'] = options.level;
    }

    if (options.category) {
        query['skills.category'] = new RegExp(options.category, 'i');
    }

    return this.find(query);
};

// Static method to find users near location
userSchema.statics.findNearLocation = function (longitude, latitude, maxDistance = 50000) {
    return this.find({
        'location.coordinates': {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                },
                $maxDistance: maxDistance, // in meters
            },
        },
    });
};

const User = mongoose.model('User', userSchema);

module.exports = User;