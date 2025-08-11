const Joi = require('joi');

/**
 * Validation schemas for session endpoints
 */

// Create session validation schema
const createSessionSchema = Joi.object({
    providerId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Provider ID must be a valid ObjectId',
            'string.empty': 'Provider ID is required'
        }),

    skill: Joi.object({
        name: Joi.string()
            .trim()
            .min(2)
            .max(100)
            .required()
            .messages({
                'string.empty': 'Skill name is required',
                'string.min': 'Skill name must be at least 2 characters',
                'string.max': 'Skill name cannot exceed 100 characters'
            }),

        category: Joi.string()
            .trim()
            .min(2)
            .max(50)
            .required()
            .messages({
                'string.empty': 'Skill category is required',
                'string.min': 'Skill category must be at least 2 characters',
                'string.max': 'Skill category cannot exceed 50 characters'
            }),

        level: Joi.string()
            .valid('beginner', 'intermediate', 'advanced', 'expert')
            .required()
            .messages({
                'any.only': 'Skill level must be one of: beginner, intermediate, advanced, expert',
                'string.empty': 'Skill level is required'
            })
    }).required(),

    scheduledDate: Joi.date()
        .iso()
        .min('now')
        .required()
        .messages({
            'date.base': 'Scheduled date must be a valid date',
            'date.iso': 'Scheduled date must be in ISO format',
            'date.min': 'Scheduled date must be in the future',
            'date.empty': 'Scheduled date is required'
        }),

    duration: Joi.number()
        .integer()
        .min(15)
        .max(480)
        .required()
        .messages({
            'number.base': 'Duration must be a number',
            'number.integer': 'Duration must be an integer',
            'number.min': 'Duration must be at least 15 minutes',
            'number.max': 'Duration cannot exceed 480 minutes (8 hours)',
            'number.empty': 'Duration is required'
        }),

    sessionType: Joi.string()
        .valid('online', 'in-person', 'hybrid')
        .default('online')
        .messages({
            'any.only': 'Session type must be one of: online, in-person, hybrid'
        }),

    location: Joi.string()
        .trim()
        .max(200)
        .allow('')
        .optional()
        .messages({
            'string.max': 'Location cannot exceed 200 characters'
        }),

    meetingLink: Joi.string()
        .uri({ scheme: ['http', 'https'] })
        .allow('')
        .optional()
        .messages({
            'string.uri': 'Meeting link must be a valid URL'
        }),

    requestMessage: Joi.string()
        .trim()
        .max(500)
        .allow('')
        .optional()
        .messages({
            'string.max': 'Request message cannot exceed 500 characters'
        }),

    timezone: Joi.string()
        .default('UTC')
        .optional()
});

// Respond to session validation schema
const respondToSessionSchema = Joi.object({
    action: Joi.string()
        .valid('accept', 'reject')
        .required()
        .messages({
            'any.only': 'Action must be either "accept" or "reject"',
            'string.empty': 'Action is required'
        }),

    responseMessage: Joi.string()
        .trim()
        .max(500)
        .allow('')
        .optional()
        .messages({
            'string.max': 'Response message cannot exceed 500 characters'
        })
});

// Cancel session validation schema
const cancelSessionSchema = Joi.object({
    cancellationReason: Joi.string()
        .trim()
        .max(300)
        .allow('')
        .optional()
        .messages({
            'string.max': 'Cancellation reason cannot exceed 300 characters'
        })
});

// Complete session validation schema
const completeSessionSchema = Joi.object({
    notes: Joi.string()
        .trim()
        .max(1000)
        .allow('')
        .optional()
        .messages({
            'string.max': 'Session notes cannot exceed 1000 characters'
        })
});

// Update session validation schema
const updateSessionSchema = Joi.object({
    scheduledDate: Joi.date()
        .iso()
        .min('now')
        .optional()
        .messages({
            'date.base': 'Scheduled date must be a valid date',
            'date.iso': 'Scheduled date must be in ISO format',
            'date.min': 'Scheduled date must be in the future'
        }),

    duration: Joi.number()
        .integer()
        .min(15)
        .max(480)
        .optional()
        .messages({
            'number.base': 'Duration must be a number',
            'number.integer': 'Duration must be an integer',
            'number.min': 'Duration must be at least 15 minutes',
            'number.max': 'Duration cannot exceed 480 minutes (8 hours)'
        }),

    sessionType: Joi.string()
        .valid('online', 'in-person', 'hybrid')
        .optional()
        .messages({
            'any.only': 'Session type must be one of: online, in-person, hybrid'
        }),

    location: Joi.string()
        .trim()
        .max(200)
        .allow('')
        .optional()
        .messages({
            'string.max': 'Location cannot exceed 200 characters'
        }),

    meetingLink: Joi.string()
        .uri({ scheme: ['http', 'https'] })
        .allow('')
        .optional()
        .messages({
            'string.uri': 'Meeting link must be a valid URL'
        }),

    requestMessage: Joi.string()
        .trim()
        .max(500)
        .allow('')
        .optional()
        .messages({
            'string.max': 'Request message cannot exceed 500 characters'
        })
});

// Check conflicts validation schema
const checkConflictsSchema = Joi.object({
    scheduledDate: Joi.date()
        .iso()
        .required()
        .messages({
            'date.base': 'Scheduled date must be a valid date',
            'date.iso': 'Scheduled date must be in ISO format',
            'date.empty': 'Scheduled date is required'
        }),

    duration: Joi.number()
        .integer()
        .min(15)
        .max(480)
        .required()
        .messages({
            'number.base': 'Duration must be a number',
            'number.integer': 'Duration must be an integer',
            'number.min': 'Duration must be at least 15 minutes',
            'number.max': 'Duration cannot exceed 480 minutes (8 hours)',
            'number.empty': 'Duration is required'
        }),

    excludeSessionId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .optional()
        .messages({
            'string.pattern.base': 'Exclude session ID must be a valid ObjectId'
        })
});

// Query parameters validation for getting sessions
const getSessionsQuerySchema = Joi.object({
    status: Joi.string()
        .pattern(/^(pending|accepted|rejected|cancelled|completed|no-show)(,(pending|accepted|rejected|cancelled|completed|no-show))*$/)
        .optional()
        .messages({
            'string.pattern.base': 'Status must be a comma-separated list of valid statuses'
        }),

    role: Joi.string()
        .valid('requester', 'provider', 'all')
        .default('all')
        .optional()
        .messages({
            'any.only': 'Role must be one of: requester, provider, all'
        }),

    page: Joi.number()
        .integer()
        .min(1)
        .default(1)
        .optional()
        .messages({
            'number.base': 'Page must be a number',
            'number.integer': 'Page must be an integer',
            'number.min': 'Page must be at least 1'
        }),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20)
        .optional()
        .messages({
            'number.base': 'Limit must be a number',
            'number.integer': 'Limit must be an integer',
            'number.min': 'Limit must be at least 1',
            'number.max': 'Limit cannot exceed 100'
        }),

    sortBy: Joi.string()
        .valid('createdAt', 'scheduledDate', 'status', 'duration')
        .default('createdAt')
        .optional()
        .messages({
            'any.only': 'Sort by must be one of: createdAt, scheduledDate, status, duration'
        }),

    sortOrder: Joi.string()
        .valid('asc', 'desc')
        .default('desc')
        .optional()
        .messages({
            'any.only': 'Sort order must be either "asc" or "desc"'
        })
});

// Upcoming sessions query validation
const upcomingSessionsQuerySchema = Joi.object({
    limit: Joi.number()
        .integer()
        .min(1)
        .max(50)
        .default(10)
        .optional()
        .messages({
            'number.base': 'Limit must be a number',
            'number.integer': 'Limit must be an integer',
            'number.min': 'Limit must be at least 1',
            'number.max': 'Limit cannot exceed 50'
        })
});

// ObjectId parameter validation
const objectIdSchema = Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
        'string.pattern.base': 'Invalid ObjectId format',
        'string.empty': 'ID is required'
    });

module.exports = {
    createSessionSchema,
    respondToSessionSchema,
    cancelSessionSchema,
    completeSessionSchema,
    updateSessionSchema,
    checkConflictsSchema,
    getSessionsQuerySchema,
    upcomingSessionsQuerySchema,
    objectIdSchema
};