require('dotenv').config();

const config = {
    // Server Configuration
    port: process.env.PORT || 5001,
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

    // Database Configuration
    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/skillswap',
        testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/skillswap_test',
    },

    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'fallback-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    },

    // Email Configuration
    email: {
        service: process.env.EMAIL_SERVICE || 'gmail',
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
        from: process.env.EMAIL_FROM || 'SkillSwap <noreply@skillswap.com>',
    },

    // Cloudinary Configuration
    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET,
    },

    // OTP Configuration
    otp: {
        expiresIn: parseInt(process.env.OTP_EXPIRES_IN) || 10, // minutes
        length: parseInt(process.env.OTP_LENGTH) || 6,
    },

    // Rate Limiting Configuration
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    },

    // Security Configuration
    bcrypt: {
        saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
    },

    // Development flags
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
};

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];

if (config.isProduction) {
    requiredEnvVars.push(
        'MONGODB_URI',
        'EMAIL_USER',
        'EMAIL_PASS',
        'CLOUDINARY_CLOUD_NAME',
        'CLOUDINARY_API_KEY',
        'CLOUDINARY_API_SECRET'
    );
}

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
    if (config.isProduction) {
        process.exit(1);
    } else {
        console.warn('⚠️ Using fallback values for development');
    }
}

module.exports = config;