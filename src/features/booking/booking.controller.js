const Booking = require('./booking_model');
const Event = require('../events/event.model');
const User = require('../auth/auth.model');
const AppError = require('../../shared/utils/appError');

/**
 * Get user bookings
 * 
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.getUserBookings = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    const bookings = await Booking.findUserBookings(userId, status)
      .populate('eventId', 'name date location');

    res.status(200).json({
      status: 'success',
      data: {
        bookings,
        count: bookings.length
      }
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    return next(new AppError(error.message, 500));
  }
};

/**
 * Get booking details
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.getBookingDetails = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .populate('userId', 'name email phone')
      .populate('eventId', 'name date location ticketPrice');

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        booking
      }
    });
  } catch (error) {
    console.error('Error fetching booking details:', error);
    return next(new AppError(error.message, 500));
  }
};

/**
 * Download ticket
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.downloadTicket = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    if (booking.status !== 'confirmed') {
      return next(new AppError('Only confirmed bookings can download tickets', 400));
    }

    if (!booking.ticketNumbers || booking.ticketNumbers.length === 0) {
      return next(new AppError('Tickets not yet generated', 400));
    }

    // Increment download count
    booking.ticketDownloadCount += 1;
    await booking.save();

    // TODO: Generate PDF with ticket details
    // For now, return ticket data
    res.status(200).json({
      status: 'success',
      message: 'Ticket download initiated',
      data: {
        ticketNumbers: booking.ticketNumbers,
        quantity: booking.quantity,
        seatType: booking.seatType,
        totalPrice: booking.totalPrice,
        downloadCount: booking.ticketDownloadCount
      }
    });
  } catch (error) {
    console.error('Error downloading ticket:', error);
    return next(new AppError(error.message, 500));
  }
};

/**
 * Get event booking statistics (Admin)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.getEventBookingStats = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    // Get stats by status
    const stats = await Booking.getEventBookingStats(eventId);

    // Get total revenue
    const totalRevenue = stats.reduce((sum, stat) => sum + (stat.revenue || 0), 0);

    // Get booking timeline
    const timeline = await Booking.aggregate([
      {
        $match: { eventId: require('mongoose').Types.ObjectId(eventId) }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$bookedAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$totalPrice' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        eventId,
        eventName: event.name,
        statistics: {
          byStatus: stats.reduce((acc, stat) => {
            acc[stat._id] = {
              count: stat.count,
              revenue: stat.revenue
            };
            return acc;
          }, {}),
          totalRevenue,
          totalBookings: stats.reduce((sum, stat) => sum + stat.count, 0)
        },
        timeline
      }
    });
  } catch (error) {
    console.error('Error getting event booking stats:', error);
    return next(new AppError(error.message, 500));
  }
};

/**
 * Cleanup expired temporary bookings (Admin)
 * Called by cron job or admin endpoint
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.cleanupExpiredBookings = async (req, res, next) => {
  try {
    // Find expired temporary bookings
    const expiredBookings = await Booking.findExpiredTemporaryBookings();

    if (expiredBookings.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'No expired bookings found',
        data: { cleaned: 0 }
      });
    }

    // Get event map for bulk updates
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

    // Release locked seats back to events
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

    res.status(200).json({
      status: 'success',
      message: 'Expired bookings cleaned up successfully',
      data: {
        cleaned: result.deletedCount
      }
    });
  } catch (error) {
    console.error('Error cleaning up expired bookings:', error);
    return next(new AppError(error.message, 500));
  }
};

/**
 * Get booking by reference number
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.getBookingByReference = async (req, res, next) => {
  try {
    const { reference } = req.params;

    const booking = await Booking.findOne({ _id: reference })
      .populate('userId', 'name email')
      .populate('eventId', 'name date location');

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { booking }
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    return next(new AppError(error.message, 500));
  }
};

/**
 * Update booking notes (Admin)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.updateBookingNotes = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { notes } = req.body;

    if (!notes) {
      return next(new AppError('Notes are required', 400));
    }

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { notes },
      { new: true, runValidators: true }
    );

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Booking notes updated',
      data: { booking }
    });
  } catch (error) {
    console.error('Error updating booking notes:', error);
    return next(new AppError(error.message, 500));
  }
};

/**
 * Get booking status summary (Admin)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.getBookingSummary = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const summary = await Booking.aggregate([
      {
        $match: { eventId: require('mongoose').Types.ObjectId(eventId) }
      },
      {
        $facet: {
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ],
          bySeatType: [
            {
              $group: {
                _id: '$seatType',
                count: { $sum: 1 },
                revenue: { $sum: '$totalPrice' }
              }
            }
          ],
          byPaymentMethod: [
            {
              $match: { paymentStatus: 'completed' }
            },
            {
              $group: {
                _id: '$paymentMethod',
                count: { $sum: 1 },
                revenue: { $sum: '$totalPrice' }
              }
            }
          ],
          totalMetrics: [
            {
              $group: {
                _id: null,
                totalBookings: { $sum: 1 },
                totalRevenue: { $sum: '$totalPrice' },
                averageBookingValue: { $avg: '$totalPrice' },
                totalSeatsBooked: { $sum: '$quantity' }
              }
            }
          ]
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        eventId,
        summary: summary[0] || {}
      }
    });
  } catch (error) {
    console.error('Error getting booking summary:', error);
    return next(new AppError(error.message, 500));
  }
};
