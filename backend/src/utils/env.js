/**
 * Environment variable utilities for secure configuration management
 */

class EnvManager {
    /**
     * Get environment variable with validation
     * @param {string} key - Environment variable key
     * @param {string} defaultValue - Default value if not found
     * @param {boolean} required - Whether the variable is required
     * @returns {string} Environment variable value
     */
    static get(key, defaultValue = null, required = false) {
        const value = process.env[key];

        if (!value && required) {
            throw new Error(`Required environment variable ${key} is not set`);
        }

        return value || defaultValue;
    }

    /**
     * Get integer environment variable
     * @param {string} key - Environment variable key
     * @param {number} defaultValue - Default value if not found
     * @returns {number} Parsed integer value
     */
    static getInt(key, defaultValue = 0) {
        const value = process.env[key];
        return value ? parseInt(value, 10) : defaultValue;
    }

    /**
     * Get boolean environment variable
     * @param {string} key - Environment variable key
     * @param {boolean} defaultValue - Default value if not found
     * @returns {boolean} Parsed boolean value
     */
    static getBool(key, defaultValue = false) {
        const value = process.env[key];
        if (!value) return defaultValue;

        return value.toLowerCase() === 'true' || value === '1';
    }

    /**
     * Get array environment variable (comma-separated)
     * @param {string} key - Environment variable key
     * @param {Array} defaultValue - Default value if not found
     * @returns {Array} Parsed array value
     */
    static getArray(key, defaultValue = []) {
        const value = process.env[key];
        if (!value) return defaultValue;

        return value.split(',').map(item => item.trim()).filter(Boolean);
    }

    /**
     * Validate all required environment variables
     * @param {Array<string>} requiredVars - Array of required variable names
     * @throws {Error} If any required variables are missing
     */
    static validateRequired(requiredVars) {
        const missing = requiredVars.filter(key => !process.env[key]);

        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
    }

    /**
     * Mask sensitive values for logging
     * @param {string} value - Value to mask
     * @param {number} visibleChars - Number of characters to show
     * @returns {string} Masked value
     */
    static maskSensitive(value, visibleChars = 4) {
        if (!value || value.length <= visibleChars) {
            return '***';
        }

        const visible = value.slice(0, visibleChars);
        const masked = '*'.repeat(value.length - visibleChars);
        return visible + masked;
    }

    /**
     * Get configuration summary for logging (with sensitive data masked)
     * @returns {Object} Configuration summary
     */
    static getConfigSummary() {
        return {
            nodeEnv: process.env.NODE_ENV || 'development',
            port: process.env.PORT || '5001',
            mongoUri: this.maskSensitive(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillswap'),
            jwtSecret: this.maskSensitive(process.env.JWT_SECRET || 'fallback'),
            emailUser: this.maskSensitive(process.env.EMAIL_USER || 'not-set'),
            cloudinaryName: process.env.CLOUDINARY_CLOUD_NAME || 'not-set',
        };
    }
}

module.exports = EnvManager;