const express = require('express');
const cors = require('cors');
const http = require('http');

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
const socketService = require('./services/socketService');
const { runDatabaseOptimization } = require('./utils/databaseOptimization');

// Import security middleware
const {
    helmetConfig,
    corsOptions,
    sanitizeMiddleware,
    securityHeaders,
    preventParameterPollution,
    suspiciousActivityDetector,
    validateContentType,
} = require('./middleware/security');

// Import rate limiters
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware - helmet with enhanced configuration
app.use(helmetConfig);

// CORS with enhanced configuration
app.use(cors(corsOptions));

// Additional security headers
app.use(securityHeaders);

// General rate limiting for all API routes
app.use('/api/', generalLimiter);

// Logging middleware
const loggingMiddleware = getLoggingMiddleware();
loggingMiddleware.forEach(middleware => app.use(middleware));

// Static file serving for testing
app.use(express.static('public'));

// Body parsing middleware with size limits
app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware - input sanitization and validation
app.use(sanitizeMiddleware);
app.use(preventParameterPollution);
app.use(suspiciousActivityDetector);
app.use(validateContentType);

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

// API routes
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const searchRoutes = require('./routes/searchRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/adminRoutes');
const chatRoutes = require('./routes/chatRoutes');
const healthRoutes = require('./routes/healthRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/health', healthRoutes);

// Additional routes will be added here
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
    const notificationProcessor = require('./jobs/notificationProcessor');
    notificationProcessor.stop();
    await database.disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    const notificationProcessor = require('./jobs/notificationProcessor');
    notificationProcessor.stop();
    await database.disconnect();
    process.exit(0);
});

// Start server
async function startServer() {
    try {
        // Connect to database
        await database.connect();

        // Run database optimization (create indexes)
        if (config.nodeEnv !== 'test') {
            await runDatabaseOptimization();
        }

        // Start notification processor
        const notificationProcessor = require('./jobs/notificationProcessor');
        notificationProcessor.start();

        // Create HTTP server
        const server = http.createServer(app);

        // Initialize Socket.io
        socketService.initialize(server);

        // Start HTTP server
        server.listen(config.port, () => {
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