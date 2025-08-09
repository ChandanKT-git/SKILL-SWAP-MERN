const express = require('express');
const AuthController = require('../controllers/authController');
const { handleJoiError } = require('../middleware/errorHandler');
const {
    registerSchema,
    loginSchema,
    verifyOTPSchema,
    resendOTPSchema,
    refreshTokenSchema,
} = require('../validation/authValidation');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Validation middleware factory
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            return handleJoiError(error, req, res, next);
        }

        req.body = value;
        next();
    };
};

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', validate(registerSchema), AuthController.register);

/**
 * @route POST /api/auth/verify-otp
 * @desc Verify OTP and complete email verification
 * @access Public
 */
router.post('/verify-otp', validate(verifyOTPSchema), AuthController.verifyOTP);

/**
 * @route POST /api/auth/resend-otp
 * @desc Resend OTP verification code
 * @access Public
 */
router.post('/resend-otp', validate(resendOTPSchema), AuthController.resendOTP);

/**
 * @route POST /api/auth/login
 * @desc User login
 * @access Public
 */
router.post('/login', validate(loginSchema), AuthController.login);

/**
 * @route POST /api/auth/refresh-token
 * @desc Refresh access token using refresh token
 * @access Public
 */
router.post('/refresh-token', validate(refreshTokenSchema), AuthController.refreshToken);

/**
 * @route POST /api/auth/logout
 * @desc User logout (client-side token removal)
 * @access Private
 */
router.post('/logout', authMiddleware, AuthController.logout);

/**
 * @route GET /api/auth/me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me', authMiddleware, AuthController.getCurrentUser);

module.exports = router;