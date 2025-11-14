// scripts/createDefaultAdmin.mongo.js (or whatever filename you use)

const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// ⚠️ Adjust this path if your AdminUser model is elsewhere
const AdminUser = require('../modules/admin/admin.model'); 

// Load environment variables
dotenv.config({
  path: path.join(__dirname, '..', 'config', 'config.env'),
});

// MongoDB connection URI (set this in config.env)
const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.DATABASE ||
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/thrillathon';

// Define all available permissions
const ALL_PERMISSIONS = [
  'user_management',
  'event_management',
  'organizer_management',
  'ticket_management',
  'feedback_management',
  'admin_management',
  'registration_management',
  'verification_management',
  'analytics_view',
  'settings_management',
  'all_permissions', // Special permission that grants everything
];

const createDefaultAdmin = async () => {
  try {
    // 1️⃣ Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      // options are optional in newer mongoose, but harmless
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');

    const timestamp = new Date().toISOString();

    // 2️⃣ Hash password with proper salt rounds
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash('admin123', saltRounds);
    console.log(
      '🔐 Password hashed successfully with salt rounds:',
      saltRounds
    );

    // 3️⃣ Check if admin already exists by userId
    const existingAdmin = await AdminUser.findOne({ userId: 'admin_001' });

    if (existingAdmin) {
      console.log(
        'ℹ️ Default admin user already exists, updating permissions and password...'
      );

      existingAdmin.password = hashedPassword;
      existingAdmin.permissions = ALL_PERMISSIONS;
      existingAdmin.updatedAt = timestamp;
      existingAdmin.role = 'super_admin'; // keep naming same as your logic

      await existingAdmin.save();

      console.log('✅ Admin updated successfully with all permissions');
    } else {
      // 4️⃣ Create new admin user with all permissions
      console.log('👑 Creating default super admin user...');

      await AdminUser.create({
        userId: 'admin_001',
        email: 'admin@example.com',
        name: 'Super Admin',
        password: hashedPassword,
        phone: '+918824223395',
        role: 'super_admin',
        status: 'active',
        permissions: ALL_PERMISSIONS,
        lastActivity: timestamp,
        lastLogin: null,
        activityLog: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      console.log('✅ Default super admin user created successfully');
    }

    console.log('\n🔑 Default admin credentials:');
    console.log('📧 Email: admin@example.com');
    console.log('🔒 Password: admin123');
    console.log('👑 Role: super_admin');
    console.log(
      '🔐 Permissions: ALL (' + ALL_PERMISSIONS.length + ' permissions)'
    );
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
  } catch (error) {
    console.error('❌ Error creating/updating default admin:', error.message);
  } finally {
    // 5️⃣ Close MongoDB connection
    try {
      await mongoose.disconnect();
      console.log('🔌 MongoDB disconnected');
    } catch (err) {
      console.error('Error disconnecting MongoDB:', err.message);
    }
  }
};

// Run the function
createDefaultAdmin();
