const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import configuration and utilities
const config = require('./config');
const database = require('./config/database');
const { getLoggingMiddleware } = require('./middleware/logging');
const {
    globalErrorHandler,
    notFoundHandler,
    handleJoiError
} = require('./middleware/errorHandler');
const EnvManager = require('./utils/env');

const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
        success: false,
        error: {
            message: 'Too many requests from this IP, please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Logging middleware
const loggingMiddleware = getLoggingMiddleware();
loggingMiddleware.forEach(middleware => app.use(middleware));

// Body parsing middleware
app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware for tracking
app.use((req, res, next) => {
    req.requestId = Math.random().toString(36).substring(2, 15);
    res.setHeader('X-Request-ID', req.requestId);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    const healthCheck = {
        status: 'OK',
        message: 'SkillSwap API is running',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        database: database.isConnected() ? 'connected' : 'disconnected',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
    };

    res.status(200).json(healthCheck);
});

// API info endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'SkillSwap API v1.0.0',
        version: '1.0.0',
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
    });
});

// API routes will be added here
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/sessions', sessionRoutes);

// Joi validation error handler
app.use(handleJoiError);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

// Graceful shutdown handling
process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    await database.disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    await database.disconnect();
    process.exit(0);
});

// Start server
async function startServer() {
    try {
        // Connect to database
        await database.connect();

        // Start HTTP server
        const server = app.listen(config.port, () => {
            console.log(`🚀 Server running on port ${config.port}`);
            console.log(`📊 Health check: http://localhost:${config.port}/health`);
            console.log(`🌍 Environment: ${config.nodeEnv}`);

            // Log configuration summary (with sensitive data masked)
            const configSummary = EnvManager.getConfigSummary();
            console.log('⚙️ Configuration:', configSummary);
        });

        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${config.port} is already in use`);
            } else {
                console.error('❌ Server error:', error);
            }
            process.exit(1);
        });

        return server;
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

// Start the server if this file is run directly
if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };