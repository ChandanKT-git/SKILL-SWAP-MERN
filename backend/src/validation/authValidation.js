const Joi = require('joi');

/**
 * Validation schemas for authentication endpoints
 */

// User registration validation schema
const registerSchema = Joi.object({
    firstName: Joi.string()
        .trim()
        .min(2)
        .max(50)
        .pattern(/^[a-zA-Z\s'-]+$/)
        .required()
        .messages({
            'string.empty': 'First name is required',
            'string.min': 'First name must be at least 2 characters long',
            'string.max': 'First name cannot exceed 50 characters',
            'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes',
        }),

    lastName: Joi.string()
        .trim()
        .min(2)
        .max(50)
        .pattern(/^[a-zA-Z\s'-]+$/)
        .required()
        .messages({
            'string.empty': 'Last name is required',
            'string.min': 'Last name must be at least 2 characters long',
            'string.max': 'Last name cannot exceed 50 characters',
            'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes',
        }),

    email: Joi.string()
        .email({ tlds: { allow: false } })
        .lowercase()
        .trim()
        .required()
        .messages({
            'string.empty': 'Email is required',
            'string.email': 'Please provide a valid email address',
        }),

    password: Joi.string()
        .min(8)
        .max(128)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
        .required()
        .messages({
            'string.empty': 'Password is required',
            'string.min': 'Password must be at least 8 characters long',
            'string.max': 'Password cannot exceed 128 characters',
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        }),

    confirmPassword: Joi.string()
        .valid(Joi.ref('password'))
        .required()
        .messages({
            'any.only': 'Passwords do not match',
            'string.empty': 'Password confirmation is required',
        }),

    acceptTerms: Joi.boolean()
        .valid(true)
        .required()
        .messages({
            'any.only': 'You must accept the terms and conditions',
            'boolean.base': 'Terms acceptance must be a boolean value',
        }),

    marketingEmails: Joi.boolean()
        .default(false)
        .optional(),
});

// Login validation schema
const loginSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .lowercase()
        .trim()
        .required()
        .messages({
            'string.empty': 'Email is required',
            'string.email': 'Please provide a valid email address',
        }),

    password: Joi.string()
        .required()
        .messages({
            'string.empty': 'Password is required',
        }),

    rememberMe: Joi.boolean()
        .default(false)
        .optional(),
});

// OTP verification validation schema
const verifyOTPSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .lowercase()
        .trim()
        .required()
        .messages({
            'string.empty': 'Email is required',
            'string.email': 'Please provide a valid email address',
        }),

    otp: Joi.string()
        .length(6)
        .pattern(/^\d{6}$/)
        .required()
        .messages({
            'string.empty': 'OTP is required',
            'string.length': 'OTP must be exactly 6 digits',
            'string.pattern.base': 'OTP must contain only numbers',
        }),
});

// Resend OTP validation schema
const resendOTPSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .lowercase()
        .trim()
        .required()
        .messages({
            'string.empty': 'Email is required',
            'string.email': 'Please provide a valid email address',
        }),
});

// Password reset request validation schema
const forgotPasswordSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .lowercase()
        .trim()
        .required()
        .messages({
            'string.empty': 'Email is required',
            'string.email': 'Please provide a valid email address',
        }),
});

// Password reset validation schema
const resetPasswordSchema = Joi.object({
    token: Joi.string()
        .required()
        .messages({
            'string.empty': 'Reset token is required',
        }),

    password: Joi.string()
        .min(8)
        .max(128)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
        .required()
        .messages({
            'string.empty': 'Password is required',
            'string.min': 'Password must be at least 8 characters long',
            'string.max': 'Password cannot exceed 128 characters',
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        }),

    confirmPassword: Joi.string()
        .valid(Joi.ref('password'))
        .required()
        .messages({
            'any.only': 'Passwords do not match',
            'string.empty': 'Password confirmation is required',
        }),
});

// Change password validation schema
const changePasswordSchema = Joi.object({
    currentPassword: Joi.string()
        .required()
        .messages({
            'string.empty': 'Current password is required',
        }),

    newPassword: Joi.string()
        .min(8)
        .max(128)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
        .invalid(Joi.ref('currentPassword'))
        .required()
        .messages({
            'string.empty': 'New password is required',
            'string.min': 'New password must be at least 8 characters long',
            'string.max': 'New password cannot exceed 128 characters',
            'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
            'any.invalid': 'New password must be different from current password',
        }),

    confirmNewPassword: Joi.string()
        .valid(Joi.ref('newPassword'))
        .required()
        .messages({
            'any.only': 'New passwords do not match',
            'string.empty': 'New password confirmation is required',
        }),
});

// Email verification token validation schema
const verifyEmailTokenSchema = Joi.object({
    token: Joi.string()
        .required()
        .messages({
            'string.empty': 'Verification token is required',
        }),
});

// Refresh token validation schema
const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string()
        .required()
        .messages({
            'string.empty': 'Refresh token is required',
        }),
});

module.exports = {
    registerSchema,
    loginSchema,
    verifyOTPSchema,
    resendOTPSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    changePasswordSchema,
    verifyEmailTokenSchema,
    refreshTokenSchema,
};