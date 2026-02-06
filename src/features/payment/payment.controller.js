const paymentService = require('./payment.service');
const crypto = require('crypto');
const Payment = require('./payment.model');

/**
 * Create payment order
 * POST /api/payments/create-order
 */
exports.createOrder = async (req, res) => {
  try {
    const { amount, description, receipt, notes, customer, eventId, seatingId, quantity } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount',
      });
    }

    // ===== VERIFICATION STATUS CHECK =====
    console.log('🔐 Checking user verification status for user:', userId);
    try {
      const User = require('../auth/auth.model');
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found',
          code: 404
        });
      }

      // Check if user is rejected (blocked from booking)
      if (user.verificationStatus === 'rejected') {
        console.warn('❌ User verification rejected:', { userId, status: user.verificationStatus });
        return res.status(403).json({
          status: 'error',
          message: 'Your account verification was rejected. Please contact support.',
          code: 403,
          verificationStatus: user.verificationStatus
        });
      }
      
      // Allow payments for pending and verified users
      console.log('✅ User verification status OK:', { userId, status: user.verificationStatus });
    } catch (verificationError) {
      console.error('⚠️ Verification check failed:', verificationError.message);
      return res.status(500).json({
        status: 'error',
        message: 'Verification check failed'
      });
    }

    // Lock seats if eventId and seatingId provided
    if (eventId && seatingId && quantity) {
      console.log('🔒 Locking seats for payment order...');
      const Event = require('../events/event.model');
      const event = await Event.findById(eventId);
      
      if (event) {
        const seatingIndex = event.seatings.findIndex(s => s._id.toString() === seatingId.toString());
        if (seatingIndex !== -1) {
          const seating = event.seatings[seatingIndex];
          const availableSeats = seating.totalSeats - seating.seatsSold - seating.lockedSeats;
          
          if (availableSeats >= quantity) {
            seating.lockedSeats += quantity;
            await event.save();
            console.log('✅ Seats LOCKED for payment:', { 
              quantity,
              lockedSeats: seating.lockedSeats,
              seatType: seating.seatType
            });
          } else {
            console.warn('⚠️ Not enough seats to lock:', { availableSeats, requested: quantity });
          }
        }
      }
    }

    const result = await paymentService.createOrder({
      userId,
      amount,
      description,
      receipt,
      notes,
      customer: {
        email: req.user?.email || customer?.email,
        phone: req.user?.phone || customer?.phone,
        name: req.user?.name || customer?.name,
        ...customer,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Order created successfully',
      data: result,
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

/**
 * Verify payment
 * POST /api/payments/verify
 * Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature }
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: razorpayOrderId, razorpayPaymentId, razorpaySignature',
      });
    }

    const result = await paymentService.verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    res.status(200).json({
      status: 'success',
      message: 'Payment verified successfully',
      data: result,
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};

/**
 * Get payment details
 * GET /api/payments/:paymentId
 */
exports.getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const result = await paymentService.getPaymentDetails(paymentId);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    console.error('Get payment details error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

/**
 * Get order details
 * GET /api/payments/order/:orderId
 */
exports.getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await paymentService.getOrderDetails(orderId);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

/**
 * Refund payment
 * POST /api/payments/:paymentId/refund
 */
exports.refundPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, notes } = req.body;

    const result = await paymentService.refundPayment(paymentId, amount, notes);

    res.status(200).json({
      status: 'success',
      message: 'Payment refunded successfully',
      data: result,
    });
  } catch (error) {
    console.error('Refund payment error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

/**
 * Get user payment history
 * GET /api/payments/history
 */
exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit = 10, skip = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const result = await paymentService.getUserPayments(
      userId,
      parseInt(limit),
      parseInt(skip)
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

/**
 * Webhook handler
 * POST /api/payments/webhook
 */
exports.handleWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest !== req.headers['x-razorpay-signature']) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature',
      });
    }

    const event = req.body;
    await paymentService.handleWebhookEvent(event);

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

/**
 * Get payment by local orderId (database)
 * GET /api/payments/lookup/:orderId
 */
exports.getPaymentByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;

    const payment = await Payment.findOne({ orderId }).lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: payment,
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

/**
 * Get convenience fee for a given amount
 * GET /api/payments/convenience-fee?amount=1000&feePercentage=2.36&gstPercentage=18
 */
exports.getConvenienceFee = async (req, res) => {
  try {
    const razorpayService = require('../../services/razorpay.service');
    const { amount, feePercentage, gstPercentage } = req.query;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid amount. Must be greater than 0',
        code: 400
      });
    }

    const baseAmount = parseFloat(amount);
    
    // Use provided values or fall back to environment variables
    const percentage = feePercentage ? parseFloat(feePercentage) : parseFloat(process.env.RAZORPAY_CONVENIENCE_FEE_PERCENTAGE || 2.36);
    const gstPercent = gstPercentage ? parseFloat(gstPercentage) : parseFloat(process.env.RAZORPAY_GST_PERCENTAGE || 18);

    // Calculate convenience fee with GST
    const { convenienceFee, gstOnFee, totalFee, totalAmount } = razorpayService.calculateConvenienceFee(
      baseAmount,
      percentage,
      gstPercent
    );

    console.log('📊 Convenience Fee Calculation (with GST):', {
      baseAmount,
      feePercentage: percentage,
      convenienceFee,
      gstPercentage: gstPercent,
      gstOnFee,
      totalFee,
      totalAmount
    });

    res.status(200).json({
      status: 'success',
      message: 'Convenience fee calculated with GST',
      data: {
        baseAmount,
        feePercentage: percentage,
        convenienceFee,
        gstPercentage: gstPercent,
        gstOnFee,
        totalFee,
        totalAmount,
        breakdown: {
          base: baseAmount,
          convenienceFee: convenienceFee,
          gst: gstOnFee,
          total: totalAmount
        }
      }
    });
  } catch (error) {
    console.error('Get convenience fee error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

/**
 * TESTING ONLY: Generate test signature for payment verification
 * POST /api/payments/test-generate-signature
 * Body: { razorpayOrderId, razorpayPaymentId }
 */
exports.generateTestSignature = async (req, res) => {
  try {
    // Only allow in development/test environment
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        status: 'error',
        message: 'This endpoint is not available in production. Use actual Razorpay payment responses.'
      });
    }

    const { razorpayOrderId, razorpayPaymentId } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: razorpayOrderId, razorpayPaymentId'
      });
    }

    const crypto = require('crypto');
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return res.status(500).json({
        status: 'error',
        message: 'RAZORPAY_KEY_SECRET not configured'
      });
    }

    // Generate signature
    const signature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    console.log('🔐 Test Signature Generated:');
    console.log('  Order ID:', razorpayOrderId);
    console.log('  Payment ID:', razorpayPaymentId);
    console.log('  Signature:', signature);

    res.status(200).json({
      status: 'success',
      message: 'Test signature generated (development only)',
      data: {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: signature
      }
    });
  } catch (error) {
    console.error('Test signature generation error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

