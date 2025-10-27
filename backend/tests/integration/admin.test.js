const request = require('supertest');
const { app } = require('../../src/server');
const User = require('../../src/models/User');
const jwt = require('jsonwebtoken');

describe('Admin API Integration Tests', () => {
    let adminToken, userToken, adminUser, regularUser;

    beforeAll(async () => {
        // Create admin user
        adminUser = new User({
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@test.com',
            password: 'password123',
            role: 'admin',
            skills: []
        });
        await adminUser.save();

        // Create regular user
        regularUser = new User({
            firstName: 'Regular',
            lastName: 'User',
            email: 'user@test.com',
            password: 'password123',
            role: 'user',
            skills: []
        });
        await regularUser.save();

        // Generate tokens
        adminToken = jwt.sign(
            { id: adminUser._id, email: adminUser.email, role: adminUser.role },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );

        userToken = jwt.sign(
            { id: regularUser._id, email: regularUser.email, role: regularUser.role },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );
    });

    afterAll(async () => {
        await User.deleteMany({});
    });

    describe('GET /api/admin/dashboard', () => {
        test('should return dashboard stats for admin', async () => {
            const response = await request(app)
                .get('/api/admin/dashboard')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('overview');
            expect(response.body.data).toHaveProperty('recentActivity');
        });

        test('should deny access for non-admin users', async () => {
            const response = await request(app)
                .get('/api/admin/dashboard')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(403);

            expect(response.body.success).toBe(false);
        });

        test('should deny access for unauthenticated users', async () => {
            const response = await request(app)
                .get('/api/admin/dashboard')
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/admin/users', () => {
        test('should return users list for admin', async () => {
            const response = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('users');
            expect(response.body.data).toHaveProperty('pagination');
            expect(Array.isArray(response.body.data.users)).toBe(true);
        });

        test('should support pagination', async () => {
            const response = await request(app)
                .get('/api/admin/users?page=1&limit=1')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.data.users.length).toBeLessThanOrEqual(1);
            expect(response.body.data.pagination.currentPage).toBe(1);
        });
    });

    describe('PUT /api/admin/users/:userId/status', () => {
        test('should update user status', async () => {
            const response = await request(app)
                .put(`/api/admin/users/${regularUser._id}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    status: 'suspended',
                    reason: 'Test suspension'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.newStatus).toBe('suspended');

            // Verify in database
            const updatedUser = await User.findById(regularUser._id);
            expect(updatedUser.status).toBe('suspended');
        });

        test('should prevent admin from changing own status', async () => {
            const response = await request(app)
                .put(`/api/admin/users/${adminUser._id}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    status: 'suspended'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });
});