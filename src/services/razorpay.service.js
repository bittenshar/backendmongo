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
 * Verify Razorpay payment signature
 * @param {string} orderId - Razorpay order ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} signature - Razorpay signature
 * @returns {boolean} Whether payment is verified
 */
exports.verifyRazorpayPayment = (orderId, paymentId, signature) => {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      throw new Error('Razorpay key secret not configured');
    }

    // Create the signature source
    const shasum = crypto.createHmac('sha256', keySecret);
    const data = `${orderId}|${paymentId}`;

    shasum.update(data);
    const expectedSignature = shasum.digest('hex');

    console.log('🔐 Payment Verification:');
    console.log('  Order ID:', orderId);
    console.log('  Payment ID:', paymentId);
    console.log('  Expected Signature:', expectedSignature);
    console.log('  Provided Signature:', signature);

    const isValid = expectedSignature === signature;

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

module.exports = {
  initializeRazorpay,
  createRazorpayOrder: exports.createRazorpayOrder,
  verifyRazorpayPayment: exports.verifyRazorpayPayment,
  fetchPaymentDetails: exports.fetchPaymentDetails,
  refundPayment: exports.refundPayment
};
