#!/usr/bin/env node

/**
 * Direct Login Test - No OTP, No Twilio
 * Create user and login to get JWT token
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
║   Direct Login Test (No Twilio/OTP)    ║
║   Phone: 8824223395                    ║
║   Server: ${BASE_URL.padEnd(24)} ║
╚════════════════════════════════════════╝
${colors.reset}`);

  try {
    // Test user credentials with the phone number you specified
    const testUser = {
      email: 'test8824223395@example.com',
      password: 'TestPass123!',
      name: 'Test User',
      phone: '8824223395',
    };

    console.log(`\n${colors.yellow}📝 Step 1: Creating user account...${colors.reset}`);
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Phone: ${testUser.phone}`);

    const signupResp = await request('POST', '/api/auth/signup', testUser);

    let token;
    let userData;

    if (signupResp.status === 201 || signupResp.status === 200) {
      console.log(`${colors.green}✅ User account created${colors.reset}`);
      token = signupResp.data.token || signupResp.data.data?.token;
      userData = signupResp.data.data;
    } else if (signupResp.status === 400 && signupResp.data.message?.includes('already exists')) {
      console.log(`${colors.yellow}⚠️  User already exists, attempting login...${colors.reset}`);
      
      // Try login
      const loginResp = await request('POST', '/api/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      if (loginResp.status !== 200) {
        console.log(`${colors.red}❌ Login failed${colors.reset}`);
        console.log(loginResp.data);
        process.exit(1);
      }

      token = loginResp.data.token || loginResp.data.data?.token;
      userData = loginResp.data.data;
      console.log(`${colors.green}✅ Login successful${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ Signup failed${colors.reset}`);
      console.log(JSON.stringify(signupResp.data, null, 2));
      process.exit(1);
    }

    if (!token) {
      console.log(`${colors.red}❌ No JWT token received${colors.reset}`);
      console.log(JSON.stringify(signupResp.data, null, 2));
      process.exit(1);
    }

    // Display JWT Token
    console.log(`\n${colors.cyan}
╔════════════════════════════════════════╗
║   ✅ Authentication Successful!        ║
╚════════════════════════════════════════╝
${colors.reset}`);

    console.log(`\n${colors.green}🎉 JWT Token:${colors.reset}`);
    console.log(`${colors.blue}${token}${colors.reset}`);

    // Display user info
    if (userData) {
      console.log(`\n${colors.green}👤 User Information:${colors.reset}`);
      console.log(`   Name: ${userData.name || 'N/A'}`);
      console.log(`   Email: ${userData.email || 'N/A'}`);
      console.log(`   Phone: ${userData.phone || 'N/A'}`);
      console.log(`   Role: ${userData.role || 'user'}`);
      console.log(`   ID: ${userData._id || userData.id || 'N/A'}`);
    }

    // Step 2: Create Razorpay Payment Order
    console.log(`\n${colors.yellow}💳 Step 2: Creating Razorpay payment order...${colors.reset}`);

    const paymentResp = await request(
      'POST',
      '/api/payments/create-order',
      {
        amount: 500,
        description: 'Test Payment - Phone: 8824223395',
        receipt: `receipt_${Date.now()}`,
        notes: {
          phone: '8824223395',
          source: 'direct-login-test',
        },
        customer: {
          email: testUser.email,
          phone: testUser.phone,
          name: testUser.name,
        },
      },
      token
    );

    if (paymentResp.status !== 200) {
      console.log(`${colors.red}❌ Payment order creation failed${colors.reset}`);
      console.log(JSON.stringify(paymentResp.data, null, 2));
      process.exit(1);
    }

    console.log(`${colors.green}✅ Razorpay order created successfully!${colors.reset}`);

    const orderData = paymentResp.data.data;
    console.log(`\n${colors.blue}📋 Razorpay Order Details:${colors.reset}`);
    console.log(`   Local Order ID: ${orderData.orderId}`);
    console.log(`   Razorpay Order ID: ${orderData.razorpayOrderId}`);
    console.log(`   Amount: ₹${orderData.amount}`);
    console.log(`   Currency: ${orderData.currency}`);
    console.log(`   Status: pending`);

    // Step 3: Get Payment History
    console.log(`\n${colors.yellow}📊 Step 3: Fetching payment history...${colors.reset}`);

    const historyResp = await request('GET', '/api/payments', null, token);

    if (historyResp.status === 200 && historyResp.data.data) {
      const { payments, total } = historyResp.data.data;
      console.log(`${colors.green}✅ Payment history retrieved!${colors.reset}`);
      console.log(`   Total payments: ${total}`);
      console.log(`   Showing: ${payments.length} records`);

      if (payments.length > 0) {
        console.log(`\n${colors.blue}📝 Payment Records:${colors.reset}`);
        payments.slice(0, 3).forEach((payment, idx) => {
          console.log(`\n   [${idx + 1}] Order: ${payment.orderId}`);
          console.log(`       Amount: ₹${payment.amount}`);
          console.log(`       Status: ${payment.status}`);
          console.log(`       Date: ${new Date(payment.createdAt).toLocaleString()}`);
        });
      }
    }

    // Final Summary
    console.log(`\n${colors.cyan}
╔════════════════════════════════════════╗
║   🎉 All Tests Passed!                 ║
╚════════════════════════════════════════╝
${colors.reset}`);

    console.log(`\n${colors.green}✅ Completed:${colors.reset}`);
    console.log(`   ✓ User created/logged in`);
    console.log(`   ✓ JWT token obtained`);
    console.log(`   ✓ Razorpay order created`);
    console.log(`   ✓ Payment history retrieved`);

    console.log(`\n${colors.yellow}🔐 Your JWT Token (save this):${colors.reset}`);
    console.log(`${colors.cyan}${token}${colors.reset}`);

    console.log(`\n${colors.yellow}📝 How to use:${colors.reset}\n`);

    console.log(`1. ${colors.blue}Create Payment Orders:${colors.reset}`);
    console.log(`   curl -X POST http://localhost:3000/api/payments/create-order \\
     -H "Authorization: Bearer ${token.substring(0, 20)}..." \\
     -d '{"amount":500,"description":"Test"}'`);

    console.log(`\n2. ${colors.blue}Get Payment History:${colors.reset}`);
    console.log(`   curl -X GET http://localhost:3000/api/payments \\
     -H "Authorization: Bearer ${token.substring(0, 20)}..."`);

    console.log(`\n3. ${colors.blue}Use in Postman:${colors.reset}`);
    console.log(`   - Import: Razorpay_Payment_API.postman_collection.json`);
    console.log(`   - Set Bearer token: ${token.substring(0, 30)}...`);

    console.log(`\n${colors.green}✨ Ready for payment testing!${colors.reset}\n`);

  } catch (error) {
    console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

main();
