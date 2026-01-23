const express = require('express');
const bookingPaymentController = require('./booking-with-payment.controller');
const authMiddleware = require('../auth/auth.middleware');

const router = express.Router();

/**
 * BOOKING WITH FACE VERIFICATION + RAZORPAY PAYMENT ROUTES
 * 
 * Flow:
 * 1. Check face verification: POST /verify-face-status
 * 2. Initiate booking: POST /initiate-with-verification
 * 3. Verify payment & confirm: POST /confirm-booking
 * 4. Get booking status: GET /status/:bookingId
 * 5. Cancel booking: DELETE /cancel/:bookingId
 */

// Check if user is face verified
router.post('/verify-face-status', authMiddleware.protect, bookingPaymentController.checkFaceVerification);

// Initiate booking with face verification check and create Razorpay order
router.post('/initiate-with-verification', authMiddleware.protect, bookingPaymentController.initiateBookingWithVerification);

// Verify payment and confirm booking after successful Razorpay payment
router.post('/confirm-booking', authMiddleware.protect, bookingPaymentController.verifyPaymentAndConfirmBooking);

// Get booking status with verification and payment details
router.get('/status/:bookingId', authMiddleware.protect, bookingPaymentController.getBookingStatus);

// Cancel booking (only before confirmation)
router.delete('/cancel/:bookingId', authMiddleware.protect, bookingPaymentController.cancelBooking);

module.exports = router;
