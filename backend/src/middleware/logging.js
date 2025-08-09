const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

/**
 * Configure Morgan logging middleware
 */

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Create write streams for different log files
const accessLogStream = fs.createWriteStream(
    path.join(logsDir, 'access.log'),
    { flags: 'a' }
);

const errorLogStream = fs.createWriteStream(
    path.join(logsDir, 'error.log'),
    { flags: 'a' }
);

// Custom token for response time in milliseconds
morgan.token('response-time-ms', (req, res) => {
    const responseTime = res.getHeader('X-Response-Time');
    return responseTime ? `${responseTime}ms` : '-';
});

// Custom token for user ID (if authenticated)
morgan.token('user-id', (req) => {
    return req.user ? req.user.id : 'anonymous';
});

// Custom token for request ID (if using request ID middleware)
morgan.token('request-id', (req) => {
    return req.requestId || '-';
});

// Development format - colorized console output
const developmentFormat = morgan('dev');

// Production format - detailed logging
const productionFormat = morgan(
    ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-ms :request-id',
    {
        stream: accessLogStream,
    }
);

// Error logging format
const errorFormat = morgan(
    ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-ms :request-id',
    {
        stream: errorLogStream,
        skip: (req, res) => res.statusCode < 400, // Only log errors
    }
);

// Combined format for both console and file in development
const combinedFormat = morgan(
    ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-ms'
);

/**
 * Get appropriate logging middleware based on environment
 * @returns {Array} Array of middleware functions
 */
function getLoggingMiddleware() {
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
        return [
            developmentFormat, // Colorized console output
            errorFormat, // Error logging to file
        ];
    } else {
        return [
            productionFormat, // Detailed file logging
            errorFormat, // Error logging to separate file
        ];
    }
}

/**
 * Custom request logger for specific events
 */
class RequestLogger {
    static logAuthAttempt(req, success, userId = null) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            success,
            userId,
            endpoint: req.originalUrl,
        };

        const logMessage = `AUTH_ATTEMPT: ${JSON.stringify(logEntry)}\n`;
        fs.appendFileSync(path.join(logsDir, 'auth.log'), logMessage);
    }

    static logSecurityEvent(req, event, details = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            event,
            details,
            endpoint: req.originalUrl,
        };

        const logMessage = `SECURITY_EVENT: ${JSON.stringify(logEntry)}\n`;
        fs.appendFileSync(path.join(logsDir, 'security.log'), logMessage);
    }

    static logDatabaseOperation(operation, collection, success, error = null) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            operation,
            collection,
            success,
            error: error ? error.message : null,
        };

        const logMessage = `DB_OPERATION: ${JSON.stringify(logEntry)}\n`;
        fs.appendFileSync(path.join(logsDir, 'database.log'), logMessage);
    }
}

module.exports = {
    getLoggingMiddleware,
    RequestLogger,
    accessLogStream,
    errorLogStream,
};