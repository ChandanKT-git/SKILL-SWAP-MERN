const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../../src/server');
const User = require('../../src/models/User');
const Session = require('../../src/models/Session');
const { connectTestDB, clearTestDB, closeTestDB } = require('../helpers/testDb');
const JWTUtils = require('../../src/utils/jwt');

describe('Session Integration Tests', () => {
    jest.setTimeout(30000);

    let testUsers = [];
    let authTokens = {};

    beforeAll(async () => {
        await connectTestDB();
    });

    afterAll(async () => {
        await closeTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();
        testUsers = [];
        authTokens = {};

        // Create test users
        const usersData = [
            {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                password: 'Password123!',
                isEmailVerified: true,
                status: 'active',
                skills: [
                    { name: 'JavaScript', level: 'advanced', category: 'Programming' },
                    { name: 'React', level: 'expert', category: 'Frontend' }
                ],
                rating: { average: 4.5, count: 10 },
                availability: { isAvailable: true }
            },
            {
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane@example.com',
                password: 'Password123!',
                isEmailVerified: true,
                status: 'active',
                skills: [
                    { name: 'Python', level: 'expert', category: 'Programming' },
                    { name: 'Machine Learning', level: 'advanced', category: 'Data Science' }
                ],
                rating: { average: 4.8, count: 15 },
                availability: { isAvailable: true }
            },
            {
                firstName: 'Bob',
                lastName: 'Johnson',
                email: 'bob@example.com',
                password: 'Password123!',
                isEmailVerified: true,
                status: 'active',
                skills: [
                    { name: 'Node.js', level: 'advanced', category: 'Backend' },
                    { name: 'MongoDB', level: 'intermediate', category: 'Database' }
                ],
                rating: { average: 4.2, count: 8 },
                availability: { isAvailable: true }
            }
        ];

        for (const userData of usersData) {
            const user = new User(userData);
            await user.save();
            testUsers.push(user);

            // Generate auth token for each user
            authTokens[user.firstName.toLowerCase()] = JWTUtils.generateAccessToken({
                id: user._id,
                email: user.email
            });
        }
    });

    describe('POST /api/sessions', () => {
        it('should create a new session booking request', async () => {
            const sessionData = {
                providerId: testUsers[1]._id.toString(), // Jane
                skill: {
                    name: 'Python',
                    category: 'Programming',
                    level: 'beginner'
                },
                scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
                duration: 60, // 1 hour
                timezone: 'UTC',
                sessionType: 'online',
                requestMessage: 'I would like to learn Python fundamentals',
                meetingLink: 'https://zoom.us/j/123456789'
            };

            const response = await request(app)
                .post('/api/sessions')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send(sessionData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.skill.name).toBe(sessionData.skill.name);
            expect(response.body.data.status).toBe('pending');
            expect(response.body.data.requester._id).toBe(testUsers[0]._id.toString());
            expect(response.body.data.provider._id).toBe(testUsers[1]._id.toString());
        });

        it('should prevent booking with oneself', async () => {
            const sessionData = {
                providerId: testUsers[0]._id.toString(), // Same as requester
                skill: {
                    name: 'JavaScript',
                    category: 'Programming',
                    level: 'beginner'
                },
                scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                duration: 60,
                sessionType: 'online'
            };

            const response = await request(app)
                .post('/api/sessions')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send(sessionData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('cannot book a session with yourself');
        });

        it('should prevent booking in the past', async () => {
            const sessionData = {
                providerId: testUsers[1]._id.toString(),
                skill: {
                    name: 'Python',
                    category: 'Programming',
                    level: 'beginner'
                },
                scheduledDate: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
                duration: 60,
                sessionType: 'online'
            };

            const response = await request(app)
                .post('/api/sessions')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send(sessionData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors[0].message).toContain('future date and time');
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/sessions')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Validation failed');
            expect(response.body.errors.length).toBeGreaterThan(0);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .post('/api/sessions')
                .send({})
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/sessions', () => {
        let testSession;

        beforeEach(async () => {
            // Create a test session
            testSession = new Session({
                requester: testUsers[0]._id, // John
                provider: testUsers[1]._id,   // Jane
                skill: {
                    name: 'Python',
                    category: 'Programming',
                    level: 'beginner'
                },
                scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                duration: 60,
                sessionType: 'online',
                requestMessage: 'Python fundamentals session',
                meetingLink: 'https://zoom.us/j/123456789'
            });
            await testSession.save();
        });

        it('should get user sessions', async () => {
            const response = await request(app)
                .get('/api/sessions')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.sessions).toHaveLength(1);
            expect(response.body.data.sessions[0].userRole).toBe('requester');
        });

        it('should filter sessions by status', async () => {
            const response = await request(app)
                .get('/api/sessions')
                .query({ status: 'pending' })
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.sessions).toHaveLength(1);
            expect(response.body.data.sessions[0].status).toBe('pending');
        });

        it('should filter sessions by type (requested vs received)', async () => {
            // Test requested sessions (John as requester)
            const requestedResponse = await request(app)
                .get('/api/sessions')
                .query({ type: 'requested' })
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(200);

            expect(requestedResponse.body.data.sessions).toHaveLength(1);
            expect(requestedResponse.body.data.sessions[0].userRole).toBe('requester');

            // Test received sessions (Jane as provider)
            const receivedResponse = await request(app)
                .get('/api/sessions')
                .query({ type: 'received' })
                .set('Authorization', `Bearer ${authTokens.jane}`)
                .expect(200);

            expect(receivedResponse.body.data.sessions).toHaveLength(1);
            expect(receivedResponse.body.data.sessions[0].userRole).toBe('provider');
        });

        it('should paginate results', async () => {
            const response = await request(app)
                .get('/api/sessions')
                .query({ page: 1, limit: 10 })
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.pagination.currentPage).toBe(1);
            expect(response.body.data.pagination.limit).toBe(10);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .get('/api/sessions')
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/sessions/:sessionId', () => {
        let testSession;

        beforeEach(async () => {
            testSession = new Session({
                requester: testUsers[0]._id,
                provider: testUsers[1]._id,
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

        it('should get a specific session', async () => {
            const response = await request(app)
                .get(`/api/sessions/${testSession._id}`)
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data._id).toBe(testSession._id.toString());
            expect(response.body.data.userRole).toBe('requester');
        });

        it('should not allow access to other users sessions', async () => {
            const response = await request(app)
                .get(`/api/sessions/${testSession._id}`)
                .set('Authorization', `Bearer ${authTokens.bob}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('do not have access');
        });

        it('should return 404 for non-existent session', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const response = await request(app)
                .get(`/api/sessions/${nonExistentId}`)
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('not found');
        });

        it('should validate ObjectId format', async () => {
            const response = await request(app)
                .get('/api/sessions/invalid-id')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid ID format');
        });
    });

    describe('PUT /api/sessions/:sessionId/respond', () => {
        let testSession;

        beforeEach(async () => {
            testSession = new Session({
                requester: testUsers[0]._id, // John
                provider: testUsers[1]._id,   // Jane
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

        it('should accept a session request', async () => {
            const response = await request(app)
                .put(`/api/sessions/${testSession._id}/respond`)
                .set('Authorization', `Bearer ${authTokens.jane}`) // Provider responds
                .send({ action: 'accept' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('accepted');
        });

        it('should decline a session request', async () => {
            const response = await request(app)
                .put(`/api/sessions/${testSession._id}/respond`)
                .set('Authorization', `Bearer ${authTokens.jane}`)
                .send({
                    action: 'decline',
                    reason: 'Schedule conflict'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('rejected');
        });

        it('should not allow requester to respond', async () => {
            const response = await request(app)
                .put(`/api/sessions/${testSession._id}/respond`)
                .set('Authorization', `Bearer ${authTokens.john}`) // Requester tries to respond
                .send({ action: 'accept' })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Only the session provider can respond');
        });

        it('should not allow responding to non-pending sessions', async () => {
            testSession.status = 'accepted';
            await testSession.save();

            const response = await request(app)
                .put(`/api/sessions/${testSession._id}/respond`)
                .set('Authorization', `Bearer ${authTokens.jane}`)
                .send({ action: 'accept' })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Cannot respond to a accepted session');
        });
    });

    describe('POST /api/sessions/:sessionId/alternative-time', () => {
        let testSession;

        beforeEach(async () => {
            testSession = new Session({
                requester: testUsers[0]._id,
                provider: testUsers[1]._id,
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

        it('should propose alternative time', async () => {
            const alternativeTime = new Date(Date.now() + 48 * 60 * 60 * 1000); // 2 days from now

            const response = await request(app)
                .post(`/api/sessions/${testSession._id}/alternative-time`)
                .set('Authorization', `Bearer ${authTokens.jane}`)
                .send({
                    dateTime: alternativeTime,
                    message: 'How about this time instead?'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.responseMessage).toContain('Alternative time proposed');
        });

        it('should not allow proposing past times', async () => {
            const pastTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

            const response = await request(app)
                .post(`/api/sessions/${testSession._id}/alternative-time`)
                .set('Authorization', `Bearer ${authTokens.jane}`)
                .send({ dateTime: pastTime })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors[0].message).toContain('must be in the future');
        });
    });

    describe('PUT /api/sessions/:sessionId/cancel', () => {
        let testSession;

        beforeEach(async () => {
            testSession = new Session({
                requester: testUsers[0]._id,
                provider: testUsers[1]._id,
                skill: {
                    name: 'Python',
                    category: 'Programming',
                    level: 'beginner'
                },
                scheduledDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 2 days from now
                duration: 60,
                sessionType: 'online',
                status: 'accepted'
            });
            await testSession.save();
        });

        it('should cancel a session', async () => {
            const response = await request(app)
                .put(`/api/sessions/${testSession._id}/cancel`)
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send({ reason: 'Emergency came up' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('cancelled');
            expect(response.body.data.cancellationReason).toBe('Emergency came up');
        });

        it('should not allow cancelling with less than 2 hours notice', async () => {
            // Update session to be in 1 hour
            testSession.scheduledDate = new Date(Date.now() + 60 * 60 * 1000);
            await testSession.save();

            const response = await request(app)
                .put(`/api/sessions/${testSession._id}/cancel`)
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send({ reason: 'Last minute cancellation' })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('less than 2 hours notice');
        });
    });

    describe('PUT /api/sessions/:sessionId/complete', () => {
        let testSession;

        beforeEach(async () => {
            testSession = new Session({
                requester: testUsers[0]._id,
                provider: testUsers[1]._id,
                skill: {
                    name: 'Python',
                    category: 'Programming',
                    level: 'beginner'
                },
                scheduledDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                duration: 60,
                sessionType: 'online',
                status: 'accepted'
            });
            await testSession.save();
        });

        it('should mark session as completed', async () => {
            const response = await request(app)
                .put(`/api/sessions/${testSession._id}/complete`)
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send({ notes: 'Great session, learned a lot!' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('completed');
            expect(response.body.data.notes.requester).toBe('Great session, learned a lot!');
        });

        it('should not allow completing future sessions', async () => {
            testSession.scheduledDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
            await testSession.save();

            const response = await request(app)
                .put(`/api/sessions/${testSession._id}/complete`)
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('accepted sessions that have started');
        });
    });

    describe('POST /api/sessions/:sessionId/feedback', () => {
        let testSession;

        beforeEach(async () => {
            testSession = new Session({
                requester: testUsers[0]._id,
                provider: testUsers[1]._id,
                skill: {
                    name: 'Python',
                    category: 'Programming',
                    level: 'beginner'
                },
                scheduledDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
                duration: 60,
                sessionType: 'online',
                status: 'completed',
                completedAt: new Date()
            });
            await testSession.save();
        });

        it('should submit feedback for completed session', async () => {
            const response = await request(app)
                .post(`/api/sessions/${testSession._id}/feedback`)
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send({
                    rating: 5,
                    comment: 'Excellent teacher, very patient and knowledgeable!'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.reviews).toHaveLength(1);
            expect(response.body.data.reviews[0].rating).toBe(5);
        });

        it('should not allow feedback for non-completed sessions', async () => {
            testSession.status = 'accepted';
            await testSession.save();

            const response = await request(app)
                .post(`/api/sessions/${testSession._id}/feedback`)
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send({
                    rating: 5,
                    comment: 'Great session!'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('only provide feedback for completed sessions');
        });

        it('should validate rating range', async () => {
            const response = await request(app)
                .post(`/api/sessions/${testSession._id}/feedback`)
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send({
                    rating: 6, // Invalid rating
                    comment: 'Great session!'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Validation failed');
        });
    });

    describe('GET /api/sessions/upcoming', () => {
        beforeEach(async () => {
            // Create upcoming sessions
            const upcomingSessions = [
                {
                    requester: testUsers[0]._id,
                    provider: testUsers[1]._id,
                    skill: {
                        name: 'Python',
                        category: 'Programming',
                        level: 'beginner'
                    },
                    scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    duration: 60,
                    sessionType: 'online',
                    status: 'accepted'
                },
                {
                    requester: testUsers[0]._id,
                    provider: testUsers[2]._id,
                    skill: {
                        name: 'Node.js',
                        category: 'Backend',
                        level: 'intermediate'
                    },
                    scheduledDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
                    duration: 90,
                    sessionType: 'online',
                    status: 'accepted'
                }
            ];

            for (const sessionData of upcomingSessions) {
                const session = new Session(sessionData);
                await session.save();
            }
        });

        it('should get upcoming sessions', async () => {
            const response = await request(app)
                .get('/api/sessions/upcoming')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.data[0].status).toBe('accepted');
        });

        it('should filter by days parameter', async () => {
            const response = await request(app)
                .get('/api/sessions/upcoming')
                .query({ days: 1 })
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
        });
    });

    describe('POST /api/sessions/check-conflicts', () => {
        beforeEach(async () => {
            // Create existing session
            const existingSession = new Session({
                requester: testUsers[0]._id,
                provider: testUsers[1]._id,
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
            await existingSession.save();
        });

        it('should detect conflicts', async () => {
            const conflictTime = new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000); // 30 minutes into existing session

            const response = await request(app)
                .post('/api/sessions/check-conflicts')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send({
                    dateTime: conflictTime,
                    duration: 60,
                    participantId: testUsers[1]._id.toString()
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.hasConflicts).toBe(true);
            expect(response.body.data.userConflicts).toHaveLength(1);
        });

        it('should return no conflicts for available time', async () => {
            const availableTime = new Date(Date.now() + 48 * 60 * 60 * 1000); // 2 days from now

            const response = await request(app)
                .post('/api/sessions/check-conflicts')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send({
                    dateTime: availableTime,
                    duration: 60,
                    participantId: testUsers[2]._id.toString()
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.hasConflicts).toBe(false);
            expect(response.body.data.userConflicts).toHaveLength(0);
            expect(response.body.data.participantConflicts).toHaveLength(0);
        });
    });

    describe('GET /api/sessions/stats', () => {
        beforeEach(async () => {
            // Create sessions with different statuses
            const sessions = [
                {
                    requester: testUsers[0]._id,
                    provider: testUsers[1]._id,
                    skill: { name: 'Python', category: 'Programming', level: 'beginner' },
                    scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    duration: 60,
                    sessionType: 'online',
                    status: 'pending'
                },
                {
                    requester: testUsers[0]._id,
                    provider: testUsers[2]._id,
                    skill: { name: 'Node.js', category: 'Backend', level: 'intermediate' },
                    scheduledDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
                    duration: 90,
                    sessionType: 'online',
                    status: 'accepted'
                },
                {
                    requester: testUsers[1]._id,
                    provider: testUsers[0]._id,
                    skill: { name: 'JavaScript', category: 'Programming', level: 'advanced' },
                    scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    duration: 60,
                    sessionType: 'online',
                    status: 'completed'
                }
            ];

            for (const sessionData of sessions) {
                const session = new Session(sessionData);
                await session.save();
            }
        });

        it('should get session statistics', async () => {
            const response = await request(app)
                .get('/api/sessions/stats')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.total).toBe(3);
            expect(response.body.data.pending).toBe(1);
            expect(response.body.data.accepted).toBe(1);
            expect(response.body.data.completed).toBe(1);
        });
    });
});