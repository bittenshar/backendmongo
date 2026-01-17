#!/usr/bin/env node

/**
 * Razorpay API Testing Script
 * Tests all payment endpoints
 */

const http = require('http');
const BASE_URL = 'http://localhost:3000';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

class APITester {
  constructor(token) {
    this.token = token;
  }

  async request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, BASE_URL);
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
      };

      const req = http.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              data: JSON.parse(data),
            });
          } catch {
            resolve({
              status: res.statusCode,
              data,
            });
          }
        });
      });

      req.on('error', reject);

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  print(title, content, status = 'info') {
    const color = status === 'success' ? colors.green : status === 'error' ? colors.red : colors.blue;
    console.log(`\n${color}${title}${colors.reset}`);
    console.log(JSON.stringify(content, null, 2));
  }

  async runTests() {
    console.log(`${colors.cyan}
╔════════════════════════════════════════╗
║   Razorpay API Testing Suite           ║
║   Testing on: ${BASE_URL.padEnd(26)} ║
╚════════════════════════════════════════╝
${colors.reset}`);

    // Test 1: Server Health
    console.log(`\n${colors.yellow}Test 1: Server Health Check${colors.reset}`);
    try {
      const health = await this.request('GET', '/');
      console.log(`${colors.green}✅ Server is running${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}❌ Server is not running${colors.reset}`);
      console.log(`${colors.yellow}Start server with: npm start${colors.reset}`);
      process.exit(1);
    }

    // Test 2: Create Payment Order
    console.log(`\n${colors.yellow}Test 2: Create Payment Order${colors.reset}`);
    const createOrderPayload = {
      amount: 500,
      description: 'Test Payment - Razorpay Integration',
      receipt: `test_receipt_${Date.now()}`,
      notes: {
        productId: 'test_prod_123',
        category: 'test',
      },
      customer: {
        email: 'test@example.com',
        phone: '9876543210',
        name: 'Test User',
      },
    };

    console.log(`${colors.blue}Request Payload:${colors.reset}`);
    console.log(JSON.stringify(createOrderPayload, null, 2));

    const orderResponse = await this.request('POST', '/api/payments/create-order', createOrderPayload);
    this.print('Response:', orderResponse.data, orderResponse.status === 200 ? 'success' : 'error');

    let razorpayOrderId = null;
    if (orderResponse.status === 200 && orderResponse.data.data) {
      razorpayOrderId = orderResponse.data.data.razorpayOrderId;
      console.log(`${colors.green}✅ Order created successfully${colors.reset}`);
      console.log(`   Order ID: ${razorpayOrderId}`);
      console.log(`   Amount: ₹${orderResponse.data.data.amount}`);
    } else {
      console.log(`${colors.red}❌ Failed to create order${colors.reset}`);
      console.log(`${colors.yellow}Check if you're authenticated and credentials are set${colors.reset}`);
    }

    // Test 3: Get Payment History
    console.log(`\n${colors.yellow}Test 3: Get Payment History${colors.reset}`);
    const historyResponse = await this.request('GET', '/api/payments?limit=5&skip=0');
    this.print('Response:', historyResponse.data, historyResponse.status === 200 ? 'success' : 'error');

    if (historyResponse.status === 200 && historyResponse.data.data) {
      const { payments = [], total } = historyResponse.data.data;
      console.log(`${colors.green}✅ Payment history retrieved${colors.reset}`);
      console.log(`   Total payments: ${total}`);
      console.log(`   Showing: ${payments.length} records`);

      if (payments.length > 0) {
        console.log(`\n${colors.blue}Latest Payment:${colors.reset}`);
        const latest = payments[0];
        console.log(`   Order ID: ${latest.orderId}`);
        console.log(`   Amount: ₹${latest.amount}`);
        console.log(`   Status: ${latest.status}`);
        console.log(`   Date: ${new Date(latest.createdAt).toLocaleString()}`);
      }
    }

    // Test 4: Get Order Details
    if (razorpayOrderId) {
      console.log(`\n${colors.yellow}Test 4: Get Order Details${colors.reset}`);
      const orderDetailsResponse = await this.request('GET', `/api/payments/order/${razorpayOrderId}`);
      this.print('Response:', orderDetailsResponse.data, orderDetailsResponse.status === 200 ? 'success' : 'error');

      if (orderDetailsResponse.status === 200) {
        console.log(`${colors.green}✅ Order details retrieved${colors.reset}`);
      }
    }

    // Summary
    console.log(`\n${colors.cyan}
╔════════════════════════════════════════╗
║   Test Summary                         ║
╚════════════════════════════════════════╝
${colors.reset}`);

    console.log(`${colors.green}✅ API Tests Completed${colors.reset}`);
    console.log(`\n${colors.blue}Next Steps:${colors.reset}`);
    console.log('1. Use Razorpay test card: 4111 1111 1111 1111');
    console.log('2. CVV: Any 3 digits');
    console.log('3. Expiry: Any future date');
    console.log('\n' + colors.yellow + 'Integration Docs:' + colors.reset);
    console.log('- Quick Start: ./RAZORPAY_QUICK_START.md');
    console.log('- Full Docs: ./src/features/payment/RAZORPAY_SETUP.md');
    console.log('- Postman Collection: ./Razorpay_Payment_API.postman_collection.json');
  }
}

// Get token from command line or use default
const token = process.argv[2] || 'test_token_for_testing';

console.log(`\n${colors.yellow}Note: Using token: ${token}${colors.reset}`);
console.log(`${colors.yellow}If you need authentication, pass your JWT token as argument:${colors.reset}`);
console.log(`${colors.cyan}node test-razorpay.js your_jwt_token${colors.reset}\n`);

const tester = new APITester(token);
tester.runTests().catch((error) => {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});
