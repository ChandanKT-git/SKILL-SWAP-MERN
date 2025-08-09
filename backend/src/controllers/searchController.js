const User = require('../models/User');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');
const { RequestLogger } = require('../middleware/logging');

/**
 * Search Controller
 * Handles skill-based user search and filtering functionality
 */
class SearchController {
    /**
     * Search users by skills with filters
     * @route GET /api/search/users
     */
    static async searchUsers(req, res, next) {
        try {
            const {
                skill,
                category,
                level,
                location,
                radius = 50000, // Default 50km radius
                minRating = 0,
                maxRating = 5,
                availability,
                page = 1,
                limit = 20,
                sortBy = 'rating.average',
                sortOrder = 'desc'
            } = req.query;

            // Build search query
            const searchQuery = {
                status: 'active',
                isEmailVerified: true
            };

            // Availability filter (only apply if explicitly specified)
            if (availability !== undefined) {
                searchQuery['availability.isAvailable'] = availability === true || availability === 'true';
            }

            // Skill-based search - use $elemMatch to ensure all conditions match the same skill
            const skillConditions = {};
            if (skill) {
                skillConditions.name = new RegExp(skill, 'i');
            }
            if (category) {
                skillConditions.category = new RegExp(category, 'i');
            }
            if (level) {
                skillConditions.level = level;
            }

            if (Object.keys(skillConditions).length > 0) {
                searchQuery.skills = { $elemMatch: skillConditions };
            }

            // Rating filter
            if (minRating || maxRating) {
                searchQuery['rating.average'] = {};
                if (minRating) searchQuery['rating.average'].$gte = parseFloat(minRating);
                if (maxRating) searchQuery['rating.average'].$lte = parseFloat(maxRating);
            }

            // Location-based search
            if (location) {
                const [longitude, latitude] = location.split(',').map(coord => parseFloat(coord.trim()));

                if (!isNaN(longitude) && !isNaN(latitude)) {
                    searchQuery['location.coordinates'] = {
                        $geoWithin: {
                            $centerSphere: [[longitude, latitude], parseInt(radius) / 6378100] // radius in radians
                        }
                    };
                }
            }

            const finalQuery = searchQuery;

            // Pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const limitNum = parseInt(limit);

            // Sort options
            const sortOptions = {};
            sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

            // Execute search
            const [users, totalCount] = await Promise.all([
                User.find(finalQuery)
                    .select('-password -otp -emailVerificationToken -passwordResetToken -loginAttempts -lockUntil')
                    .sort(sortOptions)
                    .skip(skip)
                    .limit(limitNum)
                    .lean(),
                User.countDocuments(finalQuery)
            ]);

            // Calculate pagination info
            const totalPages = Math.ceil(totalCount / limitNum);
            const hasNextPage = page < totalPages;
            const hasPrevPage = page > 1;

            // Log successful search
            RequestLogger.logDatabaseOperation('search_users', 'users', true);

            res.status(200).json({
                success: true,
                data: {
                    users,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages,
                        totalCount,
                        hasNextPage,
                        hasPrevPage,
                        limit: limitNum
                    },
                    filters: {
                        skill,
                        category,
                        level,
                        location,
                        radius: parseInt(radius),
                        minRating: parseFloat(minRating),
                        maxRating: parseFloat(maxRating),
                        availability: availability !== undefined ? (availability === true || availability === 'true') : undefined
                    }
                },
                message: `Found ${users.length} users matching your criteria`
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('search_users', 'users', false, error);
            next(error);
        }
    }

    /**
     * Get available skills for autocomplete
     * @route GET /api/search/skills
     */
    static async getAvailableSkills(req, res, next) {
        try {
            const { query, category, limit = 10 } = req.query;

            // Build aggregation pipeline
            const pipeline = [
                { $match: { status: 'active', isEmailVerified: true } },
                { $unwind: '$skills' },
                {
                    $group: {
                        _id: {
                            name: '$skills.name',
                            category: '$skills.category'
                        },
                        count: { $sum: 1 },
                        avgLevel: {
                            $avg: {
                                $switch: {
                                    branches: [
                                        { case: { $eq: ['$skills.level', 'beginner'] }, then: 1 },
                                        { case: { $eq: ['$skills.level', 'intermediate'] }, then: 2 },
                                        { case: { $eq: ['$skills.level', 'advanced'] }, then: 3 },
                                        { case: { $eq: ['$skills.level', 'expert'] }, then: 4 }
                                    ],
                                    default: 1
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        name: '$_id.name',
                        category: '$_id.category',
                        userCount: '$count',
                        averageLevel: {
                            $switch: {
                                branches: [
                                    { case: { $lte: ['$avgLevel', 1.5] }, then: 'beginner' },
                                    { case: { $lte: ['$avgLevel', 2.5] }, then: 'intermediate' },
                                    { case: { $lte: ['$avgLevel', 3.5] }, then: 'advanced' },
                                    { case: { $gt: ['$avgLevel', 3.5] }, then: 'expert' }
                                ],
                                default: 'beginner'
                            }
                        }
                    }
                },
                { $sort: { userCount: -1, name: 1 } }
            ];

            // Add query filter if provided (after $unwind, before $group)
            if (query) {
                pipeline.splice(2, 0, {
                    $match: { 'skills.name': new RegExp(query, 'i') }
                });
            }

            // Add category filter if provided (after $unwind, before $group)
            if (category) {
                pipeline.splice(query ? 3 : 2, 0, {
                    $match: { 'skills.category': new RegExp(category, 'i') }
                });
            }

            // Add limit
            pipeline.push({ $limit: parseInt(limit) });

            const skills = await User.aggregate(pipeline);

            RequestLogger.logDatabaseOperation('get_skills', 'users', true);

            res.status(200).json({
                success: true,
                data: skills,
                message: `Found ${skills.length} skills`
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('get_skills', 'users', false, error);
            next(error);
        }
    }

    /**
     * Get available skill categories
     * @route GET /api/search/categories
     */
    static async getSkillCategories(req, res, next) {
        try {
            const categories = await User.aggregate([
                { $match: { status: 'active', isEmailVerified: true } },
                { $unwind: '$skills' },
                {
                    $group: {
                        _id: '$skills.category',
                        count: { $sum: 1 },
                        skills: { $addToSet: '$skills.name' }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        category: '$_id',
                        userCount: '$count',
                        skillCount: { $size: '$skills' },
                        popularSkills: { $slice: ['$skills', 5] }
                    }
                },
                { $sort: { userCount: -1 } }
            ]);

            RequestLogger.logDatabaseOperation('get_categories', 'users', true);

            res.status(200).json({
                success: true,
                data: categories,
                message: `Found ${categories.length} skill categories`
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('get_categories', 'users', false, error);
            next(error);
        }
    }

    /**
     * Get search suggestions based on user input
     * @route GET /api/search/suggestions
     */
    static async getSearchSuggestions(req, res, next) {
        try {
            const { query, type = 'all' } = req.query;

            if (!query || query.length < 2) {
                return res.status(200).json({
                    success: true,
                    data: {
                        skills: [],
                        categories: [],
                        users: []
                    },
                    message: 'Query too short for suggestions'
                });
            }

            const suggestions = {};

            // Get skill suggestions
            if (type === 'all' || type === 'skills') {
                suggestions.skills = await User.aggregate([
                    { $match: { status: 'active', isEmailVerified: true } },
                    { $unwind: '$skills' },
                    { $match: { 'skills.name': new RegExp(query, 'i') } },
                    {
                        $group: {
                            _id: '$skills.name',
                            count: { $sum: 1 },
                            category: { $first: '$skills.category' }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            name: '$_id',
                            category: '$category',
                            userCount: '$count'
                        }
                    },
                    { $sort: { userCount: -1 } },
                    { $limit: 5 }
                ]);
            }

            // Get category suggestions
            if (type === 'all' || type === 'categories') {
                suggestions.categories = await User.aggregate([
                    { $match: { status: 'active', isEmailVerified: true } },
                    { $unwind: '$skills' },
                    { $match: { 'skills.category': new RegExp(query, 'i') } },
                    {
                        $group: {
                            _id: '$skills.category',
                            count: { $sum: 1 }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            category: '$_id',
                            userCount: '$count'
                        }
                    },
                    { $sort: { userCount: -1 } },
                    { $limit: 3 }
                ]);
            }

            // Get user suggestions
            if (type === 'all' || type === 'users') {
                suggestions.users = await User.find({
                    status: 'active',
                    isEmailVerified: true,
                    $or: [
                        { firstName: new RegExp(query, 'i') },
                        { lastName: new RegExp(query, 'i') },
                        { 'skills.name': new RegExp(query, 'i') }
                    ]
                })
                    .select('firstName lastName profileImage rating skills')
                    .sort({ 'rating.average': -1 })
                    .limit(3)
                    .lean();
            }

            RequestLogger.logDatabaseOperation('get_suggestions', 'users', true);

            res.status(200).json({
                success: true,
                data: suggestions,
                message: 'Search suggestions retrieved successfully'
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('get_suggestions', 'users', false, error);
            next(error);
        }
    }

    /**
     * Get popular skills trending in the platform
     * @route GET /api/search/trending
     */
    static async getTrendingSkills(req, res, next) {
        try {
            const { limit = 10, period = '30' } = req.query;

            // Calculate date threshold
            const dateThreshold = new Date();
            dateThreshold.setDate(dateThreshold.getDate() - parseInt(period));

            const trendingSkills = await User.aggregate([
                {
                    $match: {
                        status: 'active',
                        isEmailVerified: true,
                        createdAt: { $gte: dateThreshold }
                    }
                },
                { $unwind: '$skills' },
                {
                    $group: {
                        _id: {
                            name: '$skills.name',
                            category: '$skills.category'
                        },
                        recentUsers: { $sum: 1 },
                        avgRating: { $avg: '$rating.average' }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        name: '$_id.name',
                        category: '$_id.category',
                        recentUsers: '$recentUsers',
                        avgRating: { $round: ['$avgRating', 2] },
                        trendScore: {
                            $multiply: ['$recentUsers', { $ifNull: ['$avgRating', 3] }]
                        }
                    }
                },
                { $sort: { trendScore: -1, recentUsers: -1 } },
                { $limit: parseInt(limit) }
            ]);

            RequestLogger.logDatabaseOperation('get_trending', 'users', true);

            res.status(200).json({
                success: true,
                data: trendingSkills,
                message: `Found ${trendingSkills.length} trending skills`
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('get_trending', 'users', false, error);
            next(error);
        }
    }
}

module.exports = SearchController;