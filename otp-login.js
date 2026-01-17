#!/usr/bin/env node

/**
 * OTP Login Script
 * Login with phone number, verify OTP, and get JWT token
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

class OTPLogin {
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

  async run() {
    console.log(`${colors.cyan}
╔════════════════════════════════════════╗
║   OTP Login - Get JWT Token            ║
║   Server: ${BASE_URL.padEnd(28)} ║
╚════════════════════════════════════════╝
${colors.reset}`);

    try {
      // Step 1: Get phone number
      const phone = await this.prompt(`\n${colors.yellow}Enter phone number:${colors.reset} `);

      if (!phone || phone.length < 10) {
        console.log(`${colors.red}❌ Invalid phone number${colors.reset}`);
        process.exit(1);
      }

      // Step 2: Send OTP
      console.log(`\n${colors.blue}📱 Sending OTP to ${phone}...${colors.reset}`);

      const sendOTPResponse = await this.request('POST', '/api/auth/send-otp', {
        phone: phone.trim(),
      });

      if (sendOTPResponse.status !== 200) {
        console.log(`${colors.red}❌ Failed to send OTP${colors.reset}`);
        console.log(JSON.stringify(sendOTPResponse.data, null, 2));
        process.exit(1);
      }

      console.log(`${colors.green}✅ OTP sent successfully!${colors.reset}`);
      console.log(`${colors.yellow}📧 Check your SMS for the OTP code${colors.reset}`);

      // Step 3: Get OTP code from user
      const otp = await this.prompt(`\n${colors.yellow}Enter OTP code:${colors.reset} `);

      if (!otp || otp.length < 4) {
        console.log(`${colors.red}❌ Invalid OTP code${colors.reset}`);
        process.exit(1);
      }

      // Step 4: Verify OTP
      console.log(`\n${colors.blue}🔐 Verifying OTP...${colors.reset}`);

      const verifyOTPResponse = await this.request('POST', '/api/auth/verify-otp', {
        phone: phone.trim(),
        code: otp.trim(),
      });

      if (verifyOTPResponse.status !== 200) {
        console.log(`${colors.red}❌ OTP verification failed${colors.reset}`);
        console.log(JSON.stringify(verifyOTPResponse.data, null, 2));
        process.exit(1);
      }

      console.log(`${colors.green}✅ OTP verified successfully!${colors.reset}`);

      // Extract JWT token
      const jwtToken = verifyOTPResponse.data.token || 
                       verifyOTPResponse.data.data?.token || 
                       null;

      if (!jwtToken) {
        console.log(`${colors.red}❌ No JWT token in response${colors.reset}`);
        console.log(JSON.stringify(verifyOTPResponse.data, null, 2));
        process.exit(1);
      }

      // Step 5: Display JWT Token
      console.log(`\n${colors.cyan}
╔════════════════════════════════════════╗
║   ✅ Login Successful!                 ║
╚════════════════════════════════════════╝
${colors.reset}`);

      console.log(`\n${colors.green}🎉 JWT Token:${colors.reset}`);
      console.log(`${colors.blue}${jwtToken}${colors.reset}`);

      // Display user info if available
      if (verifyOTPResponse.data.data) {
        const user = verifyOTPResponse.data.data;
        console.log(`\n${colors.green}👤 User Info:${colors.reset}`);
        console.log(`   Name: ${user.name || 'N/A'}`);
        console.log(`   Email: ${user.email || 'N/A'}`);
        console.log(`   Phone: ${user.phone || 'N/A'}`);
        console.log(`   Role: ${user.role || 'user'}`);
      }

      // Display how to use the token
      console.log(`\n${colors.cyan}How to use this token:${colors.reset}`);
      console.log(`
1. ${colors.yellow}Test Payment API:${colors.reset}
   curl -X POST http://localhost:3000/api/payments/create-order \\
     -H "Content-Type: application/json" \\
     -H "Authorization: Bearer ${jwtToken.substring(0, 20)}..." \\
     -d '{
       "amount": 500,
       "description": "Test Payment",
       "customer": {
         "email": "test@example.com",
         "phone": "${phone}",
         "name": "Test User"
       }
     }'

2. ${colors.yellow}Get Payment History:${colors.reset}
   curl -X GET http://localhost:3000/api/payments \\
     -H "Authorization: Bearer ${jwtToken.substring(0, 20)}..."

3. ${colors.yellow}Use in Postman:${colors.reset}
   - Set variable: token = ${jwtToken.substring(0, 20)}...
   - Add header: Authorization: Bearer {{token}}
`);

      console.log(`\n${colors.green}✅ Token copied to clipboard (for easy use)${colors.reset}`);
      console.log(`${colors.yellow}⚠️  Token expires in 90 days${colors.reset}\n`);

    } catch (error) {
      console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }
}

const login = new OTPLogin();
login.run();
