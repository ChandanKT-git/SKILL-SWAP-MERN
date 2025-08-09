const jwt = require('jsonwebtoken');
const config = require('../config');
const { AuthenticationError } = require('../middleware/errorHandler');

/**
 * JWT utility functions for token generation and validation
 */
class JWTUtils {
    /**
     * Generate access token
     * @param {Object} payload - Token payload (usually user data)
     * @param {Object} options - Token options
     * @returns {string} JWT access token
     */
    static generateAccessToken(payload, options = {}) {
        try {
            const defaultOptions = {
                expiresIn: config.jwt.expiresIn,
                issuer: 'skillswap-api',
                audience: 'skillswap-client',
            };

            const tokenOptions = { ...defaultOptions, ...options };

            // Remove sensitive data from payload
            const sanitizedPayload = this.sanitizePayload(payload);

            const token = jwt.sign(sanitizedPayload, config.jwt.secret, tokenOptions);

            return token;
        } catch (error) {
            throw new Error(`Access token generation failed: ${error.message}`);
        }
    }

    /**
     * Generate refresh token
     * @param {Object} payload - Token payload
     * @param {Object} options - Token options
     * @returns {string} JWT refresh token
     */
    static generateRefreshToken(payload, options = {}) {
        try {
            const defaultOptions = {
                expiresIn: config.jwt.refreshExpiresIn,
                issuer: 'skillswap-api',
                audience: 'skillswap-client',
            };

            const tokenOptions = { ...defaultOptions, ...options };

            // Only include essential data in refresh token
            const refreshPayload = {
                id: payload.id,
                email: payload.email,
                tokenType: 'refresh',
            };

            const token = jwt.sign(refreshPayload, config.jwt.refreshSecret, tokenOptions);

            return token;
        } catch (error) {
            throw new Error(`Refresh token generation failed: ${error.message}`);
        }
    }

    /**
     * Generate token pair (access + refresh)
     * @param {Object} payload - Token payload
     * @returns {Object} Object containing access and refresh tokens
     */
    static generateTokenPair(payload) {
        try {
            const accessToken = this.generateAccessToken(payload);
            const refreshToken = this.generateRefreshToken(payload);

            return {
                accessToken,
                refreshToken,
                tokenType: 'Bearer',
                expiresIn: this.getTokenExpiration(config.jwt.expiresIn),
            };
        } catch (error) {
            throw new Error(`Token pair generation failed: ${error.message}`);
        }
    }

    /**
     * Verify access token
     * @param {string} token - JWT token to verify
     * @param {Object} options - Verification options
     * @returns {Object} Decoded token payload
     */
    static verifyAccessToken(token, options = {}) {
        try {
            if (!token) {
                throw new AuthenticationError('No token provided');
            }

            // Remove 'Bearer ' prefix if present
            const cleanToken = token.replace(/^Bearer\s+/, '');

            const defaultOptions = {
                issuer: 'skillswap-api',
                audience: 'skillswap-client',
            };

            const verifyOptions = { ...defaultOptions, ...options };

            const decoded = jwt.verify(cleanToken, config.jwt.secret, verifyOptions);

            return decoded;
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new AuthenticationError('Token has expired');
            } else if (error.name === 'JsonWebTokenError') {
                throw new AuthenticationError('Invalid token');
            } else if (error.name === 'NotBeforeError') {
                throw new AuthenticationError('Token not active yet');
            } else {
                throw new AuthenticationError(`Token verification failed: ${error.message}`);
            }
        }
    }

    /**
     * Verify refresh token
     * @param {string} token - Refresh token to verify
     * @param {Object} options - Verification options
     * @returns {Object} Decoded token payload
     */
    static verifyRefreshToken(token, options = {}) {
        try {
            if (!token) {
                throw new AuthenticationError('No refresh token provided');
            }

            const defaultOptions = {
                issuer: 'skillswap-api',
                audience: 'skillswap-client',
            };

            const verifyOptions = { ...defaultOptions, ...options };

            const decoded = jwt.verify(token, config.jwt.refreshSecret, verifyOptions);

            // Verify it's actually a refresh token
            if (decoded.tokenType !== 'refresh') {
                throw new AuthenticationError('Invalid token type');
            }

            return decoded;
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new AuthenticationError('Refresh token has expired');
            } else if (error.name === 'JsonWebTokenError') {
                throw new AuthenticationError('Invalid refresh token');
            } else {
                throw new AuthenticationError(`Refresh token verification failed: ${error.message}`);
            }
        }
    }

    /**
     * Decode token without verification (for debugging)
     * @param {string} token - JWT token to decode
     * @returns {Object} Decoded token payload
     */
    static decodeToken(token) {
        try {
            const cleanToken = token.replace(/^Bearer\s+/, '');
            const decoded = jwt.decode(cleanToken, { complete: true });

            return decoded;
        } catch (error) {
            throw new Error(`Token decoding failed: ${error.message}`);
        }
    }

    /**
     * Check if token is expired
     * @param {string} token - JWT token to check
     * @returns {boolean} True if token is expired
     */
    static isTokenExpired(token) {
        try {
            const decoded = this.decodeToken(token);

            if (!decoded || !decoded.payload.exp) {
                return true;
            }

            const currentTime = Math.floor(Date.now() / 1000);
            return decoded.payload.exp < currentTime;
        } catch (error) {
            return true; // Consider invalid tokens as expired
        }
    }

    /**
     * Get token expiration time
     * @param {string} token - JWT token
     * @returns {Date|null} Expiration date or null if invalid
     */
    static getTokenExpiration(token) {
        try {
            // Handle duration strings like '7d', '24h'
            if (typeof token === 'string' && /^\d+[smhd]$/.test(token)) {
                const duration = this.parseDuration(token);
                return new Date(Date.now() + duration);
            }

            const decoded = this.decodeToken(token);

            if (!decoded || !decoded.payload.exp) {
                return null;
            }

            return new Date(decoded.payload.exp * 1000);
        } catch (error) {
            return null;
        }
    }

    /**
     * Parse duration string to milliseconds
     * @param {string} duration - Duration string (e.g., '7d', '24h', '30m')
     * @returns {number} Duration in milliseconds
     */
    static parseDuration(duration) {
        const units = {
            s: 1000,
            m: 60 * 1000,
            h: 60 * 60 * 1000,
            d: 24 * 60 * 60 * 1000,
        };

        const match = duration.match(/^(\d+)([smhd])$/);
        if (!match) {
            throw new Error('Invalid duration format');
        }

        const [, value, unit] = match;
        return parseInt(value) * units[unit];
    }

    /**
     * Sanitize payload by removing sensitive information
     * @param {Object} payload - Original payload
     * @returns {Object} Sanitized payload
     */
    static sanitizePayload(payload) {
        const sensitiveFields = [
            'password',
            'otp',
            'emailVerificationToken',
            'passwordResetToken',
            'loginAttempts',
            'lockUntil',
        ];

        const sanitized = { ...payload };

        // Remove sensitive fields
        sensitiveFields.forEach(field => {
            delete sanitized[field];
        });

        // If payload is a Mongoose document, convert to plain object
        if (payload.toObject && typeof payload.toObject === 'function') {
            const plainObject = payload.toObject();
            sensitiveFields.forEach(field => {
                delete plainObject[field];
            });
            return plainObject;
        }

        return sanitized;
    }

    /**
     * Generate email verification token
     * @param {Object} payload - Token payload
     * @returns {string} Email verification token
     */
    static generateEmailVerificationToken(payload) {
        try {
            const tokenPayload = {
                id: payload.id,
                email: payload.email,
                purpose: 'email-verification',
            };

            const token = jwt.sign(
                tokenPayload,
                config.jwt.secret,
                {
                    expiresIn: '24h', // Email verification expires in 24 hours
                    issuer: 'skillswap-api',
                    audience: 'skillswap-client',
                }
            );

            return token;
        } catch (error) {
            throw new Error(`Email verification token generation failed: ${error.message}`);
        }
    }

    /**
     * Generate password reset token
     * @param {Object} payload - Token payload
     * @returns {string} Password reset token
     */
    static generatePasswordResetToken(payload) {
        try {
            const tokenPayload = {
                id: payload.id,
                email: payload.email,
                purpose: 'password-reset',
            };

            const token = jwt.sign(
                tokenPayload,
                config.jwt.secret,
                {
                    expiresIn: '1h', // Password reset expires in 1 hour
                    issuer: 'skillswap-api',
                    audience: 'skillswap-client',
                }
            );

            return token;
        } catch (error) {
            throw new Error(`Password reset token generation failed: ${error.message}`);
        }
    }

    /**
     * Verify special purpose token (email verification, password reset)
     * @param {string} token - Token to verify
     * @param {string} expectedPurpose - Expected token purpose
     * @returns {Object} Decoded token payload
     */
    static verifySpecialToken(token, expectedPurpose) {
        try {
            const decoded = this.verifyAccessToken(token);

            if (decoded.purpose !== expectedPurpose) {
                throw new AuthenticationError('Invalid token purpose');
            }

            return decoded;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Extract token from Authorization header
     * @param {string} authHeader - Authorization header value
     * @returns {string|null} Extracted token or null
     */
    static extractTokenFromHeader(authHeader) {
        if (!authHeader) {
            return null;
        }

        const parts = authHeader.split(' ');

        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return null;
        }

        return parts[1];
    }
}

module.exports = JWTUtils;