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

    // STEP 1: Get user details (face verification is optional)
    const user = await User.findById(userId).select('_id verificationStatus faceId name email phone');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Check if user is face verified (informational, not blocking)
    const isFaceVerified = user.verificationStatus === 'verified' && user.faceId;

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
      message: 'Booking initiated successfully. Proceed to payment.',
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
          razorpayKeyId: process.env.RAZORPAY_KEY_ID,
          razorpayOrderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          userEmail: user.email,
          userName: user.name,
          userPhone: user.phone
        },
        verification: {
          faceVerified: isFaceVerified,
          verificationStatus: user.verificationStatus,
          note: 'Face verification is optional for booking'
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
    const { bookingId, razorpayOrderId } = req.body;

    // VALIDATION: Only require bookingId and orderID - Payment ID will be fetched from Razorpay!
    if (!bookingId || !razorpayOrderId) {
      console.log('❌ Missing fields:', { bookingId, razorpayOrderId });
      return next(new AppError('Missing required fields: bookingId, razorpayOrderId', 400));
    }

    console.log('\n═════════════════════════════════════════');
    console.log('🔄 PAYMENT CONFIRMATION START');
    console.log('═════════════════════════════════════════');
    console.log('📦 Received:');
    console.log('   • bookingId:', bookingId);
    console.log('   • razorpayOrderId:', razorpayOrderId);
    console.log('   ℹ️  paymentId will be fetched from Razorpay API');

    // STEP 1: Find and validate booking
    console.log('\n📍 STEP 1: Finding booking...');
    console.log('   🔍 Searching with bookingId:', bookingId);
    console.log('   🔍 Searching with razorpayOrderId:', razorpayOrderId);
    
    // Try to find booking by bookingId (either as MongoDB _id or as custom ID)
    let booking;
    try {
      // First, try as MongoDB ObjectId
      booking = await Booking.findById(bookingId)
        .populate('userId', 'name email phone verificationStatus faceId')
        .populate('eventId', 'name date location');
      
      if (booking) {
        console.log('   ✅ Found by MongoDB _id');
      }
    } catch (mongoErr) {
      // If not a valid ObjectId, it might be a custom ID - just continue with null booking
      console.log('   ℹ️  Not a valid MongoDB ObjectId, trying razorpayOrderId search...');
      booking = null;
    }

    // If not found by MongoDB _id, try searching by razorpayOrderId
    if (!booking) {
      console.log('   🔍 Querying: Booking.findOne({ razorpayOrderId: "' + razorpayOrderId + '" })');
      booking = await Booking.findOne({ razorpayOrderId })
        .populate('userId', 'name email phone verificationStatus faceId')
        .populate('eventId', 'name date location');
      
      if (booking) {
        console.log('   ✅ Found by razorpayOrderId');
      } else {
        console.log('   ❌ Not found by razorpayOrderId');
        
        // Debug: List all bookings in database
        const allBookings = await Booking.find().select('_id razorpayOrderId status').limit(5);
        console.log('   📊 Sample bookings in database:');
        allBookings.forEach((b, i) => {
          console.log(`      ${i+1}. MongoDB _id: ${b._id}, razorpayOrderId: ${b.razorpayOrderId}, status: ${b.status}`);
        });
      }
    }

    if (!booking) {
      console.log('❌ Booking not found with either method');
      console.log('💡 Make sure you completed Step 1 first: POST /api/booking-payment/initiate-booking-with-verification');
      return next(new AppError('Booking not found. Please complete booking initiation first.', 404));
    }
    console.log('✅ Booking found');

    if (booking.status === 'confirmed') {
      console.log('⚠️  Booking already confirmed');
      return res.status(400).json({
        status: 'failed',
        message: 'Booking is already confirmed',
        data: { bookingId, status: 'confirmed' }
      });
    }

    if (booking.razorpayOrderId !== razorpayOrderId) {
      console.log('❌ Order ID mismatch');
      console.log('   Expected (in booking):', booking.razorpayOrderId);
      console.log('   Received (in request):', razorpayOrderId);
      return res.status(400).json({
        status: 'fail',
        message: 'Order ID mismatch',
        data: {
          bookingId,
          expected: booking.razorpayOrderId,
          received: razorpayOrderId,
          hint: 'Use the exact razorpayOrderId from Step 1 response'
        }
      });
    }
    console.log('✅ Order ID matches');

    // STEP 2: Check Face Verification (Optional)
    console.log('\n📍 STEP 2: Checking face verification status (optional)...');
    const user = booking.userId;
    const isFaceVerified = user.verificationStatus === 'verified' && user.faceId;
    
    if (isFaceVerified) {
      console.log('✅ Face verification confirmed');
    } else {
      console.log('⚠️  Face verification not completed (optional, booking can proceed)');
      console.log('   Status:', user.verificationStatus, '| FaceId:', user.faceId ? 'Yes' : 'No');
    }

    // STEP 3: Fetch payment from Razorpay using ORDER ID (NOT paymentId)
    console.log('\n📍 STEP 3: Fetching payment details from Razorpay...');
    let razorpayPaymentId = null;
    let paymentDetails = null;

    try {
      const { fetchPaymentByOrderId } = require('../../services/razorpay.service');
      paymentDetails = await fetchPaymentByOrderId(razorpayOrderId);
      razorpayPaymentId = paymentDetails.id;
      
      console.log('✅ Payment found via Razorpay API');
      console.log('   Payment ID:', razorpayPaymentId);
      console.log('   Status:', paymentDetails.status);
      console.log('   Amount:', paymentDetails.amount / 100, 'INR');
    } catch (apiError) {
      console.error('❌ Failed to fetch payment from Razorpay:', apiError.message);
      booking.paymentStatus = 'failed';
      booking.status = 'cancelled';
      await booking.save();

      return res.status(400).json({
        status: 'failed',
        message: 'Payment verification failed - could not fetch payment from Razorpay',
        data: {
          bookingId,
          status: 'cancelled',
          error: apiError.message
        }
      });
    }

    // STEP 4: Verify payment status
    console.log('\n📍 STEP 4: Verifying payment status...');
    if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
      console.log('❌ Payment not captured. Status:', paymentDetails.status);
      booking.paymentStatus = 'failed';
      booking.status = 'cancelled';
      await booking.save();

      return res.status(400).json({
        status: 'failed',
        message: `Payment verification failed - status: ${paymentDetails.status}`,
        data: { bookingId, status: 'cancelled' }
      });
    }
    console.log('✅ Payment captured');

    // STEP 5: Verify amount
    console.log('\n📍 STEP 5: Verifying payment amount...');
    const expectedAmount = booking.totalPrice * 100; // Convert to paise
    if (paymentDetails.amount !== expectedAmount) {
      console.log('❌ Amount mismatch');
      console.log('   Expected:', expectedAmount, 'paise');
      console.log('   Got:', paymentDetails.amount, 'paise');
      booking.paymentStatus = 'failed';
      booking.status = 'cancelled';
      await booking.save();

      return res.status(400).json({
        status: 'failed',
        message: 'Payment amount mismatch',
        data: { bookingId, status: 'cancelled' }
      });
    }
    console.log('✅ Amount verified');

    // STEP 6: Confirm booking
    console.log('\n📍 STEP 6: Confirming booking...');
    booking.razorpayPaymentId = razorpayPaymentId;
    booking.paymentVerified = true;
    booking.paymentStatus = 'completed';
    booking.status = 'confirmed';
    booking.confirmedAt = new Date();

    await booking.save();
    console.log('✅ Booking updated in database');

    // STEP 7: Save payment record
    console.log('\n📍 STEP 7: Saving payment record...');
    const payment = new Payment({
      bookingId,
      userId: user._id,
      eventId: booking.eventId._id,
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
    console.log('✅ Payment record saved');

    // STEP 8: Generate ticket
    console.log('\n📍 STEP 8: Generating ticket...');
    let ticket = null;
    let qrCodeDataUrl = null;
    
    try {
      // Generate unique ticket number
      const ticketNumber = `TKT-${booking._id.toString().slice(-8).toUpperCase()}-${Date.now().toString().slice(-6)}`;
      
      // Generate QR code for ticket
      const { generateQRCodeDataURL } = require('../../shared/services/ticket-qrcode.service');
      qrCodeDataUrl = await generateQRCodeDataURL(ticketNumber);
      
      // Create ticket object
      ticket = {
        ticketNumber,
        bookingId: booking._id,
        eventId: booking.eventId._id,
        userId: user._id,
        eventName: booking.eventId.name,
        eventDate: booking.eventId.date,
        location: booking.eventId.location,
        seatType: booking.seatType,
        quantity: booking.quantity,
        ticketGeneratedAt: new Date(),
        qrCode: qrCodeDataUrl
      };
      
      console.log('✅ Ticket generated successfully');
      console.log(`   Ticket Number: ${ticketNumber}`);
    } catch (ticketError) {
      console.warn('⚠️  Ticket generation failed (non-critical):', ticketError.message);
      // Ticket generation failure should not block booking confirmation
    }

    // STEP 9: Return success
    console.log('\n✅ PAYMENT CONFIRMATION COMPLETE');
    console.log('═════════════════════════════════════════\n');
    
    res.status(200).json({
      status: 'success',
      message: 'Booking confirmed successfully! Ticket generated.',
      data: {
        booking: {
          bookingId: booking._id,
          status: booking.status,
          quantity: booking.quantity,
          totalPrice: booking.totalPrice,
          confirmedAt: booking.confirmedAt
        },
        payment: {
          paymentId: razorpayPaymentId,
          orderId: razorpayOrderId,
          amount: booking.totalPrice,
          status: 'completed',
          verifiedVia: 'razorpay_api'
        },
        ticket: ticket ? {
          ticketNumber: ticket.ticketNumber,
          qrCode: ticket.qrCode,
          eventName: ticket.eventName,
          eventDate: ticket.eventDate,
          location: ticket.location,
          seatType: ticket.seatType,
          quantity: ticket.quantity,
          ticketGeneratedAt: ticket.ticketGeneratedAt,
          note: 'QR Code can be scanned for ticket validation'
        } : { error: 'Ticket generation failed - booking still confirmed' },
        verification: {
          faceVerified: isFaceVerified,
          verificationStatus: user.verificationStatus,
          note: 'Face verification is optional for booking'
        },
        event: {
          eventName: booking.eventId.name,
          eventDate: booking.eventId.date,
          location: booking.eventId.location
        }
      }
    });
  } catch (error) {
    console.error('\n❌ ===== ERROR =====');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('==================\n');
    return next(new AppError(error.message || 'Payment verification failed', 500));
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
