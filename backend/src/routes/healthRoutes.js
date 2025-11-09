/**
 * Health Check Routes
 * Endpoints for monitoring application health
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

/**
 * @route   GET /api/health
 * @desc    Basic health check
 * @access  Public
 */
router.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    });
});

/**
 * @route   GET /api/health/detailed
 * @desc    Detailed health check with dependencies
 * @access  Public
 */
router.get('/detailed', async (req, res) => {
    const health = {
        success: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        services: {}
    };

    // Check database connection
    try {
        const dbState = mongoose.connection.readyState;
        health.services.database = {
            status: dbState === 1 ? 'healthy' : 'unhealthy',
            state: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState]
        };
    } catch (error) {
        health.services.database = {
            status: 'unhealthy',
            error: error.message
        };
        health.success = false;
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    health.services.memory = {
        status: 'healthy',
        usage: {
            rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
        }
    };

    const statusCode = health.success ? 200 : 503;
    res.status(statusCode).json(health);
});

/**
 * @route   GET /api/health/ready
 * @desc    Readiness probe for Kubernetes/container orchestration
 * @access  Public
 */
router.get('/ready', async (req, res) => {
    try {
        // Check if database is ready
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                message: 'Database not ready'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Application is ready'
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            message: 'Application not ready',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/health/live
 * @desc    Liveness probe for Kubernetes/container orchestration
 * @access  Public
 */
router.get('/live', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Application is alive'
    });
});

module.exports = router;
