#!/usr/bin/env node

/**
 * Simple Login Script
 * Login with email/password to get JWT token
 */

const http = require('http');
const readline = require('readline');

const BASE_URL = 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

class SimpleLogin {
  request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, BASE_URL);
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
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

  prompt(question) {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  async signup() {
    console.log(`\n${colors.blue}Creating new account...${colors.reset}\n`);

    const name = await this.prompt(`${colors.yellow}Enter name:${colors.reset} `);
    const email = await this.prompt(`${colors.yellow}Enter email:${colors.reset} `);
    const password = await this.prompt(`${colors.yellow}Enter password:${colors.reset} `);
    const phone = await this.prompt(`${colors.yellow}Enter phone:${colors.reset} `);

    console.log(`\n${colors.blue}📝 Signing up...${colors.reset}`);

    const signupResponse = await this.request('POST', '/api/auth/signup', {
      name,
      email,
      password,
      phone,
    });

    if (signupResponse.status !== 201 && signupResponse.status !== 200) {
      console.log(`${colors.red}❌ Signup failed${colors.reset}`);
      console.log(JSON.stringify(signupResponse.data, null, 2));
      return null;
    }

    console.log(`${colors.green}✅ Account created successfully!${colors.reset}`);
    return signupResponse.data;
  }

  async login() {
    console.log(`\n${colors.blue}Logging in...${colors.reset}\n`);

    const email = await this.prompt(`${colors.yellow}Enter email:${colors.reset} `);
    const password = await this.prompt(`${colors.yellow}Enter password:${colors.reset} `);

    console.log(`\n${colors.blue}🔐 Verifying credentials...${colors.reset}`);

    const loginResponse = await this.request('POST', '/api/auth/login', {
      email,
      password,
    });

    if (loginResponse.status !== 200) {
      console.log(`${colors.red}❌ Login failed${colors.reset}`);
      console.log(JSON.stringify(loginResponse.data, null, 2));
      return null;
    }

    console.log(`${colors.green}✅ Login successful!${colors.reset}`);
    return loginResponse.data;
  }

  async run() {
    console.log(`${colors.cyan}
╔════════════════════════════════════════╗
║   Login & Get JWT Token                ║
║   Server: ${BASE_URL.padEnd(28)} ║
╚════════════════════════════════════════╝
${colors.reset}`);

    try {
      const choice = await this.prompt(`\n${colors.yellow}Choose:${colors.reset}\n1. Login\n2. Signup\nEnter choice (1 or 2): `);

      let response;
      if (choice === '2') {
        response = await this.signup();
      } else {
        response = await this.login();
      }

      if (!response) {
        process.exit(1);
      }

      // Extract JWT token
      const jwtToken = response.token || response.data?.token || null;

      if (!jwtToken) {
        console.log(`${colors.red}❌ No JWT token in response${colors.reset}`);
        console.log(JSON.stringify(response, null, 2));
        process.exit(1);
      }

      // Display JWT Token
      console.log(`\n${colors.cyan}
╔════════════════════════════════════════╗
║   ✅ Authentication Successful!        ║
╚════════════════════════════════════════╝
${colors.reset}`);

      console.log(`\n${colors.green}🎉 JWT Token:${colors.reset}`);
      console.log(`${colors.blue}${jwtToken}${colors.reset}`);

      // Display user info if available
      if (response.data) {
        const user = response.data;
        console.log(`\n${colors.green}👤 User Info:${colors.reset}`);
        console.log(`   Name: ${user.name || 'N/A'}`);
        console.log(`   Email: ${user.email || 'N/A'}`);
        console.log(`   Phone: ${user.phone || 'N/A'}`);
        console.log(`   Role: ${user.role || 'user'}`);
      }

      // Test Razorpay Payment API
      console.log(`\n${colors.yellow}🧪 Testing Razorpay Payment API...${colors.reset}`);

      const paymentResponse = await this.request('POST', '/api/payments/create-order', {
        amount: 500,
        description: 'Test Payment - Razorpay Integration',
        customer: {
          email: response.data?.email || 'test@example.com',
          phone: response.data?.phone || '9876543210',
          name: response.data?.name || 'Test User',
        },
      }, jwtToken);

      // Need to make authenticated request - let me fix this
      const url = new URL('/api/payments/create-order', BASE_URL);
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`,
        },
      };

      const paymentReq = http.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const paymentData = JSON.parse(data);
            
            if (res.statusCode === 200) {
              console.log(`${colors.green}✅ Payment order created!${colors.reset}`);
              console.log(`\n${colors.blue}📋 Razorpay Order Details:${colors.reset}`);
              if (paymentData.data) {
                console.log(`   Order ID: ${paymentData.data.orderId}`);
                console.log(`   Razorpay Order: ${paymentData.data.razorpayOrderId}`);
                console.log(`   Amount: ₹${paymentData.data.amount}`);
                console.log(`   Currency: ${paymentData.data.currency}`);
                console.log(`   Status: ${paymentData.data.payment?.status || 'pending'}`);
              }
            } else {
              console.log(`${colors.red}❌ Payment order creation failed${colors.reset}`);
              console.log(JSON.stringify(paymentData, null, 2));
            }
          } catch (e) {
            console.log(`${colors.red}Error parsing payment response${colors.reset}`);
          }

          // Display usage instructions
          console.log(`\n${colors.cyan}
╔════════════════════════════════════════╗
║   How to Use JWT Token                 ║
╚════════════════════════════════════════╝
${colors.reset}`);

          console.log(`\n${colors.yellow}1. Test Payment API with cURL:${colors.reset}`);
          console.log(`${colors.blue}curl -X POST http://localhost:3000/api/payments/create-order \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${jwtToken.substring(0, 20)}..." \\
  -d '{
    "amount": 500,
    "description": "Test Payment",
    "customer": {
      "email": "test@example.com",
      "phone": "9876543210",
      "name": "Test User"
    }
  }'${colors.reset}`);

          console.log(`\n${colors.yellow}2. Get Payment History:${colors.reset}`);
          console.log(`${colors.blue}curl -X GET http://localhost:3000/api/payments \\
  -H "Authorization: Bearer ${jwtToken.substring(0, 20)}..."${colors.reset}`);

          console.log(`\n${colors.yellow}3. Use in Postman:${colors.reset}`);
          console.log(`   - Import: Razorpay_Payment_API.postman_collection.json`);
          console.log(`   - Set token variable: {{token}} = ${jwtToken.substring(0, 30)}...`);
          console.log(`   - All payment endpoints now available`);

          console.log(`\n${colors.green}✅ You're all set!${colors.reset}\n`);
        });
      });

      paymentReq.on('error', (e) => {
        console.log(`${colors.red}Error: ${e.message}${colors.reset}`);
      });

      paymentReq.write(JSON.stringify({
        amount: 500,
        description: 'Test Payment - Razorpay Integration',
        customer: {
          email: response.data?.email || 'test@example.com',
          phone: response.data?.phone || '9876543210',
          name: response.data?.name || 'Test User',
        },
      }));

      paymentReq.end();

    } catch (error) {
      console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }
}

const login = new SimpleLogin();
login.run();
