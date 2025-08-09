const request = require('supertest');
const { app } = require('../../src/server');
const User = require('../../src/models/User');
const { connectTestDB, clearTestDB, closeTestDB } = require('../helpers/testDb');
const JWTUtils = require('../../src/utils/jwt');

describe('Profile Integration Tests', () => {
    let testUser;
    let accessToken;

    beforeAll(async () => {
        await connectTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();

        // Create test user
        testUser = await User.create({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            password: 'SecurePassword123!',
            isEmailVerified: true,
        });

        // Generate access token
        accessToken = JWTUtils.generateAccessToken({
            id: testUser._id,
            email: testUser.email,
            firstName: testUser.firstName,
            lastName: testUser.lastName,
            role: testUser.role,
            isEmailVerified: testUser.isEmailVerified,
        });
    });

    afterAll(async () => {
        await closeTestDB();
    });

    describe('GET /api/profile', () => {
        it('should get current user profile', async () => {
            const response = await request(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.profile).toMatchObject({
                id: testUser._id.toString(),
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
            });
        });

        it('should return error without authentication', async () => {
            const response = await request(app)
                .get('/api/profile')
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('Access token is required');
        });
    });

    describe('GET /api/profile/:userId', () => {
        it('should get user profile by ID (public view)', async () => {
            const response = await request(app)
                .get(`/api/profile/${testUser._id}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.profile).toMatchObject({
                id: testUser._id.toString(),
                firstName: 'John',
                lastName: 'Doe',
            });
            // Should not include email in public view
            expect(response.body.data.profile.email).toBeUndefined();
        });

        it('should return error for invalid user ID', async () => {
            const response = await request(app)
                .get('/api/profile/invalid-id')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('Invalid ID format');
        });

        it('should return error for non-existent user', async () => {
            const nonExistentId = '507f1f77bcf86cd799439011';
            const response = await request(app)
                .get(`/api/profile/${nonExistentId}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('User not found');
        });
    });

    describe('PUT /api/profile', () => {
        it('should update user profile successfully', async () => {
            const updateData = {
                firstName: 'Jane',
                lastName: 'Smith',
                bio: 'Software developer with 5 years of experience',
                location: {
                    city: 'San Francisco',
                    state: 'California',
                    country: 'USA',
                },
                availability: {
                    timezone: 'America/Los_Angeles',
                    preferredDays: ['monday', 'tuesday', 'wednesday'],
                    isAvailable: true,
                },
            };

            const response = await request(app)
                .put('/api/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.profile).toMatchObject({
                firstName: 'Jane',
                lastName: 'Smith',
                bio: 'Software developer with 5 years of experience',
            });
            expect(response.body.data.profile.location.city).toBe('San Francisco');
        });

        it('should validate profile update data', async () => {
            const invalidData = {
                firstName: 'A', // Too short
                bio: 'A'.repeat(501), // Too long
            };

            const response = await request(app)
                .put('/api/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('Validation failed');
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .put('/api/profile')
                .send({ firstName: 'Jane' })
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/profile/skills', () => {
        it('should add skill successfully', async () => {
            const skillData = {
                name: 'JavaScript',
                level: 'advanced',
                category: 'Programming',
                description: 'Frontend and backend development',
                yearsOfExperience: 3,
            };

            const response = await request(app)
                .post('/api/profile/skills')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(skillData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.skill).toMatchObject({
                name: 'JavaScript',
                level: 'advanced',
                category: 'Programming',
            });
            expect(response.body.data.totalSkills).toBe(1);
        });

        it('should prevent duplicate skills', async () => {
            // Add skill first
            await User.findByIdAndUpdate(testUser._id, {
                $push: {
                    skills: {
                        name: 'JavaScript',
                        level: 'intermediate',
                        category: 'Programming',
                    },
                },
            });

            const skillData = {
                name: 'javascript', // Case insensitive
                level: 'advanced',
                category: 'Programming',
            };

            const response = await request(app)
                .post('/api/profile/skills')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(skillData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('already exists');
        });

        it('should validate skill data', async () => {
            const invalidSkillData = {
                name: 'JS', // Valid
                level: 'expert', // Valid
                category: '', // Invalid - empty
            };

            const response = await request(app)
                .post('/api/profile/skills')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(invalidSkillData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('Validation failed');
        });
    });

    describe('PUT /api/profile/skills/:skillId', () => {
        let skillId;

        beforeEach(async () => {
            // Add a skill to update
            const updatedUser = await User.findByIdAndUpdate(
                testUser._id,
                {
                    $push: {
                        skills: {
                            name: 'Python',
                            level: 'intermediate',
                            category: 'Programming',
                        },
                    },
                },
                { new: true }
            );
            skillId = updatedUser.skills[0]._id;
        });

        it('should update skill successfully', async () => {
            const updateData = {
                level: 'advanced',
                yearsOfExperience: 2,
            };

            const response = await request(app)
                .put(`/api/profile/skills/${skillId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.skill.level).toBe('advanced');
            expect(response.body.data.skill.yearsOfExperience).toBe(2);
        });

        it('should return error for non-existent skill', async () => {
            const nonExistentId = '507f1f77bcf86cd799439011';
            const response = await request(app)
                .put(`/api/profile/skills/${nonExistentId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ level: 'advanced' })
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('Skill not found');
        });
    });

    describe('DELETE /api/profile/skills/:skillId', () => {
        let skillId;

        beforeEach(async () => {
            // Add a skill to delete
            const updatedUser = await User.findByIdAndUpdate(
                testUser._id,
                {
                    $push: {
                        skills: {
                            name: 'React',
                            level: 'advanced',
                            category: 'Frontend',
                        },
                    },
                },
                { new: true }
            );
            skillId = updatedUser.skills[0]._id;
        });

        it('should remove skill successfully', async () => {
            const response = await request(app)
                .delete(`/api/profile/skills/${skillId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.removedSkillId).toBe(skillId.toString());
            expect(response.body.data.totalSkills).toBe(0);

            // Verify skill was removed from database
            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser.skills.length).toBe(0);
        });

        it('should return error for non-existent skill', async () => {
            const nonExistentId = '507f1f77bcf86cd799439011';
            const response = await request(app)
                .delete(`/api/profile/skills/${nonExistentId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('Skill not found');
        });
    });

    describe('GET /api/profile/skills', () => {
        beforeEach(async () => {
            // Add some skills
            await User.findByIdAndUpdate(testUser._id, {
                $push: {
                    skills: [
                        {
                            name: 'JavaScript',
                            level: 'advanced',
                            category: 'Programming',
                        },
                        {
                            name: 'React',
                            level: 'intermediate',
                            category: 'Frontend',
                        },
                    ],
                },
            });
        });

        it('should get user skills', async () => {
            const response = await request(app)
                .get('/api/profile/skills')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.skills).toHaveLength(2);
            expect(response.body.data.totalSkills).toBe(2);
            expect(response.body.data.skills[0].name).toBe('JavaScript');
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .get('/api/profile/skills')
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });
});