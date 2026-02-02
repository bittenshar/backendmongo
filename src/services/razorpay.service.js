const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
let razorpay = null;

const initializeRazorpay = () => {
  if (razorpay) return razorpay;

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured');
  }

  try {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('✅ Razorpay initialized for booking payment');
    return razorpay;
  } catch (error) {
    console.error('❌ Failed to initialize Razorpay:', error.message);
    throw error;
  }
};

/**
 * Calculate convenience fee based on amount and percentage
 * @param {number} baseAmount - Base amount in rupees
 * @param {number} feePercentage - Fee percentage (e.g., 2.36 for 2.36%). Defaults to env RAZORPAY_CONVENIENCE_FEE_PERCENTAGE
 * @param {number} gstPercentage - GST percentage on fee (e.g., 18 for 18%). Defaults to env RAZORPAY_GST_PERCENTAGE
 * @returns {Object} { baseAmount, convenienceFee, gstOnFee, totalFee, totalAmount }
 */
exports.calculateConvenienceFee = (baseAmount, feePercentage, gstPercentage) => {
  // Use provided values or fall back to environment variables or defaults
  const percentage = feePercentage || parseFloat(process.env.RAZORPAY_CONVENIENCE_FEE_PERCENTAGE || 2.36);
  const gstPercent = gstPercentage || parseFloat(process.env.RAZORPAY_GST_PERCENTAGE || 18);
  
  // Calculate convenience fee (no rounding)
  const convenienceFee = (baseAmount * percentage) / 100;
  
  // Calculate GST on convenience fee (18% of fee)
  const gstOnFee = (convenienceFee * gstPercent) / 100;
  
  // Total fee (fee + GST)
  const totalFee = convenienceFee + gstOnFee;
  
  // Total amount to be paid
  const totalAmount = baseAmount + totalFee;
  
  console.log('💰 Convenience Fee Calculation (with GST):', {
    baseAmount,
    feePercentage: `${percentage}%`,
    convenienceFee: parseFloat(convenienceFee.toFixed(2)),
    gstPercentage: `${gstPercent}%`,
    gstOnFee: parseFloat(gstOnFee.toFixed(2)),
    totalFee: parseFloat(totalFee.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2))
  });
  
  return { 
    baseAmount, 
    convenienceFee: parseFloat(convenienceFee.toFixed(2)), 
    gstOnFee: parseFloat(gstOnFee.toFixed(2)), 
    totalFee: parseFloat(totalFee.toFixed(2)), 
    totalAmount: parseFloat(totalAmount.toFixed(2))
  };
};

/**
 * Create Razorpay order for booking
 * @param {number} amount - Amount in rupees
 * @param {string} bookingId - Booking ID
 * @param {string} email - Customer email
 * @param {string} phone - Customer phone
 * @param {string} name - Customer name
 * @returns {Promise<Object>} Razorpay order object
 */
exports.createRazorpayOrder = async (amount, bookingId, email, phone, name) => {
  try {
    const rz = initializeRazorpay();

    // Generate unique receipt
    const receipt = `BOOKING_${bookingId.substring(0, 8)}_${Date.now().toString().slice(-6)}`;

    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      receipt,
      description: `Booking Payment - ${bookingId}`,
      notes: {
        bookingId,
        type: 'booking_payment',
        timestamp: new Date().toISOString()
      }
    };

    console.log('📝 Creating Razorpay order for booking:', {
      bookingId,
      amount,
      email,
      phone
    });

    const order = await rz.orders.create(options);

    console.log('✅ Razorpay order created:', order.id);

    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
      createdAt: order.created_at
    };
  } catch (error) {
    console.error('❌ Error creating Razorpay order');
    console.error('   Full error object:', error);
    console.error('   Error keys:', Object.keys(error));
    console.error('   Error toString:', error.toString());
    
    let errorMsg = 'Unknown error';
    try {
      if (error.message) errorMsg = error.message;
      else if (error.error) errorMsg = JSON.stringify(error.error);
      else if (error.response && error.response.body) errorMsg = JSON.stringify(error.response.body);
      else errorMsg = JSON.stringify(error);
    } catch (e) {
      errorMsg = 'Unable to parse error';
    }
    
    console.error('   Parsed message:', errorMsg);
    throw new Error(`Razorpay Order Creation Failed: ${errorMsg}`);
  }
};

/**
 * Verify Razorpay payment signature (SECURE)
 * @param {string} razorpayOrderId - Razorpay order ID
 * @param {string} razorpayPaymentId - Razorpay payment ID
 * @param {string} razorpaySignature - Razorpay signature from response
 * @returns {boolean} Whether payment is verified
 */
exports.verifyRazorpayPayment = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      throw new Error('Razorpay key secret not configured');
    }

    // Create the signature source (MUST include order ID)
    const shasum = crypto.createHmac('sha256', keySecret);
    const data = `${razorpayOrderId}|${razorpayPaymentId}`;

    shasum.update(data);
    const expectedSignature = shasum.digest('hex');

    console.log('🔐 Payment Verification (SECURE):');
    console.log('  Razorpay Order ID:', razorpayOrderId);
    console.log('  Razorpay Payment ID:', razorpayPaymentId);
    console.log('  Expected Signature:', expectedSignature);
    console.log('  Provided Signature:', razorpaySignature);

    const isValid = expectedSignature === razorpaySignature;

    if (isValid) {
      console.log('✅ Payment signature verified successfully');
    } else {
      console.error('❌ Payment signature verification failed');
    }

    return isValid;
  } catch (error) {
    console.error('❌ Error verifying payment signature:', error);
    return false;
  }
};

/**
 * Fetch payment details from Razorpay
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Promise<Object>} Payment details
 */
exports.fetchPaymentDetails = async (paymentId) => {
  try {
    const rz = initializeRazorpay();

    const payment = await rz.payments.fetch(paymentId);

    console.log('✅ Fetched payment details:', paymentId);

    return {
      id: payment.id,
      orderId: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      email: payment.email,
      contact: payment.contact,
      description: payment.description,
      notes: payment.notes,
      createdAt: payment.created_at
    };
  } catch (error) {
    console.error('❌ Error fetching payment details:', error);
    throw new Error(`Failed to fetch payment details: ${error.message}`);
  }
};

/**
 * Refund payment
 * @param {string} paymentId - Razorpay payment ID
 * @param {number} amount - Amount to refund (in paise, optional - full refund if not provided)
 * @param {string} notes - Refund notes
 * @returns {Promise<Object>} Refund details
 */
exports.refundPayment = async (paymentId, amount, notes) => {
  try {
    const rz = initializeRazorpay();

    const refundOptions = {
      notes: {
        booking_refund: true,
        reason: notes || 'Booking cancelled',
        timestamp: new Date().toISOString()
      }
    };

    if (amount) {
      refundOptions.amount = Math.round(amount * 100); // Convert to paise
    }

    console.log('💰 Processing refund:', { paymentId, options: refundOptions });

    const refund = await rz.payments.refund(paymentId, refundOptions);

    console.log('✅ Refund initiated:', refund.id);

    return {
      id: refund.id,
      paymentId: refund.payment_id,
      amount: refund.amount,
      currency: refund.currency,
      status: refund.status,
      notes: refund.notes,
      createdAt: refund.created_at
    };
  } catch (error) {
    console.error('❌ Error processing refund:', error);
    throw new Error(`Failed to process refund: ${error.message}`);
  }
};

/**
 * Create Razorpay order with convenience fee
 * @param {number} baseAmount - Base amount in rupees (without fee)
 * @param {string} bookingId - Booking ID
 * @param {string} email - Customer email
 * @param {string} phone - Customer phone
 * @param {string} name - Customer name
 * @param {number} feePercentage - Fee percentage (default: from env)
 * @param {number} gstPercentage - GST percentage (default: from env)
 * @returns {Promise<Object>} Razorpay order object with fee breakdown
 */
exports.createRazorpayOrderWithFee = async (
  baseAmount,
  bookingId,
  email,
  phone,
  name,
  feePercentage,
  gstPercentage
) => {
  try {
    const rz = initializeRazorpay();

    // Calculate convenience fee with GST
    const { convenienceFee, gstOnFee, totalFee, totalAmount } = exports.calculateConvenienceFee(
      baseAmount,
      feePercentage,
      gstPercentage
    );

    // Generate unique receipt
    const receipt = `BOOKING_${bookingId.substring(0, 8)}_${Date.now().toString().slice(-6)}`;

    const options = {
      amount: Math.ceil(totalAmount * 100), // Convert to paise (ceiling for decimal values)
      currency: 'INR',
      receipt,
      description: `Booking Payment - ${bookingId}`,
      notes: {
        bookingId,
        type: 'booking_payment',
        baseAmount,
        convenienceFee,
        gstOnFee,
        totalFee,
        totalAmount,
        timestamp: new Date().toISOString()
      }
    };

    console.log('📝 Creating Razorpay order with convenience fee + GST:', {
      bookingId,
      baseAmount,
      convenienceFee,
      gstOnFee,
      totalFee,
      totalAmount,
      email,
      phone
    });

    const order = await rz.orders.create(options);

    console.log('✅ Razorpay order with fee created:', order.id);

    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      baseAmount,
      convenienceFee,
      gstOnFee,
      totalFee,
      totalAmount,
      receipt: order.receipt,
      status: order.status,
      createdAt: order.created_at
    };
  } catch (error) {
    console.error('❌ Error creating Razorpay order with fee');
    console.error('   Error message:', error.message);

    let errorMsg = 'Unknown error';
    try {
      if (error.message) errorMsg = error.message;
      else if (error.error) errorMsg = JSON.stringify(error.error);
      else if (error.response && error.response.body) errorMsg = JSON.stringify(error.response.body);
      else errorMsg = JSON.stringify(error);
    } catch (e) {
      errorMsg = 'Unable to parse error';
    }

    console.error('   Parsed message:', errorMsg);
    throw new Error(`Razorpay Order Creation Failed: ${errorMsg}`);
  }
};

module.exports = {
  initializeRazorpay,
  calculateConvenienceFee: exports.calculateConvenienceFee,
  createRazorpayOrder: exports.createRazorpayOrder,
  createRazorpayOrderWithFee: exports.createRazorpayOrderWithFee,
  verifyRazorpayPayment: exports.verifyRazorpayPayment,
  fetchPaymentDetails: exports.fetchPaymentDetails,
  refundPayment: exports.refundPayment
};
