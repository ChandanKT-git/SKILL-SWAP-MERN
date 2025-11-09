/**
 * Full System Integration Tests
 * Tests complete user journeys across all features
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/server');
const User = require('../../src/models/User');
const Session = require('../../src/models/Session');
const Review = require('../../src/models/Review');

let mongoServer;
let testUsers = {};
let authTokens = {};

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});
    await Review.deleteMany({});
    testUsers = {};
    authTokens = {};
});

describe('Full System Integration Tests', () => {
    describe('Complete User Journey: Registration to Session Completion', () => {
        it('should complete full user lifecycle', async () => {
            // 1. Register two users
            const user1Data = {
                email: 'teacher@test.com',
                password: 'Password123!',
                firstName: 'John',
                lastName: 'Teacher',
                skillsOffered: ['JavaScript', 'React'],
                skillsWanted: ['Python']
            };

            const user2Data = {
                email: 'learner@test.com',
                password: 'Password123!',
                firstName: 'Jane',
                lastName: 'Learner',
                skillsOffered: ['Python'],
                skillsWanted: ['JavaScript']
            };

            const registerRes1 = await request(app)
                .post('/api/auth/register')
                .send(user1Data)
                .expect(201);

            const registerRes2 = await request(app)
                .post('/api/auth/register')
                .send(user2Data)
                .expect(201);

            expect(registerRes1.body.success).toBe(true);
            expect(registerRes2.body.success).toBe(true);

            // 2. Verify OTP for both users
            const user1 = await User.findOne({ email: user1Data.email });
            const user2 = await User.findOne({ email: user2Data.email });

            await request(app)
                .post('/api/auth/verify-otp')
                .send({ email: user1Data.email, otp: user1.otp.code })
                .expect(200);

            await request(app)
                .post('/api/auth/verify-otp')
                .send({ email: user2Data.email, otp: user2.otp.code })
                .expect(200);

            // 3. Login both users
            const loginRes1 = await request(app)
                .post('/api/auth/login')
                .send({ email: user1Data.email, password: user1Data.password })
                .expect(200);

            const loginRes2 = await request(app)
                .post('/api/auth/login')
                .send({ email: user2Data.email, password: user2Data.password })
                .expect(200);

            const token1 = loginRes1.body.data.token;
            const token2 = loginRes2.body.data.token;

            // 4. User2 searches for JavaScript skills
            const searchRes = await request(app)
                .get('/api/users/search')
                .query({ skill: 'JavaScript' })
                .set('Authorization', `Bearer ${token2}`)
                .expect(200);

            expect(searchRes.body.data.users.length).toBeGreaterThan(0);
            expect(searchRes.body.data.users[0].skillsOffered).toContain('JavaScript');

            // 5. User2 books a session with User1
            const bookingRes = await request(app)
                .post('/api/sessions/book')
                .set('Authorization', `Bearer ${token2}`)
                .send({
                    providerId: user1._id.toString(),
                    skill: 'JavaScript',
                    description: 'Learn React basics',
                    scheduledDate: new Date(Date.now() + 86400000).toISOString(),
                    duration: 60
                })
                .expect(201);

            expect(bookingRes.body.data.session.status).toBe('pending');
            const sessionId = bookingRes.body.data.session._id;

            // 6. User1 accepts the session
            const acceptRes = await request(app)
                .put(`/api/sessions/${sessionId}/respond`)
                .set('Authorization', `Bearer ${token1}`)
                .send({ status: 'accepted' })
                .expect(200);

            expect(acceptRes.body.data.session.status).toBe('accepted');

            // 7. Mark session as completed
            const completeRes = await request(app)
                .put(`/api/sessions/${sessionId}/complete`)
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            expect(completeRes.body.data.session.status).toBe('completed');

            // 8. User2 submits a review
            const reviewRes = await request(app)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${token2}`)
                .send({
                    sessionId: sessionId,
                    revieweeId: user1._id.toString(),
                    rating: 5,
                    comment: 'Excellent teacher!'
                })
                .expect(201);

            expect(reviewRes.body.data.review.rating).toBe(5);

            // 9. Verify user1's rating was updated
            const profileRes = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            expect(profileRes.body.data.user.rating.average).toBe(5);
            expect(profileRes.body.data.user.rating.count).toBe(1);
        }, 30000);
    });

    describe('Admin Workflow Integration', () => {
        it('should handle admin moderation workflow', async () => {
            // Create admin user
            const adminUser = await User.create({
                email: 'admin@test.com',
                password: 'Password123!',
                firstName: 'Admin',
                lastName: 'User',
                role: 'admin',
                isVerified: true
            });

            // Create regular user
            const regularUser = await User.create({
                email: 'user@test.com',
                password: 'Password123!',
                firstName: 'Regular',
                lastName: 'User',
                isVerified: true
            });

            // Login as admin
            const adminLoginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: 'admin@test.com', password: 'Password123!' })
                .expect(200);

            const adminToken = adminLoginRes.body.data.token;

            // Get all users
            const usersRes = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(usersRes.body.data.users.length).toBeGreaterThanOrEqual(2);

            // Suspend regular user
            const suspendRes = await request(app)
                .put(`/api/admin/users/${regularUser._id}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ isActive: false })
                .expect(200);

            expect(suspendRes.body.data.user.isActive).toBe(false);

            // Verify suspended user cannot login
            const loginAttempt = await request(app)
                .post('/api/auth/login')
                .send({ email: 'user@test.com', password: 'Password123!' })
                .expect(403);

            expect(loginAttempt.body.success).toBe(false);
        }, 20000);
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle concurrent session bookings', async () => {
            const user1 = await User.create({
                email: 'provider@test.com',
                password: 'Password123!',
                firstName: 'Provider',
                lastName: 'User',
                isVerified: true,
                skillsOffered: ['JavaScript']
            });

            const user2 = await User.create({
                email: 'learner1@test.com',
                password: 'Password123!',
                firstName: 'Learner',
                lastName: 'One',
                isVerified: true
            });

            const user3 = await User.create({
                email: 'learner2@test.com',
                password: 'Password123!',
                firstName: 'Learner',
                lastName: 'Two',
                isVerified: true
            });

            const loginRes2 = await request(app)
                .post('/api/auth/login')
                .send({ email: 'learner1@test.com', password: 'Password123!' });

            const loginRes3 = await request(app)
                .post('/api/auth/login')
                .send({ email: 'learner2@test.com', password: 'Password123!' });

            const token2 = loginRes2.body.data.token;
            const token3 = loginRes3.body.data.token;

            const scheduledDate = new Date(Date.now() + 86400000).toISOString();

            // Both users try to book same time slot
            const booking1 = request(app)
                .post('/api/sessions/book')
                .set('Authorization', `Bearer ${token2}`)
                .send({
                    providerId: user1._id.toString(),
                    skill: 'JavaScript',
                    scheduledDate,
                    duration: 60
                });

            const booking2 = request(app)
                .post('/api/sessions/book')
                .set('Authorization', `Bearer ${token3}`)
                .send({
                    providerId: user1._id.toString(),
                    skill: 'JavaScript',
                    scheduledDate,
                    duration: 60
                });

            const results = await Promise.all([booking1, booking2]);

            // Both should succeed as they're just requests, not acceptances
            expect(results.filter(r => r.status === 201).length).toBeGreaterThanOrEqual(1);
        }, 20000);

        it('should prevent duplicate reviews for same session', async () => {
            const user1 = await User.create({
                email: 'user1@test.com',
                password: 'Password123!',
                firstName: 'User',
                lastName: 'One',
                isVerified: true
            });

            const user2 = await User.create({
                email: 'user2@test.com',
                password: 'Password123!',
                firstName: 'User',
                lastName: 'Two',
                isVerified: true
            });

            const session = await Session.create({
                requester: user1._id,
                provider: user2._id,
                skill: 'JavaScript',
                scheduledDate: new Date(),
                duration: 60,
                status: 'completed'
            });

            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: 'user1@test.com', password: 'Password123!' });

            const token = loginRes.body.data.token;

            // First review
            await request(app)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    sessionId: session._id.toString(),
                    revieweeId: user2._id.toString(),
                    rating: 5,
                    comment: 'Great!'
                })
                .expect(201);

            // Duplicate review attempt
            await request(app)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    sessionId: session._id.toString(),
                    revieweeId: user2._id.toString(),
                    rating: 4,
                    comment: 'Another review'
                })
                .expect(400);
        }, 20000);
    });
});
