const helmet = require('helmet');
const config = require('../config');

/**
 * Security middleware configurations
 * Implements various security headers and protections
 */

/**
 * Enhanced helmet configuration with security headers
 */
const helmetConfig = helmet({
    // Content Security Policy
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            connectSrc: ["'self'", config.frontendUrl],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: config.isProduction ? [] : null,
        },
    },
    // Cross-Origin Embedder Policy
    crossOriginEmbedderPolicy: false,
    // Cross-Origin Opener Policy
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    // Cross-Origin Resource Policy
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // DNS Prefetch Control
    dnsPrefetchControl: { allow: false },
    // Expect-CT
    expectCt: {
        enforce: true,
        maxAge: 30,
    },
    // Frameguard
    frameguard: { action: 'deny' },
    // Hide Powered-By
    hidePoweredBy: true,
    // HTTP Strict Transport Security
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
    },
    // IE No Open
    ieNoOpen: true,
    // No Sniff
    noSniff: true,
    // Origin Agent Cluster
    originAgentCluster: true,
    // Permitted Cross-Domain Policies
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    // Referrer Policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // X-XSS-Protection
    xssFilter: true,
});

/**
 * CORS configuration
 */
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            config.frontendUrl,
            'http://127.0.0.1:5500',
            'http://localhost:5500',
            'http://127.0.0.1:5501',
            'http://localhost:5501',
            'http://localhost:3000',
            'http://localhost:5173', // Vite default port
        ];

        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Request-ID', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 200,
};

/**
 * Request size limits middleware
 */
const requestSizeLimits = {
    json: { limit: '10mb' },
    urlencoded: { extended: true, limit: '10mb' },
    // Specific limits for different content types
    profileImage: { limit: '5mb' },
    chatAttachment: { limit: '10mb' },
};

/**
 * Sanitize user input to prevent XSS attacks
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
const sanitizeInput = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    const sanitized = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];

            if (typeof value === 'string') {
                // Remove potential XSS patterns
                sanitized[key] = value
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+\s*=/gi, '')
                    .trim();
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = sanitizeInput(value);
            } else {
                sanitized[key] = value;
            }
        }
    }

    return sanitized;
};

/**
 * Input sanitization middleware
 */
const sanitizeMiddleware = (req, res, next) => {
    if (req.body) {
        req.body = sanitizeInput(req.body);
    }
    if (req.query) {
        req.query = sanitizeInput(req.query);
    }
    if (req.params) {
        req.params = sanitizeInput(req.params);
    }
    next();
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
    // Additional custom security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Remove server information
    res.removeHeader('X-Powered-By');

    next();
};

/**
 * Prevent parameter pollution
 */
const preventParameterPollution = (req, res, next) => {
    // Ensure query parameters are not arrays (unless expected)
    const allowedArrayParams = ['skills', 'categories', 'tags', 'ids'];

    for (const key in req.query) {
        if (Array.isArray(req.query[key]) && !allowedArrayParams.includes(key)) {
            req.query[key] = req.query[key][0]; // Take first value
        }
    }

    next();
};

/**
 * Log security events
 */
const logSecurityEvent = (event, details, req) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        event,
        details,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        path: req.path,
        method: req.method,
        userId: req.user?.id || 'anonymous',
    };

    console.warn('🔒 Security Event:', JSON.stringify(logEntry));
};

/**
 * Detect and log suspicious activity
 */
const suspiciousActivityDetector = (req, res, next) => {
    const suspiciousPatterns = [
        /(\.\.|\/etc\/|\/proc\/|\/sys\/)/i, // Path traversal
        /(union.*select|insert.*into|drop.*table)/i, // SQL injection
        /(<script|javascript:|onerror=|onload=)/i, // XSS
        /(eval\(|exec\(|system\()/i, // Code injection
    ];

    const checkString = `${req.path} ${JSON.stringify(req.query)} ${JSON.stringify(req.body)}`;

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(checkString)) {
            logSecurityEvent('SUSPICIOUS_ACTIVITY', {
                pattern: pattern.toString(),
                path: req.path,
                query: req.query,
            }, req);

            return res.status(400).json({
                success: false,
                error: {
                    message: 'Invalid request detected',
                    code: 'INVALID_REQUEST',
                },
            });
        }
    }

    next();
};

/**
 * Validate Content-Type for POST/PUT/PATCH requests
 */
const validateContentType = (req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.get('content-type');

        if (!contentType) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Content-Type header is required',
                    code: 'MISSING_CONTENT_TYPE',
                },
            });
        }

        const validContentTypes = [
            'application/json',
            'application/x-www-form-urlencoded',
            'multipart/form-data',
        ];

        const isValid = validContentTypes.some(type => contentType.includes(type));

        if (!isValid) {
            return res.status(415).json({
                success: false,
                error: {
                    message: 'Unsupported Content-Type',
                    code: 'UNSUPPORTED_CONTENT_TYPE',
                },
            });
        }
    }

    next();
};

module.exports = {
    helmetConfig,
    corsOptions,
    requestSizeLimits,
    sanitizeMiddleware,
    securityHeaders,
    preventParameterPollution,
    suspiciousActivityDetector,
    validateContentType,
    logSecurityEvent,
};
