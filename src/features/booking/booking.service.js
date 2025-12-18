const Booking = require('./booking_model');
const Event = require('../events/event.model');
const AppError = require('../../shared/utils/appError');

/**
 * ==========================================
 * BOOKING SERVICE
 * ==========================================
 * Business logic and utilities for booking operations
 */

/**
 * Create booking
 * @param {Object} bookingData - Booking details
 * @returns {Promise<Object>} Created booking
 */
exports.createBooking = async (bookingData) => {
  const {
    userId,
    eventId,
    seatingId,
    seatType,
    quantity,
    pricePerSeat,
    specialRequirements
  } = bookingData;

  // Validation
  if (!userId || !eventId || !seatingId || !seatType || !quantity || !pricePerSeat) {
    throw new AppError('Missing required booking data', 400);
  }

  const totalPrice = pricePerSeat * quantity;
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15-minute lock

  const booking = await Booking.create({
    userId,
    eventId,
    seatingId,
    seatType,
    quantity,
    pricePerSeat,
    totalPrice,
    status: 'temporary',
    paymentStatus: 'pending',
    expiresAt,
    specialRequirements
  });

  return booking;
};

/**
 * Get user bookings by status
 * @param {string} userId - User ID
 * @param {string} status - Booking status filter
 * @returns {Promise<Array>} Bookings
 */
exports.getUserBookings = async (userId, status = null) => {
  return Booking.findUserBookings(userId, status);
};

/**
 * Check seat availability for event
 * @param {string} eventId - Event ID
 * @returns {Promise<Array>} Available seating info
 */
exports.checkSeatAvailability = async (eventId) => {
  const event = await Event.findById(eventId).select('seatings name');
  
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  return event.seatings
    .filter((s) => s.isActive)
    .map((s) => ({
      seatingId: s._id,
      seatType: s.seatType,
      price: s.price,
      totalSeats: s.totalSeats,
      seatsSold: s.seatsSold,
      lockedSeats: s.lockedSeats,
      availableSeats: s.totalSeats - s.seatsSold - s.lockedSeats,
      occupancyRate: ((s.seatsSold / s.totalSeats) * 100).toFixed(2)
    }));
};

/**
 * Lock seats for booking
 * @param {string} eventId - Event ID
 * @param {string} seatingId - Seating ID
 * @param {number} quantity - Number of seats
 * @returns {Promise<Object>} Lock details
 */
exports.lockSeats = async (eventId, seatingId, quantity) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  const seating = event.seatings.id(seatingId);
  if (!seating || !seating.isActive) {
    throw new AppError('Seating not available', 400);
  }

  const availableSeats = seating.totalSeats - seating.seatsSold - seating.lockedSeats;
  if (availableSeats < quantity) {
    throw new AppError(`Only ${availableSeats} seats available`, 400);
  }

  seating.lockedSeats += quantity;
  await event.save();

  return {
    seatingId,
    lockedSeats: seating.lockedSeats,
    availableSeats: seating.totalSeats - seating.seatsSold - seating.lockedSeats
  };
};

/**
 * Release locked seats
 * @param {string} eventId - Event ID
 * @param {string} seatingId - Seating ID
 * @param {number} quantity - Number of seats
 * @returns {Promise<Object>} Release details
 */
exports.releaseSeats = async (eventId, seatingId, quantity) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  const seating = event.seatings.id(seatingId);
  if (!seating) {
    throw new AppError('Seating not found', 400);
  }

  seating.lockedSeats = Math.max(0, seating.lockedSeats - quantity);
  await event.save();

  return {
    seatingId,
    lockedSeats: seating.lockedSeats,
    availableSeats: seating.totalSeats - seating.seatsSold - seating.lockedSeats
  };
};

/**
 * Confirm booking and move locked → sold
 * @param {string} bookingId - Booking ID
 * @param {string} paymentId - Payment ID
 * @param {string} paymentMethod - Payment method
 * @returns {Promise<Object>} Confirmed booking
 */
exports.confirmBooking = async (bookingId, paymentId, paymentMethod = 'card') => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  if (booking.status === 'confirmed') {
    throw new AppError('Booking already confirmed', 400);
  }

  if (booking.expiresAt && new Date() > booking.expiresAt) {
    throw new AppError('Booking expired', 400);
  }

  const event = await Event.findById(booking.eventId);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  const seating = event.seatings.id(booking.seatingId);
  if (!seating) {
    throw new AppError('Seating not found', 400);
  }

  if (seating.lockedSeats < booking.quantity) {
    throw new AppError('Locked seats not available', 400);
  }

  // Convert locked → sold
  seating.lockedSeats -= booking.quantity;
  seating.seatsSold += booking.quantity;

  await booking.confirm(paymentId, paymentMethod);
  await booking.generateTickets();
  await event.save();

  return booking;
};

/**
 * Cancel booking and release seats
 * @param {string} bookingId - Booking ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} Cancelled booking
 */
exports.cancelBooking = async (bookingId, reason = 'User cancelled') => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  if (booking.status === 'cancelled' || booking.status === 'refunded') {
    throw new AppError('Booking already cancelled', 400);
  }

  const event = await Event.findById(booking.eventId);
  if (event) {
    const seating = event.seatings.id(booking.seatingId);
    if (seating) {
      if (booking.status === 'temporary') {
        seating.lockedSeats = Math.max(0, seating.lockedSeats - booking.quantity);
      } else if (booking.status === 'confirmed') {
        seating.seatsSold = Math.max(0, seating.seatsSold - booking.quantity);
        booking.refundAmount = booking.totalPrice;
      }
      await event.save();
    }
  }

  await booking.cancel(reason);
  return booking;
};

/**
 * Get booking summary for event
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Summary statistics
 */
exports.getEventBookingSummary = async (eventId) => {
  const stats = await Booking.getEventBookingStats(eventId);
  
  const summary = {
    byStatus: {},
    totalBookings: 0,
    totalRevenue: 0,
    averageBookingValue: 0
  };

  for (const stat of stats) {
    summary.byStatus[stat._id] = {
      count: stat.count,
      revenue: stat.revenue || 0
    };
    summary.totalBookings += stat.count;
    summary.totalRevenue += (stat.revenue || 0);
  }

  if (summary.totalBookings > 0) {
    summary.averageBookingValue = summary.totalRevenue / summary.totalBookings;
  }

  return summary;
};

/**
 * Cleanup expired temporary bookings
 * Call via cron job periodically
 * @returns {Promise<number>} Number of bookings cleaned
 */
exports.cleanupExpiredBookings = async () => {
  const expiredBookings = await Booking.findExpiredTemporaryBookings();

  if (expiredBookings.length === 0) {
    return 0;
  }

  // Release locked seats
  const eventBookingMap = {};
  for (const booking of expiredBookings) {
    if (!eventBookingMap[booking.eventId]) {
      eventBookingMap[booking.eventId] = [];
    }
    eventBookingMap[booking.eventId].push({
      seatingId: booking.seatingId,
      quantity: booking.quantity
    });
  }

  for (const [eventId, bookings] of Object.entries(eventBookingMap)) {
    const event = await Event.findById(eventId);
    if (event) {
      for (const booking of bookings) {
        const seating = event.seatings.id(booking.seatingId);
        if (seating) {
          seating.lockedSeats = Math.max(0, seating.lockedSeats - booking.quantity);
        }
      }
      await event.save();
    }
  }

  // Delete expired bookings
  const result = await Booking.deleteMany({
    status: 'temporary',
    expiresAt: { $lt: new Date() }
  });

  return result.deletedCount;
};

/**
 * Generate ticket for booking
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Array>} Ticket numbers
 */
exports.generateTicket = async (bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  if (booking.status !== 'confirmed') {
    throw new AppError('Only confirmed bookings have tickets', 400);
  }

  if (booking.ticketNumbers && booking.ticketNumbers.length > 0) {
    return booking.ticketNumbers;
  }

  await booking.generateTickets();
  return booking.ticketNumbers;
};

/**
 * Validate booking before payment
 * @param {string} bookingId - Booking ID
 * @returns {Promise<boolean>} Is valid
 */
exports.validateBookingBeforePayment = async (bookingId) => {
  const booking = await Booking.findById(bookingId);
  
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  if (booking.status !== 'temporary') {
    throw new AppError('Invalid booking status', 400);
  }

  if (booking.expiresAt && new Date() > booking.expiresAt) {
    throw new AppError('Booking has expired', 400);
  }

  // Check if seats still available
  const event = await Event.findById(booking.eventId);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  const seating = event.seatings.id(booking.seatingId);
  if (!seating) {
    throw new AppError('Seating not available', 400);
  }

  if (seating.lockedSeats < booking.quantity) {
    throw new AppError('Seats no longer available', 400);
  }

  return true;
};

/**
 * Get booking history for analytics
 * @param {string} eventId - Event ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Booking history
 */
exports.getBookingHistory = async (eventId, startDate, endDate) => {
  return Booking.aggregate([
    {
      $match: {
        eventId: require('mongoose').Types.ObjectId(eventId),
        bookedAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$bookedAt' }
        },
        count: { $sum: 1 },
        revenue: { $sum: '$totalPrice' },
        seats: { $sum: '$quantity' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};
