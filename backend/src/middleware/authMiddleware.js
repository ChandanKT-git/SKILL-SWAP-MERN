const JWTUtils = require('../utils/jwt');
const User = require('../models/User');
const {
    AuthenticationError,
    AuthorizationError,
    asyncHandler
} = require('./errorHandler');
const { RequestLogger } = require('./logging');

/**
 * Authentication middleware to verify JWT tokens
 */
const authMiddleware = asyncHandler(async (req, res, next) => {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = JWTUtils.extractTokenFromHeader(authHeader);

    if (!token) {
        throw new AuthenticationError('Access token is required');
    }

    try {
        // Verify token
        const decoded = JWTUtils.verifyAccessToken(token);

        // Find user
        const user = await User.findById(decoded.id);
        if (!user) {
            throw new AuthenticationError('User not found');
        }

        // Check if user account is active
        if (user.status !== 'active') {
            RequestLogger.logSecurityEvent(req, 'INACTIVE_ACCOUNT_ACCESS', {
                userId: user._id,
                status: user.status,
            });
            throw new AuthenticationError('Account is not active');
        }

        // Check if user is locked
        if (user.isLocked) {
            RequestLogger.logSecurityEvent(req, 'LOCKED_ACCOUNT_ACCESS', {
                userId: user._id,
                lockUntil: user.lockUntil,
            });
            throw new AuthenticationError('Account is temporarily locked');
        }

        // Check if password was changed after token was issued
        if (user.changedPasswordAfter(decoded.iat)) {
            RequestLogger.logSecurityEvent(req, 'TOKEN_AFTER_PASSWORD_CHANGE', {
                userId: user._id,
                tokenIat: decoded.iat,
                passwordChangedAt: user.passwordChangedAt,
            });
            throw new AuthenticationError('Password was changed. Please log in again.');
        }

        // Add user to request object
        req.user = {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            role: user.role,
            status: user.status,
            isEmailVerified: user.isEmailVerified,
        };

        next();
    } catch (error) {
        // Log authentication failure
        RequestLogger.logSecurityEvent(req, 'AUTH_MIDDLEWARE_FAILURE', {
            error: error.message,
            token: token ? 'present' : 'missing',
        });

        throw error;
    }
});

/**
 * Authorization middleware to check user roles
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Express middleware function
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            throw new AuthenticationError('Authentication required');
        }

        if (!allowedRoles.includes(req.user.role)) {
            RequestLogger.logSecurityEvent(req, 'UNAUTHORIZED_ACCESS_ATTEMPT', {
                userId: req.user.id,
                userRole: req.user.role,
                requiredRoles: allowedRoles,
                route: req.originalUrl,
            });

            throw new AuthorizationError('Insufficient permissions');
        }

        next();
    };
};

/**
 * Middleware to check if user's email is verified
 */
const requireEmailVerification = (req, res, next) => {
    if (!req.user) {
        throw new AuthenticationError('Authentication required');
    }

    if (!req.user.isEmailVerified) {
        RequestLogger.logSecurityEvent(req, 'UNVERIFIED_EMAIL_ACCESS', {
            userId: req.user.id,
            email: req.user.email,
        });

        throw new AuthorizationError('Email verification required');
    }

    next();
};

/**
 * Optional authentication middleware - doesn't throw error if no token
 * Useful for routes that work for both authenticated and unauthenticated users
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = JWTUtils.extractTokenFromHeader(authHeader);

    if (!token) {
        // No token provided, continue without authentication
        return next();
    }

    try {
        // Verify token
        const decoded = JWTUtils.verifyAccessToken(token);

        // Find user
        const user = await User.findById(decoded.id);
        if (!user || user.status !== 'active' || user.isLocked) {
            // Invalid user, continue without authentication
            return next();
        }

        // Check if password was changed after token was issued
        if (user.changedPasswordAfter(decoded.iat)) {
            // Token is invalid, continue without authentication
            return next();
        }

        // Add user to request object
        req.user = {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            role: user.role,
            status: user.status,
            isEmailVerified: user.isEmailVerified,
        };

        next();
    } catch (error) {
        // Token verification failed, continue without authentication
        next();
    }
});

/**
 * Middleware to check if user owns the resource
 * Expects the resource user ID to be in req.params.userId or req.body.userId
 */
const requireOwnership = (userIdField = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            throw new AuthenticationError('Authentication required');
        }

        const resourceUserId = req.params[userIdField] || req.body[userIdField];

        if (!resourceUserId) {
            throw new ValidationError(`${userIdField} is required`);
        }

        // Admin users can access any resource
        if (req.user.role === 'admin') {
            return next();
        }

        // Check if user owns the resource
        if (req.user.id !== resourceUserId) {
            RequestLogger.logSecurityEvent(req, 'UNAUTHORIZED_RESOURCE_ACCESS', {
                userId: req.user.id,
                resourceUserId,
                route: req.originalUrl,
            });

            throw new AuthorizationError('You can only access your own resources');
        }

        next();
    };
};

/**
 * Rate limiting middleware for authentication endpoints
 */
const authRateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
    const attempts = new Map();

    return (req, res, next) => {
        const key = req.ip + ':' + req.originalUrl;
        const now = Date.now();

        // Clean up old entries
        for (const [k, v] of attempts.entries()) {
            if (now - v.firstAttempt > windowMs) {
                attempts.delete(k);
            }
        }

        const userAttempts = attempts.get(key);

        if (!userAttempts) {
            attempts.set(key, { count: 1, firstAttempt: now });
            return next();
        }

        if (now - userAttempts.firstAttempt > windowMs) {
            // Reset window
            attempts.set(key, { count: 1, firstAttempt: now });
            return next();
        }

        if (userAttempts.count >= maxAttempts) {
            RequestLogger.logSecurityEvent(req, 'RATE_LIMIT_EXCEEDED', {
                ip: req.ip,
                route: req.originalUrl,
                attempts: userAttempts.count,
            });

            throw new AuthorizationError('Too many attempts. Please try again later.');
        }

        userAttempts.count++;
        next();
    };
};

module.exports = {
    authenticateToken: authMiddleware,
    authorize,
    requireEmailVerification,
    optionalAuth,
    requireOwnership,
    authRateLimit
};