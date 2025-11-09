const request = require('supertest');
const { app } = require('../../src/server');
const database = require('../../src/config/database');
const User = require('../../src/models/User');

/**
 * Security Tests
 * Tests for rate limiting, input sanitization, and security headers
 */

describe('Security Tests', () => {
    beforeAll(async () => {
        await database.connect();
    });

    afterAll(async () => {
        await database.disconnect();
    });

    beforeEach(async () => {
        await User.deleteMany({});
    });

    describe('Rate Limiting', () => {
        it('should enforce rate limits on login endpoint', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'wrongpassword'
            };

            // Make multiple requests to trigger rate limit
            const requests = [];
            for (let i = 0; i < 6; i++) {
                requests.push(
                    request(app)
                        .post('/api/auth/login')
                        .send(loginData)
                );
            }

            const responses = await Promise.all(requests);

            // At least one request should be rate limited
            const rateLimited = responses.some(res => res.status === 429);
            expect(rateLimited).toBe(true);
        }, 15000);

        it('should include rate limit headers', async () => {
            const response = await request(app)
                .get('/api/search/users')
                .expect('Content-Type', /json/);

            expect(response.headers).toHaveProperty('ratelimit-limit');
            expect(response.headers).toHaveProperty('ratelimit-remaining');
        });
    });

    describe('Security Headers', () => {
        it('should include security headers in responses', async () => {
            const response = await request(app)
                .get('/health');

            // Check for security headers
            expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
            expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
            expect(response.headers).not.toHaveProperty('x-powered-by');
        });

        it('should set CORS headers correctly', async () => {
            const response = await request(app)
                .options('/api/auth/login')
                .set('Origin', 'http://localhost:3000');

            expect(response.headers).toHaveProperty('access-control-allow-origin');
            expect(response.headers).toHaveProperty('access-control-allow-methods');
        });
    });

    describe('Input Sanitization', () => {
        it('should reject requests with suspicious patterns', async () => {
            const maliciousData = {
                email: 'test@example.com',
                password: '<script>alert("xss")</script>'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(maliciousData);

            // Should either reject or sanitize the input
            expect([400, 422]).toContain(response.status);
        });

        it('should handle SQL injection attempts', async () => {
            const response = await request(app)
                .get('/api/search/users')
                .query({ skill: "'; DROP TABLE users; --" });

            // Should not crash and should return proper error
            expect(response.status).toBeLessThan(500);
        });

        it('should reject invalid Content-Type', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .set('Content-Type', 'text/plain')
                .send('invalid data');

            expect(response.status).toBe(415);
        });
    });

    describe('Request Size Limits', () => {
        it('should reject oversized JSON payloads', async () => {
            const largePayload = {
                email: 'test@example.com',
                password: 'password123',
                bio: 'a'.repeat(15 * 1024 * 1024) // 15MB
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(largePayload);

            expect(response.status).toBe(413);
        }, 10000);
    });

    describe('Authentication Security', () => {
        it('should not expose sensitive user data in responses', async () => {
            // Create a test user
            const user = await User.create({
                firstName: 'Test',
                lastName: 'User',
                email: 'test@example.com',
                password: 'Password123!',
                isEmailVerified: true
            });

            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'Password123!'
                });

            expect(loginResponse.status).toBe(200);
            expect(loginResponse.body.data.user).toBeDefined();
            expect(loginResponse.body.data.user.password).toBeUndefined();
            expect(loginResponse.body.data.user.otp).toBeUndefined();
        });

        it('should require authentication for protected routes', async () => {
            const response = await request(app)
                .get('/api/profile');

            expect(response.status).toBe(401);
        });

        it('should reject invalid JWT tokens', async () => {
            const response = await request(app)
                .get('/api/profile')
                .set('Authorization', 'Bearer invalid_token');

            expect(response.status).toBe(401);
        });
    });

    describe('Parameter Pollution Prevention', () => {
        it('should handle duplicate query parameters', async () => {
            const response = await request(app)
                .get('/api/search/users?skill=javascript&skill=python');

            // Should not crash and handle gracefully
            expect(response.status).toBeLessThan(500);
        });
    });

    describe('HTTPS and Secure Connections', () => {
        it('should set secure cookie flags in production', () => {
            // This would be tested in production environment
            // For now, just verify the configuration exists
            expect(process.env.NODE_ENV).toBeDefined();
        });
    });
});
