import { VALIDATION_PATTERNS } from './constants';

/**
 * Validation utility functions
 */

export const validateEmail = (email) => {
    if (!email) return 'Email is required';
    if (!VALIDATION_PATTERNS.EMAIL.test(email)) return 'Please enter a valid email address';
    return null;
};

export const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters long';
    if (!VALIDATION_PATTERNS.PASSWORD.test(password)) {
        return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
    }
    return null;
};

export const validateConfirmPassword = (password, confirmPassword) => {
    if (!confirmPassword) return 'Please confirm your password';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
};

export const validateRequired = (value, fieldName = 'This field') => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
        return `${fieldName} is required`;
    }
    return null;
};

export const validateMinLength = (value, minLength, fieldName = 'This field') => {
    if (value && value.length < minLength) {
        return `${fieldName} must be at least ${minLength} characters long`;
    }
    return null;
};

export const validateMaxLength = (value, maxLength, fieldName = 'This field') => {
    if (value && value.length > maxLength) {
        return `${fieldName} must not exceed ${maxLength} characters`;
    }
    return null;
};

export const validatePhone = (phone) => {
    if (!phone) return null; // Phone is optional in most cases
    if (!VALIDATION_PATTERNS.PHONE.test(phone)) {
        return 'Please enter a valid phone number';
    }
    return null;
};

export const validateUrl = (url) => {
    if (!url) return null; // URL is optional in most cases
    try {
        new URL(url);
        return null;
    } catch {
        return 'Please enter a valid URL';
    }
};

export const validateRating = (rating) => {
    if (!rating) return 'Rating is required';
    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
        return 'Rating must be between 1 and 5';
    }
    return null;
};

export const validateDate = (date, fieldName = 'Date') => {
    if (!date) return `${fieldName} is required`;
    const selectedDate = new Date(date);
    const now = new Date();

    if (isNaN(selectedDate.getTime())) {
        return `Please enter a valid ${fieldName.toLowerCase()}`;
    }

    if (selectedDate <= now) {
        return `${fieldName} must be in the future`;
    }

    return null;
};

export const validateDuration = (duration) => {
    if (!duration) return 'Duration is required';
    const numDuration = Number(duration);
    if (isNaN(numDuration) || numDuration < 15 || numDuration > 480) {
        return 'Duration must be between 15 minutes and 8 hours';
    }
    return null;
};

export const validateSkillLevel = (level) => {
    const validLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
    if (!level) return 'Skill level is required';
    if (!validLevels.includes(level)) {
        return 'Please select a valid skill level';
    }
    return null;
};

/**
 * Validate form data using validation rules
 * @param {Object} data - Form data to validate
 * @param {Object} rules - Validation rules
 * @returns {Object} - Validation errors
 */
export const validateForm = (data, rules) => {
    const errors = {};

    Object.keys(rules).forEach(field => {
        const value = data[field];
        const fieldRules = rules[field];

        for (const rule of fieldRules) {
            const error = rule(value);
            if (error) {
                errors[field] = error;
                break; // Stop at first error for this field
            }
        }
    });

    return errors;
};

/**
 * Check if form has any validation errors
 * @param {Object} errors - Validation errors object
 * @returns {boolean} - True if form is valid
 */
export const isFormValid = (errors) => {
    return Object.keys(errors).length === 0;
};

/**
 * Common validation rule sets
 */
export const validationRules = {
    register: {
        firstName: [
            (value) => validateRequired(value, 'First name'),
            (value) => validateMinLength(value, 2, 'First name'),
            (value) => validateMaxLength(value, 50, 'First name'),
        ],
        lastName: [
            (value) => validateRequired(value, 'Last name'),
            (value) => validateMinLength(value, 2, 'Last name'),
            (value) => validateMaxLength(value, 50, 'Last name'),
        ],
        email: [validateEmail],
        password: [validatePassword],
        confirmPassword: [
            (value, formData) => validateConfirmPassword(formData?.password, value),
        ],
    },

    login: {
        email: [validateEmail],
        password: [(value) => validateRequired(value, 'Password')],
    },

    profile: {
        firstName: [
            (value) => validateRequired(value, 'First name'),
            (value) => validateMinLength(value, 2, 'First name'),
            (value) => validateMaxLength(value, 50, 'First name'),
        ],
        lastName: [
            (value) => validateRequired(value, 'Last name'),
            (value) => validateMinLength(value, 2, 'Last name'),
            (value) => validateMaxLength(value, 50, 'Last name'),
        ],
        bio: [
            (value) => validateMaxLength(value, 500, 'Bio'),
        ],
        location: [
            (value) => validateMaxLength(value, 100, 'Location'),
        ],
    },

    skill: {
        name: [
            (value) => validateRequired(value, 'Skill name'),
            (value) => validateMinLength(value, 2, 'Skill name'),
            (value) => validateMaxLength(value, 100, 'Skill name'),
        ],
        category: [
            (value) => validateRequired(value, 'Category'),
            (value) => validateMaxLength(value, 50, 'Category'),
        ],
        level: [validateSkillLevel],
        description: [
            (value) => validateMaxLength(value, 500, 'Description'),
        ],
    },

    session: {
        skill: [
            (value) => validateRequired(value?.name, 'Skill name'),
        ],
        scheduledDate: [
            (value) => validateDate(value, 'Session date'),
        ],
        duration: [validateDuration],
        description: [
            (value) => validateMaxLength(value, 500, 'Description'),
        ],
    },

    review: {
        rating: [validateRating],
        comment: [
            (value) => validateMaxLength(value, 1000, 'Comment'),
        ],
    },
};