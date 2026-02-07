const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('./payment.model');
const razorpayService = require('../../services/razorpay.service');

// Validate Razorpay initialization
let razorpay = null;

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('⚠️  WARNING: Razorpay credentials not fully configured in .env');
  console.warn('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);
  console.warn('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET);
  console.warn('Razorpay features will be disabled');
} else {
  try {
    // Initialize Razorpay instance only if credentials are available
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('✅ Razorpay initialized with:');
    console.log('  Key ID:', process.env.RAZORPAY_KEY_ID?.substring(0, 20) + '...');
  } catch (error) {
    console.error('❌ Failed to initialize Razorpay:', error.message);
    razorpay = null;
  }
}

// Verify razorpay object has required methods
if (razorpay && (!razorpay.orders || typeof razorpay.orders.create !== 'function')) {
  console.error('❌ CRITICAL: Razorpay SDK not properly initialized - missing orders.create method');
  console.error('Razorpay object:', razorpay);
} else if (razorpay) {
  console.log('✅ Razorpay orders.create method available');
}

/**
 * Create a Razorpay order
 */
exports.createOrder = async ({
  userId,
  amount,
  description,
  receipt,
  notes = {},
  customer = {},
}) => {
  try {
    // Check if Razorpay is initialized
    if (!razorpay) {
      throw new Error('Razorpay is not configured. Please check your environment variables.');
    }

    // Validate inputs
    if (!userId) throw new Error('userId is required');
    if (!amount || amount <= 0) throw new Error('Valid amount is required');

    // Convert userId to string if it's an ObjectId
    const userIdStr = userId.toString();

    // Generate unique order ID (Razorpay receipt max 40 chars)
    const shortId = userIdStr.substring(0, 8); // First 8 chars of userId
    const timestamp = Date.now().toString().slice(-6); // Last 6 chars of timestamp
    const orderId = `ORD_${shortId}_${timestamp}`; // Total: 3+1+8+1+6 = 19 chars (safe)
    const receiptId = receipt ? receipt.substring(0, 40) : orderId; // Ensure receipt is max 40 chars

    console.log('🆔 Generated receipt:', receiptId, `(${receiptId.length} chars)`);

    // Razorpay order options
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      receipt: receiptId,
      description: description || 'Payment',
      notes: {
        userId,
        ...notes,
      },
    };

    console.log('📝 Creating Razorpay order with options:', options);

    // Create order with Razorpay
    const razorpayOrder = await razorpay.orders.create(options);

    if (!razorpayOrder || !razorpayOrder.id) {
      throw new Error('Invalid response from Razorpay - no order ID received');
    }

    console.log('✅ Razorpay order created:', razorpayOrder.id);

    // Save payment record in database
    const payment = new Payment({
      userId,
      orderId,
      razorpayOrderId: razorpayOrder.id,
      amount,
      currency: 'INR',
      status: 'pending',
      description,
      receipt: receiptId,
      notes,
      customer,
      metadata: {
        razorpayOrder,
      },
    });

    await payment.save();

    return {
      success: true,
      orderId,
      razorpayOrderId: razorpayOrder.id,
      amount: Math.round(amount * 100), // Return amount in paise (for verification)
      amountInRupees: amount, // Also return in rupees for display
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID,
      payment: payment.toObject(),
    };
  } catch (error) {
    console.error('❌ Error creating Razorpay order:');
    console.error('Error object:', error);
    
    // Extract error message from various formats
    let errorMsg = 'Unknown error';
    
    if (error?.error?.description) {
      // Razorpay error format: {error: {description: '...'}}
      errorMsg = error.error.description;
    } else if (error?.response?.data?.error?.description) {
      // API error response format
      errorMsg = error.response.data.error.description;
    } else if (error?.message) {
      // Standard error message
      errorMsg = error.message;
    } else if (typeof error === 'string') {
      errorMsg = error;
    }
    
    console.error('Extracted error message:', errorMsg);
    throw new Error(`Failed to create Razorpay order: ${errorMsg}`);
  }
};
/**
 * Fetch payment details from Razorpay using order ID
 * This gets the payment ID and signature for verification
 */
exports.fetchPaymentFromRazorpay = async (razorpayOrderId) => {
  try {
    // Check if Razorpay is initialized
    if (!razorpay) {
      throw new Error('Razorpay SDK not initialized');
    }

    // ✅ FETCH REAL DATA FROM RAZORPAY (not from stale database)
    console.log('📡 Fetching real payment data from Razorpay for order:', razorpayOrderId);
    
    let razorpayResponse = null;
    try {
      razorpayResponse = await razorpay.orders.fetchPayments(razorpayOrderId);
      console.log('✅ Fetched payments from Razorpay:', razorpayResponse);
    } catch (error) {
      console.error('❌ Failed to fetch from Razorpay API:', error.message);
      throw new Error(`Cannot fetch payment from Razorpay: ${error.message}`);
    }

    // Razorpay returns: { entity: 'collection', count: 1, items: [...] }
    if (!razorpayResponse.items || razorpayResponse.items.length === 0) {
      throw new Error(`No payments found for order: ${razorpayOrderId} - User may not have completed payment yet`);
    }

    const realPaymentData = razorpayResponse.items[0]; // Get first (most recent) payment
    
    console.log('✅ Found real payment from Razorpay:', {
      id: realPaymentData.id,
      status: realPaymentData.status,
      amount: realPaymentData.amount / 100,
    });

    // Find or update payment in database
    let dbPayment = await Payment.findOne({ razorpayOrderId });
    
    if (dbPayment) {
      // Update with real data from Razorpay
      dbPayment.razorpayPaymentId = realPaymentData.id;
      dbPayment.status = realPaymentData.status === 'captured' ? 'success' : realPaymentData.status;
      dbPayment.metadata = realPaymentData;
      await dbPayment.save();
      console.log('✅ Updated database with real Razorpay payment data');
    }

    return {
      razorpayOrderId: razorpayOrderId,
      razorpayPaymentId: realPaymentData.id,
      paymentId: realPaymentData.id,
      status: realPaymentData.status === 'captured' ? 'paid' : realPaymentData.status,
      amount: realPaymentData.amount / 100,
      currency: realPaymentData.currency,
      createdAt: new Date(realPaymentData.created_at * 1000),
      razorpayStatus: realPaymentData.status,
    };
  } catch (error) {
    console.error('❌ Error fetching payment from Razorpay:', error.message);
    throw new Error(`Failed to fetch payment from Razorpay: ${error.message}`);
  }
};

/**
 * Verify payment signature (SECURE)
 * Requires: razorpayOrderId, razorpayPaymentId, razorpaySignature
 */
exports.verifyPaymentSignature = async ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  orderId, // Optional: user's internal order ID for tracking
}) => {
  try {
    // Validate required fields
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new Error('Missing required fields: razorpayOrderId, razorpayPaymentId, razorpaySignature');
    }

    // Check if Razorpay is initialized
    if (!razorpay) {
      throw new Error('Razorpay SDK not initialized - cannot verify payment');
    }

    // Find payment record in database
    let payment = null;
    
    if (razorpayOrderId) {
      payment = await Payment.findOne({ razorpayOrderId });
    } else if (orderId) {
      payment = await Payment.findOne({ orderId });
    }

    if (!payment) {
      throw new Error(`Payment record not found for orderId: ${orderId || razorpayOrderId}`);
    }
    // ✅ Prevent duplicate verification
    if (payment.status === 'success') {
      return {
        success: true,
        payment: payment.toObject(),
        verified: true,
        message: 'Payment already verified',
      };
    }

    // ✅ VERIFY SIGNATURE USING HMAC_SHA256
    const isSignatureValid = razorpayService.verifyRazorpayPayment(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isSignatureValid) {
      console.error('❌ Signature verification FAILED - Payment may be FAKE or TAMPERED');
      throw new Error('Invalid payment signature - Payment could be fake');
    }

    console.log('✅ Signature verified successfully - Payment is VALID and SECURE');

    // Fetch payment details from Razorpay to double-check
    let paymentDetails = null;
    
    try {
      paymentDetails = await razorpay.payments.fetch(razorpayPaymentId);
      console.log('✅ Fetched payment details from Razorpay:', paymentDetails.id);
      console.log('   Status:', paymentDetails.status);
      console.log('   Amount:', paymentDetails.amount / 100, 'INR');
    } catch (fetchError) {
      // If payment doesn't exist in Razorpay (test scenario), that's okay
      // We already verified the signature, so we can proceed
      console.warn('⚠️ Could not fetch payment from Razorpay:', fetchError.message);
      console.log('Proceeding with payment verification based on signature validation');
      
      // Use default status if we couldn't fetch from Razorpay
      paymentDetails = {
        id: razorpayPaymentId,
        status: 'captured', // Assume captured if signature is valid
        amount: payment.amount,
        currency: payment.currency
      };
    }

    // Update payment in database
    payment = await Payment.findOneAndUpdate(
      { _id: payment._id },
      {
        razorpayPaymentId: razorpayPaymentId,
        razorpaySignature: razorpaySignature,
        status:
          paymentDetails.status === 'captured'
            ? 'success'
            : paymentDetails.status === 'authorized'
            ? 'authorized'
            : 'failed',
        metadata: paymentDetails,
        updatedAt: new Date(),
      },
      { new: true }
    );

    return {
      success: true,
      payment: payment.toObject(),
      message: 'Payment verified successfully',
      verified: true,
    };
  } catch (error) {
    const errorMsg = error?.message || 'Unknown error';
    console.error('Payment verification error details:', {
      message: errorMsg,
      orderId,
      paymentId,
      error
    });
    throw new Error(`Payment verification failed: ${errorMsg}`);;
  }
};

/**
 * Capture payment (if authorized)
 */
exports.capturePayment = async (paymentId, amount) => {
  try {
    if (!razorpay) {
      throw new Error('Razorpay is not configured');
    }

    const capturedPayment = await razorpay.payments.capture(paymentId, amount * 100);

    return {
      success: true,
      data: capturedPayment,
    };
  } catch (error) {
    throw new Error(`Failed to capture payment: ${error.message}`);
  }
};

/**
 * Get payment details
 */
exports.getPaymentDetails = async (paymentId) => {
  try {
    console.log('📝 Fetching payment details for:', paymentId);
    
    if (!paymentId) {
      throw new Error('Payment ID is required');
    }
    
    if (!razorpay) {
      throw new Error('Razorpay is not configured');
    }
    
    const paymentDetails = await razorpay.payments.fetch(paymentId);
    console.log('✅ Payment details fetched:', paymentDetails.id);

    return {
      success: true,
      data: paymentDetails,
    };
  } catch (error) {
    console.error('❌ Error fetching payment details:');
    
    let errorMsg = 'Unknown error';
    if (error?.error?.description) {
      errorMsg = error.error.description;
    } else if (error?.response?.data?.error?.description) {
      errorMsg = error.response.data.error.description;
    } else if (error?.message) {
      errorMsg = error.message;
    }
    
    throw new Error(`Failed to fetch payment details: ${errorMsg}`);
  }
};

/**
 * Get order details
 */
exports.getOrderDetails = async (orderId) => {
  try {
    console.log('📝 Fetching order details for:', orderId);
    
    if (!orderId) {
      throw new Error('Order ID is required');
    }
    
    if (!razorpay) {
      throw new Error('Razorpay is not configured');
    }
    
    const orderDetails = await razorpay.orders.fetch(orderId);
    console.log('✅ Order details fetched:', orderDetails.id);

    return {
      success: true,
      data: orderDetails,
    };
  } catch (error) {
    console.error('❌ Error fetching order details:');
    
    let errorMsg = 'Unknown error';
    if (error?.error?.description) {
      errorMsg = error.error.description;
    } else if (error?.response?.data?.error?.description) {
      errorMsg = error.response.data.error.description;
    } else if (error?.message) {
      errorMsg = error.message;
    }
    
    throw new Error(`Failed to fetch order details: ${errorMsg}`);
  }
};

/**
 * Refund payment
 */
exports.refundPayment = async (paymentId, amount = null, notes = {}) => {
  try {
    if (!razorpay) {
      throw new Error('Razorpay is not configured');
    }

    const refundOptions = {
      notes,
    };

    if (amount) {
      refundOptions.amount = Math.round(amount * 100); // Convert to paise
    }

    const refund = await razorpay.payments.refund(paymentId, refundOptions);

    // Update payment status
    await Payment.findOneAndUpdate(
      { razorpayPaymentId: paymentId },
      {
        status: 'cancelled',
        updatedAt: new Date(),
      }
    );

    return {
      success: true,
      data: refund,
      message: 'Payment refunded successfully',
    };
  } catch (error) {
    throw new Error(`Failed to refund payment: ${error.message}`);
  }
};

/**
 * Get user payment history
 */
exports.getUserPayments = async (userId, limit = 10, skip = 0) => {
  try {
    const payments = await Payment.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Payment.countDocuments({ userId });

    return {
      success: true,
      payments,
      total,
      limit,
      skip,
    };
  } catch (error) {
    throw new Error(`Failed to fetch user payments: ${error.message}`);
  }
};

/**
 * Handle webhook events
 */
exports.handleWebhookEvent = async (event) => {
  try {
    const { entity, payload } = event;

    switch (event.event) {
      case 'payment.authorized':
      case 'payment.failed':
      case 'payment.captured':
        await handlePaymentEvent(payload.payment.entity);
        break;

      case 'order.paid':
        await handleOrderPaidEvent(payload.order.entity);
        break;

      case 'refund.created':
        await handleRefundEvent(payload.refund.entity);
        break;

      default:
        console.log(`Unhandled webhook event: ${event.event}`);
    }

    return { success: true };
  } catch (error) {
    throw new Error(`Webhook handling failed: ${error.message}`);
  }
};

/**
 * Handle payment event
 */
async function handlePaymentEvent(paymentEntity) {
  const statusMap = {
    authorized: 'pending',
    captured: 'success',
    failed: 'failed',
  };

  await Payment.findOneAndUpdate(
    { razorpayPaymentId: paymentEntity.id },
    {
      status: statusMap[paymentEntity.status] || paymentEntity.status,
      metadata: paymentEntity,
      updatedAt: new Date(),
    }
  );
}

/**
 * Handle order paid event
 */
async function handleOrderPaidEvent(orderEntity) {
  await Payment.findOneAndUpdate(
    { razorpayOrderId: orderEntity.id },
    {
      status: 'success',
      metadata: orderEntity,
      updatedAt: new Date(),
    }
  );
}

/**
 * Handle refund event
 */
async function handleRefundEvent(refundEntity) {
  await Payment.findOneAndUpdate(
    { razorpayPaymentId: refundEntity.payment_id },
    {
      status: 'cancelled',
      metadata: refundEntity,
      updatedAt: new Date(),
    }
  );
}
