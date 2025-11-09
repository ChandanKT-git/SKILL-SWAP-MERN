const express = require('express');
const ProfileController = require('../controllers/profileController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { uploadSingle, cleanupOnError } = require('../middleware/upload');
const { handleJoiError } = require('../middleware/errorHandler');
const {
    updateProfileSchema,
    addSkillSchema,
    updateSkillSchema,
    objectIdSchema,
} = require('../validation/profileValidation');
const { uploadLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * Validation middleware factory
 * @param {Object} schema - Joi validation schema
 * @param {string} source - Source of data to validate ('body', 'params', 'query')
 * @returns {Function} Express middleware function
 */
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        let dataToValidate;

        if (source === 'params') {
            // For params validation, we need to validate individual param values
            dataToValidate = req.params;
        } else {
            dataToValidate = req[source];
        }

        const { error, value } = schema.validate(dataToValidate, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            return handleJoiError(error, req, res, next);
        }

        req[source] = value;
        next();
    };
};

/**
 * Validate MongoDB ObjectId parameter
 * @param {string} paramName - Name of the parameter to validate
 * @returns {Function} Express middleware function
 */
const validateObjectId = (paramName = 'userId') => {
    return (req, res, next) => {
        const id = req.params[paramName];

        if (!id) {
            return res.status(400).json({
                success: false,
                error: {
                    message: `${paramName} is required`,
                    code: 'MISSING_PARAMETER',
                },
            });
        }

        // Check if it's a valid MongoDB ObjectId
        if (!/^[0-9a-fA-F]{24}$/.test(id)) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Invalid ID format',
                    code: 'INVALID_ID_FORMAT',
                },
            });
        }

        next();
    };
};

/**
 * @route GET /api/profile
 * @desc Get current user's profile
 * @access Private
 */
router.get('/', authenticateToken, ProfileController.getProfile);

/**
 * @route PUT /api/profile
 * @desc Update current user's profile
 * @access Private
 */
router.put('/', authenticateToken, validate(updateProfileSchema), ProfileController.updateProfile);

/**
 * @route GET /api/profile/skills
 * @desc Get current user's skills
 * @access Private
 */
router.get('/skills', authenticateToken, ProfileController.getSkills);

/**
 * @route POST /api/profile/skills
 * @desc Add skill to current user's profile
 * @access Private
 */
router.post('/skills', authenticateToken, validate(addSkillSchema), ProfileController.addSkill);

/**
 * @route PUT /api/profile/skills/:skillId
 * @desc Update skill in current user's profile
 * @access Private
 */
router.put(
    '/skills/:skillId',
    authenticateToken,
    validateObjectId('skillId'),
    validate(updateSkillSchema),
    ProfileController.updateSkill
);

/**
 * @route DELETE /api/profile/skills/:skillId
 * @desc Remove skill from current user's profile
 * @access Private
 */
router.delete(
    '/skills/:skillId',
    authenticateToken,
    validateObjectId('skillId'),
    ProfileController.removeSkill
);

/**
 * @route POST /api/profile/image
 * @desc Upload profile image
 * @access Private
 */
router.post(
    '/image',
    authenticateToken,
    uploadLimiter,
    cleanupOnError,
    uploadSingle('profileImage'),
    ProfileController.uploadProfileImage
);

/**
 * @route DELETE /api/profile/image
 * @desc Remove profile image
 * @access Private
 */
router.delete('/image', authenticateToken, ProfileController.removeProfileImage);

/**
 * @route GET /api/profile/:userId
 * @desc Get user profile by ID (public view)
 * @access Public
 */
router.get('/:userId', validateObjectId('userId'), ProfileController.getProfileById);

module.exports = router;