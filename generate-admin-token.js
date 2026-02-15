const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({
    path: path.join(__dirname, '.env'),
});

// Import models
const User = require('./src/features/auth/auth.model');

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

// Generate token
const generateAdminToken = async () => {
    try {
        // Find or create admin user
        let admin = await User.findOne({ role: 'admin' });
        
        if (!admin) {
            console.log('Creating admin user...');
            admin = await User.create({
                name: 'Test Admin',
                email: 'admin@listyourshow.com',
                password: 'admin123',
                phone: '9999999999',
                role: 'admin',
                status: 'active'
            });
            console.log('✅ Admin user created');
        } else {
            console.log('✅ Admin user found');
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: admin._id.toString() },
            process.env.JWT_SECRET,
            { expiresIn: '90d' }
        );

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔑 ADMIN TOKEN (Valid for 90 days)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n📋 Admin Details:');
        console.log(`ID: ${admin._id}`);
        console.log(`Name: ${admin.name}`);
        console.log(`Email: ${admin.email}`);
        console.log(`Role: ${admin.role}`);
        
        console.log('\n🔐 Token:');
        console.log(token);
        
        console.log('\n📌 Usage Example:');
        console.log('curl -X GET "http://localhost:3000/api/listyourshow/inquiries" \\');
        console.log(`  -H "Authorization: Bearer ${token}"`);
        
        console.log('\n📚 Admin Endpoints:');
        console.log('GET  /api/listyourshow/inquiries - Get all inquiries');
        console.log('GET  /api/listyourshow/stats - Get statistics');
        console.log('PATCH /api/listyourshow/inquiry/:id/status - Update status');
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

// Run
connectDB().then(generateAdminToken);
