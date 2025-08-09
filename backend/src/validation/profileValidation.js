const Joi = require('joi');

/**
 * Validation schemas for profile management
 */

// Profile update validation
const updateProfileSchema = Joi.object({
    firstName: Joi.string()
        .min(2)
        .max(50)
        .trim()
        .pattern(/^[a-zA-Z\s]+$/)
        .messages({
            'string.pattern.base': 'First name can only contain letters and spaces',
            'string.min': 'First name must be at least 2 characters long',
            'string.max': 'First name cannot exceed 50 characters',
        }),

    lastName: Joi.string()
        .min(2)
        .max(50)
        .trim()
        .pattern(/^[a-zA-Z\s]+$/)
        .messages({
            'string.pattern.base': 'Last name can only contain letters and spaces',
            'string.min': 'Last name must be at least 2 characters long',
            'string.max': 'Last name cannot exceed 50 characters',
        }),

    bio: Joi.string()
        .max(500)
        .trim()
        .allow('')
        .messages({
            'string.max': 'Bio cannot exceed 500 characters',
        }),

    location: Joi.object({
        city: Joi.string().max(100).trim().allow(''),
        state: Joi.string().max(100).trim().allow(''),
        country: Joi.string().max(100).trim().allow(''),
        coordinates: Joi.array()
            .items(Joi.number().min(-180).max(180))
            .length(2)
            .messages({
                'array.length': 'Coordinates must contain exactly 2 numbers [longitude, latitude]',
                'number.min': 'Coordinates must be between -180 and 180',
                'number.max': 'Coordinates must be between -180 and 180',
            }),
    }),

    availability: Joi.object({
        timezone: Joi.string()
            .max(50)
            .default('UTC'),

        preferredDays: Joi.array()
            .items(
                Joi.string().valid(
                    'monday', 'tuesday', 'wednesday', 'thursday',
                    'friday', 'saturday', 'sunday'
                )
            )
            .unique()
            .messages({
                'array.unique': 'Preferred days must be unique',
                'any.only': 'Invalid day. Must be one of: monday, tuesday, wednesday, thursday, friday, saturday, sunday',
            }),

        preferredTimes: Joi.array()
            .items(
                Joi.object({
                    start: Joi.string()
                        .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
                        .required()
                        .messages({
                            'string.pattern.base': 'Start time must be in HH:MM format (24-hour)',
                        }),
                    end: Joi.string()
                        .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
                        .required()
                        .messages({
                            'string.pattern.base': 'End time must be in HH:MM format (24-hour)',
                        }),
                })
            ),

        isAvailable: Joi.boolean(),
    }),
});

// Skill validation
const addSkillSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .trim()
        .required()
        .messages({
            'string.min': 'Skill name must be at least 2 characters long',
            'string.max': 'Skill name cannot exceed 100 characters',
            'any.required': 'Skill name is required',
        }),

    level: Joi.string()
        .valid('beginner', 'intermediate', 'advanced', 'expert')
        .required()
        .messages({
            'any.only': 'Skill level must be one of: beginner, intermediate, advanced, expert',
            'any.required': 'Skill level is required',
        }),

    category: Joi.string()
        .min(2)
        .max(50)
        .trim()
        .required()
        .messages({
            'string.min': 'Category must be at least 2 characters long',
            'string.max': 'Category cannot exceed 50 characters',
            'any.required': 'Category is required',
        }),

    description: Joi.string()
        .max(200)
        .trim()
        .allow('')
        .messages({
            'string.max': 'Description cannot exceed 200 characters',
        }),

    yearsOfExperience: Joi.number()
        .integer()
        .min(0)
        .max(50)
        .messages({
            'number.integer': 'Years of experience must be a whole number',
            'number.min': 'Years of experience cannot be negative',
            'number.max': 'Years of experience cannot exceed 50',
        }),
});

// Update skill validation (all fields optional)
const updateSkillSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .trim()
        .messages({
            'string.min': 'Skill name must be at least 2 characters long',
            'string.max': 'Skill name cannot exceed 100 characters',
        }),

    level: Joi.string()
        .valid('beginner', 'intermediate', 'advanced', 'expert')
        .messages({
            'any.only': 'Skill level must be one of: beginner, intermediate, advanced, expert',
        }),

    category: Joi.string()
        .min(2)
        .max(50)
        .trim()
        .messages({
            'string.min': 'Category must be at least 2 characters long',
            'string.max': 'Category cannot exceed 50 characters',
        }),

    description: Joi.string()
        .max(200)
        .trim()
        .allow('')
        .messages({
            'string.max': 'Description cannot exceed 200 characters',
        }),

    yearsOfExperience: Joi.number()
        .integer()
        .min(0)
        .max(50)
        .messages({
            'number.integer': 'Years of experience must be a whole number',
            'number.min': 'Years of experience cannot be negative',
            'number.max': 'Years of experience cannot exceed 50',
        }),
}).min(1).messages({
    'object.min': 'At least one field must be provided for update',
});

// MongoDB ObjectId validation
const objectIdSchema = Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
        'string.pattern.base': 'Invalid ID format',
        'any.required': 'ID is required',
    });

module.exports = {
    updateProfileSchema,
    addSkillSchema,
    updateSkillSchema,
    objectIdSchema,
};