require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

(async () => {
  try {
    // Connect to MongoDB
    const mongoUrl = process.env.MONGO_URL || 'mongodb+srv://adminthrill:admin%40123@cluster0.c3flvhb.mongodb.net/adminthrill?retryWrites=true&w=majority';
    console.log('Connecting to:', mongoUrl.split('@')[1] || mongoUrl);
    
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Import User model
    const User = require('./src/features/auth/auth.model');
    
    // Find first admin user
    let admin = await User.findOne({ role: 'admin' });
    
    if (!admin) {
      console.log('❌ No admin found, checking all users...');
      const users = await User.find().limit(5);
      if (users.length > 0) {
        console.log('Found users:', users.map(u => ({ id: u._id, email: u.email, role: u.role })));
        admin = users[0];
      } else {
        console.log('❌ No users found in database');
        process.exit(1);
      }
    }
    
    console.log('\n✅ Using user:', { id: admin._id, email: admin.email, role: admin.role });
    
    // Get JWT token
    const token = admin.getJwtToken();
    console.log('\n🔑 Token:', token);
    
    // Verify token can be decoded
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_min_32_chars_long_yes');
    console.log('\n📋 Decoded:', decoded);
    
    await mongoose.connection.close();
    console.log('\n✅ Done');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
