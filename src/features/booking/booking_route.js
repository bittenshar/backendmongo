
const express = require('express');
const router = express.Router();

// Import controllers
const { getSeatAvailability } = require('./seatAvailability.controller');
const { bookSeat } = require('./bookSeat.controller');
const { confirmSeatAfterPayment } = require('./confirmSeat.controller');
const { cancelSeatBooking } = require('./cancelSeat.controller');
const bookingController = require('./booking.controller');
const authMiddleware = require('../auth/auth.middleware');

/**
 * ==========================================
 * BOOKING ROUTES
 * ==========================================
 */

// Public routes (no authentication required)
router.get('/:eventId/seats', getSeatAvailability);

// Apply authentication middleware to all routes below
router.use(authMiddleware.protect);

// POST routes must come before GET routes to avoid parameter conflicts

// ==========================================
// PAYMENT INTEGRATION ROUTES (NEW)
// ==========================================

// ONE-STEP BOOKING WITH AUTOMATIC PAYMENT
// Combines booking creation + payment verification in one endpoint
router.post('/book', bookingController.bookWithPayment);

// Create booking + initiate payment
router.post('/create-with-payment', bookingController.createBookingAndInitiatePayment);

// Verify payment + confirm booking
router.post('/:bookingId/verify-payment', bookingController.verifyBookingPayment);

// Cancel booking with refund
router.post('/:bookingId/cancel-with-refund', bookingController.cancelBookingWithRefund);

// ==========================================
// EXISTING ROUTES
// ==========================================

// Book seats (temporary lock)
router.post('/book', bookSeat);

// Confirm booking after payment
router.post('/confirm', confirmSeatAfterPayment);

// Cancel booking
router.post('/cancel', cancelSeatBooking);

// Admin routes (must come before /:bookingId routes)
router.get('/admin/:eventId/stats', bookingController.getEventBookingStats);
router.post('/admin/cleanup-expired', bookingController.cleanupExpiredBookings);

// User routes
router.get('/user/:userId', bookingController.getUserBookings);

// Get booking with payment details
router.get('/:bookingId/with-payment', bookingController.getBookingWithPayment);

// Get payment receipt
router.get('/:bookingId/receipt', bookingController.getPaymentReceipt);

// Get booking details
router.get('/:bookingId', bookingController.getBookingDetails);

// Download ticket
router.get('/:bookingId/download-ticket', bookingController.downloadTicket);

module.exports = router;
