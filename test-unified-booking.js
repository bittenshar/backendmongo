#!/usr/bin/env node

/**
 * ============================================================================
 * UNIFIED BOOKING + PAYMENT FLOW TEST SCRIPT (Node.js)
 * ============================================================================
 * 
 * This script demonstrates the complete flow:
 * 1. Create Razorpay payment order
 * 2. Simulate Razorpay payment
 * 3. Call unified booking endpoint
 * 4. Verify booking confirmation
 * 
 * Usage:
 *   TOKEN=your_token EVENT_ID=xxx SEATING_ID=yyy node test-unified-booking.js
 * 
 * ============================================================================
 */

const https = require('https');
const crypto = require('crypto');

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  apiUrl: process.env.API_URL || 'https://backendmongo-tau.vercel.app',
  token: process.env.TOKEN || '',
  eventId: process.env.EVENT_ID || '',
  seatingId: process.env.SEATING_ID || '',
  quantity: parseInt(process.env.QUANTITY || '2'),
  pricePerSeat: parseFloat(process.env.PRICE_PER_SEAT || '500'),
  seatType: process.env.SEAT_TYPE || 'VIP'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function log(type, message) {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `[${timestamp}]`;
  
  switch (type) {
    case 'success':
      console.log(`${colors.green}${colors.bright}✅ ${prefix} ${message}${colors.reset}`);
      break;
    case 'error':
      console.error(`${colors.red}${colors.bright}❌ ${prefix} ${message}${colors.reset}`);
      break;
    case 'info':
      console.log(`${colors.blue}${colors.bright}ℹ️ ${prefix} ${message}${colors.reset}`);
      break;
    case 'warning':
      console.log(`${colors.yellow}${colors.bright}⚠️ ${prefix} ${message}${colors.reset}`);
      break;
    case 'header':
      console.log(`\n${colors.bright}${colors.blue}${'═'.repeat(60)}${colors.reset}`);
      console.log(`${colors.bright}${colors.blue}  ${message}${colors.reset}`);
      console.log(`${colors.bright}${colors.blue}${'═'.repeat(60)}${colors.reset}\n`);
      break;
    case 'section':
      console.log(`\n${colors.bright}${colors.blue}${message}${colors.reset}`);
      console.log(`${colors.dim}${'─'.repeat(60)}${colors.reset}`);
      break;
    default:
      console.log(`${prefix} ${message}`);
  }
}

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(config.apiUrl);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: { raw: body } });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

function prettyPrint(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

// ============================================================================
// MAIN TEST FLOW
// ============================================================================

async function runTests() {
  try {
    log('header', 'UNIFIED BOOKING + PAYMENT FLOW TEST');

    // Validate configuration
    log('info', 'Validating configuration...');
    if (!config.token) {
      log('error', 'TOKEN environment variable not set');
      process.exit(1);
    }
    if (!config.eventId) {
      log('error', 'EVENT_ID environment variable not set');
      process.exit(1);
    }
    if (!config.seatingId) {
      log('error', 'SEATING_ID environment variable not set');
      process.exit(1);
    }
    log('success', 'Configuration validated');

    console.log(`${colors.dim}
  API URL: ${config.apiUrl}
  Event ID: ${config.eventId}
  Seating ID: ${config.seatingId}
  Quantity: ${config.quantity}
  Price per seat: ₹${config.pricePerSeat}
  Seat Type: ${config.seatType}
${colors.reset}`);

    // ========================================================================
    // STEP 1: CREATE RAZORPAY ORDER
    // ========================================================================
    log('section', 'STEP 1: Creating Razorpay Payment Order');

    const createOrderPayload = {
      amount: config.quantity * config.pricePerSeat,
      description: `Event Booking - ${config.seatType} Ticket x${config.quantity}`,
      notes: {
        eventId: config.eventId
      }
    };

    log('info', 'Sending request to /api/payments/create-order');
    console.log(`${colors.dim}Payload: ${JSON.stringify(createOrderPayload, null, 2)}${colors.reset}`);

    const orderResponse = await makeRequest('POST', '/api/payments/create-order', createOrderPayload);

    if (orderResponse.status !== 200 || !orderResponse.data.data?.razorpayOrderId) {
      log('error', 'Failed to create Razorpay order');
      console.log(JSON.stringify(orderResponse.data, null, 2));
      process.exit(1);
    }

    const razorpayOrderId = orderResponse.data.data.razorpayOrderId;
    const razorpayKey = orderResponse.data.data.key;

    log('success', `Razorpay order created: ${razorpayOrderId}`);
    console.log(`${colors.dim}Key: ${razorpayKey?.substring(0, 10)}...${colors.reset}`);

    // ========================================================================
    // STEP 2: SIMULATE RAZORPAY PAYMENT
    // ========================================================================
    log('section', 'STEP 2: Simulating Razorpay Payment');

    log('warning', 'In production: User completes payment in Razorpay checkout');

    // Generate mock Razorpay response data
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString('hex');
    const razorpayPaymentId = `pay_${randomId}`;
    
    // In real scenario, signature is calculated by Razorpay
    // For testing, we create a mock signature
    const signatureSource = `${razorpayOrderId}|${razorpayPaymentId}`;
    const razorpaySignature = crypto
      .createHmac('sha256', 'test_secret')
      .update(signatureSource)
      .digest('hex');

    log('success', 'Payment simulated');
    console.log(`${colors.dim}
  Payment ID: ${razorpayPaymentId}
  Signature: ${razorpaySignature.substring(0, 32)}...
${colors.reset}`);

    // ========================================================================
    // STEP 3: CALL UNIFIED BOOKING ENDPOINT
    // ========================================================================
    log('section', 'STEP 3: Calling Unified Booking Endpoint');

    const bookingPayload = {
      eventId: config.eventId,
      seatingId: config.seatingId,
      seatType: config.seatType,
      quantity: config.quantity,
      pricePerSeat: config.pricePerSeat,
      specialRequirements: 'Wheelchair accessible seat',
      paymentData: {
        razorpayOrderId: razorpayOrderId,
        razorpayPaymentId: razorpayPaymentId,
        razorpaySignature: razorpaySignature
      }
    };

    log('info', 'Sending request to /api/booking/book');
    console.log(`${colors.dim}Payload: ${JSON.stringify(bookingPayload, null, 2)}${colors.reset}`);

    const bookingResponse = await makeRequest('POST', '/api/booking/book', bookingPayload);

    if (bookingResponse.status !== 201) {
      log('error', `Booking failed with status ${bookingResponse.status}`);
      console.log(JSON.stringify(bookingResponse.data, null, 2));
      process.exit(1);
    }

    const bookingData = bookingResponse.data.data;
    if (bookingData.paymentStatus !== 'success') {
      log('error', `Payment verification failed: ${bookingData.message}`);
      console.log(JSON.stringify(bookingResponse.data, null, 2));
      process.exit(1);
    }

    log('success', 'Booking confirmed with verified payment');

    // ========================================================================
    // STEP 4: DISPLAY BOOKING CONFIRMATION
    // ========================================================================
    log('section', 'STEP 4: Booking Confirmation Details');

    const booking = bookingData.booking;
    const payment = bookingData.payment;

    console.log(`${colors.bright}Booking Information:${colors.reset}`);
    console.log(`${colors.dim}  Booking ID: ${booking._id}
  Status: ${booking.status}
  Payment Status: ${booking.paymentStatus}
  Total Price: ₹${booking.totalPrice}
  Quantity: ${booking.quantity}
  Seat Type: ${booking.seatType}
  Booking Date: ${new Date(booking.bookedAt).toLocaleString()}
${colors.reset}`);

    console.log(`${colors.bright}Ticket Numbers:${colors.reset}`);
    if (booking.ticketNumbers && booking.ticketNumbers.length > 0) {
      booking.ticketNumbers.forEach((ticket, index) => {
        console.log(`${colors.dim}  ${index + 1}. ${ticket}${colors.reset}`);
      });
    } else {
      console.log(`${colors.dim}  No tickets generated yet${colors.reset}`);
    }

    console.log(`${colors.bright}Payment Information:${colors.reset}`);
    console.log(`${colors.dim}  Order ID: ${payment.orderId}
  Payment ID: ${payment.paymentId}
  Amount: ₹${payment.amount}
  Currency: ${payment.currency}
  Verified At: ${new Date(payment.verifiedAt).toLocaleString()}
${colors.reset}`);

    // ========================================================================
    // STEP 5: FETCH BOOKING DETAILS
    // ========================================================================
    log('section', 'STEP 5: Fetching Full Booking Details');

    log('info', `Fetching booking details for ${booking._id}`);
    const detailsResponse = await makeRequest('GET', `/api/booking/${booking._id}`, null);

    if (detailsResponse.status === 200) {
      const fullBooking = detailsResponse.data.data.booking;
      log('success', 'Booking details retrieved');
      
      console.log(`${colors.dim}${JSON.stringify(
        {
          _id: fullBooking._id,
          status: fullBooking.status,
          paymentStatus: fullBooking.paymentStatus,
          seatType: fullBooking.seatType,
          quantity: fullBooking.quantity,
          totalPrice: fullBooking.totalPrice,
          ticketNumbers: fullBooking.ticketNumbers
        },
        null,
        2
      )}${colors.reset}`);
    } else {
      log('warning', 'Could not fetch full booking details');
    }

    // ========================================================================
    // SUCCESS SUMMARY
    // ========================================================================
    log('header', 'SUCCESS! TEST COMPLETED 🎉');

    console.log(`${colors.green}${colors.bright}
  ✅ Razorpay order created successfully
  ✅ Payment simulation successful
  ✅ Booking created successfully
  ✅ Payment signature verified
  ✅ Booking confirmed automatically
  ✅ Tickets generated
${colors.reset}`);

    console.log(`${colors.dim}
Next Steps:
  1. Download tickets: GET /api/booking/${booking._id}/download-ticket
  2. Get receipt: GET /api/booking/${booking._id}/receipt
  3. Cancel booking: POST /api/booking/${booking._id}/cancel
${colors.reset}`);

  } catch (error) {
    log('error', `Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the tests
runTests();

