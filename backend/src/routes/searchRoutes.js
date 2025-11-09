const express = require('express');
const SearchController = require('../controllers/searchController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { searchLimiter } = require('../middleware/rateLimiter');
const Joi = require('joi');

const router = express.Router();

/**
 * Validation schemas for search endpoints
 */
const searchUsersSchema = Joi.object({
    skill: Joi.string().trim().max(100).optional(),
    category: Joi.string().trim().max(50).optional(),
    level: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').optional(),
    location: Joi.string().pattern(/^-?\d+\.?\d*,-?\d+\.?\d*$/).optional()
        .messages({
            'string.pattern.base': 'Location must be in format "longitude,latitude"'
        }),
    radius: Joi.number().integer().min(1000).max(2000000).default(50000).optional(),
    minRating: Joi.number().min(0).max(5).optional(),
    maxRating: Joi.number().min(0).max(5).optional(),
    availability: Joi.boolean().optional(),
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(20).optional(),
    sortBy: Joi.string().valid('rating.average', 'createdAt', 'firstName', 'lastName').default('rating.average').optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc').optional()
});

const skillsSchema = Joi.object({
    query: Joi.string().trim().min(1).max(100).optional(),
    category: Joi.string().trim().max(50).optional(),
    limit: Joi.number().integer().min(1).max(50).default(10).optional()
});

const suggestionsSchema = Joi.object({
    query: Joi.string().trim().min(2).max(100).required(),
    type: Joi.string().valid('all', 'skills', 'categories', 'users').default('all').optional()
});

const trendingSchema = Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10).optional(),
    period: Joi.number().integer().min(1).max(365).default(30).optional()
});

/**
 * Validation middleware
 */
const validateSearchUsers = (req, res, next) => {
    const { error, value } = searchUsersSchema.validate(req.query);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))
        });
    }
    req.query = value;
    next();
};

const validateSkills = (req, res, next) => {
    const { error, value } = skillsSchema.validate(req.query);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))
        });
    }
    req.query = value;
    next();
};

const validateSuggestions = (req, res, next) => {
    const { error, value } = suggestionsSchema.validate(req.query);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))
        });
    }
    req.query = value;
    next();
};

const validateTrending = (req, res, next) => {
    const { error, value } = trendingSchema.validate(req.query);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))
        });
    }
    req.query = value;
    next();
};

/**
 * Search Routes
 */

// @route   GET /api/search/users
// @desc    Search users by skills with filters and pagination
// @access  Public (but could be protected if needed)
router.get('/users',
    searchLimiter,
    validateSearchUsers,
    SearchController.searchUsers
);

// @route   GET /api/search/skills
// @desc    Get available skills for autocomplete
// @access  Public
router.get('/skills',
    searchLimiter,
    validateSkills,
    SearchController.getAvailableSkills
);

// @route   GET /api/search/categories
// @desc    Get available skill categories
// @access  Public
router.get('/categories',
    searchLimiter,
    SearchController.getSkillCategories
);

// @route   GET /api/search/suggestions
// @desc    Get search suggestions based on user input
// @access  Public
router.get('/suggestions',
    searchLimiter,
    validateSuggestions,
    SearchController.getSearchSuggestions
);

// @route   GET /api/search/trending
// @desc    Get trending skills on the platform
// @access  Public
router.get('/trending',
    validateTrending,
    SearchController.getTrendingSkills
);

// @route   GET /api/search/user/:userId
// @desc    Get specific user profile for search results
// @access  Public
router.get('/user/:userId',
    authenticateToken,
    async (req, res, next) => {
        try {
            const { userId } = req.params;

            // Validate ObjectId
            if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user ID format'
                });
            }

            const User = require('../models/User');
            const user = await User.findById(userId)
                .select('-password -otp -emailVerificationToken -passwordResetToken -loginAttempts -lockUntil')
                .lean();

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            if (user.status !== 'active' || !user.isEmailVerified) {
                return res.status(404).json({
                    success: false,
                    message: 'User not available'
                });
            }

            res.status(200).json({
                success: true,
                data: user,
                message: 'User profile retrieved successfully'
            });
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;