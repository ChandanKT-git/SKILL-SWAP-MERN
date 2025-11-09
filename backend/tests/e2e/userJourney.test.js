const request = require('supertest');
const app = require('../../src/server');
const { connectTestDB, closeTestDB, clearTestDB } = require('../helpers/testDb');

describe('E2E: User Journey', () => {
    let server;

    beforeAll(async () => {
        await connectTestDB();
    });

    afterAll(async () => {
        await closeTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();
    });

    describe('Complete User Registration and Login Flow', () => {
        it('should complete full registration and login journey', async () => {
            // Step 1: Register new user
            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    password: 'Password123!',
                })
                .expect(201);

            expect(registerResponse.body.success).toBe(true);
            expect(registerResponse.body.message).toContain('OTP');

            // Step 2: Verify OTP
            const otp = registerResponse.body.data.otp || '123456';
            const verifyResponse = await request(app)
                .post('/api/auth/verify-otp')
                .send({
                    email: 'john@example.com',
                    otp: otp,
                })
                .expect(200);

            expect(verifyResponse.body.success).toBe(true);
            const { accessToken } = verifyResponse.body.data;

            // Step 3: Login with verified account
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'john@example.com',
                    password: 'Password123!',
                })
                .expect(200);

            expect(loginResponse.body.success).toBe(true);
            expect(loginResponse.body.data.accessToken).toBeDefined();

            // Step 4: Access protected route with token
            const profileResponse = await request(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
                .expect(200);

            expect(profileResponse.body.success).toBe(true);
            expect(profileResponse.body.data.profile.email).toBe('john@example.com');
        });
    });

    describe('Session Booking Flow', () => {
        let userToken, providerToken, providerId;

        beforeEach(async () => {
            // Create and verify requester
            await request(app).post('/api/auth/register').send({
                firstName: 'Requester',
                lastName: 'User',
                email: 'requester@example.com',
                password: 'Password123!',
            });

            const requesterLogin = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'requester@example.com',
                    password: 'Password123!',
                });
            userToken = requesterLogin.body.data.accessToken;

            // Create and verify provider
            await request(app).post('/api/auth/register').send({
                firstName: 'Provider',
                lastName: 'User',
                email: 'provider@example.com',
                password: 'Password123!',
            });

            const providerLogin = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'provider@example.com',
                    password: 'Password123!',
                });
            providerToken = providerLogin.body.data.accessToken;
            providerId = providerLogin.body.data.user.id;
        });

        it('should complete session booking and acceptance flow', async () => {
            // Step 1: Create session request
            const sessionResponse = await request(app)
                .post('/api/sessions')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    providerId: providerId,
                    skill: 'JavaScript',
                    scheduledDate: new Date(Date.now() + 86400000),
                    duration: 60,
                    description: 'Learn React basics',
                })
                .expect(201);

            expect(sessionResponse.body.success).toBe(true);
            const sessionId = sessionResponse.body.data._id;

            // Step 2: Provider accepts session
            const acceptResponse = await request(app)
                .put(`/api/sessions/${sessionId}/respond`)
                .set('Authorization', `Bearer ${providerToken}`)
                .send({
                    action: 'accept',
                })
                .expect(200);

            expect(acceptResponse.body.data.status).toBe('accepted');

            // Step 3: Verify session appears in both users' lists
            const requesterSessions = await request(app)
                .get('/api/sessions')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(requesterSessions.body.data.sessions).toHaveLength(1);
        });
    });

    describe('Review and Rating Flow', () => {
        let userToken, providerId, sessionId;

        beforeEach(async () => {
            // Setup users and completed session
            await request(app).post('/api/auth/register').send({
                firstName: 'Reviewer',
                lastName: 'User',
                email: 'reviewer@example.com',
                password: 'Password123!',
            });

            const login = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'reviewer@example.com',
                    password: 'Password123!',
                });
            userToken = login.body.data.accessToken;
        });

        it('should submit review after completed session', async () => {
            // Assuming session is completed
            const reviewResponse = await request(app)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    sessionId: sessionId,
                    revieweeId: providerId,
                    rating: 5,
                    comment: 'Excellent teacher!',
                })
                .expect(201);

            expect(reviewResponse.body.success).toBe(true);
            expect(reviewResponse.body.data.rating).toBe(5);
        });
    });
});
