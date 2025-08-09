const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const config = require('../../src/config');

let mongoServer;

/**
 * Connect to test database
 */
const connectTestDB = async () => {
    try {
        // Use MongoDB Atlas test database if configured, otherwise use in-memory database
        if (config.mongodb.testUri && !config.mongodb.testUri.includes('mongodb://localhost')) {
            // Use Atlas test database
            await mongoose.connect(config.mongodb.testUri);
            console.log('✅ Connected to MongoDB Atlas test database');
        } else {
            // Use in-memory database for local testing
            mongoServer = await MongoMemoryServer.create();
            const mongoUri = mongoServer.getUri();
            await mongoose.connect(mongoUri);
            console.log('✅ Connected to in-memory test database');
        }
    } catch (error) {
        console.error('❌ Test database connection failed:', error.message);
        throw error;
    }
};

/**
 * Clear all data from test database
 */
const clearTestDB = async () => {
    try {
        const collections = mongoose.connection.collections;

        for (const key in collections) {
            const collection = collections[key];
            await collection.deleteMany({});
        }
    } catch (error) {
        console.error('❌ Failed to clear test database:', error.message);
        throw error;
    }
};

/**
 * Close test database connection
 */
const closeTestDB = async () => {
    try {
        await mongoose.connection.close();

        if (mongoServer) {
            await mongoServer.stop();
        }

        console.log('✅ Test database connection closed');
    } catch (error) {
        console.error('❌ Failed to close test database:', error.message);
        throw error;
    }
};

/**
 * Drop test database
 */
const dropTestDB = async () => {
    try {
        await mongoose.connection.dropDatabase();
        console.log('✅ Test database dropped');
    } catch (error) {
        console.error('❌ Failed to drop test database:', error.message);
        throw error;
    }
};

module.exports = {
    connectTestDB,
    clearTestDB,
    closeTestDB,
    dropTestDB,
};