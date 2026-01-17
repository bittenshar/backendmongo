#!/usr/bin/env node

/**
 * Razorpay Payment Gateway - Complete Testing Suite
 * Run: node razorpay-complete-test.js
 */

const http = require('http');
const querystring = require('querystring');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'test8824223395@example.com';
const TEST_PASSWORD = 'TestPass123!';
const TEST_PHONE = '8824223395';
const TEST_NAME = 'Test User';

// Colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

// Test counters
let PASSED = 0;
let FAILED = 0;

// Helper function to make HTTP requests
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

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Helper functions for colored output
function printTest(msg) {
  console.log(`${BLUE}▶ ${msg}${RESET}`);
}

function printSuccess(msg) {
  console.log(`${GREEN}✓ ${msg}${RESET}`);
  PASSED++;
}

function printError(msg) {
  console.log(`${RED}✗ ${msg}${RESET}`);
  FAILED++;
}

function printInfo(msg) {
  console.log(`${YELLOW}ℹ ${msg}${RESET}`);
}

// Main test suite
async function runTests() {
  console.log('🚀 Razorpay Payment Gateway - Complete Test Suite');
  console.log('==================================================\n');

  let jwtToken = '';
  let userId = '';
  let orderId = '';
  let razorpayOrderId = '';
  let razorpayKey = '';

  try {
    // Test 1: Server Health Check
    printTest('Test 1: Server Health Check');
    const healthRes = await makeRequest('GET', '/api/health');
    if (healthRes.status === 200 && healthRes.data.status === 'success') {
      printSuccess('Server is healthy');
    } else {
      printError('Server health check failed');
      throw new Error('Server not running');
    }
    console.log('');

    // Test 2: User Signup/Authentication
    printTest('Test 2: User Signup/Authentication');
    const signupRes = await makeRequest('POST', '/api/auth/signup', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      name: TEST_NAME,
      phone: TEST_PHONE,
    });

    if ((signupRes.status === 200 || signupRes.status === 201) && signupRes.data?.token) {
      jwtToken = signupRes.data.token;
      userId = signupRes.data.data?.user?._id || signupRes.data.user?._id;
      printSuccess('User signup successful');
      printInfo(`JWT Token: ${jwtToken.substring(0, 30)}...`);
      printInfo(`User ID: ${userId}`);
    } else {
      printError(`User signup failed (status ${signupRes.status})`);
      throw new Error('Signup failed');
    }
    console.log('');

    // Test 3: Create Payment Order
    printTest('Test 3: Create Payment Order');
    const timestamp = Date.now();
    const orderRes = await makeRequest(
      'POST',
      '/api/payments/create-order',
      {
        amount: 500,
        description: 'Test Payment',
        receipt: `test-receipt-${timestamp}`,
      },
      { Authorization: `Bearer ${jwtToken}` }
    );

    if (orderRes.status === 200 && orderRes.data.data?.razorpayOrderId) {
      orderId = orderRes.data.data.orderId;
      razorpayOrderId = orderRes.data.data.razorpayOrderId;
      razorpayKey = orderRes.data.data.key;
      printSuccess('Payment order created successfully');
      printInfo(`Order ID: ${orderId}`);
      printInfo(`Razorpay Order ID: ${razorpayOrderId}`);
      printInfo(`Razorpay Key: ${razorpayKey}`);
    } else {
      printError(`Payment order creation failed: ${JSON.stringify(orderRes.data)}`);
    }
    console.log('');

    // Test 4: Get Payment History
    printTest('Test 4: Get Payment History');
    const historyRes = await makeRequest('GET', '/api/payments/', null, {
      Authorization: `Bearer ${jwtToken}`,
    });

    if (historyRes.status === 200 && historyRes.data.data?.total >= 1) {
      printSuccess('Payment history retrieved');
      printInfo(`Total payments: ${historyRes.data.data.total}`);
    } else {
      printError('Failed to retrieve payment history');
    }
    console.log('');

    // Test 5: Get Order Details
    printTest('Test 5: Get Order Details');
    const orderDetailsRes = await makeRequest(
      'GET',
      `/api/payments/order/${razorpayOrderId}`,
      null,
      { Authorization: `Bearer ${jwtToken}` }
    );

    if (orderDetailsRes.status === 200 && orderDetailsRes.data.data?.status) {
      printSuccess('Order details retrieved successfully');
      printInfo(`Order Status: ${orderDetailsRes.data.data.status}`);
    } else {
      printError('Failed to retrieve order details');
    }
    console.log('');

    // Test 6: Payment Lookup by Order ID
    printTest('Test 6: Payment Lookup by Order ID');
    const lookupRes = await makeRequest(
      'GET',
      `/api/payments/lookup/${razorpayOrderId}`,
      null,
      { Authorization: `Bearer ${jwtToken}` }
    );

    if (lookupRes.status === 200 && lookupRes.data.data?.status) {
      printSuccess('Payment lookup successful');
      printInfo(`Lookup Status: ${lookupRes.data.data.status}`);
    } else {
      printError('Payment lookup failed');
    }
    console.log('');

    // Test 7: Authentication Test (Invalid Token)
    printTest('Test 7: Authentication Test (Invalid Token)');
    const invalidAuthRes = await makeRequest(
      'GET',
      '/api/payments/',
      null,
      { Authorization: 'Bearer invalid-token' }
    );

    if (invalidAuthRes.status !== 200) {
      printSuccess('Authentication correctly rejected invalid token');
      printInfo(`Error Status: ${invalidAuthRes.status}`);
    } else {
      printError('Authentication test failed - should have been rejected');
    }
    console.log('');

    // Test 8: Payment Status Filter
    printTest('Test 8: Payment Status Filter (Pending)');
    const pendingRes = await makeRequest(
      'GET',
      '/api/payments/?status=pending',
      null,
      { Authorization: `Bearer ${jwtToken}` }
    );

    if (pendingRes.status === 200) {
      const pendingCount = pendingRes.data.data?.payments?.length || 0;
      if (pendingCount > 0) {
        printSuccess('Payment status filter working');
        printInfo(`Pending payments: ${pendingCount}`);
      } else {
        printError('No pending payments found in filter');
      }
    } else {
      printError('Payment status filter failed');
    }
    console.log('');

    // Test 9: Validation Test (Invalid Amount)
    printTest('Test 9: Validation Test (Invalid Amount)');
    const invalidRes = await makeRequest(
      'POST',
      '/api/payments/create-order',
      {
        amount: 0,
        description: 'Invalid Payment',
      },
      { Authorization: `Bearer ${jwtToken}` }
    );

    if (invalidRes.status !== 200) {
      printSuccess('Validation correctly rejected invalid amount');
      printInfo(`Error: ${invalidRes.data.message}`);
    } else {
      printError('Validation test failed - should have been rejected');
    }
    console.log('');

    // Test 10: Create Multiple Payment Orders
    printTest('Test 10: Create Multiple Payment Orders');
    let multiCount = 0;
    for (let i = 1; i <= 3; i++) {
      const multiRes = await makeRequest(
        'POST',
        '/api/payments/create-order',
        {
          amount: 100 * i,
          description: `Payment ${i}`,
          receipt: `receipt-${i}-${Date.now()}`,
        },
        { Authorization: `Bearer ${jwtToken}` }
      );

      if (multiRes.status === 200 && multiRes.data.data?.razorpayOrderId) {
        multiCount++;
      }
    }

    if (multiCount === 3) {
      printSuccess('Multiple orders created successfully');
      printInfo(`Orders created: ${multiCount}`);
    } else {
      printError(`Failed to create all orders (created: ${multiCount}/3)`);
    }
    console.log('');

  } catch (error) {
    console.error(`\n${RED}Fatal Error: ${error.message}${RESET}`);
    process.exit(1);
  }

  // Print Summary
  console.log('==================================================');
  console.log(`${BLUE}Test Summary${RESET}`);
  console.log('==================================================');
  console.log(`${GREEN}✓ Passed: ${PASSED}${RESET}`);
  console.log(`${RED}✗ Failed: ${FAILED}${RESET}`);
  const TOTAL = PASSED + FAILED;
  const SUCCESS_RATE = ((PASSED / TOTAL) * 100).toFixed(2);
  console.log(`Success Rate: ${GREEN}${SUCCESS_RATE}%${RESET}`);
  console.log('');

  // Environment Summary
  console.log('==================================================');
  console.log(`${BLUE}Test Environment${RESET}`);
  console.log('==================================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test Email: ${TEST_EMAIL}`);
  console.log(`Test Phone: ${TEST_PHONE}`);
  console.log(`User ID: ${userId}`);
  console.log(`JWT Token: ${jwtToken.substring(0, 30)}...`);
  console.log('');

  // Test Credentials
  console.log('==================================================');
  console.log(`${BLUE}Test Credentials (Save for Reference)${RESET}`);
  console.log('==================================================');
  console.log(`export JWT_TOKEN='${jwtToken}'`);
  console.log(`export USER_ID='${userId}'`);
  console.log(`export ORDER_ID='${orderId}'`);
  console.log(`export RAZORPAY_ORDER_ID='${razorpayOrderId}'`);
  console.log('');

  // API Endpoints Summary
  console.log('==================================================');
  console.log(`${BLUE}Available API Endpoints${RESET}`);
  console.log('==================================================');
  console.log('POST   /api/payments/create-order       - Create payment order');
  console.log('POST   /api/payments/verify              - Verify payment');
  console.log('GET    /api/payments/                    - Get payment history');
  console.log('GET    /api/payments/:paymentId          - Get payment details');
  console.log('GET    /api/payments/order/:orderId      - Get order details');
  console.log('GET    /api/payments/lookup/:orderId     - Lookup payment by order');
  console.log('POST   /api/payments/:paymentId/refund   - Refund payment');
  console.log('POST   /api/payments/webhook             - Razorpay webhook (public)');
  console.log('');

  // Final result
  if (FAILED === 0) {
    console.log(`${GREEN}All tests passed! 🎉${RESET}`);
    process.exit(0);
  } else {
    console.log(`${RED}Some tests failed${RESET}`);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error(`${RED}Error: ${error.message}${RESET}`);
  process.exit(1);
});
