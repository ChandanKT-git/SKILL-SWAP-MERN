const express = require('express');
const SessionController = require('../controllers/sessionController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { handleJoiError } = require('../middleware/errorHandler');
const Joi = require('joi');

const router = express.Router();

/**
 * Validation schemas for session endpoints
 */
const createSessionSchema = Joi.object({
    providerId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
        .messages({
            'string.pattern.base': 'Invalid provider ID format'
        }),
    skill: Joi.object({
        name: Joi.string().trim().min(2).max(100).required(),
        category: Joi.string().trim().min(2).max(50).required(),
        level: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').required()
    }).required(),
    scheduledDate: Joi.date().greater('now').required()
        .messages({
            'date.greater': 'Session must be scheduled for a future date and time'
        }),
    duration: Joi.number().integer().min(15).max(480).required()
        .messages({
            'number.min': 'Session duration must be at least 15 minutes',
            'number.max': 'Session duration cannot exceed 8 hours'
        }),
    timezone: Joi.string().optional().default('UTC'),
    sessionType: Joi.string().valid('online', 'in-person', 'hybrid').default('online').optional(),
    requestMessage: Joi.string().max(500).optional(),
    meetingLink: Joi.string().uri().max(500).when('sessionType', {
        is: 'online',
        then: Joi.optional(),
        otherwise: Joi.forbidden()
    }),
    location: Joi.string().max(200).when('sessionType', {
        is: Joi.valid('in-person', 'hybrid'),
        then: Joi.optional(),
        otherwise: Joi.forbidden()
    })
});

const respondToSessionSchema = Joi.object({
    action: Joi.string().valid('accept', 'decline').required(),
    confirmedDateTime: Joi.date().greater('now').when('action', {
        is: 'accept',
        then: Joi.optional(),
        otherwise: Joi.forbidden()
    }),
    reason: Joi.string().max(500).when('action', {
        is: 'decline',
        then: Joi.optional(),
        otherwise: Joi.forbidden()
    }),
    responseMessage: Joi.string().max(500).optional(),
    meetingLink: Joi.string().uri().max(500).when('action', {
        is: 'accept',
        then: Joi.optional(),
        otherwise: Joi.forbidden()
    }),
    location: Joi.string().max(200).when('action', {
        is: 'accept',
        then: Joi.optional(),
        otherwise: Joi.forbidden()
    })
});

const alternativeTimeSchema = Joi.object({
    dateTime: Joi.date().greater('now').required()
        .messages({
            'date.greater': 'Alternative time must be in the future'
        }),
    message: Joi.string().max(500).optional()
});

const cancelSessionSchema = Joi.object({
    reason: Joi.string().max(300).optional()
});

const completeSessionSchema = Joi.object({
    notes: Joi.string().max(1000).optional()
});

const feedbackSchema = Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().max(500).optional()
});

const checkConflictsSchema = Joi.object({
    dateTime: Joi.date().greater('now').required(),
    duration: Joi.number().integer().min(15).max(480).required(),
    participantId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional()
});

const getUserSessionsSchema = Joi.object({
    status: Joi.alternatives().try(
        Joi.string().valid('pending', 'accepted', 'rejected', 'cancelled', 'completed', 'no-show'),
        Joi.array().items(Joi.string().valid('pending', 'accepted', 'rejected', 'cancelled', 'completed', 'no-show'))
    ).optional(),
    type: Joi.string().valid('requested', 'received', 'all').default('all').optional(),
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(20).optional(),
    upcoming: Joi.boolean().optional()
});

const getUpcomingSessionsSchema = Joi.object({
    days: Joi.number().integer().min(1).max(365).default(7).optional()
});

const objectIdSchema = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

/**
 * Validation middleware
 */
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body);
        if (error) {
            return handleJoiError(error, req, res, next);
        }
        req.body = value;
        next();
    };
};

const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query);
        if (error) {
            return handleJoiError(error, req, res, next);
        }
        req.query = value;
        next();
    };
};

const validateObjectId = (paramName) => {
    return (req, res, next) => {
        const { error } = objectIdSchema.validate(req.params[paramName]);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ID format',
                errors: [{
                    field: paramName,
                    message: error.details[0].message
                }]
            });
        }
        next();
    };
};

/**
 * Session Routes
 * All routes require authentication
 */

// @route   POST /api/sessions
// @desc    Create a new session booking request
// @access  Private
router.post('/',
    authenticateToken,
    validate(createSessionSchema),
    SessionController.createSession
);

// @route   GET /api/sessions
// @desc    Get user's sessions with filtering
// @access  Private
router.get('/',
    authenticateToken,
    validateQuery(getUserSessionsSchema),
    SessionController.getUserSessions
);

// @route   GET /api/sessions/upcoming
// @desc    Get upcoming sessions for a user
// @access  Private
router.get('/upcoming',
    authenticateToken,
    validateQuery(getUpcomingSessionsSchema),
    SessionController.getUpcomingSessions
);

// @route   GET /api/sessions/stats
// @desc    Get session statistics for a user
// @access  Private
router.get('/stats',
    authenticateToken,
    SessionController.getSessionStats
);

// @route   POST /api/sessions/check-conflicts
// @desc    Check for scheduling conflicts
// @access  Private
router.post('/check-conflicts',
    authenticateToken,
    validate(checkConflictsSchema),
    SessionController.checkConflicts
);

// @route   GET /api/sessions/:sessionId
// @desc    Get a specific session by ID
// @access  Private
router.get('/:sessionId',
    authenticateToken,
    validateObjectId('sessionId'),
    SessionController.getSession
);

// @route   PUT /api/sessions/:sessionId/respond
// @desc    Respond to a session request (accept/decline)
// @access  Private
router.put('/:sessionId/respond',
    authenticateToken,
    validateObjectId('sessionId'),
    validate(respondToSessionSchema),
    SessionController.respondToSession
);

// @route   POST /api/sessions/:sessionId/alternative-time
// @desc    Propose alternative time for a session
// @access  Private
router.post('/:sessionId/alternative-time',
    authenticateToken,
    validateObjectId('sessionId'),
    validate(alternativeTimeSchema),
    SessionController.proposeAlternativeTime
);

// @route   PUT /api/sessions/:sessionId/cancel
// @desc    Cancel a session
// @access  Private
router.put('/:sessionId/cancel',
    authenticateToken,
    validateObjectId('sessionId'),
    validate(cancelSessionSchema),
    SessionController.cancelSession
);

// @route   PUT /api/sessions/:sessionId/complete
// @desc    Mark session as completed
// @access  Private
router.put('/:sessionId/complete',
    authenticateToken,
    validateObjectId('sessionId'),
    validate(completeSessionSchema),
    SessionController.completeSession
);

// @route   POST /api/sessions/:sessionId/feedback
// @desc    Submit feedback for a completed session
// @access  Private
router.post('/:sessionId/feedback',
    authenticateToken,
    validateObjectId('sessionId'),
    validate(feedbackSchema),
    SessionController.submitFeedback
);

module.exports = router;