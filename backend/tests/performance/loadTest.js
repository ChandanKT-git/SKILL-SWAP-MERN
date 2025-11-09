/**
 * Load Testing Script
 * Tests application performance under load
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/server');
const User = require('../../src/models/User');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
}, 30000);

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Performance and Load Tests', () => {
    describe('Concurrent User Registration', () => {
        it('should handle 50 concurrent registrations', async () => {
            const startTime = Date.now();
            const registrations = [];

            for (let i = 0; i < 50; i++) {
                registrations.push(
                    request(app)
                        .post('/api/auth/register')
                        .send({
                            email: `user${i}@test.com`,
                            password: 'Password123!',
                            firstName: `User${i}`,
                            lastName: 'Test',
                            skillsOffered: ['JavaScript'],
                            skillsWanted: ['Python']
                        })
                );
            }

            const results = await Promise.all(registrations);
            const endTime = Date.now();
            const duration = endTime - startTime;

            const successCount = results.filter(r => r.status === 201).length;

            console.log(`\n📊 Concurrent Registration Performance:`);
            console.log(`   Total requests: 50`);
            console.log(`   Successful: ${successCount}`);
            console.log(`   Duration: ${duration}ms`);
            console.log(`   Avg time per request: ${(duration / 50).toFixed(2)}ms`);

            expect(successCount).toBeGreaterThan(45); // Allow some failures
            expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
        }, 30000);
    });

    describe('Search Performance', () => {
        beforeEach(async () => {
            await User.deleteMany({});

            // Create test users
            const users = [];
            for (let i = 0; i < 100; i++) {
                users.push({
                    email: `user${i}@test.com`,
                    password: 'hashedpassword',
                    firstName: `User${i}`,
                    lastName: 'Test',
                    isVerified: true,
                    skillsOffered: i % 2 === 0 ? ['JavaScript'] : ['Python'],
                    skillsWanted: ['React'],
                    location: i % 3 === 0 ? 'New York' : 'San Francisco'
                });
            }
            await User.insertMany(users);
        });

        it('should search through 100 users quickly', async () => {
            // Create and login a user
            const testUser = await User.create({
                email: 'searcher@test.com',
                password: 'hashedpassword',
                firstName: 'Searcher',
                lastName: 'Test',
                isVerified: true
            });

            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: 'searcher@test.com', password: 'hashedpassword' });

            const token = loginRes.body.data.token;

            const startTime = Date.now();

            const searchRes = await request(app)
                .get('/api/users/search')
                .query({ skill: 'JavaScript' })
                .set('Authorization', `Bearer ${token}`);

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`\n📊 Search Performance:`);
            console.log(`   Database size: 100 users`);
            console.log(`   Results found: ${searchRes.body.data.users.length}`);
            console.log(`   Query time: ${duration}ms`);

            expect(searchRes.status).toBe(200);
            expect(duration).toBeLessThan(500); // Should complete within 500ms
        });

        it('should handle concurrent searches', async () => {
            const testUser = await User.create({
                email: 'searcher@test.com',
                password: 'hashedpassword',
                firstName: 'Searcher',
                lastName: 'Test',
                isVerified: true
            });

            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: 'searcher@test.com', password: 'hashedpassword' });

            const token = loginRes.body.data.token;

            const startTime = Date.now();
            const searches = [];

            for (let i = 0; i < 20; i++) {
                searches.push(
                    request(app)
                        .get('/api/users/search')
                        .query({ skill: i % 2 === 0 ? 'JavaScript' : 'Python' })
                        .set('Authorization', `Bearer ${token}`)
                );
            }

            const results = await Promise.all(searches);
            const endTime = Date.now();
            const duration = endTime - startTime;

            const successCount = results.filter(r => r.status === 200).length;

            console.log(`\n📊 Concurrent Search Performance:`);
            console.log(`   Total searches: 20`);
            console.log(`   Successful: ${successCount}`);
            console.log(`   Duration: ${duration}ms`);
            console.log(`   Avg time per search: ${(duration / 20).toFixed(2)}ms`);

            expect(successCount).toBe(20);
            expect(duration).toBeLessThan(3000);
        }, 30000);
    });

    describe('API Response Times', () => {
        let authToken;

        beforeEach(async () => {
            await User.deleteMany({});

            const user = await User.create({
                email: 'test@test.com',
                password: 'hashedpassword',
                firstName: 'Test',
                lastName: 'User',
                isVerified: true
            });

            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@test.com', password: 'hashedpassword' });

            authToken = loginRes.body.data.token;
        });

        it('should respond to health check quickly', async () => {
            const startTime = Date.now();

            const res = await request(app).get('/api/health');

            const duration = Date.now() - startTime;

            console.log(`\n📊 Health Check Performance: ${duration}ms`);

            expect(res.status).toBe(200);
            expect(duration).toBeLessThan(100);
        });

        it('should respond to profile requests quickly', async () => {
            const startTime = Date.now();

            const res = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${authToken}`);

            const duration = Date.now() - startTime;

            console.log(`\n📊 Profile Request Performance: ${duration}ms`);

            expect(res.status).toBe(200);
            expect(duration).toBeLessThan(200);
        });
    });

    describe('Memory Usage', () => {
        it('should not leak memory during repeated operations', async () => {
            const initialMemory = process.memoryUsage().heapUsed;

            // Perform 100 operations
            for (let i = 0; i < 100; i++) {
                await request(app).get('/api/health');
            }

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            const memoryIncreaseMB = (memoryIncrease / 1024 / 1024).toFixed(2);

            console.log(`\n📊 Memory Usage:`);
            console.log(`   Initial: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
            console.log(`   Final: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
            console.log(`   Increase: ${memoryIncreaseMB}MB`);

            // Memory increase should be reasonable (less than 50MB for 100 requests)
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
        });
    });
});
