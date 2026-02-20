const mongoose = require('mongoose');
require('dotenv').config();

const Admin = require('./src/features/admin/admin.model');

async function checkAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin exists
    const admin = await Admin.findOne({ email: 'admin@thrillathon.com' });

    if (admin) {
      console.log('\n✅ Admin account found:');
      console.log('Email:', admin.email);
      console.log('Role:', admin.role);
      console.log('Status:', admin.status);
      console.log('Created:', admin.createdAt);
    } else {
      console.log('\n❌ Admin account NOT found');
      console.log('Creating admin account...\n');

      // Create admin
      const newAdmin = await Admin.create({
        name: 'Admin',
        email: 'admin@thrillathon.com',
        password: 'admin123',
        passwordConfirm: 'admin123',
        role: 'super-admin',
        permissions: ['all'],
        active: true
      });

      console.log('✅ Admin created successfully!');
      console.log('Email:', newAdmin.email);
      console.log('Password: admin123');
      console.log('Role:', newAdmin.role);
    }

    // List all admins
    console.log('\n📋 All admin accounts:');
    const allAdmins = await Admin.find({}, { password: 0 });
    console.log(JSON.stringify(allAdmins, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkAdmin();
