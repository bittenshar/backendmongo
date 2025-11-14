const express = require('express');
const authController = require('./auth.controller');

const router = express.Router();

// Protected route to get current user info
router.get('/', authController.protect, authController.getCurrentUser);

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/admin-login', authController.login); // Admin login uses same login logic
router.get('/logout', authController.logout);

// ============================================
// OTP Verification Routes (Public)
// ============================================
router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);

module.exports = router;