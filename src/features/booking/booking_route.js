
const express = require('express');
const router = express.Router();

// Import controllers
const { getSeatAvailability } = require('./seatAvailability.controller');
const { bookSeat } = require('./bookSeat.controller');
const { confirmSeatAfterPayment } = require('./confirmSeat.controller');
const { cancelSeatBooking } = require('./cancelSeat.controller');
const bookingController = require('./booking.controller');
const ticketValidationController = require('./ticket-validation.controller');
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
// ADMIN ONLY ROUTES
// ==========================================

// Admin: Book ticket for specific user without payment
router.post('/admin/book-without-payment', bookingController.adminBookEventTicket);

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

// Book seats (temporary lock) - OLD endpoint, kept for backward compatibility
// NOTE: POST /book is handled by unified payment endpoint above
router.post('/book-seat', bookSeat);

// Confirm booking after payment
router.post('/confirm', confirmSeatAfterPayment);

// Cancel booking
router.post('/cancel', cancelSeatBooking);

// Admin routes (must come before /:bookingId routes)
router.get('/admin/all', bookingController.getAllBookings);
router.get('/admin/:eventId/stats', bookingController.getEventBookingStats);
router.post('/admin/cleanup-expired', bookingController.cleanupExpiredBookings);

// User routes
router.get('/user/:userId', bookingController.getUserBookings);

// Get booking by reference number
router.get('/reference/:referenceNumber', bookingController.getBookingByReference);

// Get booking summary
router.get('/:bookingId/summary', bookingController.getBookingSummary);

// Get booking with payment details
router.get('/:bookingId/with-payment', bookingController.getBookingWithPayment);

// Get payment receipt
router.get('/:bookingId/receipt', bookingController.getPaymentReceipt);

// Get booking details
router.get('/:bookingId', bookingController.getBookingDetails);

// Download ticket
router.get('/:bookingId/download-ticket', bookingController.downloadTicket);

// ==========================================
// TICKET VALIDATION ROUTES (NEW)
// ==========================================

// Validate ticket (public - for check-in staff)
router.post('/validate-ticket', ticketValidationController.validateTicket);

// Validate QR code
router.post('/validate-qr', ticketValidationController.validateQRCode);

// Check in ticket (mark as used)
router.post('/checkin-ticket', ticketValidationController.checkInTicket);

// Get ticket details by ticket number
router.get('/ticket/:ticketNumber', ticketValidationController.getTicketDetails);

module.exports = router;
