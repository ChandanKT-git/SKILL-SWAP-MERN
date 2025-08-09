const PasswordUtils = require('../../src/utils/password');

describe('PasswordUtils', () => {
    describe('hash', () => {
        it('should hash a password successfully', async () => {
            const password = 'TestPassword123!';
            const hashedPassword = await PasswordUtils.hash(password);

            expect(hashedPassword).toBeDefined();
            expect(hashedPassword).not.toBe(password);
            expect(hashedPassword.length).toBeGreaterThan(50);
        });

        it('should throw error for invalid password', async () => {
            await expect(PasswordUtils.hash('')).rejects.toThrow('Password must be a non-empty string');
            await expect(PasswordUtils.hash(null)).rejects.toThrow('Password must be a non-empty string');
            await expect(PasswordUtils.hash(123)).rejects.toThrow('Password must be a non-empty string');
        });

        it('should generate different hashes for same password', async () => {
            const password = 'TestPassword123!';
            const hash1 = await PasswordUtils.hash(password);
            const hash2 = await PasswordUtils.hash(password);

            expect(hash1).not.toBe(hash2);
        });
    });

    describe('compare', () => {
        it('should return true for matching password', async () => {
            const password = 'TestPassword123!';
            const hashedPassword = await PasswordUtils.hash(password);

            const isMatch = await PasswordUtils.compare(password, hashedPassword);
            expect(isMatch).toBe(true);
        });

        it('should return false for non-matching password', async () => {
            const password = 'TestPassword123!';
            const wrongPassword = 'WrongPassword123!';
            const hashedPassword = await PasswordUtils.hash(password);

            const isMatch = await PasswordUtils.compare(wrongPassword, hashedPassword);
            expect(isMatch).toBe(false);
        });

        it('should throw error for missing parameters', async () => {
            await expect(PasswordUtils.compare('', 'hash')).rejects.toThrow('Both passwords are required');
            await expect(PasswordUtils.compare('password', '')).rejects.toThrow('Both passwords are required');
        });
    });

    describe('validateStrength', () => {
        it('should validate strong password', () => {
            const strongPassword = 'VeryStrongP4ssw0rd!@#$';
            const result = PasswordUtils.validateStrength(strongPassword);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.strength.level).toBe('very-strong');
        });

        it('should reject weak password', () => {
            const weakPassword = 'weak';
            const result = PasswordUtils.validateStrength(weakPassword);

            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(['very-weak', 'weak']).toContain(result.strength.level);
        });

        it('should check for minimum length', () => {
            const shortPassword = '1234567';
            const result = PasswordUtils.validateStrength(shortPassword);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Password must be at least 8 characters long');
        });

        it('should check for character requirements', () => {
            const noUpperCase = 'lowercase123!';
            const result1 = PasswordUtils.validateStrength(noUpperCase);
            expect(result1.errors).toContain('Password must contain at least one uppercase letter');

            const noLowerCase = 'UPPERCASE123!';
            const result2 = PasswordUtils.validateStrength(noLowerCase);
            expect(result2.errors).toContain('Password must contain at least one lowercase letter');

            const noNumbers = 'NoNumbers!@#';
            const result3 = PasswordUtils.validateStrength(noNumbers);
            expect(result3.errors).toContain('Password must contain at least one number');

            const noSpecialChar = 'NoSpecialChar123';
            const result4 = PasswordUtils.validateStrength(noSpecialChar);
            expect(result4.errors).toContain('Password must contain at least one special character');
        });

        it('should detect common patterns', () => {
            const commonPassword = 'Password123!';
            const result = PasswordUtils.validateStrength(commonPassword);

            expect(result.errors).toContain('Password contains common patterns that are not secure');
        });

        it('should detect sequential characters', () => {
            const sequentialPassword = 'Abc123!@#';
            const result = PasswordUtils.validateStrength(sequentialPassword);

            expect(result.errors).toContain('Password should not contain sequential characters (e.g., 123, abc)');
        });
    });

    describe('generateSecure', () => {
        it('should generate password of specified length', () => {
            const length = 16;
            const password = PasswordUtils.generateSecure(length);

            expect(password).toBeDefined();
            expect(password.length).toBe(length);
        });

        it('should generate different passwords each time', () => {
            const password1 = PasswordUtils.generateSecure();
            const password2 = PasswordUtils.generateSecure();

            expect(password1).not.toBe(password2);
        });

        it('should respect character type options', () => {
            const onlyNumbers = PasswordUtils.generateSecure(8, {
                includeLowercase: false,
                includeUppercase: false,
                includeNumbers: true,
                includeSpecialChars: false,
            });

            expect(/^\d+$/.test(onlyNumbers)).toBe(true);
        });

        it('should throw error if no character types selected', () => {
            expect(() => {
                PasswordUtils.generateSecure(8, {
                    includeLowercase: false,
                    includeUppercase: false,
                    includeNumbers: false,
                    includeSpecialChars: false,
                });
            }).toThrow('At least one character type must be included');
        });
    });

    describe('hasSequentialChars', () => {
        it('should detect alphabetical sequences', () => {
            expect(PasswordUtils.hasSequentialChars('abc123')).toBe(true);
            expect(PasswordUtils.hasSequentialChars('xyz789')).toBe(true);
            expect(PasswordUtils.hasSequentialChars('cba321')).toBe(true); // reverse
        });

        it('should detect numerical sequences', () => {
            expect(PasswordUtils.hasSequentialChars('pass123')).toBe(true);
            expect(PasswordUtils.hasSequentialChars('test789')).toBe(true);
            expect(PasswordUtils.hasSequentialChars('word321')).toBe(true); // reverse
        });

        it('should detect keyboard sequences', () => {
            expect(PasswordUtils.hasSequentialChars('qwe123')).toBe(true);
            expect(PasswordUtils.hasSequentialChars('asd456')).toBe(true);
        });

        it('should return false for non-sequential passwords', () => {
            expect(PasswordUtils.hasSequentialChars('ComplexP4ssw0rd!')).toBe(false);
            expect(PasswordUtils.hasSequentialChars('Random1357!')).toBe(false);
        });
    });

    describe('calculateStrength', () => {
        it('should calculate strength correctly', () => {
            const veryStrong = PasswordUtils.calculateStrength('VeryStrongPassword123!@#$');
            expect(veryStrong.level).toBe('very-strong');
            expect(veryStrong.score).toBeGreaterThanOrEqual(7);

            const weak = PasswordUtils.calculateStrength('weak');
            expect(['very-weak', 'weak']).toContain(weak.level);
            expect(weak.score).toBeLessThan(3);
        });

        it('should provide helpful feedback', () => {
            const shortPassword = PasswordUtils.calculateStrength('Short1!');
            expect(shortPassword.feedback).toContain('Consider using a longer password');

            const noSpecialChars = PasswordUtils.calculateStrength('NoSpecialChars123');
            expect(noSpecialChars.feedback).toContain('Add special characters for better security');
        });
    });

    describe('generateSalt', () => {
        it('should generate salt successfully', async () => {
            const salt = await PasswordUtils.generateSalt();

            expect(salt).toBeDefined();
            expect(typeof salt).toBe('string');
            expect(salt.length).toBeGreaterThan(20);
        });

        it('should generate different salts', async () => {
            const salt1 = await PasswordUtils.generateSalt();
            const salt2 = await PasswordUtils.generateSalt();

            expect(salt1).not.toBe(salt2);
        });
    });

    describe('hashWithSalt', () => {
        it('should hash password with custom salt', async () => {
            const password = 'TestPassword123!';
            const salt = await PasswordUtils.generateSalt();
            const hashedPassword = await PasswordUtils.hashWithSalt(password, salt);

            expect(hashedPassword).toBeDefined();
            expect(hashedPassword).not.toBe(password);
            expect(hashedPassword.length).toBeGreaterThan(50);
        });

        it('should produce same hash with same salt', async () => {
            const password = 'TestPassword123!';
            const salt = await PasswordUtils.generateSalt();

            const hash1 = await PasswordUtils.hashWithSalt(password, salt);
            const hash2 = await PasswordUtils.hashWithSalt(password, salt);

            expect(hash1).toBe(hash2);
        });
    });
});