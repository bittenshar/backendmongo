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

/**
 * ==========================================
 * PAYMENT INTEGRATION METHODS
 * ==========================================
 */

/**
 * Create booking with automatic payment order generation
 * Integrates with Payment API to create Razorpay order
 */
exports.createBookingWithPayment = async (bookingData) => {
  try {
    const paymentService = require('../payment/payment.service');
    const {
      userId,
      eventId,
      seatingId,
      seatType,
      quantity,
      pricePerSeat,
      totalPrice,
      specialRequirements = null
    } = bookingData;

    console.log('📝 Creating booking with payment:', {
      userId,
      eventId,
      seatType,
      quantity,
      totalPrice
    });

    // 1. Create booking record (temporary status)
    const booking = new Booking({
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
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 min expiry
    });

    // Save booking first
    await booking.save();
    console.log('✅ Booking created (temporary):', booking._id);

    // 2. Create Razorpay payment order
    try {
      const paymentOrderData = {
        userId,
        amount: totalPrice, // Amount in INR (payment service will convert to paise)
        description: `Event Booking - Seat Type: ${seatType}, Qty: ${quantity}`,
        receipt: `BOOKING_${booking._id}_${Date.now()}`
      };

      console.log('💳 Creating payment order with amount:', paymentOrderData.amount);

      const paymentResponse = await paymentService.createOrder(
        paymentOrderData
      );

      console.log('✅ Payment order created:', paymentResponse.razorpayOrderId);

      // 3. Store payment response in booking
      booking.razorpayOrderId = paymentResponse.razorpayOrderId;
      booking.paymentOrder = {
        orderId: paymentResponse.orderId,
        razorpayOrderId: paymentResponse.razorpayOrderId,
        amount: paymentResponse.amount,
        currency: paymentResponse.currency,
        receipt: paymentResponse.receipt,
        key: paymentResponse.key,
        description: paymentResponse.description,
        status: paymentResponse.status,
        createdAt: new Date()
      };
      booking.paymentStatus = 'processing';

      await booking.save();
      console.log('✅ Payment details stored in booking');

      return {
        success: true,
        booking: booking.toObject(),
        payment: paymentResponse,
        message: 'Booking created successfully. Ready for payment.'
      };

    } catch (paymentError) {
      // If payment order creation fails, mark booking as failed
      console.error('❌ Payment creation failed:', paymentError.message);
      
      booking.paymentStatus = 'failed';
      booking.status = 'cancelled';
      booking.cancellationReason = `Payment order creation failed: ${paymentError.message}`;
      await booking.save();

      throw new AppError(
        `Payment order creation failed: ${paymentError.message}`,
        400
      );
    }

  } catch (error) {
    console.error('❌ Error creating booking:', error.message);
    throw new AppError(`Error creating booking: ${error.message}`, 500);
  }
};

/**
 * Verify payment and confirm booking
 * Validates Razorpay signature and confirms booking
 */
exports.verifyBookingPayment = async (bookingId, paymentData) => {
  try {
    const paymentService = require('../payment/payment.service');
    const { orderId, paymentId, signature } = paymentData;

    console.log('🔐 Verifying payment for booking:', bookingId);
    console.log('📋 Payment data:', { orderId, paymentId });

    // Find booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    console.log('📌 Booking details:', { 
      bookingId: booking._id,
      razorpayOrderId: booking.razorpayOrderId,
      status: booking.status 
    });

    // Check if already verified
    if (booking.paymentVerified) {
      console.log('⚠️ Payment already verified for this booking');
      return {
        success: true,
        booking: booking.toObject(),
        verified: true,
        message: 'Payment already verified. Booking confirmed.'
      };
    }

    // Check if payment order matches (orderId should match razorpayOrderId from frontend)
    console.log('🔍 Comparing orders:', { received: orderId, stored: booking.razorpayOrderId });
    if (booking.razorpayOrderId !== orderId) {
      console.error('❌ Order ID mismatch:', { 
        received: orderId, 
        stored: booking.razorpayOrderId,
        receivedType: typeof orderId,
        storedType: typeof booking.razorpayOrderId
      });
      throw new AppError(
        `Payment order ID does not match booking. Expected: ${booking.razorpayOrderId}, Received: ${orderId}`,
        400
      );
    }
    
    console.log('✅ Order IDs match');

    // Verify payment with payment service
    console.log('📌 Calling payment verification service...');
    const verificationResult = await paymentService.verifyPaymentSignature({
      orderId,
      paymentId,
      signature
    });

    console.log('✅ Payment verified successfully');

    // Update booking with verified payment details
    booking.razorpayPaymentId = paymentId;
    booking.razorpaySignature = signature;
    booking.paymentVerificationDetails = verificationResult;
    booking.paymentVerified = true;
    booking.paymentStatus = 'completed';

    // Confirm booking using built-in method
    await booking.confirm(paymentId, 'razorpay');
    console.log('✅ Booking confirmed');

    // ===== AUTO-GENERATE TICKETS =====
    console.log('🎫 Auto-generating tickets...');
    await booking.generateTickets();
    console.log('✅ Tickets generated:', booking.ticketNumbers);
    console.log('📌 Booking after ticket generation:', {
      _id: booking._id,
      ticketNumbers: booking.ticketNumbers,
      status: booking.status,
      paymentStatus: booking.paymentStatus
    });

    // ===== GENERATE PDF & QR CODES =====
    try {
      console.log('📄 Generating PDF ticket...');
      const ticketPdfService = require('../../shared/services/ticket-pdf.service');
      const ticketQrcodeService = require('../../shared/services/ticket-qrcode.service');
      const User = require('../auth/auth.model');

      // Get user details
      const user = await User.findById(booking.userId);

      // Generate PDF
      const pdfBuffer = await ticketPdfService.generateTicketPDF(booking, event, user);
      console.log('✅ PDF ticket generated');

      // Generate QR codes for each ticket
      console.log('📱 Generating QR codes...');
      const qrCodes = await ticketQrcodeService.generateMultipleQRCodes(booking.ticketNumbers);
      booking.qrCodes = qrCodes.map(qr => qr.dataUrl);
      
      console.log('💾 Saving booking with QR codes...');
      await booking.save();
      console.log('✅ QR codes generated and saved:', booking.qrCodes.length);
      console.log('📌 Booking after QR save:', {
        _id: booking._id,
        qrCodesCount: booking.qrCodes.length,
        ticketsCount: booking.ticketNumbers.length
      });

      // ===== SEND NOTIFICATIONS =====
      try {
        console.log('📬 Sending ticket notifications...');
        const ticketNotificationService = require('../../shared/services/ticket-notification.service');
        
        const notificationResults = await ticketNotificationService.sendTicketViaAllChannels(
          user,
          booking,
          booking.ticketNumbers,
          event
        );

        booking.notificationsSent = {
          whatsapp: notificationResults.whatsapp.success || false,
          email: notificationResults.email.success || false,
          sms: notificationResults.sms.success || false,
          sentAt: new Date()
        };
        
        console.log('💾 Saving booking with notifications status...');
        await booking.save();
        console.log('✅ Notifications sent and saved:', booking.notificationsSent);
        console.log('📌 Booking after notifications save:', {
          _id: booking._id,
          notificationsSent: booking.notificationsSent
        });
      } catch (notificationError) {
        console.warn('⚠️ Error sending notifications:', notificationError.message);
        // Don't fail the booking if notifications fail
      }

    } catch (ticketError) {
      console.warn('⚠️ Error generating/sending tickets:', ticketError.message);
      // Don't fail the booking if ticket generation fails
    }

    // ===== UPDATE SEATING INVENTORY =====
    console.log('🎫 Updating seating inventory...');
    const Event = require('../events/event.model').default || require('../events/event.model');
    const event = await Event.findById(booking.eventId);
    
    if (event) {
      // Find the seating by ID in the seatings array
      const seatingIndex = event.seatings.findIndex(s => s._id.toString() === booking.seatingId.toString());
      
      if (seatingIndex !== -1) {
        const seating = event.seatings[seatingIndex];
        
        // Move seats from locked to sold
        seating.lockedSeats = Math.max(0, seating.lockedSeats - booking.quantity);
        seating.seatsSold += booking.quantity;
        
        await event.save();
        console.log('✅ Seating inventory updated:', {
          seatsSold: seating.seatsSold,
          lockedSeats: seating.lockedSeats,
          remainingSeats: seating.totalSeats - seating.seatsSold - seating.lockedSeats
        });
      } else {
        console.warn('⚠️ Seating not found in event seatings array');
      }
    } else {
      console.warn('⚠️ Event not found for booking');
    }

    // ===== FETCH FRESH BOOKING DATA FROM DB =====
    console.log('🔄 Fetching fresh booking data from database...');
    const freshBooking = await Booking.findById(bookingId)
      .populate('userId', 'name email phone')
      .populate('eventId', 'name date location');
    
    console.log('✅ Fresh booking data retrieved:', {
      _id: freshBooking._id,
      status: freshBooking.status,
      ticketNumbers: freshBooking.ticketNumbers?.length || 0,
      qrCodes: freshBooking.qrCodes?.length || 0,
      notificationsSent: freshBooking.notificationsSent
    });

    return {
      success: true,
      booking: freshBooking.toObject(),
      verified: true,
      payment: {
        orderId,
        paymentId,
        verified: true,
        verificationDetails: verificationResult
      },
      message: 'Booking confirmed successfully'
    };

  } catch (error) {
    console.error('❌ Payment verification error:', error.message);
    
    // Update booking with failed payment
    try {
      const booking = await Booking.findById(bookingId);
      if (booking) {
        booking.paymentStatus = 'failed';
        booking.paymentVerified = false;
        await booking.save();
      }
    } catch (updateError) {
      console.error('Error updating booking after verification failure:', updateError);
    }

    throw new AppError(
      `Payment verification failed: ${error.message}`,
      400
    );
  }
};

/**
 * Get booking with payment details
 */
exports.getBookingWithPayment = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId)
      .populate('userId', 'name email phone')
      .populate('eventId', 'name date location price');

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    return {
      success: true,
      booking: booking.toObject(),
      payment: {
        status: booking.paymentStatus,
        verified: booking.paymentVerified,
        razorpayOrderId: booking.razorpayOrderId,
        razorpayPaymentId: booking.razorpayPaymentId,
        orderDetails: booking.paymentOrder,
        verificationDetails: booking.paymentVerificationDetails
      }
    };

  } catch (error) {
    throw new AppError(`Error fetching booking: ${error.message}`, 500);
  }
};

/**
 * Cancel booking and process refund if paid
 */
exports.cancelBooking = async (bookingId, reason = 'User cancelled') => {
  try {
    const paymentService = require('../payment/payment.service');
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    if (booking.status === 'cancelled') {
      throw new AppError('Booking already cancelled', 400);
    }

    // If payment was completed, process refund
    if (booking.paymentVerified && booking.razorpayPaymentId) {
      try {
        console.log('🔄 Processing refund for cancelled booking');
        const refundResult = await paymentService.refundPayment(
          booking.razorpayPaymentId,
          booking.totalPrice * 100
        );

        booking.refundAmount = booking.totalPrice;
        console.log('✅ Refund processed:', refundResult);
      } catch (refundError) {
        console.error('⚠️ Refund failed:', refundError.message);
        // Continue with cancellation even if refund fails
      }
    }

    // Cancel booking using built-in method
    await booking.cancel(reason);
    console.log('✅ Booking cancelled:', bookingId);

    return {
      success: true,
      booking: booking.toObject(),
      message: 'Booking cancelled successfully',
      refundProcessed: booking.paymentVerified
    };

  } catch (error) {
    throw new AppError(`Error cancelling booking: ${error.message}`, 500);
  }
};

/**
 * Get payment receipt
 */
exports.getPaymentReceipt = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId)
      .populate('userId', 'name email phone')
      .populate('eventId', 'name date location');

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    if (!booking.paymentVerified) {
      throw new AppError('Payment not verified yet', 400);
    }

    return {
      success: true,
      receipt: {
        bookingId: booking._id,
        orderId: booking.paymentOrder?.orderId,
        razorpayOrderId: booking.razorpayOrderId,
        razorpayPaymentId: booking.razorpayPaymentId,
        user: {
          name: booking.userId.name,
          email: booking.userId.email,
          phone: booking.userId.phone
        },
        event: {
          name: booking.eventId.name,
          date: booking.eventId.date,
          location: booking.eventId.location
        },
        booking: {
          seatType: booking.seatType,
          quantity: booking.quantity,
          pricePerSeat: booking.pricePerSeat,
          totalPrice: booking.totalPrice
        },
        payment: {
          method: booking.paymentMethod,
          status: booking.paymentStatus,
          verified: booking.paymentVerified,
          paidAt: booking.confirmedAt
        },
        ticketNumbers: booking.ticketNumbers,
        bookedAt: booking.bookedAt
      }
    };

  } catch (error) {
    throw new AppError(`Error generating receipt: ${error.message}`, 500);
  }
};
/**
 * Clean up expired temporary bookings and unlock their seats
 * Called periodically to maintain seat inventory accuracy
 */
exports.cleanupExpiredBookings = async () => {
  try {
    console.log('🧹 Cleaning up expired temporary bookings...');
    
    const now = new Date();
    const expiredBookings = await Booking.find({
      status: 'temporary',
      expiresAt: { $lt: now }
    });

    console.log(`📋 Found ${expiredBookings.length} expired bookings`);

    for (const booking of expiredBookings) {
      try {
        console.log('🔄 Processing expired booking:', booking._id);
        
        // Unlock seats in inventory
        const Event = require('../events/event.model').default || require('../events/event.model');
        const event = await Event.findById(booking.eventId);
        
        if (event) {
          const seatingIndex = event.seatings.findIndex(
            s => s._id.toString() === booking.seatingId.toString()
          );
          
          if (seatingIndex !== -1) {
            const seating = event.seatings[seatingIndex];
            seating.lockedSeats = Math.max(0, seating.lockedSeats - booking.quantity);
            await event.save();
            console.log('🔓 Seats unlocked:', {
              unlocked: booking.quantity,
              totalLocked: seating.lockedSeats,
              bookingId: booking._id
            });
          }
        }
        
        // Mark booking as expired/cancelled
        booking.status = 'cancelled';
        booking.cancellationReason = 'Payment timeout - seat lock expired after 5 minutes';
        booking.paymentStatus = 'failed';
        await booking.save();
        console.log('✅ Expired booking marked as cancelled:', booking._id);
        
      } catch (expiredError) {
        console.error('❌ Error processing expired booking:', expiredError.message);
      }
    }
    
    console.log(`✅ Cleanup completed: ${expiredBookings.length} bookings processed`);
    return expiredBookings.length;
    
  } catch (error) {
    console.error('❌ Error in cleanupExpiredBookings:', error.message);
  }
};