const mongoose = require('mongoose');
require('dotenv').config({ path: './src/config/config.env' });

const User = require('./src/features/auth/auth.model');

const testUserId = '6915c1ce111e057ff7b315bc'; // Your test user
const testFaceId = 'rek_1304_test_802f'; // Example face ID from your AWS screenshot

async function updateUserFaceId() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected');

    const result = await User.findByIdAndUpdate(
      testUserId,
      { faceId: testFaceId },
      { new: true }
    );

    if (result) {
      console.log('✅ User faceId updated successfully!');
      console.log('User:', {
        _id: result._id,
        email: result.email,
        faceId: result.faceId
      });
    } else {
      console.log('❌ User not found');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateUserFaceId();
