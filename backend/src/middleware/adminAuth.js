const { AuthenticationError, AuthorizationError } = require('./errorHandler');

/**
 * Admin Authentication Middleware
 * Ensures user has admin role for protected admin routes
 */
const requireAdmin = (req, res, next) => {
    try {
        // Check if user is authenticated (should be handled by authenticateToken middleware first)
        if (!req.user) {
            throw new AuthenticationError('Authentication required');
        }

        // Check if user has admin role
        if (req.user.role !== 'admin') {
            // Log unauthorized admin access attempt
            console.warn(`Unauthorized admin access attempt by user ${req.user.id} (${req.user.email}) from IP ${req.ip}`);

            throw new AuthorizationError('Admin access required');
        }

        // User is authenticated and has admin role
        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Check if user has admin role (for conditional features)
 * Returns boolean instead of throwing error
 */
const isAdmin = (user) => {
    if (!user) return false;
    return user.role === 'admin';
};

/**
 * Middleware to check admin or owner access
 * Allows access if user is admin OR owns the resource
 */
const requireAdminOrOwner = (resourceUserIdField = 'userId') => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new AuthenticationError('Authentication required');
            }

            const isUserAdmin = req.user.role === 'admin';
            const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
            const isOwner = resourceUserId && resourceUserId.toString() === req.user.id.toString();

            if (!isUserAdmin && !isOwner) {
                throw new AuthorizationError('Admin access or resource ownership required');
            }

            // Add flags to request for use in controllers
            req.isAdmin = isUserAdmin;
            req.isOwner = isOwner;

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Middleware to log admin actions for audit trail
 */
const logAdminAction = (action) => {
    return (req, res, next) => {
        // Store original res.json to intercept response
        const originalJson = res.json;

        res.json = function (data) {
            // Log admin action after successful response
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log(`Admin Action: ${action}`, {
                    adminId: req.user.id,
                    adminEmail: req.user.email,
                    action,
                    targetResource: req.params,
                    requestBody: req.body,
                    timestamp: new Date().toISOString(),
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                });
            }

            // Call original json method
            return originalJson.call(this, data);
        };

        next();
    };
};

/**
 * Rate limiting for admin actions
 * More restrictive than regular API rate limiting
 */
const adminRateLimit = require('express-rate-limit')({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each admin to 100 requests per windowMs
    message: {
        success: false,
        error: {
            message: 'Too many admin requests, please try again later.',
            code: 'ADMIN_RATE_LIMIT_EXCEEDED',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for non-admin users
    skip: (req) => req.user?.role !== 'admin'
});

module.exports = {
    requireAdmin,
    isAdmin,
    requireAdminOrOwner,
    logAdminAction,
    adminRateLimit
};