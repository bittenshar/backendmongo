
const express = require('express');
const router = express.Router();

// Import controllers
const { getSeatAvailability } = require('./seatAvailability.controller');
const { bookSeat } = require('./bookSeat.controller');
const { confirmSeatAfterPayment } = require('./confirmSeat.controller');
const { cancelSeatBooking } = require('./cancelSeat.controller');
const bookingController = require('./booking.controller');

/**
 * ==========================================
 * BOOKING ROUTES
 * ==========================================
 */

// POST routes must come before GET routes to avoid parameter conflicts

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

// Get seat availability
router.get('/:eventId/seats', getSeatAvailability);

// Get booking details
router.get('/:bookingId', bookingController.getBookingDetails);

// Download ticket
router.get('/:bookingId/download-ticket', bookingController.downloadTicket);

module.exports = router;
