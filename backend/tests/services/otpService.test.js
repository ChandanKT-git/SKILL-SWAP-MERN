const OTPService = require('../../src/services/otpService');

describe('OTPService', () => {
    describe('generateOTP', () => {
        it('should generate OTP of specified length', () => {
            const length = 6;
            const otp = OTPService.generateOTP(length);

            expect(otp).toBeDefined();
            expect(otp.length).toBe(length);
            expect(typeof otp).toBe('string');
        });

        it('should generate numeric OTP by default', () => {
            const otp = OTPService.generateOTP(6);
            expect(/^\d+$/.test(otp)).toBe(true);
        });

        it('should generate alphabetic OTP when specified', () => {
            const otp = OTPService.generateOTP(6, { type: 'alphabetic' });
            expect(/^[A-Z]+$/.test(otp)).toBe(true);
        });

        it('should generate alphanumeric OTP when specified', () => {
            const otp = OTPService.generateOTP(6, { type: 'alphanumeric' });
            expect(/^[A-Z0-9]+$/.test(otp)).toBe(true);
        });

        it('should exclude similar characters when specified', () => {
            const otp = OTPService.generateOTP(100, { type: 'numeric', excludeSimilar: true });
            expect(otp).not.toContain('0');
            expect(otp).not.toContain('1');
        });

        it('should generate different OTPs each time', () => {
            const otp1 = OTPService.generateOTP(6);
            const otp2 = OTPService.generateOTP(6);

            expect(otp1).not.toBe(otp2);
        });

        it('should throw error for invalid type', () => {
            expect(() => {
                OTPService.generateOTP(6, { type: 'invalid' });
            }).toThrow('Invalid OTP type');
        });
    });

    describe('generateOTPWithExpiration', () => {
        it('should generate OTP with expiration data', () => {
            const otpData = OTPService.generateOTPWithExpiration();

            expect(otpData.code).toBeDefined();
            expect(otpData.expires).toBeInstanceOf(Date);
            expect(otpData.attempts).toBe(0);
            expect(otpData.generatedAt).toBeInstanceOf(Date);
        });

        it('should set correct expiration time', () => {
            const expiresInMinutes = 5;
            const otpData = OTPService.generateOTPWithExpiration({ expiresInMinutes });

            const expectedExpiration = new Date(Date.now() + expiresInMinutes * 60 * 1000);
            const timeDiff = Math.abs(otpData.expires.getTime() - expectedExpiration.getTime());

            expect(timeDiff).toBeLessThan(1000); // Within 1 second
        });

        it('should use custom length', () => {
            const length = 8;
            const otpData = OTPService.generateOTPWithExpiration({ length });

            expect(otpData.code.length).toBe(length);
        });
    });

    describe('validateOTP', () => {
        let validOTPData;

        beforeEach(() => {
            validOTPData = OTPService.generateOTPWithExpiration({ expiresInMinutes: 10 });
        });

        it('should validate correct OTP', () => {
            const result = OTPService.validateOTP(validOTPData.code, validOTPData);

            expect(result.isValid).toBe(true);
            expect(result.error).toBeNull();
            expect(result.shouldRegenerate).toBe(false);
        });

        it('should reject incorrect OTP', () => {
            const wrongOTP = '000000';
            const result = OTPService.validateOTP(wrongOTP, validOTPData);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Invalid OTP');
            expect(result.shouldRegenerate).toBe(false);
        });

        it('should reject expired OTP', () => {
            const expiredOTPData = {
                code: '123456',
                expires: new Date(Date.now() - 1000), // Expired 1 second ago
                attempts: 0,
            };

            const result = OTPService.validateOTP('123456', expiredOTPData);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('OTP has expired');
            expect(result.shouldRegenerate).toBe(true);
        });

        it('should reject OTP after max attempts', () => {
            const maxAttemptsOTPData = {
                ...validOTPData,
                attempts: 5,
            };

            const result = OTPService.validateOTP(validOTPData.code, maxAttemptsOTPData);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Maximum OTP attempts exceeded');
            expect(result.shouldRegenerate).toBe(true);
        });

        it('should handle missing OTP data', () => {
            const result = OTPService.validateOTP('123456', null);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('No OTP found or OTP data is incomplete');
            expect(result.shouldRegenerate).toBe(true);
        });

        it('should handle invalid input format', () => {
            const result = OTPService.validateOTP(null, validOTPData);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Invalid OTP format');
            expect(result.shouldRegenerate).toBe(false);
        });

        it('should be case insensitive by default', () => {
            const alphaOTPData = OTPService.generateOTPWithExpiration({
                type: 'alphabetic',
                expiresInMinutes: 10
            });

            const result = OTPService.validateOTP(
                alphaOTPData.code.toLowerCase(),
                alphaOTPData
            );

            expect(result.isValid).toBe(true);
        });

        it('should respect case sensitivity option', () => {
            const alphaOTPData = OTPService.generateOTPWithExpiration({
                type: 'alphabetic',
                expiresInMinutes: 10
            });

            const result = OTPService.validateOTP(
                alphaOTPData.code.toLowerCase(),
                alphaOTPData,
                { caseSensitive: true }
            );

            expect(result.isValid).toBe(false);
        });

        it('should track remaining attempts', () => {
            const otpData = { ...validOTPData, attempts: 2 };
            const result = OTPService.validateOTP('wrong', otpData, { maxAttempts: 5 });

            expect(result.attemptsRemaining).toBe(2); // 5 - (2 + 1)
        });
    });

    describe('generateSecureOTP', () => {
        it('should generate cryptographically secure OTP', () => {
            const otp = OTPService.generateSecureOTP(8);

            expect(otp).toBeDefined();
            expect(otp.length).toBe(8);
            expect(typeof otp).toBe('string');
            expect(/^[A-F0-9]+$/.test(otp)).toBe(true); // Hex characters
        });

        it('should generate different OTPs each time', () => {
            const otp1 = OTPService.generateSecureOTP();
            const otp2 = OTPService.generateSecureOTP();

            expect(otp1).not.toBe(otp2);
        });
    });

    describe('generateTOTP', () => {
        const testSecret = 'test-secret-key';

        it('should generate TOTP', () => {
            const totp = OTPService.generateTOTP(testSecret);

            expect(totp).toBeDefined();
            expect(totp.length).toBe(6);
            expect(/^\d+$/.test(totp)).toBe(true);
        });

        it('should generate same TOTP for same time window', () => {
            const totp1 = OTPService.generateTOTP(testSecret);
            const totp2 = OTPService.generateTOTP(testSecret);

            expect(totp1).toBe(totp2);
        });

        it('should respect custom digits option', () => {
            const totp = OTPService.generateTOTP(testSecret, { digits: 8 });

            expect(totp.length).toBe(8);
        });
    });

    describe('validateTOTP', () => {
        const testSecret = 'test-secret-key';

        it('should validate correct TOTP', () => {
            const totp = OTPService.generateTOTP(testSecret);
            const isValid = OTPService.validateTOTP(totp, testSecret);

            expect(isValid).toBe(true);
        });

        it('should reject incorrect TOTP', () => {
            const isValid = OTPService.validateTOTP('000000', testSecret);

            expect(isValid).toBe(false);
        });
    });

    describe('hashOTP', () => {
        it('should hash OTP', () => {
            const otp = '123456';
            const hashedOTP = OTPService.hashOTP(otp);

            expect(hashedOTP).toBeDefined();
            expect(hashedOTP).not.toBe(otp);
            expect(hashedOTP.length).toBe(64); // SHA-256 hex length
        });

        it('should generate same hash for same OTP', () => {
            const otp = '123456';
            const hash1 = OTPService.hashOTP(otp);
            const hash2 = OTPService.hashOTP(otp);

            expect(hash1).toBe(hash2);
        });
    });

    describe('verifyHashedOTP', () => {
        it('should verify correct hashed OTP', () => {
            const otp = '123456';
            const hashedOTP = OTPService.hashOTP(otp);
            const isValid = OTPService.verifyHashedOTP(otp, hashedOTP);

            expect(isValid).toBe(true);
        });

        it('should reject incorrect hashed OTP', () => {
            const otp = '123456';
            const wrongOTP = '654321';
            const hashedOTP = OTPService.hashOTP(otp);
            const isValid = OTPService.verifyHashedOTP(wrongOTP, hashedOTP);

            expect(isValid).toBe(false);
        });
    });

    describe('generateBackupCodes', () => {
        it('should generate backup codes', () => {
            const codes = OTPService.generateBackupCodes(5, 8);

            expect(codes).toHaveLength(5);
            codes.forEach(code => {
                expect(code.length).toBe(8);
                expect(/^[A-Z0-9]+$/.test(code)).toBe(true);
            });
        });

        it('should generate unique backup codes', () => {
            const codes = OTPService.generateBackupCodes(10);
            const uniqueCodes = new Set(codes);

            expect(uniqueCodes.size).toBe(codes.length);
        });
    });

    describe('formatOTP', () => {
        it('should format OTP with spaces', () => {
            const otp = '123456';
            const formatted = OTPService.formatOTP(otp, { separator: ' ', groupSize: 3 });

            expect(formatted).toBe('123 456');
        });

        it('should format OTP with dashes', () => {
            const otp = '12345678';
            const formatted = OTPService.formatOTP(otp, { separator: '-', groupSize: 4 });

            expect(formatted).toBe('1234-5678');
        });

        it('should handle invalid input', () => {
            expect(OTPService.formatOTP(null)).toBeNull();
            expect(OTPService.formatOTP('')).toBe('');
        });
    });

    describe('getTimeRemaining', () => {
        it('should calculate time remaining correctly', () => {
            const futureDate = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
            const timeRemaining = OTPService.getTimeRemaining(futureDate);

            expect(timeRemaining.expired).toBe(false);
            expect(timeRemaining.minutes).toBeGreaterThanOrEqual(4); // Should be around 4-5 minutes
            expect(timeRemaining.totalSeconds).toBeGreaterThan(240); // More than 4 minutes
            expect(timeRemaining.formatted).toMatch(/^\d+:\d{2}$/);
        });

        it('should handle expired date', () => {
            const pastDate = new Date(Date.now() - 1000); // 1 second ago
            const timeRemaining = OTPService.getTimeRemaining(pastDate);

            expect(timeRemaining.expired).toBe(true);
            expect(timeRemaining.totalSeconds).toBe(0);
            expect(timeRemaining.minutes).toBe(0);
            expect(timeRemaining.seconds).toBe(0);
        });

        it('should format time correctly', () => {
            const futureDate = new Date(Date.now() + 125 * 1000); // 2 minutes 5 seconds
            const timeRemaining = OTPService.getTimeRemaining(futureDate);

            expect(timeRemaining.formatted).toBe('2:05');
        });
    });
});