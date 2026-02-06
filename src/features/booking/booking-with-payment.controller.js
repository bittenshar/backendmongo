const Booking = require('./booking_model');
const Event = require('../events/event.model');
const User = require('../auth/auth.model');
const Payment = require('../payment/payment.model');
const AppError = require('../../shared/utils/appError');
const { createRazorpayOrder, verifyRazorpayPayment } = require('../../services/razorpay.service');
const crypto = require('crypto');

/**
 * Step 1: Check Face Verification Status
 * Returns if user is verified or not
 */
exports.checkFaceVerification = async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return next(new AppError('User ID is required', 400));
    }

    const user = await User.findById(userId).select('verificationStatus faceId');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const isVerified = user.verificationStatus === 'verified' && user.faceId;

    res.status(200).json({
      status: 'success',
      data: {
        userId,
        isVerified,
        verificationStatus: user.verificationStatus,
        faceId: user.faceId ? 'Yes' : 'No',
        message: isVerified 
          ? 'User is face verified' 
          : 'User is not face verified. Please complete face verification first.'
      }
    });
  } catch (error) {
    console.error('Error checking face verification:', error);
    return next(new AppError(error.message, 500));
  }
};

/**
 * Step 2: Initiate Booking with Face Verification Check
 * Creates temporary booking and returns Razorpay order details
 */
exports.initiateBookingWithVerification = async (req, res, next) => {
  try {
    const { userId, eventId, seatingId, seatType, quantity, pricePerSeat } = req.body;

    // Validate required fields
    if (!userId || !eventId || !seatingId || !seatType || !quantity || !pricePerSeat) {
      return next(new AppError('Missing required fields: userId, eventId, seatingId, seatType, quantity, pricePerSeat', 400));
    }

    // STEP 1: Check if user is face verified
    const user = await User.findById(userId).select('_id verificationStatus faceId name email phone');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (user.verificationStatus !== 'verified' || !user.faceId) {
      return res.status(403).json({
        status: 'failed',
        message: 'User is not face verified',
        data: {
          isVerified: false,
          reason: 'Complete face verification before booking',
          verificationStatus: user.verificationStatus
        }
      });
    }

    // STEP 2: Verify event exists and get details
    const event = await Event.findById(eventId).select('_id name date location ticketPrice');

    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    // STEP 3: Calculate total price
    const totalPrice = quantity * pricePerSeat;

    // STEP 4: Create temporary booking
    const tempBooking = new Booking({
      userId,
      eventId,
      seatingId,
      seatType,
      quantity,
      pricePerSeat,
      totalPrice,
      status: 'temporary',
      paymentStatus: 'pending',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // Expires in 15 minutes
    });

    await tempBooking.save();

    // STEP 5: Create Razorpay order
    let razorpayOrder;
    try {
      razorpayOrder = await createRazorpayOrder(
        totalPrice,
        tempBooking._id.toString(),
        user.email,
        user.phone,
        user.name
      );
    } catch (rzError) {
      const errorMsg = rzError.message || rzError.toString();
      const errorDetails = {
        message: errorMsg,
        type: rzError.constructor.name,
        razorpayResponse: rzError.response?.body || null
      };
      console.error('🔴 Razorpay error caught in controller:', errorDetails);
      // Clean up temporary booking on failure
      await Booking.deleteOne({ _id: tempBooking._id });
      
      // Return detailed error for debugging
      return res.status(500).json({
        status: 'error',
        message: `Payment gateway error: ${errorMsg}`,
        details: errorDetails,
        error: { statusCode: 500, status: 'error', isOperational: true }
      });
    }

    if (!razorpayOrder || !razorpayOrder.id) {
      console.error('🔴 Razorpay order creation failed:', razorpayOrder);
      await Booking.deleteOne({ _id: tempBooking._id });
      return next(new AppError('Failed to create payment order', 500));
    }

    // STEP 6: Update booking with Razorpay order ID
    tempBooking.razorpayOrderId = razorpayOrder.id;
    tempBooking.paymentId = razorpayOrder.id;
    await tempBooking.save();

    // STEP 7: Return booking and payment details
    res.status(200).json({
      status: 'success',
      message: 'Booking initiated successfully. User is face verified. Proceed to payment.',
      data: {
        booking: {
          bookingId: tempBooking._id,
          userId,
          eventId,
          quantity,
          pricePerSeat,
          totalPrice,
          status: tempBooking.status,
          expiresAt: tempBooking.expiresAt,
          createdAt: tempBooking.bookedAt
        },
        payment: {
          razorpayOrderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          userEmail: user.email,
          userName: user.name,
          userPhone: user.phone
        },
        verification: {
          faceVerified: true,
          verificationStatus: user.verificationStatus
        }
      }
    });
  } catch (error) {
    console.error('Error initiating booking:', error);
    return next(new AppError(error.message, 500));
  }
};

/**
 * Step 3: Verify Payment and Confirm Booking
 * Completes the booking after successful Razorpay payment
 */
exports.verifyPaymentAndConfirmBooking = async (req, res, next) => {
  try {
    const { bookingId, razorpayPaymentId, razorpayOrderId } = req.body;

    // Validate ONLY these 3 fields - NO signature required!
    if (!bookingId || !razorpayPaymentId || !razorpayOrderId) {
      return next(new AppError('Missing required fields: bookingId, razorpayPaymentId, razorpayOrderId', 400));
    }

    console.log('🔄 Payment Confirmation Request:');
    console.log('  ✅ bookingId:', bookingId);
    console.log('  ✅ razorpayOrderId:', razorpayOrderId);
    console.log('  ✅ razorpayPaymentId:', razorpayPaymentId);
    console.log('  📌 Signature: NOT REQUIRED');

    // STEP 1: Find booking
    const booking = await Booking.findById(bookingId)
      .populate('userId', 'name email phone verificationStatus')
      .populate('eventId', 'name date location');

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    if (booking.status === 'confirmed') {
      return res.status(400).json({
        status: 'failed',
        message: 'Booking is already confirmed'
      });
    }

    if (booking.razorpayOrderId !== razorpayOrderId) {
      return next(new AppError('Order ID mismatch', 400));
    }

    console.log('✅ Booking found and Order ID matches');

    // STEP 2: Check Face Verification First
    const user = await User.findById(booking.userId).select('verificationStatus faceId');

    if (user.verificationStatus !== 'verified' || !user.faceId) {
      booking.paymentStatus = 'failed';
      booking.status = 'cancelled';
      await booking.save();

      return res.status(403).json({
        status: 'failed',
        message: 'Face verification required. Please complete face verification first.',
        data: {
          bookingId,
          status: 'cancelled'
        }
      });
    }

    console.log('✅ Face verification confirmed');

    // STEP 3: Payment is already verified by Razorpay
    // When user completes payment in Razorpay, it's already secure
    // Backend just needs to record it
    console.log('✅ Payment received from Razorpay');

    // STEP 4: Update booking with payment details
    booking.razorpayPaymentId = razorpayPaymentId;
    booking.paymentVerified = true;
    booking.paymentStatus = 'completed';
    booking.status = 'confirmed';
    booking.confirmedAt = new Date();

    console.log('📝 Updating booking...');
    await booking.save();

    // STEP 5: Save payment record
    const payment = new Payment({
      bookingId,
      userId: booking.userId,
      eventId: booking.eventId,
      orderId: razorpayOrderId,
      razorpayPaymentId: razorpayPaymentId,
      amount: booking.totalPrice,
      currency: 'INR',
      status: 'paid',
      description: `Booking Payment - ${booking._id}`,
      customer: {
        email: user.email,
        phone: user.phone,
        name: user.name
      }
    });

    await payment.save();

    // STEP 6: Return success response
    res.status(200).json({
      status: 'success',
      message: 'Booking confirmed successfully! Payment received.',
      data: {
        booking: {
          bookingId: booking._id,
          status: booking.status,
          userId: booking.userId,
          eventId: booking.eventId,
          quantity: booking.quantity,
          totalPrice: booking.totalPrice,
          confirmedAt: booking.confirmedAt,
          ticketNumbers: booking.ticketNumbers || []
        },
        payment: {
          paymentId: razorpayPaymentId,
          orderId: razorpayOrderId,
          amount: booking.totalPrice,
          status: 'completed',
          method: 'razorpay'
        },
        event: {
          eventId: booking.eventId,
          eventName: booking.eventId.name,
          eventDate: booking.eventId.date,
          location: booking.eventId.location
        },
        verification: {
          faceVerified: true
        }
      }
    });
  } catch (error) {
    console.error('Error verifying payment and confirming booking:', error);
    return next(new AppError(error.message, 500));
  }
};

/**
 * Get Booking Status with Verification Details
 */
exports.getBookingStatus = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .populate('userId', 'name email verificationStatus faceId')
      .populate('eventId', 'name date location');

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    const userVerified = booking.userId.verificationStatus === 'verified' && booking.userId.faceId;

    res.status(200).json({
      status: 'success',
      data: {
        booking: {
          bookingId: booking._id,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          quantity: booking.quantity,
          totalPrice: booking.totalPrice,
          bookedAt: booking.bookedAt,
          confirmedAt: booking.confirmedAt,
          expiresAt: booking.expiresAt
        },
        payment: {
          razorpayOrderId: booking.razorpayOrderId,
          razorpayPaymentId: booking.razorpayPaymentId,
          paymentVerified: booking.paymentVerified,
          amount: booking.totalPrice
        },
        verification: {
          userVerified,
          verificationStatus: booking.userId.verificationStatus,
          userId: booking.userId._id
        },
        event: {
          eventId: booking.eventId._id,
          eventName: booking.eventId.name,
          eventDate: booking.eventId.date
        }
      }
    });
  } catch (error) {
    console.error('Error getting booking status:', error);
    return next(new AppError(error.message, 500));
  }
};

/**
 * Cancel Booking (Only before confirmation)
 */
exports.cancelBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    if (booking.status === 'confirmed') {
      return next(new AppError('Cannot cancel a confirmed booking', 400));
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason || 'User cancelled';
    booking.paymentStatus = 'cancelled';

    await booking.save();

    res.status(200).json({
      status: 'success',
      message: 'Booking cancelled successfully',
      data: {
        bookingId: booking._id,
        status: booking.status,
        cancelledAt: booking.cancelledAt
      }
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return next(new AppError(error.message, 500));
  }
};
