const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../../src/server');
const User = require('../../src/models/User');
const emailService = require('../../src/services/emailService');

// Mock email service to prevent actual emails during testing
jest.mock('../../src/services/emailService', () => ({
    sendOTPEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-message-id' }),
    sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-message-id' }),
    sendAccountLockedEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-message-id' }),
}));

describe('Authentication Integration Tests', () => {
    let mongoServer;
    let server;

    beforeAll(async () => {
        // Start in-memory MongoDB
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();

        // Connect to the in-memory database
        await mongoose.connect(mongoUri);

        // Start the server
        server = app.listen(0); // Use random available port
    });

    afterAll(async () => {
        // Close server and database connections
        if (server) {
            server.close();
        }
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        // Clear database before each test
        await User.deleteMany({});

        // Clear email service mocks
        jest.clearAllMocks();
    });

    describe('POST /api/auth/register', () => {
        const validRegistrationData = {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            password: 'SecurePassword123!',
            confirmPassword: 'SecurePassword123!',
            acceptTerms: true,
            marketingEmails: false,
        };

        it('should register a new user successfully', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send(validRegistrationData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('Registration successful');
            expect(response.body.data.email).toBe(validRegistrationData.email);
            expect(response.body.data.isEmailVerified).toBe(false);
            expect(response.body.data.otpExpires).toBeDefined();

            // Check if user was created in database
            const user = await User.findOne({ email: validRegistrationData.email }).select('+otp');
            expect(user).toBeTruthy();
            expect(user.firstName).toBe(validRegistrationData.firstName);
            expect(user.isEmailVerified).toBe(false);
            expect(user.otp.code).toBeDefined();

            // Check if OTP email was sent
            expect(emailService.sendOTPEmail).toHaveBeenCalledWith(
                validRegistrationData.email,
                expect.any(String),
                validRegistrationData.firstName
            );
        });

        it('should return error for duplicate email', async () => {
            // Create user first
            await User.create({
                ...validRegistrationData,
                isEmailVerified: true,
            });

            const response = await request(app)
                .post('/api/auth/register')
                .send(validRegistrationData)
                .expect(409);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('already exists');
        });

        it('should update existing unverified user', async () => {
            // Create unverified user first
            await User.create({
                firstName: 'Jane',
                lastName: 'Smith',
                email: validRegistrationData.email,
                password: 'OldPassword123!',
                isEmailVerified: false,
            });

            const response = await request(app)
                .post('/api/auth/register')
                .send(validRegistrationData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('Registration updated');

            // Check if user was updated
            const user = await User.findOne({ email: validRegistrationData.email });
            expect(user.firstName).toBe(validRegistrationData.firstName);
            expect(user.lastName).toBe(validRegistrationData.lastName);
        });

        it('should validate required fields', async () => {
            const invalidData = { ...validRegistrationData };
            delete invalidData.firstName;

            const response = await request(app)
                .post('/api/auth/register')
                .send(invalidData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.details).toBeDefined();
            expect(response.body.error.details.some(d => d.field === 'firstName')).toBe(true);
        });

        it('should validate email format', async () => {
            const invalidData = {
                ...validRegistrationData,
                email: 'invalid-email',
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(invalidData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.details.some(d => d.field === 'email')).toBe(true);
        });

        it('should validate password strength', async () => {
            const invalidData = {
                ...validRegistrationData,
                password: 'weak',
                confirmPassword: 'weak',
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(invalidData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.details.some(d => d.field === 'password')).toBe(true);
        });

        it('should validate password confirmation', async () => {
            const invalidData = {
                ...validRegistrationData,
                confirmPassword: 'DifferentPassword123!',
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(invalidData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.details.some(d => d.field === 'confirmPassword')).toBe(true);
        });

        it('should require terms acceptance', async () => {
            const invalidData = {
                ...validRegistrationData,
                acceptTerms: false,
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(invalidData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.details.some(d => d.field === 'acceptTerms')).toBe(true);
        });
    });

    describe('POST /api/auth/verify-otp', () => {
        let testUser;
        let validOTP;

        beforeEach(async () => {
            // Create test user with OTP
            validOTP = '123456';
            testUser = await User.create({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                password: 'SecurePassword123!',
                isEmailVerified: false,
                otp: {
                    code: validOTP,
                    expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
                    attempts: 0,
                    generatedAt: new Date(),
                },
            });
        });

        it('should verify OTP successfully', async () => {
            const response = await request(app)
                .post('/api/auth/verify-otp')
                .send({
                    email: testUser.email,
                    otp: validOTP,
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('verified successfully');
            expect(response.body.data.user.isEmailVerified).toBe(true);
            expect(response.body.data.tokens.accessToken).toBeDefined();
            expect(response.body.data.tokens.refreshToken).toBeDefined();

            // Check if user was updated in database
            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser.isEmailVerified).toBe(true);
            expect(updatedUser.otp?.code).toBeUndefined();

            // Check if welcome email was sent
            expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(
                testUser.email,
                testUser.firstName
            );
        });

        it('should return error for invalid OTP', async () => {
            const response = await request(app)
                .post('/api/auth/verify-otp')
                .send({
                    email: testUser.email,
                    otp: '999999',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('Invalid OTP');

            // Check if attempts were incremented
            const updatedUser = await User.findById(testUser._id).select('+otp');
            expect(updatedUser.otp.attempts).toBe(1);
        });

        it('should return error for expired OTP', async () => {
            // Update user with expired OTP
            testUser.otp.expires = new Date(Date.now() - 1000); // 1 second ago
            await testUser.save();

            const response = await request(app)
                .post('/api/auth/verify-otp')
                .send({
                    email: testUser.email,
                    otp: validOTP,
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('expired');
        });

        it('should return error for non-existent user', async () => {
            const response = await request(app)
                .post('/api/auth/verify-otp')
                .send({
                    email: 'nonexistent@example.com',
                    otp: validOTP,
                })
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('User not found');
        });

        it('should return error for already verified user', async () => {
            // Mark user as verified
            testUser.isEmailVerified = true;
            await testUser.save();

            const response = await request(app)
                .post('/api/auth/verify-otp')
                .send({
                    email: testUser.email,
                    otp: validOTP,
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('already verified');
        });

        it('should handle maximum OTP attempts', async () => {
            // Set attempts to maximum
            testUser.otp.attempts = 4; // Will become 5 after failed attempt
            await testUser.save();

            const response = await request(app)
                .post('/api/auth/verify-otp')
                .send({
                    email: testUser.email,
                    otp: '999999',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('Maximum OTP attempts exceeded');
        });
    });

    describe('POST /api/auth/resend-otp', () => {
        let testUser;

        beforeEach(async () => {
            testUser = await User.create({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                password: 'SecurePassword123!',
                isEmailVerified: false,
                otp: {
                    code: '123456',
                    expires: new Date(Date.now() + 10 * 60 * 1000),
                    attempts: 0,
                    generatedAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
                },
            });
        });

        it('should resend OTP successfully', async () => {
            const response = await request(app)
                .post('/api/auth/resend-otp')
                .send({
                    email: testUser.email,
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('sent successfully');
            expect(response.body.data.otpExpires).toBeDefined();

            // Check if new OTP was generated
            const updatedUser = await User.findById(testUser._id).select('+otp');
            expect(updatedUser.otp).toBeDefined();
            expect(updatedUser.otp.code).toBeDefined();
            expect(updatedUser.otp.attempts).toBe(0); // Reset attempts

            // Check if OTP email was sent
            expect(emailService.sendOTPEmail).toHaveBeenCalledWith(
                testUser.email,
                expect.any(String),
                testUser.firstName
            );
        });

        it('should return error for non-existent user', async () => {
            const response = await request(app)
                .post('/api/auth/resend-otp')
                .send({
                    email: 'nonexistent@example.com',
                })
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('User not found');
        });

        it('should return error for already verified user', async () => {
            testUser.isEmailVerified = true;
            await testUser.save();

            const response = await request(app)
                .post('/api/auth/resend-otp')
                .send({
                    email: testUser.email,
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('already verified');
        });

        it('should enforce rate limiting', async () => {
            // Set recent OTP generation time
            testUser.otp.generatedAt = new Date(Date.now() - 30 * 1000); // 30 seconds ago
            await testUser.save();

            const response = await request(app)
                .post('/api/auth/resend-otp')
                .send({
                    email: testUser.email,
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('Please wait');
        });
    });

    describe('POST /api/auth/login', () => {
        let verifiedUser;
        let unverifiedUser;

        beforeEach(async () => {
            // Create verified user
            verifiedUser = await User.create({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                password: 'SecurePassword123!',
                isEmailVerified: true,
            });

            // Create unverified user
            unverifiedUser = await User.create({
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.smith@example.com',
                password: 'SecurePassword123!',
                isEmailVerified: false,
            });
        });

        it('should login verified user successfully', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: verifiedUser.email,
                    password: 'SecurePassword123!',
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('Login successful');
            expect(response.body.data.user.email).toBe(verifiedUser.email);
            expect(response.body.data.user.isEmailVerified).toBe(true);
            expect(response.body.data.tokens.accessToken).toBeDefined();
            expect(response.body.data.tokens.refreshToken).toBeDefined();

            // Check if last login was updated
            const updatedUser = await User.findById(verifiedUser._id);
            expect(updatedUser.lastLogin).toBeDefined();
        });

        it('should handle unverified user login', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: unverifiedUser.email,
                    password: 'SecurePassword123!',
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('verify your email');
            expect(response.body.data.isEmailVerified).toBe(false);
            expect(response.body.data.otpExpires).toBeDefined();

            // Check if new OTP was generated
            const updatedUser = await User.findById(unverifiedUser._id).select('+otp');
            expect(updatedUser.otp).toBeDefined();
            expect(updatedUser.otp.code).toBeDefined();

            // Check if OTP email was sent
            expect(emailService.sendOTPEmail).toHaveBeenCalled();
        });

        it('should return error for invalid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: verifiedUser.email,
                    password: 'WrongPassword123!',
                })
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('Invalid email or password');

            // Check if login attempts were incremented
            const updatedUser = await User.findById(verifiedUser._id).select('+loginAttempts');
            expect(updatedUser.loginAttempts).toBe(1);
        });

        it('should return error for non-existent user', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'SecurePassword123!',
                })
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('Invalid email or password');
        });

        it('should handle account locking after multiple failed attempts', async () => {
            // Set user to have 4 failed attempts (next will lock)
            verifiedUser.loginAttempts = 4;
            await verifiedUser.save();

            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: verifiedUser.email,
                    password: 'WrongPassword123!',
                })
                .expect(401);

            expect(response.body.success).toBe(false);

            // Check if account was locked
            const updatedUser = await User.findById(verifiedUser._id).select('+loginAttempts +lockUntil');
            expect(updatedUser.loginAttempts).toBe(5);
            expect(updatedUser.lockUntil).toBeDefined();
            expect(updatedUser.lockUntil.getTime()).toBeGreaterThan(Date.now());
        });

        it('should handle remember me option', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: verifiedUser.email,
                    password: 'SecurePassword123!',
                    rememberMe: true,
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.tokens.accessToken).toBeDefined();

            // Token should have longer expiration when rememberMe is true
            // This would need to be tested by decoding the token and checking expiration
        });
    });

    describe('POST /api/auth/refresh-token', () => {
        let testUser;
        let refreshToken;

        beforeEach(async () => {
            testUser = await User.create({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                password: 'SecurePassword123!',
                isEmailVerified: true,
            });

            // Generate refresh token
            const JWTUtils = require('../../src/utils/jwt');
            refreshToken = JWTUtils.generateRefreshToken({
                id: testUser._id,
                email: testUser.email,
            });
        });

        it('should refresh token successfully', async () => {
            const response = await request(app)
                .post('/api/auth/refresh-token')
                .send({
                    refreshToken,
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('refreshed successfully');
            expect(response.body.data.accessToken).toBeDefined();
            expect(response.body.data.tokenType).toBe('Bearer');
        });

        it('should return error for invalid refresh token', async () => {
            const response = await request(app)
                .post('/api/auth/refresh-token')
                .send({
                    refreshToken: 'invalid-token',
                })
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('Invalid refresh token');
        });

        it('should return error for non-existent user', async () => {
            // Delete the user
            await User.findByIdAndDelete(testUser._id);

            const response = await request(app)
                .post('/api/auth/refresh-token')
                .send({
                    refreshToken,
                })
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('User not found');
        });

        it('should return error for inactive user', async () => {
            // Deactivate user
            testUser.status = 'suspended';
            await testUser.save();

            const response = await request(app)
                .post('/api/auth/refresh-token')
                .send({
                    refreshToken,
                })
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('not active');
        });
    });
});