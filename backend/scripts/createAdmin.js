/**
 * Create Admin User Script
 * Run this script to create an admin user for the application
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');
require('dotenv').config();

const User = require('../src/models/User');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function createAdmin() {
    try {
        // Connect to database
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        // Get admin details
        console.log('\n📝 Enter admin user details:\n');

        const email = await question('Email: ');
        const password = await question('Password: ');
        const firstName = await question('First Name: ');
        const lastName = await question('Last Name: ');

        // Validate input
        if (!email || !password || !firstName || !lastName) {
            console.error('❌ All fields are required');
            process.exit(1);
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.error('❌ User with this email already exists');
            process.exit(1);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create admin user
        const admin = await User.create({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role: 'admin',
            isVerified: true,
            isActive: true
        });

        console.log('\n✅ Admin user created successfully!');
        console.log(`\nAdmin Details:`);
        console.log(`  ID: ${admin._id}`);
        console.log(`  Email: ${admin.email}`);
        console.log(`  Name: ${admin.firstName} ${admin.lastName}`);
        console.log(`  Role: ${admin.role}`);

    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
        process.exit(1);
    } finally {
        rl.close();
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from database');
        process.exit(0);
    }
}

createAdmin();
