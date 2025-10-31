const Joi = require('joi');

const chatValidation = {
    // Create direct chat validation
    createDirectChat: Joi.object({
        otherUserId: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
                'string.pattern.base': 'Invalid user ID format',
                'any.required': 'Other user ID is required',
            }),
        sessionId: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .optional()
            .messages({
                'string.pattern.base': 'Invalid session ID format',
            }),
    }),

    // Send message validation
    sendMessage: Joi.object({
        content: Joi.string()
            .trim()
            .min(1)
            .max(1000)
            .required()
            .messages({
                'string.empty': 'Message content cannot be empty',
                'string.min': 'Message content must be at least 1 character',
                'string.max': 'Message content cannot exceed 1000 characters',
                'any.required': 'Message content is required',
            }),
        messageType: Joi.string()
            .valid('text', 'image', 'file', 'system')
            .default('text')
            .messages({
                'any.only': 'Message type must be one of: text, image, file, system',
            }),
    }),

    // Chat ID parameter validation
    chatId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Invalid chat ID format',
            'any.required': 'Chat ID is required',
        }),

    // Message ID parameter validation
    messageId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Invalid message ID format',
            'any.required': 'Message ID is required',
        }),

    // Session ID parameter validation
    sessionId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Invalid session ID format',
            'any.required': 'Session ID is required',
        }),

    // Pagination query validation
    pagination: Joi.object({
        page: Joi.number()
            .integer()
            .min(1)
            .default(1)
            .messages({
                'number.base': 'Page must be a number',
                'number.integer': 'Page must be an integer',
                'number.min': 'Page must be at least 1',
            }),
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(20)
            .messages({
                'number.base': 'Limit must be a number',
                'number.integer': 'Limit must be an integer',
                'number.min': 'Limit must be at least 1',
                'number.max': 'Limit cannot exceed 100',
            }),
        includeArchived: Joi.boolean()
            .default(false)
            .messages({
                'boolean.base': 'includeArchived must be a boolean',
            }),
    }),

    // Socket.io event validation
    socketEvents: {
        joinChat: Joi.object({
            chatId: Joi.string()
                .pattern(/^[0-9a-fA-F]{24}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Invalid chat ID format',
                    'any.required': 'Chat ID is required',
                }),
        }),

        leaveChat: Joi.object({
            chatId: Joi.string()
                .pattern(/^[0-9a-fA-F]{24}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Invalid chat ID format',
                    'any.required': 'Chat ID is required',
                }),
        }),

        sendMessage: Joi.object({
            chatId: Joi.string()
                .pattern(/^[0-9a-fA-F]{24}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Invalid chat ID format',
                    'any.required': 'Chat ID is required',
                }),
            content: Joi.string()
                .trim()
                .min(1)
                .max(1000)
                .required()
                .messages({
                    'string.empty': 'Message content cannot be empty',
                    'string.min': 'Message content must be at least 1 character',
                    'string.max': 'Message content cannot exceed 1000 characters',
                    'any.required': 'Message content is required',
                }),
            messageType: Joi.string()
                .valid('text', 'image', 'file', 'system')
                .default('text')
                .messages({
                    'any.only': 'Message type must be one of: text, image, file, system',
                }),
        }),

        typing: Joi.object({
            chatId: Joi.string()
                .pattern(/^[0-9a-fA-F]{24}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Invalid chat ID format',
                    'any.required': 'Chat ID is required',
                }),
        }),

        markAsRead: Joi.object({
            chatId: Joi.string()
                .pattern(/^[0-9a-fA-F]{24}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Invalid chat ID format',
                    'any.required': 'Chat ID is required',
                }),
            messageId: Joi.string()
                .pattern(/^[0-9a-fA-F]{24}$/)
                .optional()
                .messages({
                    'string.pattern.base': 'Invalid message ID format',
                }),
        }),
    },
};

module.exports = chatValidation;