const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../../src/server');
const User = require('../../src/models/User');
const Session = require('../../src/models/Session');
const Review = require('../../src/models/Review');
const { connectTestDB, clearTestDB, closeTestDB } = require('../helpers/testDb');
const JWTUtils = require('../../src/utils/jwt');

describe('Review Basic Functionality Tests', () => {
    jest.setTimeout(30000);

    let testUser1, testUser2, testSession;
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
            email: 'john.review.basic@test.com',
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
            email: 'jane.review.basic@test.com',
            password: 'Password123!',
            isEmailVerified: true,
            status: 'active',
            skills: [
                { name: 'Python', level: 'expert', category: 'Programming' }
            ]
        });
        await testUser2.save();

        // Create completed session
        testSession = new Session({
            requester: testUser1._id,
            provider: testUser2._id,
            skill: {
                name: 'Python',
                category: 'Programming',
                level: 'beginner'
            },
            scheduledDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
            duration: 60,
            sessionType: 'online',
            status: 'completed',
            completedAt: new Date(Date.now() - 60 * 60 * 1000)
        });
        await testSession.save();

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

    describe('Review Model', () => {
        it('should create a review with valid data', async () => {
            const reviewData = {
                reviewer: testUser1._id,
                reviewee: testUser2._id,
                session: testSession._id,
                rating: 5,
                comment: 'Excellent teacher! Very patient and knowledgeable about Python.',
                skillReviewed: {
                    name: 'Python',
                    category: 'Programming'
                },
                reviewType: 'learning'
            };

            const review = new Review(reviewData);
            const savedReview = await review.save();

            expect(savedReview._id).toBeDefined();
            expect(savedReview.rating).toBe(5);
            expect(savedReview.comment).toBe(reviewData.comment);
            expect(savedReview.status).toBe('active');
            expect(savedReview.reviewType).toBe('learning');
            expect(savedReview.skillReviewed.name).toBe('Python');
        });

        it('should have proper virtual properties', async () => {
            const review = new Review({
                reviewer: testUser1._id,
                reviewee: testUser2._id,
                session: testSession._id,
                rating: 5,
                comment: 'Great session!',
                skillReviewed: { name: 'Python', category: 'Programming' },
                reviewType: 'learning'
            });
            await review.save();

            // Test helpfulness virtuals
            review.helpfulness.helpful.push(testUser1._id);
            review.helpfulness.helpful.push(testUser2._id);
            review.helpfulness.notHelpful.push(new mongoose.Types.ObjectId());

            expect(review.helpfulnessScore).toBe(67); // 2 out of 3 = 67%
            expect(review.netHelpfulness).toBe(1); // 2 helpful - 1 not helpful = 1
            expect(review.isFlagged).toBe(false);
            expect(review.flagCount).toBe(0);
        });

        it('should have working instance methods', async () => {
            const review = new Review({
                reviewer: testUser1._id,
                reviewee: testUser2._id,
                session: testSession._id,
                rating: 5,
                comment: 'Great session!',
                skillReviewed: { name: 'Python', category: 'Programming' },
                reviewType: 'learning'
            });
            await review.save();

            // Test flagging functionality
            expect(review.canBeFlaggedBy(testUser1._id)).toBe(false); // Reviewer cannot flag own review
            expect(review.canBeFlaggedBy(testUser2._id)).toBe(true); // Others can flag

            // Test helpfulness marking
            await review.markHelpfulness(testUser2._id, true);
            expect(review.helpfulness.helpful).toHaveLength(1);
            expect(review.helpfulness.helpful[0].toString()).toBe(testUser2._id.toString());

            // Test response functionality
            await review.addResponse('Thank you for the kind words!');
            expect(review.response.comment).toBe('Thank you for the kind words!');
            expect(review.response.respondedAt).toBeDefined();
        });

        it('should prevent duplicate reviews for same session', async () => {
            const reviewData = {
                reviewer: testUser1._id,
                reviewee: testUser2._id,
                session: testSession._id,
                rating: 5,
                comment: 'Great session!',
                skillReviewed: { name: 'Python', category: 'Programming' },
                reviewType: 'learning'
            };

            // Create first review
            const review1 = new Review(reviewData);
            await review1.save();

            // Try to create duplicate review
            const review2 = new Review(reviewData);
            await expect(review2.save()).rejects.toThrow();
        });

        it('should prevent users from reviewing themselves', async () => {
            const reviewData = {
                reviewer: testUser1._id,
                reviewee: testUser1._id, // Same user
                session: testSession._id,
                rating: 5,
                comment: 'Great session!',
                skillReviewed: { name: 'Python', category: 'Programming' },
                reviewType: 'learning'
            };

            const review = new Review(reviewData);
            await expect(review.save()).rejects.toThrow('Users cannot review themselves');
        });
    });

    describe('Review Static Methods', () => {
        beforeEach(async () => {
            // Create test reviews
            const reviews = [
                {
                    reviewer: testUser1._id,
                    reviewee: testUser2._id,
                    session: testSession._id,
                    rating: 5,
                    comment: 'Excellent teacher!',
                    skillReviewed: { name: 'Python', category: 'Programming' },
                    reviewType: 'learning'
                },
                {
                    reviewer: testUser2._id,
                    reviewee: testUser1._id,
                    session: testSession._id,
                    rating: 4,
                    comment: 'Good student!',
                    skillReviewed: { name: 'JavaScript', category: 'Programming' },
                    reviewType: 'teaching'
                }
            ];

            for (const reviewData of reviews) {
                const review = new Review(reviewData);
                await review.save();
            }
        });

        it('should calculate user average rating', async () => {
            const ratingData = await Review.getUserAverageRating(testUser2._id);

            expect(ratingData.averageRating).toBe(5);
            expect(ratingData.totalReviews).toBe(1);
            expect(ratingData.ratingDistribution[5]).toBe(1);
        });

        it('should get skill-specific rating', async () => {
            const skillRating = await Review.getSkillRating(testUser2._id, 'Python', 'Programming');

            expect(skillRating.averageRating).toBe(5);
            expect(skillRating.totalReviews).toBe(1);
        });

        it('should find user reviews', async () => {
            const reviews = await Review.findUserReviews(testUser2._id);

            expect(reviews).toHaveLength(1);
            expect(reviews[0].rating).toBe(5);
        });

        it('should check if review exists for session', async () => {
            const exists = await Review.reviewExistsForSession(testSession._id, testUser1._id);
            expect(exists).toBe(true);

            const notExists = await Review.reviewExistsForSession(testSession._id, new mongoose.Types.ObjectId());
            expect(notExists).toBe(false);
        });
    });

    describe('Review Routes (Basic)', () => {
        it('should require authentication for review routes', async () => {
            const response = await request(app)
                .get('/api/reviews/pending')
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should validate ObjectId format in routes', async () => {
            const response = await request(app)
                .get('/api/reviews/invalid-id')
                .set('Authorization', `Bearer ${authToken1}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid ID format');
        });
    });

    describe('Review Moderation', () => {
        let testReview;

        beforeEach(async () => {
            testReview = new Review({
                reviewer: testUser1._id,
                reviewee: testUser2._id,
                session: testSession._id,
                rating: 1,
                comment: 'This is inappropriate content that should be flagged',
                skillReviewed: { name: 'Python', category: 'Programming' },
                reviewType: 'learning'
            });
            await testReview.save();
        });

        it('should flag review and auto-hide after multiple flags', async () => {
            // Create additional users for flagging
            const user3 = new User({
                firstName: 'User3',
                lastName: 'Test',
                email: 'user3@test.com',
                password: 'Password123!',
                isEmailVerified: true,
                status: 'active'
            });
            await user3.save();

            const user4 = new User({
                firstName: 'User4',
                lastName: 'Test',
                email: 'user4@test.com',
                password: 'Password123!',
                isEmailVerified: true,
                status: 'active'
            });
            await user4.save();

            const user5 = new User({
                firstName: 'User5',
                lastName: 'Test',
                email: 'user5@test.com',
                password: 'Password123!',
                isEmailVerified: true,
                status: 'active'
            });
            await user5.save();

            // Flag the review multiple times
            await testReview.flagReview(testUser2._id, 'inappropriate', 'Test 1');
            await testReview.flagReview(user3._id, 'spam', 'Test 2');
            await testReview.flagReview(user4._id, 'fake', 'Test 3');

            expect(testReview.status).toBe('flagged');
            expect(testReview.moderation.flaggedBy).toHaveLength(3);
        });

        it('should get reviews for moderation', async () => {
            testReview.status = 'flagged';
            await testReview.save();

            const moderationReviews = await Review.getReviewsForModeration();
            expect(moderationReviews).toHaveLength(1);
            expect(moderationReviews[0].status).toBe('flagged');
        });
    });

    describe('User Rating Updates', () => {
        it('should update user rating after review submission', async () => {
            const initialUser = await User.findById(testUser2._id);
            const initialRating = initialUser.rating;

            const review = new Review({
                reviewer: testUser1._id,
                reviewee: testUser2._id,
                session: testSession._id,
                rating: 5,
                comment: 'Excellent teacher!',
                skillReviewed: { name: 'Python', category: 'Programming' },
                reviewType: 'learning'
            });
            await review.save();

            // Wait for post-save middleware to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            const updatedUser = await User.findById(testUser2._id);
            expect(updatedUser.rating.average).toBe(5);
            expect(updatedUser.rating.count).toBe(1);
        });
    });
});