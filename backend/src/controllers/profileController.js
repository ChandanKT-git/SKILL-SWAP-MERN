const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const {
    ValidationError,
    NotFoundError,
    AuthorizationError,
    asyncHandler
} = require('../middleware/errorHandler');
const { RequestLogger } = require('../middleware/logging');

/**
 * Profile controller handling user profile management
 */
class ProfileController {
    /**
     * Get current user's profile
     * @route GET /api/profile
     */
    static getProfile = asyncHandler(async (req, res) => {
        const user = await User.findById(req.user.id);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        res.status(200).json({
            success: true,
            data: {
                profile: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    fullName: user.fullName,
                    email: user.email,
                    profileImage: user.profileImage,
                    bio: user.bio,
                    location: user.location,
                    skills: user.skills,
                    availability: user.availability,
                    rating: user.rating,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                },
            },
        });
    });

    /**
     * Get user profile by ID (public view)
     * @route GET /api/profile/:userId
     */
    static getProfileById = asyncHandler(async (req, res) => {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        // Return public profile information only
        res.status(200).json({
            success: true,
            data: {
                profile: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    fullName: user.fullName,
                    profileImage: user.profileImage,
                    bio: user.bio,
                    location: user.location,
                    skills: user.skills,
                    availability: user.availability,
                    rating: user.rating,
                    createdAt: user.createdAt,
                },
            },
        });
    });

    /**
     * Update user profile
     * @route PUT /api/profile
     */
    static updateProfile = asyncHandler(async (req, res) => {
        const {
            firstName,
            lastName,
            bio,
            location,
            availability,
        } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        // Update basic profile information
        if (firstName !== undefined) user.firstName = firstName;
        if (lastName !== undefined) user.lastName = lastName;
        if (bio !== undefined) user.bio = bio;

        // Update location
        if (location) {
            user.location = {
                ...user.location,
                ...location,
            };
        }

        // Update availability
        if (availability) {
            user.availability = {
                ...user.availability,
                ...availability,
            };
        }

        await user.save();

        // Log profile update
        RequestLogger.logDatabaseOperation('profile_update', 'users', true, null, {
            userId: user._id,
            updatedFields: Object.keys(req.body),
        });

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                profile: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    fullName: user.fullName,
                    email: user.email,
                    profileImage: user.profileImage,
                    bio: user.bio,
                    location: user.location,
                    skills: user.skills,
                    availability: user.availability,
                    rating: user.rating,
                    updatedAt: user.updatedAt,
                },
            },
        });
    });

    /**
     * Add skill to user profile
     * @route POST /api/profile/skills
     */
    static addSkill = asyncHandler(async (req, res) => {
        const {
            name,
            level,
            category,
            description,
            yearsOfExperience,
        } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        // Check if skill already exists
        const existingSkill = user.skills.find(
            skill => skill.name.toLowerCase() === name.toLowerCase()
        );

        if (existingSkill) {
            throw new ValidationError('Skill already exists in your profile');
        }

        // Add new skill
        const newSkill = {
            name: name.trim(),
            level,
            category: category.trim(),
            description: description?.trim(),
            yearsOfExperience,
        };

        user.skills.push(newSkill);
        await user.save();

        // Log skill addition
        RequestLogger.logDatabaseOperation('skill_add', 'users', true, null, {
            userId: user._id,
            skillName: name,
            skillLevel: level,
        });

        res.status(201).json({
            success: true,
            message: 'Skill added successfully',
            data: {
                skill: user.skills[user.skills.length - 1],
                totalSkills: user.skills.length,
            },
        });
    });

    /**
     * Update skill in user profile
     * @route PUT /api/profile/skills/:skillId
     */
    static updateSkill = asyncHandler(async (req, res) => {
        const { skillId } = req.params;
        const {
            name,
            level,
            category,
            description,
            yearsOfExperience,
        } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        // Find the skill to update
        const skill = user.skills.id(skillId);
        if (!skill) {
            throw new NotFoundError('Skill not found');
        }

        // Update skill fields
        if (name !== undefined) skill.name = name.trim();
        if (level !== undefined) skill.level = level;
        if (category !== undefined) skill.category = category.trim();
        if (description !== undefined) skill.description = description?.trim();
        if (yearsOfExperience !== undefined) skill.yearsOfExperience = yearsOfExperience;

        await user.save();

        // Log skill update
        RequestLogger.logDatabaseOperation('skill_update', 'users', true, null, {
            userId: user._id,
            skillId,
            skillName: skill.name,
        });

        res.status(200).json({
            success: true,
            message: 'Skill updated successfully',
            data: {
                skill,
            },
        });
    });

    /**
     * Remove skill from user profile
     * @route DELETE /api/profile/skills/:skillId
     */
    static removeSkill = asyncHandler(async (req, res) => {
        const { skillId } = req.params;

        const user = await User.findById(req.user.id);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        // Find and remove the skill
        const skill = user.skills.id(skillId);
        if (!skill) {
            throw new NotFoundError('Skill not found');
        }

        const skillName = skill.name;
        user.skills.pull(skillId);
        await user.save();

        // Log skill removal
        RequestLogger.logDatabaseOperation('skill_remove', 'users', true, null, {
            userId: user._id,
            skillId,
            skillName,
        });

        res.status(200).json({
            success: true,
            message: 'Skill removed successfully',
            data: {
                removedSkillId: skillId,
                totalSkills: user.skills.length,
            },
        });
    });

    /**
     * Upload profile image
     * @route POST /api/profile/image
     */
    static uploadProfileImage = asyncHandler(async (req, res) => {
        if (!req.file) {
            throw new ValidationError('No image file provided');
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        try {
            // Delete existing profile image from Cloudinary if it exists
            if (user.profileImage?.publicId) {
                await cloudinary.uploader.destroy(user.profileImage.publicId);
            }

            // Upload new image to Cloudinary
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'skillswap/profiles',
                public_id: `profile_${user._id}`,
                transformation: [
                    { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                    { quality: 'auto', fetch_format: 'auto' },
                ],
            });

            // Update user profile image
            user.profileImage = {
                url: result.secure_url,
                publicId: result.public_id,
            };

            await user.save();

            // Log image upload
            RequestLogger.logDatabaseOperation('profile_image_upload', 'users', true, null, {
                userId: user._id,
                imageUrl: result.secure_url,
            });

            res.status(200).json({
                success: true,
                message: 'Profile image uploaded successfully',
                data: {
                    profileImage: user.profileImage,
                },
            });
        } catch (error) {
            // Log upload failure
            RequestLogger.logDatabaseOperation('profile_image_upload', 'users', false, error, {
                userId: user._id,
            });

            throw new Error(`Failed to upload image: ${error.message}`);
        }
    });

    /**
     * Remove profile image
     * @route DELETE /api/profile/image
     */
    static removeProfileImage = asyncHandler(async (req, res) => {
        const user = await User.findById(req.user.id);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        if (!user.profileImage?.publicId) {
            throw new ValidationError('No profile image to remove');
        }

        try {
            // Delete image from Cloudinary
            await cloudinary.uploader.destroy(user.profileImage.publicId);

            // Remove image from user profile
            user.profileImage = undefined;
            await user.save();

            // Log image removal
            RequestLogger.logDatabaseOperation('profile_image_remove', 'users', true, null, {
                userId: user._id,
            });

            res.status(200).json({
                success: true,
                message: 'Profile image removed successfully',
            });
        } catch (error) {
            // Log removal failure
            RequestLogger.logDatabaseOperation('profile_image_remove', 'users', false, error, {
                userId: user._id,
            });

            throw new Error(`Failed to remove image: ${error.message}`);
        }
    });

    /**
     * Get user's skills
     * @route GET /api/profile/skills
     */
    static getSkills = asyncHandler(async (req, res) => {
        const user = await User.findById(req.user.id);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        res.status(200).json({
            success: true,
            data: {
                skills: user.skills,
                totalSkills: user.skills.length,
            },
        });
    });
}

module.exports = ProfileController;