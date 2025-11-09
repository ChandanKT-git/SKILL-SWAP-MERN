const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * Rate limiting middleware configurations for different endpoint types
 * Implements tiered rate limiting based on endpoint sensitivity and resource usage
 */

// General API rate limiter - applies to all /api routes
const generalLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs, // 15 minutes
    max: config.rateLimit.maxRequests, // 100 requests per window
    message: {
        success: false,
        error: {
            message: 'Too many requests from this IP, please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
        },
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per window
    message: {
        success: false,
        error: {
            message: 'Too many authentication attempts, please try again later.',
            code: 'AUTH_RATE_LIMIT_EXCEEDED',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
});

// Very strict rate limiter for login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per window
    message: {
        success: false,
        error: {
            message: 'Too many login attempts, please try again after 15 minutes.',
            code: 'LOGIN_RATE_LIMIT_EXCEEDED',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
    skipFailedRequests: false,
});

// Rate limiter for OTP/verification endpoints
const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 OTP requests per hour
    message: {
        success: false,
        error: {
            message: 'Too many OTP requests, please try again later.',
            code: 'OTP_RATE_LIMIT_EXCEEDED',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for file upload endpoints
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 uploads per hour
    message: {
        success: false,
        error: {
            message: 'Too many upload requests, please try again later.',
            code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for search endpoints
const searchLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 searches per minute
    message: {
        success: false,
        error: {
            message: 'Too many search requests, please slow down.',
            code: 'SEARCH_RATE_LIMIT_EXCEEDED',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
});

// Rate limiter for session booking endpoints
const bookingLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 booking requests per hour
    message: {
        success: false,
        error: {
            message: 'Too many booking requests, please try again later.',
            code: 'BOOKING_RATE_LIMIT_EXCEEDED',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for review submission
const reviewLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 reviews per hour
    message: {
        success: false,
        error: {
            message: 'Too many review submissions, please try again later.',
            code: 'REVIEW_RATE_LIMIT_EXCEEDED',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for admin endpoints
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per window (higher for admin operations)
    message: {
        success: false,
        error: {
            message: 'Too many admin requests, please try again later.',
            code: 'ADMIN_RATE_LIMIT_EXCEEDED',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for password reset
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 password reset requests per hour
    message: {
        success: false,
        error: {
            message: 'Too many password reset attempts, please try again later.',
            code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for chat/messaging endpoints
const chatLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 messages per minute
    message: {
        success: false,
        error: {
            message: 'Too many messages, please slow down.',
            code: 'CHAT_RATE_LIMIT_EXCEEDED',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    generalLimiter,
    authLimiter,
    loginLimiter,
    otpLimiter,
    uploadLimiter,
    searchLimiter,
    bookingLimiter,
    reviewLimiter,
    adminLimiter,
    passwordResetLimiter,
    chatLimiter,
};
