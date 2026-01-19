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

/**
 * ==========================================
 * PAYMENT INTEGRATION CONTROLLERS
 * ==========================================
 */

/**
 * Create booking and initiate payment
 * POST /api/booking/create-with-payment
 */
exports.createBookingAndInitiatePayment = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      eventId,
      seatingId,
      seatType,
      quantity,
      pricePerSeat,
      specialRequirements
    } = req.body;

    // Validate required fields
    if (!eventId || !seatingId || !seatType || !quantity || !pricePerSeat) {
      return next(new AppError('Missing required fields', 400));
    }

    const totalPrice = quantity * pricePerSeat;

    // Create booking with payment
    const bookingService = require('./booking.service');
    const result = await bookingService.createBookingWithPayment({
      userId,
      eventId,
      seatingId,
      seatType,
      quantity,
      pricePerSeat,
      totalPrice,
      specialRequirements
    });

    res.status(201).json({
      status: 'success',
      data: result,
      message: 'Booking created and payment order initiated'
    });

  } catch (error) {
    console.error('Error creating booking:', error);
    next(error);
  }
};

/**
 * Verify payment and confirm booking
 * POST /api/booking/:bookingId/verify-payment
 */
exports.verifyBookingPayment = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId || !signature) {
      return next(new AppError('Missing payment verification details', 400));
    }

    const bookingService = require('./booking.service');
    const result = await bookingService.verifyBookingPayment(bookingId, {
      orderId,
      paymentId,
      signature
    });

    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Booking confirmed with verified payment'
    });

  } catch (error) {
    console.error('Error verifying booking payment:', error);
    next(error);
  }
};

/**
 * Get booking with payment details
 * GET /api/booking/:bookingId/with-payment
 */
exports.getBookingWithPayment = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const bookingService = require('./booking.service');
    const result = await bookingService.getBookingWithPayment(bookingId);

    res.status(200).json({
      status: 'success',
      data: result
    });

  } catch (error) {
    console.error('Error fetching booking:', error);
    next(error);
  }
};

/**
 * Cancel booking with refund
 * POST /api/booking/:bookingId/cancel
 */
exports.cancelBookingWithRefund = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    const bookingService = require('./booking.service');
    const result = await bookingService.cancelBooking(bookingId, reason);

    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Booking cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    next(error);
  }
};

/**
 * Get payment receipt
 * GET /api/booking/:bookingId/receipt
 */
exports.getPaymentReceipt = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const bookingService = require('./booking.service');
    const result = await bookingService.getPaymentReceipt(bookingId);

    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Payment receipt generated successfully'
    });

  } catch (error) {
    console.error('Error generating receipt:', error);
    next(error);
  }
};

/**
 * ==========================================
 * UNIFIED BOOKING + PAYMENT ENDPOINT
 * ==========================================
 */

/**
 * One-step booking with automatic payment processing
 * POST /api/booking/book
 * 
 * This endpoint handles the entire flow:
 * 1. Creates booking record
 * 2. Initiates Razorpay payment
 * 3. Verifies payment signature
 * 4. Confirms booking if payment successful
 * 
 * Request body:
 * {
 *   eventId: string,
 *   seatingId: string,
 *   seatType: string,
 *   quantity: number,
 *   pricePerSeat: number,
 *   specialRequirements?: string,
 *   paymentData: {
 *     razorpayOrderId: string,
 *     razorpayPaymentId: string,
 *     razorpaySignature: string
 *   }
 * }
 * 
 * Response includes:
 * - paymentStatus: success/failed
 * - booking: confirmed booking details with ticket info
 * - payment: payment details with order and transaction IDs
 * - token: JWT token for authenticated access (if new user profile completed)
 */
exports.bookWithPayment = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const {
      eventId,
      seatingId,
      seatType,
      quantity,
      pricePerSeat,
      specialRequirements,
      paymentData // Contains razorpayOrderId, razorpayPaymentId, razorpaySignature
    } = req.body;

    // ===== VALIDATION =====
    if (!eventId || !seatingId || !seatType || !quantity || !pricePerSeat) {
      return next(new AppError('Missing required fields: eventId, seatingId, seatType, quantity, pricePerSeat', 400));
    }

    if (!paymentData || !paymentData.razorpayOrderId || !paymentData.razorpayPaymentId || !paymentData.razorpaySignature) {
      return next(new AppError('Missing payment data: razorpayOrderId, razorpayPaymentId, razorpaySignature required', 400));
    }

    const bookingService = require('./booking.service');
    const totalPrice = quantity * pricePerSeat;

    console.log('📚 Unified booking endpoint called:', {
      userId,
      eventId,
      seatType,
      quantity,
      totalPrice,
      paymentData: paymentData.razorpayOrderId
    });

    // ===== STEP 1: Use Razorpay order from frontend payment data =====
    const razorpayOrderId = paymentData.razorpayOrderId;
    
    console.log('💳 Step 1: Using Razorpay order from frontend:', razorpayOrderId);
    console.log('✅ Razorpay order ID confirmed:', razorpayOrderId);

    // ===== STEP 2: Create temporary booking =====
    let booking;
    try {
      console.log('📋 Step 2: Creating temporary booking...');
      
      booking = new Booking({
        userId,
        eventId,
        seatingId,
        seatType,
        quantity,
        pricePerSeat,
        totalPrice,
        status: 'temporary',
        paymentStatus: 'pending',
        specialRequirements,
        razorpayOrderId,
        expiresAt: new Date(Date.now() + 1 * 60 * 1000) // 1 min expiry for seat lock
      });

      await booking.save();
      console.log('✅ Temporary booking created:', booking._id);

    } catch (bookingError) {
      console.error('❌ Booking creation failed:', bookingError.message);
      return next(new AppError(`Booking creation failed: ${bookingError.message}`, 400));
    }

    // ===== STEP 2.5: Lock seats in inventory =====
    try {
      console.log('🔒 Step 2.5: Locking seats in inventory...');
      const Event = require('../events/event.model').default || require('../events/event.model');
      const event = await Event.findById(eventId);
      
      if (event) {
        const seatingIndex = event.seatings.findIndex(s => s._id.toString() === seatingId.toString());
        
        if (seatingIndex !== -1) {
          const seating = event.seatings[seatingIndex];
          seating.lockedSeats += quantity;
          await event.save();
          console.log('🔒 Seats locked:', {
            locked: quantity,
            totalLocked: seating.lockedSeats,
            remainingAvailable: seating.totalSeats - seating.seatsSold - seating.lockedSeats
          });
        } else {
          console.warn('⚠️ Seating not found in event');
        }
      }
    } catch (lockError) {
      console.warn('⚠️ Could not lock seats in inventory:', lockError.message);
      // Don't fail the booking if seat locking fails
    }

    // ===== STEP 3: Verify payment signature =====
    try {
      console.log('🔐 Step 3: Verifying payment signature...');
      
      const paymentService = require('../payment/payment.service');
      const verificationResult = await paymentService.verifyPaymentSignature({
        orderId: razorpayOrderId,
        paymentId: paymentData.razorpayPaymentId,
        signature: paymentData.razorpaySignature
      });

      if (!verificationResult.verified) {
        throw new Error('Payment signature verification failed');
      }

      console.log('✅ Payment signature verified');

    } catch (verificationError) {
      console.error('❌ Payment verification failed:', verificationError.message);
      
      // Mark booking as failed
      booking.status = 'cancelled';
      booking.paymentStatus = 'failed';
      booking.cancellationReason = `Payment verification failed: ${verificationError.message}`;
      await booking.save();

      return next(new AppError(`Payment verification failed: ${verificationError.message}`, 400));
    }

    // ===== STEP 4: Confirm booking with payment verification =====
    try {
      console.log('🎟️ Step 4: Confirming booking with verified payment...');
      
      const confirmationResult = await bookingService.verifyBookingPayment(booking._id.toString(), {
        orderId: razorpayOrderId,
        paymentId: paymentData.razorpayPaymentId,
        signature: paymentData.razorpaySignature
      });

      console.log('✅ Booking confirmed with payment verified');

      // ===== SUCCESS RESPONSE =====
      res.status(201).json({
        status: 'success',
        message: 'Booking confirmed with successful payment',
        data: {
          paymentStatus: 'success',
          booking: confirmationResult.booking,
          payment: {
            orderId: razorpayOrderId,
            paymentId: paymentData.razorpayPaymentId,
            amount: totalPrice,
            currency: 'INR',
            verifiedAt: new Date()
          },
          ticketInfo: {
            seatType,
            quantity,
            pricePerSeat,
            totalPrice,
            ticketNumbers: confirmationResult.booking?.ticketNumbers || []
          }
        }
      });

    } catch (confirmationError) {
      console.error('❌ Booking confirmation failed:', confirmationError.message);
      return next(new AppError(`Booking confirmation failed: ${confirmationError.message}`, 400));
    }

  } catch (error) {
    console.error('❌ Unexpected error in unified booking endpoint:', error);
    next(error);
  }
};
