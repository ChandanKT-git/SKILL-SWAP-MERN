const { validationResult } = require('express-validator');
const { ValidationError } = require('./errorHandler');

/**
 * Validation middleware to handle express-validator results
 */
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const validationErrors = errors.array().map(error => ({
            field: error.path || error.param,
            message: error.msg,
            value: error.value,
            location: error.location
        }));

        const error = new ValidationError('Validation failed', validationErrors);
        return next(error);
    }

    next();
};

/**
 * Custom validation functions
 */
const customValidators = {
    /**
     * Check if value is a valid MongoDB ObjectId
     */
    isMongoId: (value) => {
        const objectIdRegex = /^[0-9a-fA-F]{24}$/;
        return objectIdRegex.test(value);
    },

    /**
     * Check if password meets security requirements
     */
    isStrongPassword: (value) => {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        return strongPasswordRegex.test(value);
    },

    /**
     * Check if email is valid format
     */
    isValidEmail: (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
    },

    /**
     * Check if phone number is valid format
     */
    isValidPhone: (value) => {
        const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
        return phoneRegex.test(value);
    },

    /**
     * Check if URL is valid
     */
    isValidUrl: (value) => {
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Check if date is in the future
     */
    isFutureDate: (value) => {
        const date = new Date(value);
        return date > new Date();
    },

    /**
     * Check if date is within a reasonable range (not too far in future)
     */
    isReasonableDate: (value) => {
        const date = new Date(value);
        const now = new Date();
        const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

        return date >= now && date <= oneYearFromNow;
    },

    /**
     * Check if skill level is valid
     */
    isValidSkillLevel: (value) => {
        const validLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
        return validLevels.includes(value.toLowerCase());
    },

    /**
     * Check if duration is reasonable (in minutes)
     */
    isReasonableDuration: (value) => {
        const duration = parseInt(value);
        return duration >= 15 && duration <= 480; // 15 minutes to 8 hours
    },

    /**
     * Check if rating is valid (1-5)
     */
    isValidRating: (value) => {
        const rating = parseInt(value);
        return rating >= 1 && rating <= 5;
    },

    /**
     * Check if array has unique values
     */
    hasUniqueValues: (array) => {
        return array.length === new Set(array).size;
    },

    /**
     * Check if string contains only allowed characters
     */
    isAlphanumericWithSpaces: (value) => {
        const regex = /^[a-zA-Z0-9\s]+$/;
        return regex.test(value);
    },

    /**
     * Check if file type is allowed
     */
    isAllowedFileType: (mimetype, allowedTypes = ['image/jpeg', 'image/png', 'image/gif']) => {
        return allowedTypes.includes(mimetype);
    },

    /**
     * Check if file size is within limit
     */
    isWithinSizeLimit: (size, maxSizeInMB = 5) => {
        const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
        return size <= maxSizeInBytes;
    }
};

/**
 * Sanitization functions
 */
const sanitizers = {
    /**
     * Trim whitespace and convert to lowercase
     */
    normalizeEmail: (email) => {
        return email.trim().toLowerCase();
    },

    /**
     * Remove non-alphanumeric characters except spaces
     */
    sanitizeName: (name) => {
        return name.replace(/[^a-zA-Z\s]/g, '').trim();
    },

    /**
     * Remove HTML tags and scripts
     */
    sanitizeHtml: (text) => {
        return text.replace(/<[^>]*>/g, '').trim();
    },

    /**
     * Normalize phone number format
     */
    normalizePhone: (phone) => {
        return phone.replace(/\D/g, '');
    },

    /**
     * Capitalize first letter of each word
     */
    capitalizeWords: (text) => {
        return text.replace(/\w\S*/g, (txt) =>
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }
};

/**
 * Common validation chains for reuse
 */
const commonValidations = {
    /**
     * User ID validation
     */
    userId: (fieldName = 'userId') => [
        require('express-validator').param(fieldName)
            .custom(customValidators.isMongoId)
            .withMessage('Invalid user ID format')
    ],

    /**
     * Email validation
     */
    email: (fieldName = 'email') => [
        require('express-validator').body(fieldName)
            .isEmail()
            .normalizeEmail()
            .withMessage('Invalid email format')
    ],

    /**
     * Password validation
     */
    password: (fieldName = 'password') => [
        require('express-validator').body(fieldName)
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters long')
            .custom(customValidators.isStrongPassword)
            .withMessage('Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number')
    ],

    /**
     * Name validation
     */
    name: (fieldName) => [
        require('express-validator').body(fieldName)
            .isLength({ min: 2, max: 50 })
            .withMessage(`${fieldName} must be between 2 and 50 characters`)
            .matches(/^[a-zA-Z\s]+$/)
            .withMessage(`${fieldName} can only contain letters and spaces`)
    ],

    /**
     * Pagination validation
     */
    pagination: () => [
        require('express-validator').query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer'),
        require('express-validator').query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100')
    ]
};

module.exports = {
    validateRequest,
    customValidators,
    sanitizers,
    commonValidations
};