// routes/admin/admin.routes.js

const express = require('express');
const adminController = require('./admin.controller');
const authController = require('../auth/auth.controller');
const employeeRoutes = require('./admin.employees.routes');
const { connectMongoDB } = require('../../config/db'); // 👈 Mongo-only now
const mongoose = require('mongoose');

const ensureMongoConnection = async (req, res, next) => {
  try {
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    if (mongoose.connection.readyState === 1) {
      // Already connected
      return next();
    }

    // If not connected, try to connect
    await connectMongoDB();
    return next();
  } catch (error) {
    console.error('❌ MongoDB connection error for admin routes:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Unable to connect to MongoDB',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const router = express.Router();

// Ensure MongoDB is ready
router.use(ensureMongoConnection);

// Protect all routes
router.use(authController.protect);

// Restrict to admin users
router.use(authController.restrictTo('admin'));

// Admin dashboard routes
router.get('/stats', adminController.getStats);

// Employee management routes
router.use('/employees', employeeRoutes);

// Admin user management routes
router.post('/admin-users', adminController.createAdminUser);
router.get('/admin-users', adminController.getAllAdminUsers);

// Admin registration route (protected)
router.post('/register', adminController.registerAdmin);

// Face data management routes
router.get('/users/:userId/face-data', adminController.checkFaceId);
router.post('/users/:userId/issue-tickets', adminController.issuePendingTickets);

module.exports = router;
