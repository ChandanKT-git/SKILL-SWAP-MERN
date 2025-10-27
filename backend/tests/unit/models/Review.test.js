const mongoose = require('mongoose');
const Review = require('../../../src/models/Review');
const User = require('../../../src/models/User');
const Session = require('../../../src/models/Session');
const { connectTestDB, clearTestDB, closeTestDB } = require('../../helpers/testDb');

describe('Review Model Unit Tests', () => {
    jest.setTimeout(30000);

    let testUsers = [];
    let testSession;

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
                email: 'john.review.model@test.com',
                password: 'Password123!',
                isEmailVerified: true,
                status: 'active'
            },
            {
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.review.model@test.com',
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

        // Create test session
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
            status: 'completed'
        });
        await testSession.save();
    });

    describe('Review Creation', () => {
        it('should create a valid review', async () => {
            const reviewData = {
                reviewer: testUsers[0]._id,
                reviewee: testUsers[1]._id,
                session: testSession._id,
                rating: 5,
                comment: 'Excellent teacher! Very patient and knowledgeable.',
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
        });

        it('should require all mandatory fields', async () => {
            const review = new Review({});

            await expect(review.save()).rejects.toThrow();
        });

        it('should validate rating range', async () => {
            const reviewData = {
                reviewer: testUsers[0]._id,
                reviewee: testUsers[1]._id,
                session: testSession._id,
                rating: 6, // Invalid rating
                comment: 'Great session!',
                skillReviewed: { name: 'Python', category: 'Programming' },
                reviewType: 'learning'
            };

            const review = new Review(reviewData);
            await expect(review.save()).rejects.toThrow();
        });

        it('should validate comment length', async () => {
            const reviewData = {
                reviewer: testUsers[0]._id,
                reviewee: testUsers[1]._id,
                session: testSession._id,
                rating: 5,
                comment: 'Short', // Too short
                skillReviewed: { name: 'Python', category: 'Programming' },
                reviewType: 'learning'
            };

            const review = new Review(reviewData);
            await expect(review.save()).rejects.toThrow();
        });

        it('should validate review type enum', async () => {
            const reviewData = {
                reviewer: testUsers[0]._id,
                reviewee: testUsers[1]._id,
                session: testSession._id,
                rating: 5,
                comment: 'Great session!',
                skillReviewed: { name: 'Python', category: 'Programming' },
                reviewType: 'invalid-type'
            };

            const review = new Review(reviewData);
            await expect(review.save()).rejects.toThrow();
        });

        it('should prevent users from reviewing themselves', async () => {
            const reviewData = {
                reviewer: testUsers[0]._id,
                reviewee: testUsers[0]._id, // Same user
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

    describe('Virtual Properties', () => {
        let review;

        beforeEach(async () => {
            review = new Review({
                reviewer: testUsers[0]._id,
                reviewee: testUsers[1]._id,
                session: testSession._id,
                rating: 5,
                comment: 'Great session!',
                skillReviewed: { name: 'Python', category: 'Programming' },
                reviewType: 'learning'
            });
            await review.save();
        });

        it('should calculate helpfulness score correctly', () => {
            // Add some helpfulness votes
            review.helpfulness.helpful.push(testUsers[0]._id);
            review.helpfulness.helpful.push(testUsers[1]._id);
            review.helpfulness.notHelpful.push(new mongoose.Types.ObjectId());

            expect(review.helpfulnessScore).toBe(67); // 2 out of 3 = 67%
        });

        it('should calculate net helpfulness correctly', () => {
            review.helpfulness.helpful.push(testUsers[0]._id);
            review.helpfulness.helpful.push(testUsers[1]._id);
            review.helpfulness.notHelpful.push(new mongoose.Types.ObjectId());

            expect(review.netHelpfulness).toBe(1); // 2 helpful - 1 not helpful = 1
        });

        it('should determine if review is flagged', () => {
            expect(review.isFlagged).toBe(false);

            review.status = 'flagged';
            expect(review.isFlagged).toBe(true);
        });

        it('should count flags correctly', () => {
            expect(review.flagCount).toBe(0);

            review.moderation.flaggedBy.push({
                user: testUsers[0]._id,
                reason: 'inappropriate',
                flaggedAt: new Date()
            });

            expect(review.flagCount).toBe(1);
        });
    });

    describe('Instance Methods', () => {
        let review;

        beforeEach(async () => {
            review = new Review({
                reviewer: testUsers[0]._id,
                reviewee: testUsers[1]._id,
                session: testSession._id,
                rating: 5,
                comment: 'Great session!',
                skillReviewed: { name: 'Python', category: 'Programming' },
                reviewType: 'learning'
            });
            await review.save();
        });

        it('should check if user can flag review', () => {
            // Reviewer cannot flag their own review
            expect(review.canBeFlaggedBy(testUsers[0]._id)).toBe(false);

            // Other users can flag the review
            expect(review.canBeFlaggedBy(testUsers[1]._id)).toBe(true);
        });

        it('should flag review correctly', async () => {
            await review.flagReview(testUsers[1]._id, 'inappropriate', 'Contains offensive language');

            expect(review.moderation.flaggedBy).toHaveLength(1);
            expect(review.moderation.flaggedBy[0].reason).toBe('inappropriate');
            expect(review.moderation.flaggedBy[0].details).toBe('Contains offensive language');
        });

        it('should auto-hide review after multiple flags', async () => {
            // Add multiple flags
            await review.flagReview(testUsers[1]._id, 'inappropriate', 'Test 1');

            // Create additional users for more flags
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

            await review.flagReview(user3._id, 'spam', 'Test 2');
            await review.flagReview(user4._id, 'fake', 'Test 3');

            expect(review.status).toBe('flagged');
        });

        it('should mark helpfulness correctly', async () => {
            await review.markHelpfulness(testUsers[1]._id, true);

            expect(review.helpfulness.helpful).toHaveLength(1);
            expect(review.helpfulness.helpful[0].toString()).toBe(testUsers[1]._id.toString());
            expect(review.helpfulness.notHelpful).toHaveLength(0);

            // Change vote
            await review.markHelpfulness(testUsers[1]._id, false);

            expect(review.helpfulness.helpful).toHaveLength(0);
            expect(review.helpfulness.notHelpful).toHaveLength(1);
        });

        it('should add response correctly', async () => {
            const responseComment = 'Thank you for the kind words!';
            await review.addResponse(responseComment);

            expect(review.response.comment).toBe(responseComment);
            expect(review.response.respondedAt).toBeDefined();
        });
    });

    describe('Static Methods', () => {
        beforeEach(async () => {
            // Create multiple reviews for testing
            const reviews = [
                {
                    reviewer: testUsers[0]._id,
                    reviewee: testUsers[1]._id,
                    session: testSession._id,
                    rating: 5,
                    comment: 'Excellent teacher!',
                    skillReviewed: { name: 'Python', category: 'Programming' },
                    reviewType: 'learning'
                },
                {
                    reviewer: testUsers[1]._id,
                    reviewee: testUsers[0]._id,
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
            const ratingData = await Review.getUserAverageRating(testUsers[1]._id);

            expect(ratingData.averageRating).toBe(5);
            expect(ratingData.totalReviews).toBe(1);
            expect(ratingData.ratingDistribution[5]).toBe(1);
        });

        it('should get skill-specific rating', async () => {
            const skillRating = await Review.getSkillRating(testUsers[1]._id, 'Python', 'Programming');

            expect(skillRating.averageRating).toBe(5);
            expect(skillRating.totalReviews).toBe(1);
        });

        it('should find user reviews', async () => {
            const reviews = await Review.findUserReviews(testUsers[1]._id);

            expect(reviews).toHaveLength(1);
            expect(reviews[0].rating).toBe(5);
        });

        it('should check if review exists for session', async () => {
            const exists = await Review.reviewExistsForSession(testSession._id, testUsers[0]._id);
            expect(exists).toBe(true);

            const notExists = await Review.reviewExistsForSession(testSession._id, new mongoose.Types.ObjectId());
            expect(notExists).toBe(false);
        });

        it('should get reviews for moderation', async () => {
            // Create a flagged review
            const flaggedReview = new Review({
                reviewer: testUsers[0]._id,
                reviewee: testUsers[1]._id,
                session: testSession._id,
                rating: 1,
                comment: 'This is inappropriate content',
                skillReviewed: { name: 'Python', category: 'Programming' },
                reviewType: 'learning',
                status: 'flagged'
            });
            await flaggedReview.save();

            const moderationReviews = await Review.getReviewsForModeration();
            expect(moderationReviews).toHaveLength(1);
            expect(moderationReviews[0].status).toBe('flagged');
        });
    });

    describe('Indexes and Constraints', () => {
        it('should enforce unique constraint on reviewer-session combination', async () => {
            const reviewData = {
                reviewer: testUsers[0]._id,
                reviewee: testUsers[1]._id,
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

        it('should have proper indexes for performance', async () => {
            const indexes = await Review.collection.getIndexes();
            const indexNames = Object.keys(indexes);

            expect(indexNames).toContain('reviewer_1_session_1');
            expect(indexNames).toContain('reviewee_1_createdAt_-1');
            expect(indexNames).toContain('session_1_reviewer_1');
        });
    });

    describe('Post-save Middleware', () => {
        it('should update user rating after review save', async () => {
            const initialUser = await User.findById(testUsers[1]._id);
            const initialRating = initialUser.rating;

            const review = new Review({
                reviewer: testUsers[0]._id,
                reviewee: testUsers[1]._id,
                session: testSession._id,
                rating: 5,
                comment: 'Excellent teacher!',
                skillReviewed: { name: 'Python', category: 'Programming' },
                reviewType: 'learning'
            });
            await review.save();

            // Wait a bit for the post-save middleware to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            const updatedUser = await User.findById(testUsers[1]._id);
            expect(updatedUser.rating.average).toBe(5);
            expect(updatedUser.rating.count).toBe(1);
        });
    });
});