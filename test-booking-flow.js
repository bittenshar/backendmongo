/**
 * SIMPLE BOOKING TEST - without nodemon restarts
 */

const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:3000/api';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'VOQbBQugnE0Um2qljl5MVswR';

let testData = {
  userId: null,
  token: null,
  eventId: null,
  bookingId: null,
};

// Create axios instance with error handling
const api = axios.create({ 
  baseURL: BASE_URL,
  timeout: 5000 
});

async function runTest() {
  console.log('\n============================================================');
  console.log('🎯 BOOKING WITH FACE VERIFICATION + RAZORPAY PAYMENT TEST');
  console.log('============================================================\n');

  try {
    // Step 1: Register/Login user
    console.log('1️⃣  STEP 1: User Registration/Login');
    console.log('-------------------------------------');
    
    const loginPayload = {
      email: 'test@example.com',
      password: 'test123'
    };

    let response = await api.post('/auth/login', loginPayload);
    
    if (response.data.status === 'success') {
      testData.token = response.data.token;
      testData.userId = response.data.data.user._id;
      console.log('✅ User logged in successfully');
      console.log('   User ID:', testData.userId);
    } else if (response.data.status === 'fail') {
      console.log('⚠️  User not found, registering new user...');
      
      const registerPayload = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'test123'
      };
      
      response = await api.post('/auth/signup', registerPayload);
      testData.token = response.data.token;
      testData.userId = response.data.data.user._id;
      console.log('✅ User registered successfully');
      console.log('   User ID:', testData.userId);
    }

    // Step 2: Check face verification
    console.log('\n2️⃣  STEP 2: Check Face Verification Status');
    console.log('-------------------------------------');

    response = await api.post(
      '/booking-payment/verify-face-status',
      { userId: testData.userId },
      { headers: { Authorization: `Bearer ${testData.token}` } }
    );

    console.log('✅ Face verification response received');
    console.log('   Status:', response.data.data?.verificationStatus || 'not verified');
    console.log('   Face ID present:', !!response.data.data?.faceId);

    // Step 3: Initiate booking
    console.log('\n3️⃣  STEP 3: Initiate Booking with Razorpay Order');
    console.log('-------------------------------------');

    const bookingPayload = {
      eventId: 'event-123',
      eventName: 'Concert 2026',
      quantity: 2,
      amount: 500
    };

    response = await api.post(
      '/booking-payment/initiate-with-verification',
      bookingPayload,
      { headers: { Authorization: `Bearer ${testData.token}` } }
    );

    if (response.data.status === 'success') {
      testData.bookingId = response.data.data.booking._id;
      testData.razorpayOrderId = response.data.data.razorpayOrderId;
      
      console.log('✅ Booking initiated successfully');
      console.log('   Booking ID:', testData.bookingId);
      console.log('   Razorpay Order ID:', testData.razorpayOrderId);
      console.log('   Status:', response.data.data.booking.status);
      console.log('   Amount:', response.data.data.booking.amount);
    }

    // Step 4: Simulate payment and verify
    console.log('\n4️⃣  STEP 4: Simulate Payment & Generate Signature');
    console.log('-------------------------------------');

    // Simulate Razorpay payment response
    const razorpayPaymentId = 'pay_' + Math.random().toString(36).substr(2, 14).toUpperCase();
    
    // Create HMAC signature
    const signatureData = `${testData.razorpayOrderId}|${razorpayPaymentId}`;
    const signature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(signatureData)
      .digest('hex');

    console.log('✅ Payment simulation created');
    console.log('   Payment ID:', razorpayPaymentId);
    console.log('   Signature:', signature.substring(0, 20) + '...');

    // Step 5: Confirm booking with payment
    console.log('\n5️⃣  STEP 5: Confirm Booking with Payment Verification');
    console.log('-------------------------------------');

    const confirmPayload = {
      bookingId: testData.bookingId,
      razorpayOrderId: testData.razorpayOrderId,
      razorpayPaymentId: razorpayPaymentId,
      razorpaySignature: signature
    };

    response = await api.post(
      '/booking-payment/confirm-booking',
      confirmPayload,
      { headers: { Authorization: `Bearer ${testData.token}` } }
    );

    if (response.data.status === 'success') {
      console.log('✅ Booking confirmed successfully!');
      console.log('   Final Status:', response.data.data.booking.status);
      console.log('   Payment Status:', response.data.data.payment?.status);
      console.log('   Total Amount:', response.data.data.booking.amount);
    }

    // Step 6: Get booking status
    console.log('\n6️⃣  STEP 6: Retrieve Final Booking Status');
    console.log('-------------------------------------');

    response = await api.get(
      `/booking-payment/status/${testData.bookingId}`,
      { headers: { Authorization: `Bearer ${testData.token}` } }
    );

    console.log('✅ Final booking details retrieved');
    console.log('   Booking ID:', response.data.data.booking._id);
    console.log('   Status:', response.data.data.booking.status);
    console.log('   Amount:', response.data.data.booking.amount);
    console.log('   User ID:', response.data.data.booking.userId);
    console.log('   Created At:', new Date(response.data.data.booking.createdAt).toLocaleString());

    console.log('\n============================================================');
    console.log('🎉 COMPLETE BOOKING FLOW TEST PASSED SUCCESSFULLY!');
    console.log('============================================================\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.response?.data?.message || error.message);
    
    if (error.response?.data?.stack) {
      console.error('\nStack trace:');
      console.error(error.response.data.stack);
    }
    
    process.exit(1);
  }
}

// Wait for server to be ready
setTimeout(runTest, 2000);
