const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../../src/server');
const User = require('../../src/models/User');
const { connectTestDB, clearTestDB, closeTestDB } = require('../helpers/testDb');
const JWTUtils = require('../../src/utils/jwt');

describe('Search Integration Tests', () => {
    jest.setTimeout(30000); // 30 second timeout
    let testUsers = [];
    let authToken;

    beforeAll(async () => {
        await connectTestDB();
    });

    afterAll(async () => {
        await closeTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();
        testUsers = []; // Reset the array

        // Create test users with different skills and locations
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
                location: {
                    city: 'New York',
                    state: 'NY',
                    country: 'USA',
                    coordinates: [-74.006, 40.7128] // NYC coordinates
                },
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
                location: {
                    city: 'San Francisco',
                    state: 'CA',
                    country: 'USA',
                    coordinates: [-122.4194, 37.7749] // SF coordinates
                },
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
                    { name: 'JavaScript', level: 'intermediate', category: 'Programming' },
                    { name: 'Node.js', level: 'advanced', category: 'Backend' }
                ],
                location: {
                    city: 'Chicago',
                    state: 'IL',
                    country: 'USA',
                    coordinates: [-87.6298, 41.8781] // Chicago coordinates
                },
                rating: { average: 4.2, count: 8 },
                availability: { isAvailable: false }
            },
            {
                firstName: 'Alice',
                lastName: 'Wilson',
                email: 'alice@example.com',
                password: 'Password123!',
                isEmailVerified: true,
                status: 'active',
                skills: [
                    { name: 'Graphic Design', level: 'expert', category: 'Design' },
                    { name: 'Photoshop', level: 'advanced', category: 'Design' }
                ],
                location: {
                    city: 'Los Angeles',
                    state: 'CA',
                    country: 'USA',
                    coordinates: [-118.2437, 34.0522] // LA coordinates
                },
                rating: { average: 4.7, count: 12 },
                availability: { isAvailable: true }
            },
            {
                firstName: 'Charlie',
                lastName: 'Brown',
                email: 'charlie@example.com',
                password: 'Password123!',
                isEmailVerified: false, // Not verified - should not appear in search
                status: 'active',
                skills: [
                    { name: 'Java', level: 'expert', category: 'Programming' }
                ],
                rating: { average: 4.0, count: 5 },
                availability: { isAvailable: true }
            }
        ];

        for (const userData of usersData) {
            const user = await User.create(userData);
            testUsers.push(user);
        }

        // Generate auth token for authenticated requests
        authToken = JWTUtils.generateAccessToken({
            id: testUsers[0]._id,
            email: testUsers[0].email,
            firstName: testUsers[0].firstName,
            lastName: testUsers[0].lastName,
            role: testUsers[0].role,
            isEmailVerified: testUsers[0].isEmailVerified,
        });
    });

    describe('GET /api/search/users', () => {
        it('should search users by skill name', async () => {
            const response = await request(app)
                .get('/api/search/users')
                .query({ skill: 'JavaScript' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.users).toHaveLength(2);
            expect(response.body.data.users.every(user =>
                user.skills.some(skill => skill.name.toLowerCase().includes('javascript'))
            )).toBe(true);
        });

        it('should filter users by skill level', async () => {
            const response = await request(app)
                .get('/api/search/users')
                .query({ skill: 'JavaScript', level: 'advanced' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.users).toHaveLength(1);
            expect(response.body.data.users[0].firstName).toBe('John');
        });

        it('should filter users by category', async () => {
            const response = await request(app)
                .get('/api/search/users')
                .query({ category: 'Programming' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.users).toHaveLength(3); // John, Jane, Bob (Charlie not verified)
        });

        it('should filter users by rating range', async () => {
            const response = await request(app)
                .get('/api/search/users')
                .query({ minRating: 4.5 })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.users).toHaveLength(3); // John, Jane, Alice
            expect(response.body.data.users.every(user => user.rating.average >= 4.5)).toBe(true);
        });

        it('should filter users by availability', async () => {
            const response = await request(app)
                .get('/api/search/users')
                .query({ availability: false })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.users).toHaveLength(1);
            expect(response.body.data.users[0].firstName).toBe('Bob');
        });

        it('should search users by location with radius', async () => {
            // Search near NYC with 1000km radius (should include Chicago)
            const response = await request(app)
                .get('/api/search/users')
                .query({
                    location: '-74.006,40.7128', // NYC coordinates
                    radius: 1000000 // 1000km in meters
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.users.length).toBeGreaterThan(0);
        });

        it('should paginate search results', async () => {
            const response = await request(app)
                .get('/api/search/users')
                .query({ page: 1, limit: 2 })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.users).toHaveLength(2);
            expect(response.body.data.pagination.currentPage).toBe(1);
            expect(response.body.data.pagination.limit).toBe(2);
            expect(response.body.data.pagination.totalCount).toBeGreaterThan(2);
        });

        it('should sort users by rating descending by default', async () => {
            const response = await request(app)
                .get('/api/search/users')
                .expect(200);

            expect(response.body.success).toBe(true);
            const ratings = response.body.data.users.map(user => user.rating.average);
            const sortedRatings = [...ratings].sort((a, b) => b - a);
            expect(ratings).toEqual(sortedRatings);
        });

        it('should sort users by name ascending when specified', async () => {
            const response = await request(app)
                .get('/api/search/users')
                .query({ sortBy: 'firstName', sortOrder: 'asc' })
                .expect(200);

            expect(response.body.success).toBe(true);
            const names = response.body.data.users.map(user => user.firstName);
            const sortedNames = [...names].sort();
            expect(names).toEqual(sortedNames);
        });

        it('should exclude unverified and inactive users', async () => {
            const response = await request(app)
                .get('/api/search/users')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.users.every(user =>
                user.isEmailVerified && user.status === 'active'
            )).toBe(true);
            expect(response.body.data.users.find(user => user.firstName === 'Charlie')).toBeUndefined();
        });

        it('should return empty results for non-existent skill', async () => {
            const response = await request(app)
                .get('/api/search/users')
                .query({ skill: 'NonExistentSkill' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.users).toHaveLength(0);
        });

        it('should validate invalid location format', async () => {
            const response = await request(app)
                .get('/api/search/users')
                .query({ location: 'invalid-location' })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Validation failed');
        });
    });

    describe('GET /api/search/skills', () => {
        it('should get all available skills', async () => {
            const response = await request(app)
                .get('/api/search/skills')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.data[0]).toHaveProperty('name');
            expect(response.body.data[0]).toHaveProperty('category');
            expect(response.body.data[0]).toHaveProperty('userCount');
        });

        it('should filter skills by query', async () => {
            const response = await request(app)
                .get('/api/search/skills')
                .query({ query: 'Java' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.every(skill =>
                skill.name.toLowerCase().includes('java')
            )).toBe(true);
        });

        it('should filter skills by category', async () => {
            const response = await request(app)
                .get('/api/search/skills')
                .query({ category: 'Programming' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.every(skill =>
                skill.category.toLowerCase().includes('programming')
            )).toBe(true);
        });

        it('should limit results', async () => {
            const response = await request(app)
                .get('/api/search/skills')
                .query({ limit: 3 })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeLessThanOrEqual(3);
        });
    });

    describe('GET /api/search/categories', () => {
        it('should get all skill categories', async () => {
            const response = await request(app)
                .get('/api/search/categories')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.data[0]).toHaveProperty('category');
            expect(response.body.data[0]).toHaveProperty('userCount');
            expect(response.body.data[0]).toHaveProperty('skillCount');
        });

        it('should sort categories by user count descending', async () => {
            const response = await request(app)
                .get('/api/search/categories')
                .expect(200);

            expect(response.body.success).toBe(true);
            const userCounts = response.body.data.map(cat => cat.userCount);
            const sortedCounts = [...userCounts].sort((a, b) => b - a);
            expect(userCounts).toEqual(sortedCounts);
        });
    });

    describe('GET /api/search/suggestions', () => {
        it('should get search suggestions for skills', async () => {
            const response = await request(app)
                .get('/api/search/suggestions')
                .query({ query: 'Java', type: 'skills' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('skills');
            expect(response.body.data.skills).toBeInstanceOf(Array);
        });

        it('should get search suggestions for categories', async () => {
            const response = await request(app)
                .get('/api/search/suggestions')
                .query({ query: 'Program', type: 'categories' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('categories');
            expect(response.body.data.categories).toBeInstanceOf(Array);
        });

        it('should get search suggestions for users', async () => {
            const response = await request(app)
                .get('/api/search/suggestions')
                .query({ query: 'John', type: 'users' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('users');
            expect(response.body.data.users).toBeInstanceOf(Array);
        });

        it('should get all types of suggestions by default', async () => {
            const response = await request(app)
                .get('/api/search/suggestions')
                .query({ query: 'Java' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('skills');
            expect(response.body.data).toHaveProperty('categories');
            expect(response.body.data).toHaveProperty('users');
        });

        it('should require minimum query length', async () => {
            const response = await request(app)
                .get('/api/search/suggestions')
                .query({ query: 'J' })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should handle short queries gracefully', async () => {
            const response = await request(app)
                .get('/api/search/suggestions')
                .query({ query: 'Ja' })
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    describe('GET /api/search/trending', () => {
        it('should get trending skills', async () => {
            const response = await request(app)
                .get('/api/search/trending')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            if (response.body.data.length > 0) {
                expect(response.body.data[0]).toHaveProperty('name');
                expect(response.body.data[0]).toHaveProperty('category');
                expect(response.body.data[0]).toHaveProperty('recentUsers');
                expect(response.body.data[0]).toHaveProperty('trendScore');
            }
        });

        it('should limit trending results', async () => {
            const response = await request(app)
                .get('/api/search/trending')
                .query({ limit: 5 })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeLessThanOrEqual(5);
        });

        it('should filter by time period', async () => {
            const response = await request(app)
                .get('/api/search/trending')
                .query({ period: 7 }) // Last 7 days
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
        });
    });

    describe('GET /api/search/user/:userId', () => {
        it('should get specific user profile', async () => {
            const userId = testUsers[0]._id.toString();

            const response = await request(app)
                .get(`/api/search/user/${userId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data._id).toBe(userId);
            expect(response.body.data.firstName).toBe('John');
            expect(response.body.data).not.toHaveProperty('password');
        });

        it('should require authentication', async () => {
            const userId = testUsers[0]._id.toString();

            const response = await request(app)
                .get(`/api/search/user/${userId}`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should return error for invalid user ID', async () => {
            const response = await request(app)
                .get('/api/search/user/invalid-id')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid user ID format');
        });

        it('should return error for non-existent user', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();

            const response = await request(app)
                .get(`/api/search/user/${nonExistentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('User not found');
        });

        it('should not return unverified users', async () => {
            const unverifiedUserId = testUsers[4]._id.toString(); // Charlie

            const response = await request(app)
                .get(`/api/search/user/${unverifiedUserId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('User not available');
        });
    });
});