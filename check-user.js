const mongoose = require('mongoose');
require('dotenv').config({ path: './src/config/config.env' });
const User = require('./src/features/auth/auth.model');

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ email: 'd@example.com' });
    console.log('User found:', {
      _id: user._id,
      email: user.email,
      uploadedPhoto: user.uploadedPhoto,
      faceId: user.faceId,
      password: '***' // Don't log password
    });
    await mongoose.connection.close();
  } catch (e) {
    console.error('Error:', e.message);
  }
}
checkUser();
