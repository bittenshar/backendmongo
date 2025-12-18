const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({
    path: path.join(__dirname, 'src/config/config.env'),
});

// Import admin model
const Admin = require('./src/features/admin/admin.model');

// Connect to database
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        process.exit(1);
    }
};

// Create admin users
const createAdmins = async () => {
    try {
        // Clear existing admins
        await Admin.deleteMany({});
        console.log('🗑️  Cleared existing admin users');

        // Create admins
        const admins = await Admin.create([
            {
                adminId: 'admin_' + Date.now() + '_1',
                email: 'admin@thrillathon.com',
                password: 'admin123',
                passwordConfirm: 'admin123',
                role: 'admin',
                name: 'Main Admin',
                permissions: ['manage_users', 'manage_events', 'manage_tickets', 'manage_organizers', 'manage_admins', 'view_analytics', 'manage_settings'],
                active: true
            },
            {
                adminId: 'admin_' + Date.now() + '_2',
                email: 'admin1@thrillathon.com',
                password: 'admin123',
                passwordConfirm: 'admin123',
                role: 'admin',
                name: 'Admin One',
                permissions: ['manage_users', 'manage_events', 'manage_tickets', 'manage_organizers', 'manage_admins', 'view_analytics', 'manage_settings'],
                active: true
            }
        ]);

        console.log(`✅ Created ${admins.length} admin users`);
        console.log('\n📋 Admin Credentials:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        admins.forEach((admin, index) => {
            console.log(`\n👤 Admin ${index + 1}:`);
            console.log(`   Email: ${admin.email}`);
            console.log(`   Password: admin123`);
            console.log(`   Role: ${admin.role}`);
        });
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admins:', error.message);
        process.exit(1);
    }
};

// Run
connectDB().then(createAdmins);
