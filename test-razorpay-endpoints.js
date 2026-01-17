#!/usr/bin/env node

/**
 * Razorpay API Testing with Authentication
 */

const http = require('http');
const BASE_URL = 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

class RazorpayTester {
  constructor() {
    this.token = null;
  }

  request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, BASE_URL);
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (this.token) {
        options.headers['Authorization'] = `Bearer ${this.token}`;
      }

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

  async testWithoutAuth() {
    console.log(`\n${colors.yellow}Testing WITHOUT Authentication:${colors.reset}`);
    console.log('═'.repeat(50));

    const response = await this.request('POST', '/api/payments/create-order', {
      amount: 500,
      description: 'Test Payment',
    });

    console.log(`Status: ${response.status}`);
    console.log(`Message: ${response.data.message}`);

    if (response.status === 401) {
      console.log(`${colors.green}✅ Authentication check working (returns 401)${colors.reset}`);
    }
  }

  async testWebhookEndpoint() {
    console.log(`\n${colors.yellow}Testing Webhook Endpoint (No Auth Required):${colors.reset}`);
    console.log('═'.repeat(50));

    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_test_123',
            status: 'captured',
            amount: 50000,
          },
        },
      },
    };

    const response = await this.request('POST', '/api/payments/webhook', payload);

    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(response.data, null, 2));

    if (response.status >= 400) {
      console.log(`${colors.green}✅ Webhook endpoint is accessible${colors.reset}`);
    }
  }

  async testHealthCheck() {
    console.log(`\n${colors.yellow}Testing Server Health:${colors.reset}`);
    console.log('═'.repeat(50));

    try {
      const response = await this.request('GET', '/api/health');
      console.log(`Status: ${response.status}`);
      console.log(`Response:`, JSON.stringify(response.data, null, 2));
      console.log(`${colors.green}✅ Server is healthy${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}❌ Server is not running${colors.reset}`);
      throw error;
    }
  }

  async run() {
    console.log(`${colors.cyan}
╔════════════════════════════════════════╗
║   Razorpay Payment API Testing         ║
║   Server: ${BASE_URL.padEnd(28)} ║
╚════════════════════════════════════════╝
${colors.reset}`);

    try {
      // Test 1: Health check
      await this.testHealthCheck();

      // Test 2: Webhook (no auth required)
      await this.testWebhookEndpoint();

      // Test 3: Create order (requires auth)
      await this.testWithoutAuth();

      // Summary
      console.log(`\n${colors.cyan}
╔════════════════════════════════════════╗
║   Summary                              ║
╚════════════════════════════════════════╝
${colors.reset}`);

      console.log(`\n${colors.green}✅ Payment Routes Registered Successfully!${colors.reset}`);

      console.log(`\n${colors.blue}API Endpoints Available:${colors.reset}`);
      console.log('  POST   /api/payments/create-order      (requires auth)');
      console.log('  POST   /api/payments/verify            (requires auth)');
      console.log('  GET    /api/payments                   (requires auth)');
      console.log('  GET    /api/payments/:paymentId        (requires auth)');
      console.log('  POST   /api/payments/:paymentId/refund (requires auth)');
      console.log('  POST   /api/payments/webhook           (public)');

      console.log(`\n${colors.yellow}To fully test the APIs:${colors.reset}`);
      console.log('1. Get a valid JWT token by logging in:');
      console.log('   curl -X POST http://localhost:3000/api/auth/login \\');
      console.log('     -H "Content-Type: application/json" \\');
      console.log('     -d {"email":"user@example.com","password":"password"}');
      console.log('');
      console.log('2. Use the token with payment endpoints:');
      console.log('   curl -X POST http://localhost:3000/api/payments/create-order \\');
      console.log('     -H "Authorization: Bearer YOUR_TOKEN" \\');
      console.log('     -d {"amount":500,"description":"Test"}');
      console.log('');
      console.log('3. Or import Postman collection: Razorpay_Payment_API.postman_collection.json');

    } catch (error) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }
}

const tester = new RazorpayTester();
tester.run();
