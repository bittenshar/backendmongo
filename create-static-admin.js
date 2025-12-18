const mongoose = require('mongoose');
require('dotenv').config({ path: './src/config/config.env' });
const AdminUser = require('./src/features/admin/admin.model');
const bcrypt = require('bcryptjs');

async function createStaticAdmin() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });

    console.log('✅ Connected to MongoDB\n');

    // Default static admin credentials
    const staticAdminEmail = 'admin@admin.com';
    const staticAdminPassword = 'Admin@123';

    // Check if static admin already exists
    let staticAdmin = await AdminUser.findOne({ email: staticAdminEmail });

    if (staticAdmin) {
      console.log('ℹ️  Static admin already exists');
      console.log(`📧 Email: ${staticAdminEmail}`);
      console.log(`🔒 Password: ${staticAdminPassword}`);
    } else {
      console.log('🆕 Creating static admin user...\n');

      // Create static admin
      staticAdmin = await AdminUser.create({
        email: staticAdminEmail,
        password: staticAdminPassword,
        passwordConfirm: staticAdminPassword,
        name: 'Static Admin',
        role: 'admin',
        permissions: ['all'],
        active: true
      });

      console.log('✅ Static admin created successfully!\n');
      console.log('📋 Static Admin Credentials:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📧 Email:    ${staticAdminEmail}`);
      console.log(`🔒 Password: ${staticAdminPassword}`);
      console.log(`👤 Name:     Static Admin`);
      console.log(`🎯 Role:     admin`);
      console.log(`🔑 Permissions: all`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    console.log('✅ Done! Use these credentials to login:\n');
    console.log(`POST /api/auth/admin-login`);
    console.log(`{`);
    console.log(`  "email": "${staticAdminEmail}",`);
    console.log(`  "password": "${staticAdminPassword}"`);
    console.log(`}\n`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createStaticAdmin();
