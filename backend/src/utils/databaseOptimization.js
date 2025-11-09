const mongoose = require('mongoose');

/**
 * Database optimization utilities
 * Handles index creation and performance monitoring
 */

/**
 * Create additional performance indexes for all models
 * This complements the indexes already defined in the schemas
 */
async function createPerformanceIndexes() {
    try {
        console.log('🔧 Creating performance indexes...');

        const User = mongoose.model('User');
        const Session = mongoose.model('Session');
        const Review = mongoose.model('Review');
        const Chat = mongoose.model('Chat');

        // User model additional indexes
        await User.collection.createIndex(
            { email: 1 },
            { unique: true, background: true }
        );
        await User.collection.createIndex(
            { 'skills.name': 1, 'skills.category': 1 },
            { background: true }
        );
        await User.collection.createIndex(
            { status: 1, role: 1, isEmailVerified: 1 },
            { background: true }
        );
        await User.collection.createIndex(
            { 'rating.average': -1, 'rating.count': -1 },
            { background: true }
        );
        await User.collection.createIndex(
            { createdAt: -1 },
            { background: true }
        );
        await User.collection.createIndex(
            { lastLogin: -1 },
            { background: true, sparse: true }
        );

        // Session model additional indexes
        await Session.collection.createIndex(
            { requester: 1, status: 1, scheduledDate: -1 },
            { background: true }
        );
        await Session.collection.createIndex(
            { provider: 1, status: 1, scheduledDate: -1 },
            { background: true }
        );
        await Session.collection.createIndex(
            { status: 1, scheduledDate: 1 },
            { background: true }
        );
        await Session.collection.createIndex(
            { 'skill.name': 1, 'skill.category': 1, status: 1 },
            { background: true }
        );
        await Session.collection.createIndex(
            { scheduledDate: 1, status: 1 },
            { background: true }
        );

        // Review model additional indexes
        await Review.collection.createIndex(
            { reviewee: 1, status: 1, createdAt: -1 },
            { background: true }
        );
        await Review.collection.createIndex(
            { reviewer: 1, createdAt: -1 },
            { background: true }
        );
        await Review.collection.createIndex(
            { session: 1, reviewer: 1 },
            { unique: true, background: true }
        );
        await Review.collection.createIndex(
            { status: 1, isFlagged: 1 },
            { background: true }
        );
        await Review.collection.createIndex(
            { 'skillReviewed.name': 1, 'skillReviewed.category': 1, status: 1 },
            { background: true }
        );
        await Review.collection.createIndex(
            { rating: -1, createdAt: -1 },
            { background: true }
        );

        // Chat model additional indexes
        await Chat.collection.createIndex(
            { participants: 1, lastActivity: -1 },
            { background: true }
        );
        await Chat.collection.createIndex(
            { session: 1, chatType: 1 },
            { background: true, sparse: true }
        );
        await Chat.collection.createIndex(
            { lastActivity: -1, isActive: 1 },
            { background: true }
        );
        await Chat.collection.createIndex(
            { 'messages.sender': 1, 'messages.createdAt': -1 },
            { background: true }
        );

        console.log('✅ Performance indexes created successfully');
    } catch (error) {
        console.error('❌ Error creating performance indexes:', error.message);
        throw error;
    }
}

/**
 * Get index information for a collection
 * @param {string} collectionName - Name of the collection
 * @returns {Promise<Array>} Array of index information
 */
async function getCollectionIndexes(collectionName) {
    try {
        const collection = mongoose.connection.collection(collectionName);
        const indexes = await collection.indexes();
        return indexes;
    } catch (error) {
        console.error(`Error getting indexes for ${collectionName}:`, error.message);
        return [];
    }
}

/**
 * Get database statistics
 * @returns {Promise<Object>} Database statistics
 */
async function getDatabaseStats() {
    try {
        const stats = await mongoose.connection.db.stats();
        return {
            database: stats.db,
            collections: stats.collections,
            dataSize: formatBytes(stats.dataSize),
            storageSize: formatBytes(stats.storageSize),
            indexes: stats.indexes,
            indexSize: formatBytes(stats.indexSize),
            avgObjSize: formatBytes(stats.avgObjSize),
        };
    } catch (error) {
        console.error('Error getting database stats:', error.message);
        return null;
    }
}

/**
 * Get collection statistics
 * @param {string} collectionName - Name of the collection
 * @returns {Promise<Object>} Collection statistics
 */
async function getCollectionStats(collectionName) {
    try {
        const collection = mongoose.connection.collection(collectionName);
        const stats = await collection.stats();
        return {
            collection: collectionName,
            count: stats.count,
            size: formatBytes(stats.size),
            storageSize: formatBytes(stats.storageSize),
            avgObjSize: formatBytes(stats.avgObjSize),
            indexCount: stats.nindexes,
            totalIndexSize: formatBytes(stats.totalIndexSize),
        };
    } catch (error) {
        console.error(`Error getting stats for ${collectionName}:`, error.message);
        return null;
    }
}

/**
 * Analyze slow queries and suggest optimizations
 * @returns {Promise<Array>} Array of slow query analysis
 */
async function analyzeSlowQueries() {
    try {
        // Enable profiling if not already enabled
        await mongoose.connection.db.setProfilingLevel(1, { slowms: 100 });

        // Get slow queries from system.profile collection
        const slowQueries = await mongoose.connection.db
            .collection('system.profile')
            .find({ millis: { $gt: 100 } })
            .sort({ ts: -1 })
            .limit(10)
            .toArray();

        return slowQueries.map(query => ({
            operation: query.op,
            namespace: query.ns,
            duration: `${query.millis}ms`,
            timestamp: query.ts,
            command: query.command,
        }));
    } catch (error) {
        console.error('Error analyzing slow queries:', error.message);
        return [];
    }
}

/**
 * Optimize collection by rebuilding indexes
 * @param {string} collectionName - Name of the collection
 */
async function optimizeCollection(collectionName) {
    try {
        console.log(`🔧 Optimizing collection: ${collectionName}`);
        const collection = mongoose.connection.collection(collectionName);

        // Reindex collection
        await collection.reIndex();

        console.log(`✅ Collection ${collectionName} optimized`);
    } catch (error) {
        console.error(`Error optimizing ${collectionName}:`, error.message);
        throw error;
    }
}

/**
 * Check index usage and suggest improvements
 * @param {string} collectionName - Name of the collection
 * @returns {Promise<Object>} Index usage analysis
 */
async function analyzeIndexUsage(collectionName) {
    try {
        const collection = mongoose.connection.collection(collectionName);
        const indexStats = await collection.aggregate([
            { $indexStats: {} }
        ]).toArray();

        return indexStats.map(stat => ({
            name: stat.name,
            usageCount: stat.accesses.ops,
            lastUsed: stat.accesses.since,
        }));
    } catch (error) {
        console.error(`Error analyzing index usage for ${collectionName}:`, error.message);
        return [];
    }
}

/**
 * Format bytes to human-readable format
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Run comprehensive database optimization
 */
async function runDatabaseOptimization() {
    try {
        console.log('🚀 Starting database optimization...');

        // Create performance indexes
        await createPerformanceIndexes();

        // Get database stats
        const dbStats = await getDatabaseStats();
        console.log('📊 Database Stats:', dbStats);

        // Get stats for each collection
        const collections = ['users', 'sessions', 'reviews', 'chats'];
        for (const collection of collections) {
            const stats = await getCollectionStats(collection);
            console.log(`📊 ${collection} Stats:`, stats);
        }

        console.log('✅ Database optimization completed');
    } catch (error) {
        console.error('❌ Database optimization failed:', error.message);
        throw error;
    }
}

module.exports = {
    createPerformanceIndexes,
    getCollectionIndexes,
    getDatabaseStats,
    getCollectionStats,
    analyzeSlowQueries,
    optimizeCollection,
    analyzeIndexUsage,
    runDatabaseOptimization,
};
