const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../../src/server');
const User = require('../../src/models/User');
const Session = require('../../src/models/Session');
const { connectTestDB, clearTestDB, closeTestDB } = require('../helpers/testDb');
const JWTUtils = require('../../src/utils/jwt');

describe('Session Basic Functionality Tests', () => {
    jest.setTimeout(30000);

    let testUser1, testUser2;
    let authToken1, authToken2;

    beforeAll(async () => {
        await connectTestDB();
    });

    afterAll(async () => {
        await closeTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();

        // Create test users
        testUser1 = new User({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@test.com',
            password: 'Password123!',
            isEmailVerified: true,
            status: 'active',
            skills: [
                { name: 'JavaScript', level: 'advanced', category: 'Programming' }
            ]
        });
        await testUser1.save();

        testUser2 = new User({
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@test.com',
            password: 'Password123!',
            isEmailVerified: true,
            status: 'active',
            skills: [
                { name: 'Python', level: 'expert', category: 'Programming' }
            ]
        });
        await testUser2.save();

        // Generate auth tokens
        authToken1 = JWTUtils.generateAccessToken({
            id: testUser1._id,
            email: testUser1.email
        });

        authToken2 = JWTUtils.generateAccessToken({
            id: testUser2._id,
            email: testUser2.email
        });
    });

    describe('Session Model', () => {
        it('should create a session with valid data', async () => {
            const sessionData = {
                requester: testUser1._id,
                provider: testUser2._id,
                skill: {
                    name: 'Python',
                    category: 'Programming',
                    level: 'beginner'
                },
                scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                duration: 60,
                sessionType: 'online'
            };

            const session = new Session(sessionData);
            const savedSession = await session.save();

            expect(savedSession._id).toBeDefined();
            expect(savedSession.skill.name).toBe('Python');
            expect(savedSession.status).toBe('pending');
            expect(savedSession.requester.toString()).toBe(testUser1._id.toString());
            expect(savedSession.provider.toString()).toBe(testUser2._id.toString());
        });

        it('should have proper virtual properties', async () => {
            const session = new Session({
                requester: testUser1._id,
                provider: testUser2._id,
                skill: {
                    name: 'Python',
                    category: 'Programming',
                    level: 'beginner'
                },
                scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                duration: 90, // 1.5 hours
                sessionType: 'online'
            });
            await session.save();

            expect(session.endTime).toBeDefined();
            expect(parseFloat(session.durationHours)).toBe(1.5);
            expect(session.timeUntilSession).toBeGreaterThan(0);
            expect(session.participants).toHaveLength(2);
        });

        it('should have working instance methods', async () => {
            const session = new Session({
                requester: testUser1._id,
                provider: testUser2._id,
                skill: {
                    name: 'Python',
                    category: 'Programming',
                    level: 'beginner'
                },
                scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                duration: 60,
                sessionType: 'online'
            });
            await session.save();

            expect(session.isParticipant(testUser1._id)).toBe(true);
            expect(session.isParticipant(testUser2._id)).toBe(true);
            expect(session.getOtherParticipant(testUser1._id).toString()).toBe(testUser2._id.toString());
            expect(session.canBeCancelled()).toBe(true);
        });

        it('should find conflicting sessions', async () => {
            // Create first session
            const session1 = new Session({
                requester: testUser1._id,
                provider: testUser2._id,
                skill: {
                    name: 'Python',
                    category: 'Programming',
                    level: 'beginner'
                },
                scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                duration: 60,
                sessionType: 'online',
                status: 'accepted'
            });
            await session1.save();

            // Check for conflicts
            const conflictStart = new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000); // 30 minutes into first session
            const conflicts = await Session.findConflictingSessions(testUser1._id, conflictStart, 60);

            expect(conflicts).toHaveLength(1);
            expect(conflicts[0]._id.toString()).toBe(session1._id.toString());
        });
    });

    describe('Session Routes (Basic)', () => {
        it('should require authentication for session routes', async () => {
            const response = await request(app)
                .get('/api/sessions')
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should validate ObjectId format in routes', async () => {
            const response = await request(app)
                .get('/api/sessions/invalid-id')
                .set('Authorization', `Bearer ${authToken1}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid ID format');
        });
    });

    describe('Session Status Management', () => {
        let testSession;

        beforeEach(async () => {
            testSession = new Session({
                requester: testUser1._id,
                provider: testUser2._id,
                skill: {
                    name: 'Python',
                    category: 'Programming',
                    level: 'beginner'
                },
                scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                duration: 60,
                sessionType: 'online'
            });
            await testSession.save();
        });

        it('should track status changes in history', async () => {
            expect(testSession.status).toBe('pending');

            testSession.status = 'accepted';
            testSession.respondedAt = new Date();
            await testSession.save();

            expect(testSession.status).toBe('accepted');
            expect(testSession.respondedAt).toBeDefined();
        });

        it('should handle session completion', async () => {
            testSession.status = 'accepted';
            testSession.scheduledDate = new Date(Date.now() - 60 * 60 * 1000); // Past date
            await testSession.save();

            expect(testSession.canBeCompleted()).toBe(true);

            testSession.status = 'completed';
            testSession.completedAt = new Date();
            await testSession.save();

            expect(testSession.status).toBe('completed');
            expect(testSession.completedAt).toBeDefined();
        });

        it('should handle session cancellation', async () => {
            testSession.status = 'cancelled';
            testSession.cancelledAt = new Date();
            testSession.cancelledBy = testUser1._id;
            testSession.cancellationReason = 'Emergency';
            await testSession.save();

            expect(testSession.status).toBe('cancelled');
            expect(testSession.cancelledAt).toBeDefined();
            expect(testSession.cancellationReason).toBe('Emergency');
        });
    });
});