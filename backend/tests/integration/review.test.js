const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../../src/server');
const User = require('../../src/models/User');
const Session = require('../../src/models/Session');
const Review = require('../../src/models/Review');
const { connectTestDB, clearTestDB, closeTestDB } = require('../helpers/testDb');
const JWTUtils = require('../../src/utils/jwt');

describe('Review Integration Tests', () => {
    jest.setTimeout(30000);

    let testUsers = [];
    let authTokens = {};
    let completedSession;

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
                email: 'john.review@test.com',
                password: 'Password123!',
                isEmailVerified: true,
                status: 'active',
                role: 'user',
                skills: [
                    { name: 'JavaScript', level: 'advanced', category: 'Programming' }
                ],
                rating: { average: 4.5, count: 5 }
            },
            {
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.review@test.com',
                password: 'Password123!',
                isEmailVerified: true,
                status: 'active',
                role: 'user',
                skills: [
                    { name: 'Python', level: 'expert', category: 'Programming' }
                ],
                rating: { average: 4.8, count: 10 }
            },
            {
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin.review@test.com',
                password: 'Password123!',
                isEmailVerified: true,
                status: 'active',
                role: 'admin'
            }
        ];

        for (const userData of usersData) {
            const user = new User(userData);
            await user.save();
            testUsers.push(user);

            // Generate auth token for each user
            const tokenName = userData.firstName.toLowerCase();
            authTokens[tokenName] = JWTUtils.generateAccessToken({
                id: user._id,
                email: user.email
            });
        }

        // Create a completed session for testing
        completedSession = new Session({
            requester: testUsers[0]._id, // John
            provider: testUsers[1]._id,   // Jane
            skill: {
                name: 'Python',
                category: 'Programming',
                level: 'beginner'
            },
            scheduledDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            duration: 60,
            sessionType: 'online',
            status: 'completed',
            completedAt: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
        });
        await completedSession.save();
    });

    describe('POST /api/reviews', () => {
        it('should submit a review for a completed session', async () => {
            const reviewData = {
                sessionId: completedSession._id.toString(),
                revieweeId: testUsers[1]._id.toString(), // Jane (provider)
                rating: 5,
                comment: 'Excellent teacher! Very patient and knowledgeable about Python.',
                reviewType: 'learning'
            };

            const response = await request(app)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send(reviewData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.rating).toBe(5);
            expect(response.body.data.comment).toBe(reviewData.comment);
            expect(response.body.data.reviewer._id).toBe(testUsers[0]._id.toString());
            expect(response.body.data.reviewee._id).toBe(testUsers[1]._id.toString());
            expect(response.body.data.reviewType).toBe('learning');
        });

        it('should prevent duplicate reviews for the same session', async () => {
            // Submit first review
            const reviewData = {
                sessionId: completedSession._id.toString(),
                revieweeId: testUsers[1]._id.toString(),
                rating: 5,
                comment: 'Great session!',
                reviewType: 'learning'
            };

            await request(app)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send(reviewData)
                .expect(201);

            // Try to submit duplicate review
            const response = await request(app)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send(reviewData)
                .expect(409);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('already reviewed');
        });

        it('should prevent reviews for non-completed sessions', async () => {
            // Create a pending session
            const pendingSession = new Session({
                requester: testUsers[0]._id,
                provider: testUsers[1]._id,
                skill: {
                    name: 'JavaScript',
                    category: 'Programming',
                    level: 'intermediate'
                },
                scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                duration: 60,
                sessionType: 'online',
                status: 'pending'
            });
            await pendingSession.save();

            const reviewData = {
                sessionId: pendingSession._id.toString(),
                revieweeId: testUsers[1]._id.toString(),
                rating: 5,
                comment: 'Great session!',
                reviewType: 'learning'
            };

            const response = await request(app)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send(reviewData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('completed sessions');
        });

        it('should prevent reviews from non-participants', async () => {
            // Create another user who wasn't part of the session
            const outsider = new User({
                firstName: 'Bob',
                lastName: 'Wilson',
                email: 'bob.review@test.com',
                password: 'Password123!',
                isEmailVerified: true,
                status: 'active'
            });
            await outsider.save();

            const outsiderToken = JWTUtils.generateAccessToken({
                id: outsider._id,
                email: outsider.email
            });

            const reviewData = {
                sessionId: completedSession._id.toString(),
                revieweeId: testUsers[1]._id.toString(),
                rating: 5,
                comment: 'Great session!',
                reviewType: 'learning'
            };

            const response = await request(app)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${outsiderToken}`)
                .send(reviewData)
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('participated in');
        });

        it('should validate review data', async () => {
            const invalidReviewData = {
                sessionId: completedSession._id.toString(),
                revieweeId: testUsers[1]._id.toString(),
                rating: 6, // Invalid rating (> 5)
                comment: 'Short', // Too short comment
                reviewType: 'learning'
            };

            const response = await request(app)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send(invalidReviewData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Validation failed');
        });

        it('should require authentication', async () => {
            const reviewData = {
                sessionId: completedSession._id.toString(),
                revieweeId: testUsers[1]._id.toString(),
                rating: 5,
                comment: 'Great session!',
                reviewType: 'learning'
            };

            const response = await request(app)
                .post('/api/reviews')
                .send(reviewData)
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/reviews/user/:userId', () => {
        beforeEach(async () => {
            // Create some test reviews
            const reviews = [
                {
                    reviewer: testUsers[0]._id,
                    reviewee: testUsers[1]._id,
                    session: completedSession._id,
                    rating: 5,
                    comment: 'Excellent teacher!',
                    skillReviewed: { name: 'Python', category: 'Programming' },
                    reviewType: 'learning'
                },
                {
                    reviewer: testUsers[1]._id,
                    reviewee: testUsers[0]._id,
                    session: completedSession._id,
                    rating: 4,
                    comment: 'Good student, very engaged!',
                    skillReviewed: { name: 'Python', category: 'Programming' },
                    reviewType: 'teaching'
                }
            ];

            for (const reviewData of reviews) {
                const review = new Review(reviewData);
                await review.save();
            }
        });

        it('should get reviews for a user', async () => {
            const response = await request(app)
                .get(`/api/reviews/user/${testUsers[1]._id}`)
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.reviews).toHaveLength(1);
            expect(response.body.data.reviews[0].rating).toBe(5);
            expect(response.body.data.ratingData.averageRating).toBe(5);
            expect(response.body.data.ratingData.totalReviews).toBe(1);
        });

        it('should paginate reviews', async () => {
            const response = await request(app)
                .get(`/api/reviews/user/${testUsers[1]._id}`)
                .query({ page: 1, limit: 1 })
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.reviews).toHaveLength(1);
            expect(response.body.data.pagination.currentPage).toBe(1);
            expect(response.body.data.pagination.limit).toBe(1);
        });

        it('should return 404 for non-existent user', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const response = await request(app)
                .get(`/api/reviews/user/${nonExistentId}`)
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('not found');
        });
    });

    describe('GET /api/reviews/pending', () => {
        it('should get pending reviews for the current user', async () => {
            const response = await request(app)
                .get('/api/reviews/pending')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].session._id).toBe(completedSession._id.toString());
            expect(response.body.data[0].reviewee._id).toBe(testUsers[1]._id.toString());
        });

        it('should return empty array if no pending reviews', async () => {
            // Submit a review first
            const review = new Review({
                reviewer: testUsers[0]._id,
                reviewee: testUsers[1]._id,
                session: completedSession._id,
                rating: 5,
                comment: 'Great session!',
                skillReviewed: { name: 'Python', category: 'Programming' },
                reviewType: 'learning'
            });
            await review.save();

            const response = await request(app)
                .get('/api/reviews/pending')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(0);
        });
    });

    describe('POST /api/reviews/:reviewId/flag', () => {
        let testReview;

        beforeEach(async () => {
            testReview = new Review({
                reviewer: testUsers[0]._id,
                reviewee: testUsers[1]._id,
                session: completedSession._id,
                rating: 5,
                comment: 'Great session!',
                skillReviewed: { name: 'Python', category: 'Programming' },
                reviewType: 'learning'
            });
            await testReview.save();
        });

        it('should flag a review for moderation', async () => {
            const flagData = {
                reason: 'inappropriate',
                details: 'Contains offensive language'
            };

            const response = await request(app)
                .post(`/api/reviews/${testReview._id}/flag`)
                .set('Authorization', `Bearer ${authTokens.jane}`)
                .send(flagData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('flagged');

            // Verify the review was flagged
            const updatedReview = await Review.findById(testReview._id);
            expect(updatedReview.moderation.flaggedBy).toHaveLength(1);
            expect(updatedReview.moderation.flaggedBy[0].reason).toBe('inappropriate');
        });

        it('should prevent users from flagging their own reviews', async () => {
            const flagData = {
                reason: 'inappropriate',
                details: 'Test'
            };

            const response = await request(app)
                .post(`/api/reviews/${testReview._id}/flag`)
                .set('Authorization', `Bearer ${authTokens.john}`) // Reviewer trying to flag own review
                .send(flagData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('cannot flag');
        });
    });

    describe('POST /api/reviews/:reviewId/helpfulness', () => {
        let testReview;

        beforeEach(async () => {
            testReview = new Review({
                reviewer: testUsers[0]._id,
                reviewee: testUsers[1]._id,
                session: completedSession._id,
                rating: 5,
                comment: 'Great session!',
                skillReviewed: { name: 'Python', category: 'Programming' },
                reviewType: 'learning'
            });
            await testReview.save();
        });

        it('should mark review as helpful', async () => {
            const response = await request(app)
                .post(`/api/reviews/${testReview._id}/helpfulness`)
                .set('Authorization', `Bearer ${authTokens.jane}`)
                .send({ isHelpful: true })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.helpfulnessScore).toBe(100);
            expect(response.body.data.netHelpfulness).toBe(1);
        });

        it('should prevent users from rating helpfulness of their own reviews', async () => {
            const response = await request(app)
                .post(`/api/reviews/${testReview._id}/helpfulness`)
                .set('Authorization', `Bearer ${authTokens.john}`) // Reviewer trying to rate own review
                .send({ isHelpful: true })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('your own review');
        });
    });

    describe('POST /api/reviews/:reviewId/response', () => {
        let testReview;

        beforeEach(async () => {
            testReview = new Review({
                reviewer: testUsers[0]._id,
                reviewee: testUsers[1]._id,
                session: completedSession._id,
                rating: 5,
                comment: 'Great session!',
                skillReviewed: { name: 'Python', category: 'Programming' },
                reviewType: 'learning'
            });
            await testReview.save();
        });

        it('should allow reviewee to respond to review', async () => {
            const responseData = {
                comment: 'Thank you for the kind words! It was a pleasure teaching you.'
            };

            const response = await request(app)
                .post(`/api/reviews/${testReview._id}/response`)
                .set('Authorization', `Bearer ${authTokens.jane}`) // Jane is the reviewee
                .send(responseData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.response.comment).toBe(responseData.comment);
            expect(response.body.data.response.respondedAt).toBeDefined();
        });

        it('should prevent non-reviewee from responding', async () => {
            const responseData = {
                comment: 'This is not my review to respond to.'
            };

            const response = await request(app)
                .post(`/api/reviews/${testReview._id}/response`)
                .set('Authorization', `Bearer ${authTokens.john}`) // John is the reviewer, not reviewee
                .send(responseData)
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('reviewed user can respond');
        });

        it('should prevent duplicate responses', async () => {
            // Add first response
            testReview.response = {
                comment: 'First response',
                respondedAt: new Date()
            };
            await testReview.save();

            const responseData = {
                comment: 'Second response attempt'
            };

            const response = await request(app)
                .post(`/api/reviews/${testReview._id}/response`)
                .set('Authorization', `Bearer ${authTokens.jane}`)
                .send(responseData)
                .expect(409);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('already responded');
        });
    });

    describe('GET /api/reviews/user/:userId/stats', () => {
        beforeEach(async () => {
            // Create multiple reviews for testing stats
            const reviews = [
                {
                    reviewer: testUsers[0]._id,
                    reviewee: testUsers[1]._id,
                    session: completedSession._id,
                    rating: 5,
                    comment: 'Excellent!',
                    skillReviewed: { name: 'Python', category: 'Programming' },
                    reviewType: 'learning'
                },
                {
                    reviewer: testUsers[2]._id,
                    reviewee: testUsers[1]._id,
                    session: completedSession._id,
                    rating: 4,
                    comment: 'Very good!',
                    skillReviewed: { name: 'Python', category: 'Programming' },
                    reviewType: 'learning'
                }
            ];

            for (const reviewData of reviews) {
                const review = new Review(reviewData);
                await review.save();
            }
        });

        it('should get user rating statistics', async () => {
            const response = await request(app)
                .get(`/api/reviews/user/${testUsers[1]._id}/stats`)
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.averageRating).toBe(4.5);
            expect(response.body.data.totalReviews).toBe(2);
            expect(response.body.data.ratingDistribution).toBeDefined();
            expect(response.body.data.reviewsByType).toBeDefined();
        });
    });

    describe('Admin Routes', () => {
        let flaggedReview;

        beforeEach(async () => {
            flaggedReview = new Review({
                reviewer: testUsers[0]._id,
                reviewee: testUsers[1]._id,
                session: completedSession._id,
                rating: 1,
                comment: 'This is inappropriate content that should be flagged',
                skillReviewed: { name: 'Python', category: 'Programming' },
                reviewType: 'learning',
                status: 'flagged'
            });
            await flaggedReview.save();
        });

        describe('GET /api/reviews/moderation', () => {
            it('should get reviews for moderation (admin only)', async () => {
                const response = await request(app)
                    .get('/api/reviews/moderation')
                    .set('Authorization', `Bearer ${authTokens.admin}`)
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data.reviews).toHaveLength(1);
                expect(response.body.data.reviews[0].status).toBe('flagged');
            });

            it('should deny access to non-admin users', async () => {
                const response = await request(app)
                    .get('/api/reviews/moderation')
                    .set('Authorization', `Bearer ${authTokens.john}`)
                    .expect(403);

                expect(response.body.success).toBe(false);
            });
        });

        describe('PUT /api/reviews/:reviewId/moderate', () => {
            it('should allow admin to moderate reviews', async () => {
                const moderationData = {
                    action: 'approve',
                    notes: 'Review is acceptable after investigation'
                };

                const response = await request(app)
                    .put(`/api/reviews/${flaggedReview._id}/moderate`)
                    .set('Authorization', `Bearer ${authTokens.admin}`)
                    .send(moderationData)
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data.status).toBe('active');
                expect(response.body.data.moderation.moderationNotes).toBe(moderationData.notes);
            });

            it('should deny access to non-admin users', async () => {
                const moderationData = {
                    action: 'approve',
                    notes: 'Test'
                };

                const response = await request(app)
                    .put(`/api/reviews/${flaggedReview._id}/moderate`)
                    .set('Authorization', `Bearer ${authTokens.john}`)
                    .send(moderationData)
                    .expect(403);

                expect(response.body.success).toBe(false);
            });
        });
    });
});