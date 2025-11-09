const request = require('supertest');
const { app } = require('../../src/server');
const database = require('../../src/config/database');
const User = require('../../src/models/User');
const Session = require('../../src/models/Session');
const Review = require('../../src/models/Review');
const { getDatabaseStats, getCollectionStats } = require('../../src/utils/databaseOptimization');

/**
 * Performance Tests
 * Tests for database indexing, query performance, and optimization
 */

describe('Performance Tests', () => {
    let testUsers = [];
    let authToken;

    beforeAll(async () => {
        await database.connect();

        // Create test users for performance testing
        const userPromises = [];
        for (let i = 0; i < 20; i++) {
            userPromises.push(
                User.create({
                    firstName: `User${i}`,
                    lastName: `Test${i}`,
                    email: `user${i}@example.com`,
                    password: 'Password123!',
                    isEmailVerified: true,
                    skills: [
                        {
                            name: i % 2 === 0 ? 'JavaScript' : 'Python',
                            level: 'intermediate',
                            category: 'Programming',
                            yearsOfExperience: i % 5
                        }
                    ],
                    rating: {
                        average: 3 + (i % 3),
                        count: i
                    }
                })
            );
        }
        testUsers = await Promise.all(userPromises);

        // Login to get auth token
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'user0@example.com',
                password: 'Password123!'
            });

        authToken = loginResponse.body.data.token;
    });

    afterAll(async () => {
        await User.deleteMany({});
        await Session.deleteMany({});
        await Review.deleteMany({});
        await database.disconnect();
    });

    describe('Database Indexing', () => {
        it('should have indexes on User collection', async () => {
            const collection = database.getConnection().collection('users');
            const indexes = await collection.indexes();

            expect(indexes.length).toBeGreaterThan(1);

            // Check for specific indexes
            const indexNames = indexes.map(idx => Object.keys(idx.key).join('_'));
            expect(indexNames).toContain('email_1');
        });

        it('should have indexes on Session collection', async () => {
            const collection = database.getConnection().collection('sessions');
            const indexes = await collection.indexes();

            expect(indexes.length).toBeGreaterThan(1);
        });

        it('should have indexes on Review collection', async () => {
            const collection = database.getConnection().collection('reviews');
            const indexes = await collection.indexes();

            expect(indexes.length).toBeGreaterThan(1);
        });
    });

    describe('Query Performance', () => {
        it('should perform user search efficiently', async () => {
            const startTime = Date.now();

            const response = await request(app)
                .get('/api/search/users')
                .query({ skill: 'JavaScript' });

            const duration = Date.now() - startTime;

            expect(response.status).toBe(200);
            expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
        });

        it('should handle pagination efficiently', async () => {
            const startTime = Date.now();

            const response = await request(app)
                .get('/api/search/users')
                .query({ page: 1, limit: 10 });

            const duration = Date.now() - startTime;

            expect(response.status).toBe(200);
            expect(duration).toBeLessThan(500);
        });

        it('should perform filtered searches efficiently', async () => {
            const startTime = Date.now();

            const response = await request(app)
                .get('/api/search/users')
                .query({
                    skill: 'JavaScript',
                    minRating: 3,
                    sortBy: 'rating.average',
                    sortOrder: 'desc'
                });

            const duration = Date.now() - startTime;

            expect(response.status).toBe(200);
            expect(duration).toBeLessThan(1000);
        });
    });

    describe('Database Statistics', () => {
        it('should retrieve database statistics', async () => {
            const stats = await getDatabaseStats();

            expect(stats).toBeDefined();
            expect(stats).toHaveProperty('collections');
            expect(stats).toHaveProperty('dataSize');
            expect(stats).toHaveProperty('indexes');
        });

        it('should retrieve collection statistics', async () => {
            const stats = await getCollectionStats('users');

            expect(stats).toBeDefined();
            expect(stats).toHaveProperty('collection', 'users');
            expect(stats).toHaveProperty('count');
            expect(stats.count).toBeGreaterThan(0);
        });
    });

    describe('Response Time Benchmarks', () => {
        it('should respond to health check quickly', async () => {
            const startTime = Date.now();

            const response = await request(app)
                .get('/health');

            const duration = Date.now() - startTime;

            expect(response.status).toBe(200);
            expect(duration).toBeLessThan(100); // Should be very fast
        });

        it('should handle concurrent requests efficiently', async () => {
            const startTime = Date.now();

            const requests = [];
            for (let i = 0; i < 10; i++) {
                requests.push(
                    request(app)
                        .get('/api/search/users')
                        .query({ skill: 'JavaScript' })
                );
            }

            const responses = await Promise.all(requests);
            const duration = Date.now() - startTime;

            expect(responses.every(res => res.status === 200)).toBe(true);
            expect(duration).toBeLessThan(3000); // 10 concurrent requests in less than 3 seconds
        });
    });

    describe('Cloudinary Optimization', () => {
        it('should have cloudinary configuration', () => {
            const cloudinary = require('../../src/config/cloudinary');
            expect(cloudinary.config).toBeDefined();
            expect(cloudinary.config.isReady).toBeDefined();
        });

        it('should support URL caching', () => {
            const cloudinary = require('../../src/config/cloudinary');

            if (cloudinary.config.isReady()) {
                expect(cloudinary.config.getCacheStats).toBeDefined();
                const stats = cloudinary.config.getCacheStats();
                expect(stats).toHaveProperty('size');
                expect(stats).toHaveProperty('maxSize');
            }
        });
    });

    describe('Memory Usage', () => {
        it('should not leak memory during multiple requests', async () => {
            const initialMemory = process.memoryUsage().heapUsed;

            // Make multiple requests
            for (let i = 0; i < 50; i++) {
                await request(app)
                    .get('/api/search/users')
                    .query({ skill: 'JavaScript' });
            }

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;

            // Memory increase should be reasonable (less than 50MB)
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
        }, 30000);
    });

    describe('Aggregation Performance', () => {
        it('should calculate user ratings efficiently', async () => {
            // Create some test reviews
            const session = await Session.create({
                requester: testUsers[0]._id,
                provider: testUsers[1]._id,
                skill: {
                    name: 'JavaScript',
                    category: 'Programming',
                    level: 'intermediate'
                },
                scheduledDate: new Date(Date.now() + 86400000),
                duration: 60,
                status: 'completed'
            });

            await Review.create({
                reviewer: testUsers[0]._id,
                reviewee: testUsers[1]._id,
                session: session._id,
                rating: 5,
                comment: 'Great session!',
                skillReviewed: {
                    name: 'JavaScript',
                    category: 'Programming'
                },
                reviewType: 'learning',
                status: 'active'
            });

            const startTime = Date.now();

            const ratingData = await Review.getUserAverageRating(testUsers[1]._id);

            const duration = Date.now() - startTime;

            expect(ratingData).toBeDefined();
            expect(ratingData.averageRating).toBeGreaterThan(0);
            expect(duration).toBeLessThan(500);
        });
    });
});
