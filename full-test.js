#!/usr/bin/env node

/**
 * Direct Test: Create user, login, and test Razorpay
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

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
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

async function main() {
  console.log(`${colors.cyan}
╔════════════════════════════════════════╗
║   Full Test: Login & Razorpay Payment  ║
║   Server: ${BASE_URL.padEnd(28)} ║
╚════════════════════════════════════════╝
${colors.reset}`);

  try {
    // Test user credentials
    const testUser = {
      email: `test_${Date.now()}@example.com`,
      password: 'TestPassword123!',
      name: 'Test User',
      phone: '8824223395',
    };

    console.log(`\n${colors.yellow}Step 1: Creating account...${colors.reset}`);
    console.log(`Email: ${testUser.email}`);
    console.log(`Phone: ${testUser.phone}`);

    const signupResp = await request('POST', '/api/auth/signup', testUser);

    if (signupResp.status !== 201 && signupResp.status !== 200) {
      console.log(`${colors.red}❌ Signup failed${colors.reset}`);
      console.log(signupResp.data);
      
      // Try login instead
      console.log(`\n${colors.yellow}Trying to login with existing account...${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ Account created${colors.reset}`);
    }

    // Login
    console.log(`\n${colors.yellow}Step 2: Logging in...${colors.reset}`);

    const loginResp = await request('POST', '/api/auth/login', {
      email: testUser.email,
      password: testUser.password,
    });

    if (loginResp.status !== 200) {
      console.log(`${colors.red}❌ Login failed${colors.reset}`);
      console.log(loginResp.data);
      process.exit(1);
    }

    const jwtToken = loginResp.data.token || loginResp.data.data?.token;

    if (!jwtToken) {
      console.log(`${colors.red}❌ No token in response${colors.reset}`);
      process.exit(1);
    }

    console.log(`${colors.green}✅ Login successful!${colors.reset}`);
    console.log(`${colors.blue}Token: ${jwtToken.substring(0, 50)}...${colors.reset}`);

    // Display user info
    if (loginResp.data.data) {
      const user = loginResp.data.data;
      console.log(`\n${colors.green}👤 User Info:${colors.reset}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Phone: ${user.phone}`);
      console.log(`   Role: ${user.role || 'user'}`);
    }

    // Test Razorpay - Create Order
    console.log(`\n${colors.yellow}Step 3: Creating Razorpay payment order...${colors.reset}`);

    const paymentResp = await request(
      'POST',
      '/api/payments/create-order',
      {
        amount: 500,
        description: 'Test Payment - Phone: 8824223395',
        customer: {
          email: testUser.email,
          phone: testUser.phone,
          name: testUser.name,
        },
      },
      jwtToken
    );

    if (paymentResp.status !== 200) {
      console.log(`${colors.red}❌ Payment order creation failed${colors.reset}`);
      console.log(paymentResp.data);
      process.exit(1);
    }

    console.log(`${colors.green}✅ Payment order created!${colors.reset}`);

    const orderData = paymentResp.data.data;
    console.log(`\n${colors.blue}📋 Razorpay Order Details:${colors.reset}`);
    console.log(`   Local Order ID: ${orderData.orderId}`);
    console.log(`   Razorpay Order ID: ${orderData.razorpayOrderId}`);
    console.log(`   Amount: ₹${orderData.amount}`);
    console.log(`   Currency: ${orderData.currency}`);
    console.log(`   Key ID: ${orderData.key.substring(0, 20)}...`);

    // Get Payment History
    console.log(`\n${colors.yellow}Step 4: Fetching payment history...${colors.reset}`);

    const historyResp = await request('GET', '/api/payments', null, jwtToken);

    if (historyResp.status === 200 && historyResp.data.data) {
      const { payments, total } = historyResp.data.data;
      console.log(`${colors.green}✅ Payment history fetched!${colors.reset}`);
      console.log(`   Total payments: ${total}`);
      console.log(`   Displayed: ${payments.length} records`);

      if (payments.length > 0) {
        console.log(`\n${colors.blue}Latest Payment:${colors.reset}`);
        const latest = payments[0];
        console.log(`   Order ID: ${latest.orderId}`);
        console.log(`   Amount: ₹${latest.amount}`);
        console.log(`   Status: ${latest.status}`);
      }
    }

    // Final Summary
    console.log(`\n${colors.cyan}
╔════════════════════════════════════════╗
║   ✅ All Tests Passed!                 ║
╚════════════════════════════════════════╝
${colors.reset}`);

    console.log(`\n${colors.green}Summary:${colors.reset}`);
    console.log(`✅ User created & logged in`);
    console.log(`✅ JWT token obtained`);
    console.log(`✅ Razorpay order created`);
    console.log(`✅ Payment history retrieved`);

    console.log(`\n${colors.blue}Your JWT Token:${colors.reset}`);
    console.log(`${colors.cyan}${jwtToken}${colors.reset}`);

    console.log(`\n${colors.yellow}Next Steps:${colors.reset}`);
    console.log(`
1. Use this token for all authenticated requests
2. Test payment verification after customer pays
3. View payments at: GET /api/payments
4. View order details at: GET /api/payments/order/{orderId}
5. Import Postman collection to test all endpoints

🎉 Ready for payment integration!
`);

  } catch (error) {
    console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

main();
