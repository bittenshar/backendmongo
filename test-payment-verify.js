#!/usr/bin/env node

/**
 * Payment Verification Testing - Complete Test Suite
 * Tests: POST /api/payments/verify
 * 
 * Run: node test-payment-verify.js
 */

const http = require('http');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'http://localhost:3000';
const RAZORPAY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'degfS9w5klNpAJg2SBEFXR8y';

// Colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

let PASSED = 0;
let FAILED = 0;

// Helper function
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: JSON.parse(responseData),
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData,
          });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Helper functions for colored output
function print(msg) {
  console.log(`${BLUE}▶ ${msg}${RESET}`);
}

function success(msg) {
  console.log(`${GREEN}✓ ${msg}${RESET}`);
  PASSED++;
}

function fail(msg) {
  console.log(`${RED}✗ ${msg}${RESET}`);
  FAILED++;
}

function info(msg) {
  console.log(`${YELLOW}ℹ ${msg}${RESET}`);
}

// Generate valid signature
function generateSignature(orderId, paymentId, secret = RAZORPAY_SECRET) {
  const message = `${orderId}|${paymentId}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
  return signature;
}

// Main test suite
async function runTests() {
  console.log('🧪 Payment Verification API - Complete Test Suite');
  console.log('==================================================\n');

  let jwtToken = '';
  let orderId = '';
  let razorpayOrderId = '';
  let paymentId = '';

  try {
    // Test 1: Create test user
    print('Test 1: Create Test User');
    const userRes = await makeRequest('POST', '/api/auth/signup', {
      email: `verify-test-${Date.now()}@test.com`,
      password: 'TestPass123!',
      name: 'Verify Test',
      phone: '9876543210',
    });

    if (userRes.status === 200 || userRes.status === 201) {
      jwtToken = userRes.data.token;
      success(`User created, token: ${jwtToken.substring(0, 30)}...`);
    } else {
      fail('User creation failed');
      throw new Error('Cannot create test user');
    }
    console.log('');

    // Test 2: Create payment order
    print('Test 2: Create Payment Order');
    const orderRes = await makeRequest(
      'POST',
      '/api/payments/create-order',
      {
        amount: 500,
        description: 'Verification Test',
        receipt: `verify-${Date.now()}`,
      },
      { Authorization: `Bearer ${jwtToken}` }
    );

    if (orderRes.status === 200 && orderRes.data.data?.razorpayOrderId) {
      orderId = orderRes.data.data.orderId;
      razorpayOrderId = orderRes.data.data.razorpayOrderId;
      paymentId = `pay_${Date.now()}_test`; // Simulated payment ID
      success(`Order created: ${razorpayOrderId}`);
      info(`Order ID: ${orderId}`);
      info(`Payment ID (simulated): ${paymentId}`);
    } else {
      fail('Order creation failed');
      throw new Error('Cannot create test order');
    }
    console.log('');

    // Test 3: Verify with VALID signature
    print('Test 3: Verify Payment with VALID Signature');
    const validSignature = generateSignature(razorpayOrderId, paymentId);
    info(`Generated signature: ${validSignature}`);

    const verifyValidRes = await makeRequest(
      'POST',
      '/api/payments/verify',
      {
        orderId: razorpayOrderId,
        paymentId: paymentId,
        signature: validSignature,
      },
      { Authorization: `Bearer ${jwtToken}` }
    );

    if (verifyValidRes.status === 200 && verifyValidRes.data.data?.verified) {
      success('Payment verified successfully with valid signature');
      info(`Status: ${verifyValidRes.data.data.payment?.status}`);
    } else {
      info(`Response status: ${verifyValidRes.status}`);
      info(`Response: ${JSON.stringify(verifyValidRes.data)}`);
      fail('Valid signature verification failed');
    }
    console.log('');

    // Test 4: Verify with INVALID signature (tampered)
    print('Test 4: Verify Payment with INVALID Signature (Tampered)');
    const invalidSignature = 'invalid_signature_12345';
    info(`Invalid signature: ${invalidSignature}`);

    const verifyInvalidRes = await makeRequest(
      'POST',
      '/api/payments/verify',
      {
        orderId: razorpayOrderId,
        paymentId: paymentId,
        signature: invalidSignature,
      },
      { Authorization: `Bearer ${jwtToken}` }
    );

    if (verifyInvalidRes.status !== 200 || !verifyInvalidRes.data.data?.verified) {
      success('Invalid signature correctly rejected');
      info(`Error: ${verifyInvalidRes.data.message}`);
    } else {
      fail('Invalid signature should have been rejected');
    }
    console.log('');

    // Test 5: Verify with WRONG order ID
    print('Test 5: Verify Payment with WRONG Order ID');
    const wrongOrderId = 'ORD_WRONG_123456';
    const wrongSignature = generateSignature(wrongOrderId, paymentId);

    const verifyWrongOrderRes = await makeRequest(
      'POST',
      '/api/payments/verify',
      {
        orderId: wrongOrderId,
        paymentId: paymentId,
        signature: wrongSignature,
      },
      { Authorization: `Bearer ${jwtToken}` }
    );

    if (verifyWrongOrderRes.status !== 200) {
      success('Wrong order ID correctly rejected');
    } else {
      fail('Wrong order ID should have been rejected');
    }
    console.log('');

    // Test 6: Verify with MISSING fields
    print('Test 6: Verify Payment with MISSING Fields');
    const verifyMissingRes = await makeRequest(
      'POST',
      '/api/payments/verify',
      {
        orderId: razorpayOrderId,
        // Missing paymentId and signature
      },
      { Authorization: `Bearer ${jwtToken}` }
    );

    if (verifyMissingRes.status !== 200) {
      success('Missing required fields correctly rejected');
      info(`Error: ${verifyMissingRes.data.message}`);
    } else {
      fail('Missing fields should have been rejected');
    }
    console.log('');

    // Test 7: Verify without authentication
    print('Test 7: Verify Payment WITHOUT Authentication');
    const verifyNoAuthRes = await makeRequest(
      'POST',
      '/api/payments/verify',
      {
        orderId: razorpayOrderId,
        paymentId: paymentId,
        signature: validSignature,
      }
      // No Authorization header
    );

    if (verifyNoAuthRes.status !== 200) {
      success('Unauthenticated request correctly rejected');
      info(`Status: ${verifyNoAuthRes.status}`);
    } else {
      fail('Unauthenticated request should have been rejected');
    }
    console.log('');

    // Test 8: Verify multiple times (idempotency)
    print('Test 8: Verify Same Payment TWICE (Idempotency)');
    
    const verifyFirst = await makeRequest(
      'POST',
      '/api/payments/verify',
      {
        orderId: razorpayOrderId,
        paymentId: paymentId,
        signature: validSignature,
      },
      { Authorization: `Bearer ${jwtToken}` }
    );

    const verifySecond = await makeRequest(
      'POST',
      '/api/payments/verify',
      {
        orderId: razorpayOrderId,
        paymentId: paymentId,
        signature: validSignature,
      },
      { Authorization: `Bearer ${jwtToken}` }
    );

    if (verifyFirst.status === 200 && verifySecond.status === 200) {
      success('Idempotent verification works correctly');
      info('Both attempts succeeded');
    } else {
      info(`First: ${verifyFirst.status}, Second: ${verifySecond.status}`);
      fail('Idempotency test failed');
    }
    console.log('');

    // Test 9: Verify with different secret (wrong key)
    print('Test 9: Verify Payment with WRONG Secret Key');
    const wrongSecret = 'wrong_secret_key_not_valid';
    const wrongSecretSignature = generateSignature(razorpayOrderId, paymentId, wrongSecret);

    const verifyWrongSecretRes = await makeRequest(
      'POST',
      '/api/payments/verify',
      {
        orderId: razorpayOrderId,
        paymentId: paymentId,
        signature: wrongSecretSignature,
      },
      { Authorization: `Bearer ${jwtToken}` }
    );

    if (verifyWrongSecretRes.status !== 200 || !verifyWrongSecretRes.data.data?.verified) {
      success('Wrong secret key correctly rejected');
    } else {
      fail('Wrong secret should have been rejected');
    }
    console.log('');

    // Test 10: Check payment status after verification
    print('Test 10: Check Payment Status After Verification');
    const statusRes = await makeRequest(
      'GET',
      `/api/payments/?status=success`,
      null,
      { Authorization: `Bearer ${jwtToken}` }
    );

    if (statusRes.status === 200) {
      const successPayments = statusRes.data.data?.payments?.length || 0;
      info(`Verified payments: ${successPayments}`);
      success('Payment status check successful');
    } else {
      fail('Payment status check failed');
    }
    console.log('');

  } catch (error) {
    console.error(`\n${RED}Fatal Error: ${error.message}${RESET}`);
    process.exit(1);
  }

  // Summary
  console.log('==================================================');
  console.log(`${BLUE}Test Summary${RESET}`);
  console.log('==================================================');
  console.log(`${GREEN}✓ Passed: ${PASSED}${RESET}`);
  console.log(`${RED}✗ Failed: ${FAILED}${RESET}`);
  const TOTAL = PASSED + FAILED;
  const SUCCESS_RATE = ((PASSED / TOTAL) * 100).toFixed(2);
  console.log(`Success Rate: ${GREEN}${SUCCESS_RATE}%${RESET}`);
  console.log('');

  // Key Information
  console.log('==================================================');
  console.log(`${BLUE}Signature Verification Details${RESET}`);
  console.log('==================================================');
  console.log(`Secret Key: ${RAZORPAY_SECRET?.substring(0, 10)}...`);
  console.log(`Algorithm: HMAC-SHA256`);
  console.log(`Format: HMAC(orderId|paymentId)`);
  console.log('');

  // Test Results
  console.log('==================================================');
  console.log(`${BLUE}Endpoint Test Results${RESET}`);
  console.log('==================================================');
  console.log(`Endpoint: POST /api/payments/verify`);
  console.log(`Auth Required: Yes (JWT Token)`);
  console.log(`Response Format: JSON`);
  console.log('');

  if (FAILED === 0) {
    console.log(`${GREEN}All verification tests passed! 🎉${RESET}`);
    process.exit(0);
  } else {
    console.log(`${RED}Some tests failed - review above${RESET}`);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error(`${RED}Error: ${error.message}${RESET}`);
  process.exit(1);
});
