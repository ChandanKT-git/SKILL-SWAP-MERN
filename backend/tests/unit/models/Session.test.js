const mongoose = require('mongoose');
const Session = require('../../../src/models/Session');
const User = require('../../../src/models/User');
const { connectTestDB, clearTestDB, closeTestDB } = require('../../helpers/testDb');

describe('Session Model Unit Tests', () => {
    jest.setTimeout(30000);

    let testUsers = [];

    beforeAll(async () => {
        await connectTestDB();
    });

    afterAll(async () => {
        await closeTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();
        testUsers = [];

        // Create test users
        const usersData = [
            {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                password: 'Password123!',
                isEmailVerified: true,
                status: 'active'
            },
            {
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane@example.com',
                password: 'Password123!',
                isEmailVerified: true,
                status: 'active'
            }
        ];

        for (const userData of usersData) {
            const user = new User(userData);
            await user.save();
            testUsers.push(user);
        }
    });

    describe('Session Creation', () => {
        it('should create a valid session', async () => {
            const sessionData = {
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
                requestMessage: 'I want to learn Python fundamentals'
            };

            const session = new Session(sessionData);
            const savedSession = await session.save();

            expect(savedSession._id).toBeDefined();
            expect(savedSession.skill.name).toBe(sessionData.skill.name);
            expect(savedSession.status).toBe('pending');
        });

        it('should require all mandatory fields', async () => {
            const session = new Session({});

            await expect(session.save()).rejects.toThrow();
        });

        it('should validate skill level enum', async () => {
            const sessionData = {
                requester: testUsers[0]._id,
                provider: testUsers[1]._id,
                skill: {
                    name: 'Python',
                    category: 'Programming',
                    level: 'invalid-level' // Invalid enum value
                },
                scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                duration: 60,
                sessionType: 'online'
            };

            const session = new Session(sessionData);
            await expect(session.save()).rejects.toThrow();
        });

        it('should validate duration range', async () => {
            const sessionData = {
                requester: testUsers[0]._id,
                provider: testUsers[1]._id,
                skill: {
                    name: 'Python',
                    category: 'Programming',
                    level: 'beginner'
                },
                scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                duration: 10, // Below minimum
                sessionType: 'online'
            };

            const session = new Session(sessionData);
            await expect(session.save()).rejects.toThrow();
        });

        it('should validate future scheduled date for new sessions', async () => {
            const sessionData = {
                requester: testUsers[0]._id,
                provider: testUsers[1]._id,
                skill: {
                    name: 'Python',
                    category: 'Programming',
                    level: 'beginner'
                },
                scheduledDate: new Date(Date.now() - 60 * 60 * 1000), // Past date
                duration: 60,
                sessionType: 'online'
            };

            const session = new Session(sessionData);
            await expect(session.save()).rejects.toThrow();
        });
    });

    describe('Virtual Properties', () => {
        let session;

        beforeEach(async () => {
            session = new Session({
                requester: testUsers[0]._id,
                provider: testUsers[1]._id,
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
        });

        it('should calculate endTime correctly', () => {
            const expectedEndTime = new Date(session.scheduledDate.getTime() + (90 * 60000));
            expect(session.endTime.getTime()).toBe(expectedEndTime.getTime());
        });

        it('should calculate durationHours correctly', () => {
            expect(parseFloat(session.durationHours)).toBe(1.5);
        });

        it('should calculate timeUntilSession correctly', () => {
            expect(session.timeUntilSession).toBeGreaterThan(0);
        });

        it('should return participants array', () => {
            expect(session.participants).toHaveLength(2);
            expect(session.participants).toContain(session.requester);
            expect(session.participants).toContain(session.provider);
        });
    });

    describe('Instance Methods', () => {
        let session;

        beforeEach(async () => {
            session = new Session({
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
            await session.save();
        });

        it('should check if user is participant', () => {
            expect(session.isParticipant(testUsers[0]._id)).toBe(true);
            expect(session.isParticipant(testUsers[1]._id)).toBe(true);
            expect(session.isParticipant(new mongoose.Types.ObjectId())).toBe(false);
        });

        it('should get other participant', () => {
            expect(session.getOtherParticipant(testUsers[0]._id).toString()).toBe(testUsers[1]._id.toString());
            expect(session.getOtherParticipant(testUsers[1]._id).toString()).toBe(testUsers[0]._id.toString());
            expect(session.getOtherParticipant(new mongoose.Types.ObjectId())).toBeNull();
        });

        it('should determine if session can be cancelled', () => {
            // Pending session should be cancellable
            expect(session.canBeCancelled()).toBe(true);

            // Completed session should not be cancellable
            session.status = 'completed';
            expect(session.canBeCancelled()).toBe(false);
        });

        it('should not allow cancellation with less than 2 hours notice', async () => {
            // Set session to be in 1 hour
            session.scheduledDate = new Date(Date.now() + 60 * 60 * 1000);
            session.status = 'accepted';
            await session.save();

            expect(session.canBeCancelled()).toBe(false);
        });

        it('should determine if session can be completed', () => {
            // Future accepted session should not be completable
            session.status = 'accepted';
            expect(session.canBeCompleted()).toBe(false);

            // Past accepted session should be completable
            session.scheduledDate = new Date(Date.now() - 60 * 60 * 1000);
            expect(session.canBeCompleted()).toBe(true);
        });

        it('should check for conflicts with other sessions', () => {
            const otherSession = new Session({
                requester: testUsers[1]._id,
                provider: testUsers[0]._id,
                skill: {
                    name: 'JavaScript',
                    category: 'Programming',
                    level: 'intermediate'
                },
                scheduledDate: new Date(session.scheduledDate.getTime() + 30 * 60 * 1000), // 30 minutes later
                duration: 60,
                sessionType: 'online',
                status: 'accepted'
            });

            expect(session.hasConflictWith(otherSession)).toBe(true);
        });

        it('should not detect conflicts with cancelled sessions', () => {
            const otherSession = new Session({
                requester: testUsers[1]._id,
                provider: testUsers[0]._id,
                skill: {
                    name: 'JavaScript',
                    category: 'Programming',
                    level: 'intermediate'
                },
                scheduledDate: new Date(session.scheduledDate.getTime() + 30 * 60 * 1000),
                duration: 60,
                sessionType: 'online',
                status: 'cancelled'
            });

            expect(session.hasConflictWith(otherSession)).toBe(false);
        });
    });

    describe('Static Methods', () => {
        let sessions = [];

        beforeEach(async () => {
            // Create test sessions
            const sessionData = [
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
                    requester: testUsers[1]._id,
                    provider: testUsers[0]._id,
                    skill: {
                        name: 'JavaScript',
                        category: 'Programming',
                        level: 'intermediate'
                    },
                    scheduledDate: new Date(Date.now() + 25 * 60 * 60 * 1000), // Overlapping time
                    duration: 90,
                    sessionType: 'online',
                    status: 'pending'
                }
            ];

            for (const data of sessionData) {
                const session = new Session(data);
                await session.save();
                sessions.push(session);
            }
        });

        it('should find conflicting sessions correctly', async () => {
            const conflictStart = new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000); // 30 minutes into first session
            const duration = 60; // 1 hour duration

            const conflicts = await Session.findConflictingSessions(testUsers[0]._id, conflictStart, duration);

            expect(conflicts).toHaveLength(1);
            expect(conflicts[0]._id.toString()).toBe(sessions[0]._id.toString());
        });

        it('should not find conflicts for available times', async () => {
            const availableStart = new Date(Date.now() + 48 * 60 * 60 * 1000); // 2 days from now
            const duration = 60;

            const conflicts = await Session.findConflictingSessions(testUsers[0]._id, availableStart, duration);

            expect(conflicts).toHaveLength(0);
        });

        it('should find upcoming sessions', async () => {
            const upcomingSessions = await Session.findUpcomingSessions(testUsers[0]._id, 10);

            expect(upcomingSessions).toHaveLength(1); // Only accepted sessions are upcoming
            expect(upcomingSessions[0].status).toBe('accepted');
        });

        it('should find sessions by status', async () => {
            const acceptedSessions = await Session.findByStatus(testUsers[0]._id, 'accepted');

            expect(acceptedSessions).toHaveLength(1);
            expect(acceptedSessions[0].status).toBe('accepted');
        });

        it('should find sessions by multiple statuses', async () => {
            const allSessions = await Session.findByStatus(testUsers[0]._id, ['accepted', 'pending']);

            expect(allSessions).toHaveLength(2); // User is involved in both sessions
        });
    });

    describe('Pre-save Middleware', () => {
        it('should prevent same user as requester and provider', async () => {
            const session = new Session({
                requester: testUsers[0]._id,
                provider: testUsers[0]._id, // Same user
                skill: {
                    name: 'Python',
                    category: 'Programming',
                    level: 'beginner'
                },
                scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                duration: 60,
                sessionType: 'online'
            });

            await expect(session.save()).rejects.toThrow('Requester and provider cannot be the same user');
        });

        it('should set response timestamp when status changes', async () => {
            const session = new Session({
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

            await session.save();
            expect(session.respondedAt).toBeUndefined();

            // Change status to accepted
            session.status = 'accepted';
            await session.save();

            expect(session.respondedAt).toBeDefined();
        });

        it('should set completion timestamp when status changes to completed', async () => {
            const session = new Session({
                requester: testUsers[0]._id,
                provider: testUsers[1]._id,
                skill: {
                    name: 'Python',
                    category: 'Programming',
                    level: 'beginner'
                },
                scheduledDate: new Date(Date.now() - 60 * 60 * 1000), // Past date for completion
                duration: 60,
                sessionType: 'online'
            });

            await session.save();
            expect(session.completedAt).toBeUndefined();

            // Change status to completed
            session.status = 'completed';
            await session.save();

            expect(session.completedAt).toBeDefined();
        });

        it('should set cancellation timestamp when status changes to cancelled', async () => {
            const session = new Session({
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

            await session.save();
            expect(session.cancelledAt).toBeUndefined();

            // Change status to cancelled
            session.status = 'cancelled';
            await session.save();

            expect(session.cancelledAt).toBeDefined();
        });
    });

    describe('Indexes', () => {
        it('should have proper indexes for performance', async () => {
            const indexes = await Session.collection.getIndexes();

            // Check that important indexes exist
            const indexNames = Object.keys(indexes);

            expect(indexNames).toContain('requester_1_createdAt_-1');
            expect(indexNames).toContain('provider_1_createdAt_-1');
            expect(indexNames).toContain('status_1_scheduledDate_1');
            expect(indexNames).toContain('scheduledDate_1');
        });
    });
});