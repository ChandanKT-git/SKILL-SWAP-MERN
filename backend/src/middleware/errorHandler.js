const { RequestLogger } = require('./logging');

/**
 * Custom error classes
 */
class AppError extends Error {
    constructor(message, statusCode, code = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, errors = []) {
        super(message, 400, 'VALIDATION_ERROR');
        this.errors = errors;
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404, 'NOT_FOUND_ERROR');
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409, 'CONFLICT_ERROR');
    }
}

class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429, 'RATE_LIMIT_ERROR');
    }
}

/**
 * Error response formatter
 */
function formatErrorResponse(error, req) {
    const isDevelopment = process.env.NODE_ENV === 'development';

    const response = {
        success: false,
        error: {
            message: error.message,
            code: error.code || 'INTERNAL_ERROR',
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
            method: req.method,
        },
    };

    // Add validation errors if present
    if (error.errors && Array.isArray(error.errors)) {
        response.error.details = error.errors;
    }

    // Add stack trace in development
    if (isDevelopment && error.stack) {
        response.error.stack = error.stack;
    }

    // Add request ID if available
    if (req.requestId) {
        response.error.requestId = req.requestId;
    }

    return response;
}

/**
 * Handle different types of errors
 */
function handleCastError(error) {
    const message = `Invalid ${error.path}: ${error.value}`;
    return new ValidationError(message);
}

function handleDuplicateFieldsError(error) {
    const field = Object.keys(error.keyValue)[0];
    const value = error.keyValue[field];
    const message = `${field} '${value}' already exists`;
    return new ConflictError(message);
}

function handleValidationError(error) {
    const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value,
    }));

    return new ValidationError('Validation failed', errors);
}

function handleJWTError() {
    return new AuthenticationError('Invalid token');
}

function handleJWTExpiredError() {
    return new AuthenticationError('Token expired');
}

/**
 * Global error handling middleware
 */
function globalErrorHandler(error, req, res, next) {
    let err = { ...error };
    err.message = error.message;

    // Log error details
    console.error('Error:', {
        message: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });

    // Handle specific error types
    if (error.name === 'CastError') {
        err = handleCastError(error);
    } else if (error.code === 11000) {
        err = handleDuplicateFieldsError(error);
    } else if (error.name === 'ValidationError') {
        err = handleValidationError(error);
    } else if (error.name === 'JsonWebTokenError') {
        err = handleJWTError();
    } else if (error.name === 'TokenExpiredError') {
        err = handleJWTExpiredError();
    } else if (!error.isOperational) {
        // Handle programming errors
        err = new AppError('Something went wrong', 500, 'INTERNAL_ERROR');
    }

    // Log security-related errors
    if (err.statusCode === 401 || err.statusCode === 403) {
        RequestLogger.logSecurityEvent(req, 'ACCESS_DENIED', {
            error: err.message,
            code: err.code,
        });
    }

    // Send error response
    const statusCode = err.statusCode || 500;
    const response = formatErrorResponse(err, req);

    res.status(statusCode).json(response);
}

/**
 * Handle 404 errors for undefined routes
 */
function notFoundHandler(req, res, next) {
    const error = new NotFoundError(`Route ${req.originalUrl} not found`);
    next(error);
}

/**
 * Async error wrapper to catch async errors
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Validation error handler for Joi
 */
function handleJoiError(error, req, res, next) {
    if (error.isJoi) {
        const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value,
        }));

        const validationError = new ValidationError('Validation failed', errors);
        return next(validationError);
    }

    next(error);
}

module.exports = {
    // Error classes
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,

    // Middleware
    globalErrorHandler,
    notFoundHandler,
    asyncHandler,
    handleJoiError,

    // Utilities
    formatErrorResponse,
};