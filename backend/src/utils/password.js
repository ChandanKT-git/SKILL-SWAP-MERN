const bcrypt = require('bcryptjs');
const config = require('../config');

/**
 * Password utility functions for secure password handling
 */
class PasswordUtils {
    /**
     * Hash a password using bcrypt
     * @param {string} password - Plain text password
     * @returns {Promise<string>} Hashed password
     */
    static async hash(password) {
        try {
            if (!password || typeof password !== 'string') {
                throw new Error('Password must be a non-empty string');
            }

            const saltRounds = config.bcrypt.saltRounds;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            return hashedPassword;
        } catch (error) {
            throw new Error(`Password hashing failed: ${error.message}`);
        }
    }

    /**
     * Compare a plain text password with a hashed password
     * @param {string} plainPassword - Plain text password
     * @param {string} hashedPassword - Hashed password from database
     * @returns {Promise<boolean>} True if passwords match
     */
    static async compare(plainPassword, hashedPassword) {
        try {
            if (!plainPassword || !hashedPassword) {
                throw new Error('Both passwords are required for comparison');
            }

            const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
            return isMatch;
        } catch (error) {
            throw new Error(`Password comparison failed: ${error.message}`);
        }
    }

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {Object} Validation result with isValid and errors
     */
    static validateStrength(password) {
        const errors = [];
        const minLength = 8;
        const maxLength = 128;

        if (!password || typeof password !== 'string') {
            return {
                isValid: false,
                errors: ['Password must be a string'],
            };
        }

        // Length validation
        if (password.length < minLength) {
            errors.push(`Password must be at least ${minLength} characters long`);
        }

        if (password.length > maxLength) {
            errors.push(`Password cannot exceed ${maxLength} characters`);
        }

        // Character type validation
        const hasLowerCase = /[a-z]/.test(password);
        const hasUpperCase = /[A-Z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (!hasLowerCase) {
            errors.push('Password must contain at least one lowercase letter');
        }

        if (!hasUpperCase) {
            errors.push('Password must contain at least one uppercase letter');
        }

        if (!hasNumbers) {
            errors.push('Password must contain at least one number');
        }

        if (!hasSpecialChar) {
            errors.push('Password must contain at least one special character');
        }

        // Common password patterns to avoid
        const commonPatterns = [
            /^password/i,
            /^123456/,
            /^qwerty/i,
            /^admin/i,
            /^letmein/i,
        ];

        const hasCommonPattern = commonPatterns.some(pattern => pattern.test(password));
        if (hasCommonPattern) {
            errors.push('Password contains common patterns that are not secure');
        }

        // Sequential characters check
        const hasSequential = this.hasSequentialChars(password);
        if (hasSequential) {
            errors.push('Password should not contain sequential characters (e.g., 123, abc)');
        }

        return {
            isValid: errors.length === 0,
            errors,
            strength: this.calculateStrength(password),
        };
    }

    /**
     * Calculate password strength score
     * @param {string} password - Password to analyze
     * @returns {Object} Strength analysis
     */
    static calculateStrength(password) {
        let score = 0;
        const feedback = [];

        // Length scoring
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;
        if (password.length >= 16) score += 1;

        // Character variety scoring
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/\d/.test(password)) score += 1;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

        // Bonus for character variety
        const uniqueChars = new Set(password).size;
        if (uniqueChars >= password.length * 0.7) score += 1;

        // Determine strength level
        let level = 'very-weak';
        if (score >= 7) level = 'very-strong';
        else if (score >= 6) level = 'strong';
        else if (score >= 4) level = 'medium';
        else if (score >= 2) level = 'weak';

        // Provide feedback
        if (password.length < 12) {
            feedback.push('Consider using a longer password');
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            feedback.push('Add special characters for better security');
        }
        if (uniqueChars < password.length * 0.5) {
            feedback.push('Use more varied characters');
        }

        return {
            score,
            level,
            feedback,
        };
    }

    /**
     * Check for sequential characters in password
     * @param {string} password - Password to check
     * @returns {boolean} True if sequential characters found
     */
    static hasSequentialChars(password) {
        const sequences = [
            'abcdefghijklmnopqrstuvwxyz',
            '0123456789',
            'qwertyuiopasdfghjklzxcvbnm', // QWERTY keyboard layout
        ];

        for (const sequence of sequences) {
            for (let i = 0; i <= sequence.length - 3; i++) {
                const subseq = sequence.substring(i, i + 3);
                const reverseSubseq = subseq.split('').reverse().join('');

                if (password.toLowerCase().includes(subseq) ||
                    password.toLowerCase().includes(reverseSubseq)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Generate a secure random password
     * @param {number} length - Password length (default: 16)
     * @param {Object} options - Generation options
     * @returns {string} Generated password
     */
    static generateSecure(length = 16, options = {}) {
        const {
            includeLowercase = true,
            includeUppercase = true,
            includeNumbers = true,
            includeSpecialChars = true,
            excludeSimilar = true, // Exclude similar looking characters
        } = options;

        let charset = '';

        if (includeLowercase) {
            charset += excludeSimilar ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
        }

        if (includeUppercase) {
            charset += excludeSimilar ? 'ABCDEFGHJKMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        }

        if (includeNumbers) {
            charset += excludeSimilar ? '23456789' : '0123456789';
        }

        if (includeSpecialChars) {
            charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        }

        if (!charset) {
            throw new Error('At least one character type must be included');
        }

        let password = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
        }

        // Note: We don't validate generated passwords to avoid infinite recursion
        // The random generation should naturally create strong passwords

        return password;
    }

    /**
     * Generate salt for password hashing
     * @param {number} rounds - Salt rounds (default from config)
     * @returns {Promise<string>} Generated salt
     */
    static async generateSalt(rounds = config.bcrypt.saltRounds) {
        try {
            const salt = await bcrypt.genSalt(rounds);
            return salt;
        } catch (error) {
            throw new Error(`Salt generation failed: ${error.message}`);
        }
    }

    /**
     * Hash password with custom salt
     * @param {string} password - Plain text password
     * @param {string} salt - Custom salt
     * @returns {Promise<string>} Hashed password
     */
    static async hashWithSalt(password, salt) {
        try {
            const hashedPassword = await bcrypt.hash(password, salt);
            return hashedPassword;
        } catch (error) {
            throw new Error(`Password hashing with salt failed: ${error.message}`);
        }
    }
}

module.exports = PasswordUtils;