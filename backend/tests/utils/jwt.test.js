const JWTUtils = require('../../src/utils/jwt');
const config = require('../../src/config');

// Mock config for testing
jest.mock('../../src/config', () => ({
    jwt: {
        secret: 'test-secret-key',
        refreshSecret: 'test-refresh-secret-key',
        expiresIn: '1h',
        refreshExpiresIn: '7d',
    },
}));

describe('JWTUtils', () => {
    const mockPayload = {
        id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
    };

    describe('generateAccessToken', () => {
        it('should generate a valid access token', () => {
            const token = JWTUtils.generateAccessToken(mockPayload);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
        });

        it('should include payload data in token', () => {
            const token = JWTUtils.generateAccessToken(mockPayload);
            const decoded = JWTUtils.decodeToken(token);

            expect(decoded.payload.id).toBe(mockPayload.id);
            expect(decoded.payload.email).toBe(mockPayload.email);
            expect(decoded.payload.firstName).toBe(mockPayload.firstName);
        });

        it('should set correct expiration', () => {
            const token = JWTUtils.generateAccessToken(mockPayload);
            const decoded = JWTUtils.decodeToken(token);

            expect(decoded.payload.exp).toBeDefined();
            expect(decoded.payload.iat).toBeDefined();
            expect(decoded.payload.exp > decoded.payload.iat).toBe(true);
        });

        it('should sanitize sensitive data from payload', () => {
            const payloadWithSensitiveData = {
                ...mockPayload,
                password: 'secret-password',
                otp: '123456',
            };

            const token = JWTUtils.generateAccessToken(payloadWithSensitiveData);
            const decoded = JWTUtils.decodeToken(token);

            expect(decoded.payload.password).toBeUndefined();
            expect(decoded.payload.otp).toBeUndefined();
        });
    });

    describe('generateRefreshToken', () => {
        it('should generate a valid refresh token', () => {
            const token = JWTUtils.generateRefreshToken(mockPayload);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3);
        });

        it('should include minimal data in refresh token', () => {
            const token = JWTUtils.generateRefreshToken(mockPayload);
            const decoded = JWTUtils.decodeToken(token);

            expect(decoded.payload.id).toBe(mockPayload.id);
            expect(decoded.payload.email).toBe(mockPayload.email);
            expect(decoded.payload.tokenType).toBe('refresh');
            expect(decoded.payload.firstName).toBeUndefined(); // Should not include extra data
        });
    });

    describe('generateTokenPair', () => {
        it('should generate both access and refresh tokens', () => {
            const tokenPair = JWTUtils.generateTokenPair(mockPayload);

            expect(tokenPair.accessToken).toBeDefined();
            expect(tokenPair.refreshToken).toBeDefined();
            expect(tokenPair.tokenType).toBe('Bearer');
            expect(tokenPair.expiresIn).toBeDefined();
        });

        it('should generate different tokens', () => {
            const tokenPair = JWTUtils.generateTokenPair(mockPayload);

            expect(tokenPair.accessToken).not.toBe(tokenPair.refreshToken);
        });
    });

    describe('verifyAccessToken', () => {
        it('should verify valid access token', () => {
            const token = JWTUtils.generateAccessToken(mockPayload);
            const decoded = JWTUtils.verifyAccessToken(token);

            expect(decoded.id).toBe(mockPayload.id);
            expect(decoded.email).toBe(mockPayload.email);
        });

        it('should handle Bearer prefix', () => {
            const token = JWTUtils.generateAccessToken(mockPayload);
            const bearerToken = `Bearer ${token}`;
            const decoded = JWTUtils.verifyAccessToken(bearerToken);

            expect(decoded.id).toBe(mockPayload.id);
        });

        it('should throw error for invalid token', () => {
            expect(() => {
                JWTUtils.verifyAccessToken('invalid-token');
            }).toThrow('Invalid token');
        });

        it('should throw error for missing token', () => {
            expect(() => {
                JWTUtils.verifyAccessToken('');
            }).toThrow('No token provided');
        });

        it('should throw error for expired token', () => {
            // Generate token with very short expiration
            const shortLivedToken = JWTUtils.generateAccessToken(mockPayload, { expiresIn: '1ms' });

            // Wait for token to expire
            setTimeout(() => {
                expect(() => {
                    JWTUtils.verifyAccessToken(shortLivedToken);
                }).toThrow('Token has expired');
            }, 10);
        });
    });

    describe('verifyRefreshToken', () => {
        it('should verify valid refresh token', () => {
            const token = JWTUtils.generateRefreshToken(mockPayload);
            const decoded = JWTUtils.verifyRefreshToken(token);

            expect(decoded.id).toBe(mockPayload.id);
            expect(decoded.tokenType).toBe('refresh');
        });

        it('should reject access token as refresh token', () => {
            const accessToken = JWTUtils.generateAccessToken(mockPayload);

            expect(() => {
                JWTUtils.verifyRefreshToken(accessToken);
            }).toThrow('Invalid refresh token');
        });
    });

    describe('decodeToken', () => {
        it('should decode token without verification', () => {
            const token = JWTUtils.generateAccessToken(mockPayload);
            const decoded = JWTUtils.decodeToken(token);

            expect(decoded.header).toBeDefined();
            expect(decoded.payload).toBeDefined();
            expect(decoded.signature).toBeDefined();
        });

        it('should handle Bearer prefix', () => {
            const token = JWTUtils.generateAccessToken(mockPayload);
            const bearerToken = `Bearer ${token}`;
            const decoded = JWTUtils.decodeToken(bearerToken);

            expect(decoded.payload.id).toBe(mockPayload.id);
        });
    });

    describe('isTokenExpired', () => {
        it('should return false for valid token', () => {
            const token = JWTUtils.generateAccessToken(mockPayload);
            const isExpired = JWTUtils.isTokenExpired(token);

            expect(isExpired).toBe(false);
        });

        it('should return true for invalid token', () => {
            const isExpired = JWTUtils.isTokenExpired('invalid-token');

            expect(isExpired).toBe(true);
        });
    });

    describe('getTokenExpiration', () => {
        it('should return expiration date for valid token', () => {
            const token = JWTUtils.generateAccessToken(mockPayload);
            const expiration = JWTUtils.getTokenExpiration(token);

            expect(expiration).toBeInstanceOf(Date);
            expect(expiration.getTime()).toBeGreaterThan(Date.now());
        });

        it('should parse duration strings', () => {
            const expiration = JWTUtils.getTokenExpiration('1h');

            expect(expiration).toBeInstanceOf(Date);
            expect(expiration.getTime()).toBeGreaterThan(Date.now());
        });

        it('should return null for invalid token', () => {
            const expiration = JWTUtils.getTokenExpiration('invalid-token');

            expect(expiration).toBeNull();
        });
    });

    describe('parseDuration', () => {
        it('should parse seconds', () => {
            const duration = JWTUtils.parseDuration('30s');
            expect(duration).toBe(30 * 1000);
        });

        it('should parse minutes', () => {
            const duration = JWTUtils.parseDuration('15m');
            expect(duration).toBe(15 * 60 * 1000);
        });

        it('should parse hours', () => {
            const duration = JWTUtils.parseDuration('2h');
            expect(duration).toBe(2 * 60 * 60 * 1000);
        });

        it('should parse days', () => {
            const duration = JWTUtils.parseDuration('7d');
            expect(duration).toBe(7 * 24 * 60 * 60 * 1000);
        });

        it('should throw error for invalid format', () => {
            expect(() => {
                JWTUtils.parseDuration('invalid');
            }).toThrow('Invalid duration format');
        });
    });

    describe('generateEmailVerificationToken', () => {
        it('should generate email verification token', () => {
            const token = JWTUtils.generateEmailVerificationToken(mockPayload);
            const decoded = JWTUtils.decodeToken(token);

            expect(decoded.payload.purpose).toBe('email-verification');
            expect(decoded.payload.id).toBe(mockPayload.id);
            expect(decoded.payload.email).toBe(mockPayload.email);
        });
    });

    describe('generatePasswordResetToken', () => {
        it('should generate password reset token', () => {
            const token = JWTUtils.generatePasswordResetToken(mockPayload);
            const decoded = JWTUtils.decodeToken(token);

            expect(decoded.payload.purpose).toBe('password-reset');
            expect(decoded.payload.id).toBe(mockPayload.id);
            expect(decoded.payload.email).toBe(mockPayload.email);
        });
    });

    describe('verifySpecialToken', () => {
        it('should verify email verification token', () => {
            const token = JWTUtils.generateEmailVerificationToken(mockPayload);
            const decoded = JWTUtils.verifySpecialToken(token, 'email-verification');

            expect(decoded.purpose).toBe('email-verification');
            expect(decoded.id).toBe(mockPayload.id);
        });

        it('should reject token with wrong purpose', () => {
            const token = JWTUtils.generateEmailVerificationToken(mockPayload);

            expect(() => {
                JWTUtils.verifySpecialToken(token, 'password-reset');
            }).toThrow('Invalid token purpose');
        });
    });

    describe('extractTokenFromHeader', () => {
        it('should extract token from valid Authorization header', () => {
            const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
            const authHeader = `Bearer ${token}`;
            const extracted = JWTUtils.extractTokenFromHeader(authHeader);

            expect(extracted).toBe(token);
        });

        it('should return null for invalid header format', () => {
            expect(JWTUtils.extractTokenFromHeader('InvalidHeader')).toBeNull();
            expect(JWTUtils.extractTokenFromHeader('Basic token')).toBeNull();
            expect(JWTUtils.extractTokenFromHeader('')).toBeNull();
            expect(JWTUtils.extractTokenFromHeader(null)).toBeNull();
        });

        it('should return null for malformed Bearer header', () => {
            expect(JWTUtils.extractTokenFromHeader('Bearer')).toBeNull();
            expect(JWTUtils.extractTokenFromHeader('Bearer token extra')).toBeNull();
        });
    });

    describe('sanitizePayload', () => {
        it('should remove sensitive fields', () => {
            const sensitivePayload = {
                ...mockPayload,
                password: 'secret',
                otp: '123456',
                emailVerificationToken: 'token',
                passwordResetToken: 'reset-token',
                loginAttempts: 3,
                lockUntil: new Date(),
            };

            const sanitized = JWTUtils.sanitizePayload(sensitivePayload);

            expect(sanitized.password).toBeUndefined();
            expect(sanitized.otp).toBeUndefined();
            expect(sanitized.emailVerificationToken).toBeUndefined();
            expect(sanitized.passwordResetToken).toBeUndefined();
            expect(sanitized.loginAttempts).toBeUndefined();
            expect(sanitized.lockUntil).toBeUndefined();

            // Should keep non-sensitive fields
            expect(sanitized.id).toBe(mockPayload.id);
            expect(sanitized.email).toBe(mockPayload.email);
        });

        it('should handle Mongoose documents', () => {
            const mockDocument = {
                ...mockPayload,
                password: 'secret',
                toObject: jest.fn().mockReturnValue({
                    ...mockPayload,
                    password: 'secret',
                }),
            };

            const sanitized = JWTUtils.sanitizePayload(mockDocument);

            expect(mockDocument.toObject).toHaveBeenCalled();
            expect(sanitized.password).toBeUndefined();
            expect(sanitized.id).toBe(mockPayload.id);
        });
    });
});