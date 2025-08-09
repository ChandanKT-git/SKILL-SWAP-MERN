const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../src/models/User');

describe('User Model', () => {
    let mongoServer;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        await User.deleteMany({});
    });

    describe('User Creation', () => {
        const validUserData = {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            password: 'SecurePassword123!',
        };

        it('should create a user with valid data', async () => {
            const user = new User(validUserData);
            const savedUser = await user.save();

            expect(savedUser._id).toBeDefined();
            expect(savedUser.firstName).toBe(validUserData.firstName);
            expect(savedUser.lastName).toBe(validUserData.lastName);
            expect(savedUser.email).toBe(validUserData.email);
            expect(savedUser.password).not.toBe(validUserData.password); // Should be hashed
            expect(savedUser.isEmailVerified).toBe(false);
            expect(savedUser.role).toBe('user');
            expect(savedUser.status).toBe('active');
        });

        it('should hash password before saving', async () => {
            const user = new User(validUserData);
            await user.save();

            expect(user.password).not.toBe(validUserData.password);
            expect(user.password.length).toBeGreaterThan(50);
            expect(user.password.startsWith('$2a$')).toBe(true); // bcrypt hash format
        });

        it('should require firstName', async () => {
            const userData = { ...validUserData };
            delete userData.firstName;

            const user = new User(userData);
            await expect(user.save()).rejects.toThrow('First name is required');
        });

        it('should require lastName', async () => {
            const userData = { ...validUserData };
            delete userData.lastName;

            const user = new User(userData);
            await expect(user.save()).rejects.toThrow('Last name is required');
        });

        it('should require email', async () => {
            const userData = { ...validUserData };
            delete userData.email;

            const user = new User(userData);
            await expect(user.save()).rejects.toThrow('Email is required');
        });

        it('should require password', async () => {
            const userData = { ...validUserData };
            delete userData.password;

            const user = new User(userData);
            await expect(user.save()).rejects.toThrow('Password is required');
        });

        it('should validate email format', async () => {
            const userData = { ...validUserData, email: 'invalid-email' };

            const user = new User(userData);
            await expect(user.save()).rejects.toThrow('Please provide a valid email address');
        });

        it('should enforce unique email', async () => {
            const user1 = new User(validUserData);
            await user1.save();

            const user2 = new User(validUserData);
            await expect(user2.save()).rejects.toThrow();
        });

        it('should convert email to lowercase', async () => {
            const userData = { ...validUserData, email: 'JOHN.DOE@EXAMPLE.COM' };
            const user = new User(userData);
            await user.save();

            expect(user.email).toBe('john.doe@example.com');
        });

        it('should validate password minimum length', async () => {
            const userData = { ...validUserData, password: '1234567' }; // 7 characters

            const user = new User(userData);
            await expect(user.save()).rejects.toThrow('Password must be at least 8 characters long');
        });

        it('should trim firstName and lastName', async () => {
            const userData = {
                ...validUserData,
                firstName: '  John  ',
                lastName: '  Doe  ',
            };

            const user = new User(userData);
            await user.save();

            expect(user.firstName).toBe('John');
            expect(user.lastName).toBe('Doe');
        });
    });

    describe('User Virtuals', () => {
        it('should generate fullName virtual', async () => {
            const user = new User({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                password: 'SecurePassword123!',
            });

            expect(user.fullName).toBe('John Doe');
        });

        it('should calculate isLocked virtual', async () => {
            const user = new User({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                password: 'SecurePassword123!',
            });

            expect(user.isLocked).toBe(false);

            user.lockUntil = new Date(Date.now() + 60000); // Lock for 1 minute
            expect(user.isLocked).toBe(true);

            user.lockUntil = new Date(Date.now() - 60000); // Expired lock
            expect(user.isLocked).toBe(false);
        });
    });

    describe('User Methods', () => {
        let user;

        beforeEach(async () => {
            user = new User({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                password: 'SecurePassword123!',
            });
            await user.save();
        });

        describe('comparePassword', () => {
            it('should return true for correct password', async () => {
                const isMatch = await user.comparePassword('SecurePassword123!');
                expect(isMatch).toBe(true);
            });

            it('should return false for incorrect password', async () => {
                const isMatch = await user.comparePassword('WrongPassword123!');
                expect(isMatch).toBe(false);
            });

            it('should throw error for invalid input', async () => {
                await expect(user.comparePassword(null)).rejects.toThrow();
            });
        });

        describe('changedPasswordAfter', () => {
            it('should return false if password not changed', () => {
                const jwtTimestamp = Math.floor(Date.now() / 1000);
                const result = user.changedPasswordAfter(jwtTimestamp);
                expect(result).toBe(false);
            });

            it('should return true if password changed after JWT', async () => {
                const jwtTimestamp = Math.floor(Date.now() / 1000);

                // Simulate password change
                user.password = 'NewPassword123!';
                user.passwordChangedAt = new Date();
                await user.save();

                const result = user.changedPasswordAfter(jwtTimestamp - 10);
                expect(result).toBe(true);
            });
        });

        describe('incLoginAttempts', () => {
            it('should increment login attempts', async () => {
                await user.incLoginAttempts();
                const updatedUser = await User.findById(user._id).select('+loginAttempts');
                expect(updatedUser.loginAttempts).toBe(1);
            });

            it('should lock account after max attempts', async () => {
                // Set attempts to 4 (one less than max)
                user.loginAttempts = 4;
                await user.save();

                await user.incLoginAttempts();
                const updatedUser = await User.findById(user._id).select('+loginAttempts +lockUntil');

                expect(updatedUser.loginAttempts).toBe(5);
                expect(updatedUser.lockUntil).toBeDefined();
                expect(updatedUser.lockUntil.getTime()).toBeGreaterThan(Date.now());
            });

            it('should reset attempts if lock expired', async () => {
                user.loginAttempts = 5;
                user.lockUntil = new Date(Date.now() - 1000); // Expired lock
                await user.save();

                await user.incLoginAttempts();
                const updatedUser = await User.findById(user._id).select('+loginAttempts +lockUntil');

                expect(updatedUser.loginAttempts).toBe(1);
                expect(updatedUser.lockUntil).toBeUndefined();
            });
        });

        describe('resetLoginAttempts', () => {
            it('should reset login attempts and lock', async () => {
                user.loginAttempts = 3;
                user.lockUntil = new Date(Date.now() + 60000);
                await user.save();

                await user.resetLoginAttempts();
                const updatedUser = await User.findById(user._id).select('+loginAttempts +lockUntil');

                expect(updatedUser.loginAttempts).toBeFalsy();
                expect(updatedUser.lockUntil).toBeUndefined();
            });
        });
    });

    describe('User Static Methods', () => {
        beforeEach(async () => {
            await User.create({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                password: 'SecurePassword123!',
            });
        });

        describe('findByEmailWithPassword', () => {
            it('should find user by email with password field', async () => {
                const user = await User.findByEmailWithPassword('john.doe@example.com');

                expect(user).toBeDefined();
                expect(user.email).toBe('john.doe@example.com');
                expect(user.password).toBeDefined(); // Should include password
            });

            it('should return null for non-existent email', async () => {
                const user = await User.findByEmailWithPassword('nonexistent@example.com');
                expect(user).toBeNull();
            });
        });

        describe('findBySkill', () => {
            beforeEach(async () => {
                await User.create({
                    firstName: 'Jane',
                    lastName: 'Smith',
                    email: 'jane.smith@example.com',
                    password: 'SecurePassword123!',
                    skills: [
                        {
                            name: 'JavaScript',
                            level: 'advanced',
                            category: 'Programming',
                            description: 'Frontend and backend development',
                            yearsOfExperience: 5,
                        },
                        {
                            name: 'React',
                            level: 'expert',
                            category: 'Frontend',
                            description: 'React development',
                            yearsOfExperience: 3,
                        },
                    ],
                });
            });

            it('should find users by skill name', async () => {
                const users = await User.findBySkill('JavaScript');

                expect(users).toHaveLength(1);
                expect(users[0].email).toBe('jane.smith@example.com');
            });

            it('should find users by skill name case-insensitive', async () => {
                const users = await User.findBySkill('javascript');

                expect(users).toHaveLength(1);
                expect(users[0].email).toBe('jane.smith@example.com');
            });

            it('should filter by skill level', async () => {
                const users = await User.findBySkill('JavaScript', { level: 'advanced' });

                expect(users).toHaveLength(1);
                expect(users[0].email).toBe('jane.smith@example.com');
            });

            it('should filter by skill category', async () => {
                const users = await User.findBySkill('React', { category: 'Frontend' });

                expect(users).toHaveLength(1);
                expect(users[0].email).toBe('jane.smith@example.com');
            });

            it('should return empty array for non-existent skill', async () => {
                const users = await User.findBySkill('NonExistentSkill');
                expect(users).toHaveLength(0);
            });
        });
    });

    describe('User Skills', () => {
        it('should add skills to user', async () => {
            const user = await User.create({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                password: 'SecurePassword123!',
                skills: [
                    {
                        name: 'Python',
                        level: 'intermediate',
                        category: 'Programming',
                        description: 'Backend development with Django',
                        yearsOfExperience: 2,
                    },
                ],
            });

            expect(user.skills).toHaveLength(1);
            expect(user.skills[0].name).toBe('Python');
            expect(user.skills[0].level).toBe('intermediate');
            expect(user.skills[0].category).toBe('Programming');
        });

        it('should validate skill level enum', async () => {
            const userData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                password: 'SecurePassword123!',
                skills: [
                    {
                        name: 'Python',
                        level: 'invalid-level',
                        category: 'Programming',
                    },
                ],
            };

            const user = new User(userData);
            await expect(user.save()).rejects.toThrow();
        });
    });

    describe('User Location', () => {
        it('should save location with coordinates', async () => {
            const user = await User.create({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                password: 'SecurePassword123!',
                location: {
                    city: 'New York',
                    state: 'NY',
                    country: 'USA',
                    coordinates: [-74.006, 40.7128], // [longitude, latitude]
                },
            });

            expect(user.location.city).toBe('New York');
            expect(user.location.coordinates).toEqual([-74.006, 40.7128]);
        });
    });

    describe('User JSON Serialization', () => {
        it('should exclude sensitive fields from JSON', async () => {
            const user = await User.create({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                password: 'SecurePassword123!',
            });

            const userJSON = user.toJSON();

            expect(userJSON.password).toBeUndefined();
            expect(userJSON.otp).toBeUndefined();
            expect(userJSON.emailVerificationToken).toBeUndefined();
            expect(userJSON.passwordResetToken).toBeUndefined();
            expect(userJSON.loginAttempts).toBeUndefined();
            expect(userJSON.lockUntil).toBeUndefined();

            // Should include non-sensitive fields
            expect(userJSON.firstName).toBe('John');
            expect(userJSON.email).toBe('john.doe@example.com');
        });
    });
});