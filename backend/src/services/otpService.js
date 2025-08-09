const crypto = require('crypto');
const config = require('../config');
const { ValidationError } = require('../middleware/errorHandler');

/**
 * OTP (One-Time Password) service for email verification and authentication
 */
class OTPService {
    /**
     * Generate a random OTP
     * @param {number} length - OTP length (default from config)
     * @param {Object} options - Generation options
     * @returns {string} Generated OTP
     */
    static generateOTP(length = config.otp.length, options = {}) {
        try {
            const {
                type = 'numeric', // 'numeric', 'alphanumeric', 'alphabetic'
                excludeSimilar = true, // Exclude similar looking characters
            } = options;

            let charset = '';

            switch (type) {
                case 'numeric':
                    charset = excludeSimilar ? '23456789' : '0123456789';
                    break;
                case 'alphabetic':
                    charset = excludeSimilar ?
                        'ABCDEFGHJKMNPQRSTUVWXYZ' :
                        'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                    break;
                case 'alphanumeric':
                    charset = excludeSimilar ?
                        '23456789ABCDEFGHJKMNPQRSTUVWXYZ' :
                        '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                    break;
                default:
                    throw new Error('Invalid OTP type');
            }

            let otp = '';
            for (let i = 0; i < length; i++) {
                const randomIndex = crypto.randomInt(0, charset.length);
                otp += charset[randomIndex];
            }

            return otp;
        } catch (error) {
            throw new Error(`OTP generation failed: ${error.message}`);
        }
    }

    /**
     * Generate OTP with expiration
     * @param {Object} options - Generation options
     * @returns {Object} OTP data with code and expiration
     */
    static generateOTPWithExpiration(options = {}) {
        try {
            const {
                length = config.otp.length,
                expiresInMinutes = config.otp.expiresIn,
                type = 'numeric',
            } = options;

            const code = this.generateOTP(length, { type });
            const expires = new Date(Date.now() + expiresInMinutes * 60 * 1000);

            return {
                code,
                expires,
                attempts: 0,
                generatedAt: new Date(),
            };
        } catch (error) {
            throw new Error(`OTP generation with expiration failed: ${error.message}`);
        }
    }

    /**
     * Validate OTP
     * @param {string} inputOTP - OTP provided by user
     * @param {Object} storedOTP - OTP data from database
     * @param {Object} options - Validation options
     * @returns {Object} Validation result
     */
    static validateOTP(inputOTP, storedOTP, options = {}) {
        try {
            const {
                maxAttempts = 5,
                caseSensitive = false,
            } = options;

            // Check if OTP data exists
            if (!storedOTP || !storedOTP.code || !storedOTP.expires) {
                return {
                    isValid: false,
                    error: 'No OTP found or OTP data is incomplete',
                    shouldRegenerate: true,
                };
            }

            // Check if OTP has expired
            if (new Date() > new Date(storedOTP.expires)) {
                return {
                    isValid: false,
                    error: 'OTP has expired',
                    shouldRegenerate: true,
                };
            }

            // Check attempt limit
            if (storedOTP.attempts >= maxAttempts) {
                return {
                    isValid: false,
                    error: 'Maximum OTP attempts exceeded',
                    shouldRegenerate: true,
                };
            }

            // Validate OTP format
            if (!inputOTP || typeof inputOTP !== 'string') {
                return {
                    isValid: false,
                    error: 'Invalid OTP format',
                    shouldRegenerate: false,
                };
            }

            // Compare OTPs
            const normalizedInput = caseSensitive ? inputOTP : inputOTP.toUpperCase();
            const normalizedStored = caseSensitive ? storedOTP.code : storedOTP.code.toUpperCase();

            const isValid = normalizedInput === normalizedStored;

            return {
                isValid,
                error: isValid ? null : 'Invalid OTP',
                shouldRegenerate: false,
                attemptsRemaining: maxAttempts - (storedOTP.attempts + 1),
            };
        } catch (error) {
            throw new Error(`OTP validation failed: ${error.message}`);
        }
    }

    /**
     * Generate secure OTP using crypto.randomBytes
     * @param {number} length - OTP length
     * @returns {string} Cryptographically secure OTP
     */
    static generateSecureOTP(length = config.otp.length) {
        try {
            const bytes = crypto.randomBytes(Math.ceil(length * 0.75));
            const otp = bytes.toString('hex').substring(0, length).toUpperCase();

            return otp;
        } catch (error) {
            throw new Error(`Secure OTP generation failed: ${error.message}`);
        }
    }

    /**
     * Generate time-based OTP (TOTP-like)
     * @param {string} secret - Secret key for TOTP
     * @param {Object} options - TOTP options
     * @returns {string} Time-based OTP
     */
    static generateTOTP(secret, options = {}) {
        try {
            const {
                window = 30, // Time window in seconds
                digits = 6,
            } = options;

            const epoch = Math.floor(Date.now() / 1000);
            const timeStep = Math.floor(epoch / window);

            const hmac = crypto.createHmac('sha1', secret);
            hmac.update(Buffer.from(timeStep.toString(16).padStart(16, '0'), 'hex'));
            const hash = hmac.digest();

            const offset = hash[hash.length - 1] & 0x0f;
            const binary = ((hash[offset] & 0x7f) << 24) |
                ((hash[offset + 1] & 0xff) << 16) |
                ((hash[offset + 2] & 0xff) << 8) |
                (hash[offset + 3] & 0xff);

            const otp = (binary % Math.pow(10, digits)).toString().padStart(digits, '0');

            return otp;
        } catch (error) {
            throw new Error(`TOTP generation failed: ${error.message}`);
        }
    }

    /**
     * Validate TOTP
     * @param {string} inputOTP - OTP provided by user
     * @param {string} secret - Secret key for TOTP
     * @param {Object} options - Validation options
     * @returns {boolean} True if TOTP is valid
     */
    static validateTOTP(inputOTP, secret, options = {}) {
        try {
            const {
                window = 30,
                tolerance = 1, // Allow 1 time step before/after current
            } = options;

            const currentTOTP = this.generateTOTP(secret, { window });

            // Check current time step
            if (inputOTP === currentTOTP) {
                return true;
            }

            // Check previous and next time steps for clock drift tolerance
            for (let i = 1; i <= tolerance; i++) {
                const epoch = Math.floor(Date.now() / 1000);

                // Check previous time step
                const prevTimeStep = Math.floor((epoch - i * window) / window);
                const prevTOTP = this.generateTOTPForTimeStep(secret, prevTimeStep, options);
                if (inputOTP === prevTOTP) {
                    return true;
                }

                // Check next time step
                const nextTimeStep = Math.floor((epoch + i * window) / window);
                const nextTOTP = this.generateTOTPForTimeStep(secret, nextTimeStep, options);
                if (inputOTP === nextTOTP) {
                    return true;
                }
            }

            return false;
        } catch (error) {
            throw new Error(`TOTP validation failed: ${error.message}`);
        }
    }

    /**
     * Generate TOTP for specific time step
     * @param {string} secret - Secret key
     * @param {number} timeStep - Time step
     * @param {Object} options - Generation options
     * @returns {string} TOTP for the time step
     */
    static generateTOTPForTimeStep(secret, timeStep, options = {}) {
        const { digits = 6 } = options;

        const hmac = crypto.createHmac('sha1', secret);
        hmac.update(Buffer.from(timeStep.toString(16).padStart(16, '0'), 'hex'));
        const hash = hmac.digest();

        const offset = hash[hash.length - 1] & 0x0f;
        const binary = ((hash[offset] & 0x7f) << 24) |
            ((hash[offset + 1] & 0xff) << 16) |
            ((hash[offset + 2] & 0xff) << 8) |
            (hash[offset + 3] & 0xff);

        const otp = (binary % Math.pow(10, digits)).toString().padStart(digits, '0');

        return otp;
    }

    /**
     * Hash OTP for secure storage
     * @param {string} otp - OTP to hash
     * @returns {string} Hashed OTP
     */
    static hashOTP(otp) {
        try {
            const hash = crypto.createHash('sha256');
            hash.update(otp);
            return hash.digest('hex');
        } catch (error) {
            throw new Error(`OTP hashing failed: ${error.message}`);
        }
    }

    /**
     * Verify hashed OTP
     * @param {string} inputOTP - OTP provided by user
     * @param {string} hashedOTP - Hashed OTP from database
     * @returns {boolean} True if OTP matches
     */
    static verifyHashedOTP(inputOTP, hashedOTP) {
        try {
            const inputHash = this.hashOTP(inputOTP);
            return inputHash === hashedOTP;
        } catch (error) {
            throw new Error(`Hashed OTP verification failed: ${error.message}`);
        }
    }

    /**
     * Generate backup codes for account recovery
     * @param {number} count - Number of backup codes to generate
     * @param {number} length - Length of each backup code
     * @returns {Array<string>} Array of backup codes
     */
    static generateBackupCodes(count = 10, length = 8) {
        try {
            const codes = [];

            for (let i = 0; i < count; i++) {
                const code = this.generateOTP(length, { type: 'alphanumeric' });
                codes.push(code);
            }

            return codes;
        } catch (error) {
            throw new Error(`Backup codes generation failed: ${error.message}`);
        }
    }

    /**
     * Format OTP for display (add spaces or dashes)
     * @param {string} otp - OTP to format
     * @param {Object} options - Formatting options
     * @returns {string} Formatted OTP
     */
    static formatOTP(otp, options = {}) {
        const {
            separator = ' ',
            groupSize = 3,
        } = options;

        if (!otp || typeof otp !== 'string') {
            return otp;
        }

        const groups = [];
        for (let i = 0; i < otp.length; i += groupSize) {
            groups.push(otp.substring(i, i + groupSize));
        }

        return groups.join(separator);
    }

    /**
     * Get OTP expiration time remaining
     * @param {Date} expirationDate - OTP expiration date
     * @returns {Object} Time remaining information
     */
    static getTimeRemaining(expirationDate) {
        try {
            const now = new Date();
            const expiration = new Date(expirationDate);
            const diff = expiration.getTime() - now.getTime();

            if (diff <= 0) {
                return {
                    expired: true,
                    totalSeconds: 0,
                    minutes: 0,
                    seconds: 0,
                };
            }

            const totalSeconds = Math.floor(diff / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;

            return {
                expired: false,
                totalSeconds,
                minutes,
                seconds,
                formatted: `${minutes}:${seconds.toString().padStart(2, '0')}`,
            };
        } catch (error) {
            throw new Error(`Time remaining calculation failed: ${error.message}`);
        }
    }
}

module.exports = OTPService;