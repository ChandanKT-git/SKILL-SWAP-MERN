const mongoose = require('mongoose');

class Database {
    constructor() {
        this.connection = null;
    }

    async connect() {
        try {
            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillswap';

            const options = {
                maxPoolSize: 10, // Maintain up to 10 socket connections
                serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
                socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
                family: 4, // Use IPv4, skip trying IPv6
            };

            this.connection = await mongoose.connect(mongoUri, options);

            console.log(`✅ MongoDB connected: ${this.connection.connection.host}`);

            // Handle connection events
            mongoose.connection.on('error', (err) => {
                console.error('❌ MongoDB connection error:', err);
            });

            mongoose.connection.on('disconnected', () => {
                console.warn('⚠️ MongoDB disconnected');
            });

            mongoose.connection.on('reconnected', () => {
                console.log('🔄 MongoDB reconnected');
            });

            return this.connection;
        } catch (error) {
            console.error('❌ MongoDB connection failed:', error.message);
            process.exit(1);
        }
    }

    async disconnect() {
        try {
            if (this.connection) {
                await mongoose.connection.close();
                console.log('📴 MongoDB connection closed');
            }
        } catch (error) {
            console.error('❌ Error closing MongoDB connection:', error.message);
        }
    }

    getConnection() {
        return this.connection;
    }

    isConnected() {
        return mongoose.connection.readyState === 1;
    }
}

// Create singleton instance
const database = new Database();

module.exports = database;