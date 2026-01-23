/**
 * Setup script to mark test user as face verified
 * Run this before the booking test
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function setupTestUser() {
  try {
    console.log('🔧 Setting up test user for booking tests...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get User model
    const User = require('./src/features/auth/auth.model');

    // Find or create test user
    let user = await User.findOne({ email: 'test@example.com' });

    if (!user) {
      console.log('📝 Creating new test user...');
      user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'test123',
        phone: '9876543210',
        role: 'user'
      });
      console.log('✅ User created\n');
    } else {
      console.log('ℹ️  User already exists\n');
    }

    // Update user to be face verified
    user.verificationStatus = 'verified';
    user.faceId = 'face_' + Math.random().toString(36).substr(2, 9);
    await user.save();

    console.log('✅ Test user setup complete!\n');
    console.log('📋 User Details:');
    console.log('   Email:', user.email);
    console.log('   User ID:', user._id);
    console.log('   Verification Status:', user.verificationStatus);
    console.log('   Face ID:', user.faceId);
    console.log('\n🚀 Now you can run the booking test:\n');
    console.log('   node complete-booking-payment-test.js\n');

    await mongoose.connection.close();
    console.log('✅ Disconnected from MongoDB\n');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupTestUser();
