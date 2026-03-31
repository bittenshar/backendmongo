#!/usr/bin/env node

/**
 * Organizer Register & Auth Test Script
 * Test organizer registration, login, and event retrieval
 * 
 * Usage: node organizer-register-test.js
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
  gray: '\x1b[90m'
};

class OrganizerAuthTest {
  request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(BASE_URL + path);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              data: JSON.parse(data)
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              data: data
            });
          }
        });
      });

      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  requestWithToken(method, path, token, body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(BASE_URL + path);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              data: JSON.parse(data)
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              data: data
            });
          }
        });
      });

      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  prompt(question) {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
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
║   Organizer Register & Auth Test       ║
║   Server: ${BASE_URL.padEnd(28)} ║
╚════════════════════════════════════════╝
${colors.reset}`);

    try {
      // Menu
      const choice = await this.prompt(`\n${colors.yellow}Choose action:${colors.reset}
  1. Register new organizer
  2. Login with existing account
  
Enter choice (1 or 2): `);

      let token;
      let organizer;

      if (choice === '1') {
        // Register
        console.log(`\n${colors.blue}📝 Registration Form${colors.reset}`);
        const email = await this.prompt(`${colors.yellow}Email:${colors.reset} `);
        const password = await this.prompt(`${colors.yellow}Password (min 8 chars):${colors.reset} `);
        const confirmPassword = await this.prompt(`${colors.yellow}Confirm Password:${colors.reset} `);
        const name = await this.prompt(`${colors.yellow}Organization Name:${colors.reset} `);
        const phone = await this.prompt(`${colors.yellow}Phone:${colors.reset} `);
        const contactPerson = await this.prompt(`${colors.yellow}Contact Person:${colors.reset} `);

        if (!email || !password || !confirmPassword || !name || !phone || !contactPerson) {
          console.log(`${colors.red}❌ All required fields must be provided${colors.reset}`);
          process.exit(1);
        }

        // Optional fields
        const address = await this.prompt(`${colors.yellow}Address (optional, press Enter to skip):${colors.reset} `);
        const website = await this.prompt(`${colors.yellow}Website (optional, press Enter to skip):${colors.reset} `);
        const description = await this.prompt(`${colors.yellow}Description (optional, press Enter to skip):${colors.reset} `);

        console.log(`\n${colors.blue}🔐 Registering organizer...${colors.reset}`);
        const registerResponse = await this.request('POST', '/api/organizers/auth/register', {
          email,
          password,
          confirmPassword,
          name,
          phone,
          contactPerson,
          address: address || '',
          website: website || '',
          description: description || ''
        });

        if (registerResponse.status !== 201) {
          console.log(`${colors.red}❌ Registration failed${colors.reset}`);
          console.log(`Error: ${registerResponse.data.message || JSON.stringify(registerResponse.data)}`);
          process.exit(1);
        }

        token = registerResponse.data.token;
        organizer = registerResponse.data.data.organizer;
        console.log(`${colors.green}✅ Registration Successful!${colors.reset}`);
      } else if (choice === '2') {
        // Login
        const email = await this.prompt(`\n${colors.yellow}Enter organizer email:${colors.reset} `);
        const password = await this.prompt(`${colors.yellow}Enter password:${colors.reset} `);

        if (!email || !password) {
          console.log(`${colors.red}❌ Email and password are required${colors.reset}`);
          process.exit(1);
        }

        console.log(`\n${colors.blue}🔐 Logging in...${colors.reset}`);
        const loginResponse = await this.request('POST', '/api/organizers/auth/login', {
          email,
          password
        });

        if (loginResponse.status !== 200) {
          console.log(`${colors.red}❌ Login failed${colors.reset}`);
          console.log(`Error: ${loginResponse.data.message || JSON.stringify(loginResponse.data)}`);
          process.exit(1);
        }

        token = loginResponse.data.token;
        organizer = loginResponse.data.data.organizer;
        console.log(`${colors.green}✅ Login Successful!${colors.reset}`);
      } else {
        console.log(`${colors.red}❌ Invalid choice${colors.reset}`);
        process.exit(1);
      }

      // Display organizer info
      console.log(`\n${colors.cyan}👤 Organizer Information:${colors.reset}`);
      console.log(`   Name: ${organizer.name}`);
      console.log(`   Email: ${organizer.email}`);
      console.log(`   Phone: ${organizer.phone}`);
      console.log(`   Contact Person: ${organizer.contactPerson}`);
      console.log(`   Status: ${organizer.status}`);
      console.log(`   Join Date: ${new Date(organizer.joinDate).toLocaleString()}`);

      // Fetch profile options
      const profileChoice = await this.prompt(`\n${colors.yellow}Fetch profile:${colors.reset}
  1. Profile only
  2. Profile + Events Summary
  3. Profile + Full Events List

Enter choice (1, 2, or 3): `);

      console.log(`\n${colors.blue}📊 Fetching profile...${colors.reset}`);
      let profilePath = '/api/organizers/auth/profile';
      if (profileChoice === '2') {
        profilePath += '?include=summary';
      } else if (profileChoice === '3') {
        profilePath += '?include=events';
      }

      const profileResponse = await this.requestWithToken('GET', profilePath, token);

      if (profileResponse.status !== 200) {
        console.log(`${colors.red}❌ Failed to fetch profile${colors.reset}`);
        console.log(JSON.stringify(profileResponse.data, null, 2));
        process.exit(1);
      }

      console.log(`${colors.green}✅ Profile Fetched!${colors.reset}`);

      if (profileResponse.data.data.events) {
        const eventsSummary = profileResponse.data.data.events.summary;
        console.log(`\n${colors.cyan}📅 Events Summary:${colors.reset}`);
        console.log(`   Total Events: ${eventsSummary.total}`);
        console.log(`   Active Events: ${eventsSummary.active}`);
        console.log(`   Upcoming Events: ${eventsSummary.upcoming}`);
        console.log(`   Past Events: ${eventsSummary.past}`);

        if (profileResponse.data.data.events.list && profileResponse.data.data.events.list.length > 0) {
          console.log(`\n${colors.cyan}📋 Events List:${colors.reset}`);
          profileResponse.data.data.events.list.forEach((event, index) => {
            console.log(`\n   ${colors.yellow}${index + 1}. ${event.name}${colors.reset}`);
            console.log(`      Location: ${event.location}`);
            console.log(`      Date: ${new Date(event.date).toLocaleDateString()}`);
            console.log(`      Status: ${event.status}`);
            if (event.seatings && event.seatings.length > 0) {
              console.log(`      ${colors.gray}Seating Types:${colors.reset}`);
              event.seatings.forEach(seat => {
                console.log(`        - ${seat.seatType}: ₹${seat.price}`);
              });
            }
          });
        }
      }

      // Display JWT Token
      console.log(`\n${colors.green}🔑 JWT Token (valid for 7 days):${colors.reset}`);
      console.log(`${colors.gray}${token.substring(0, 50)}...${colors.reset}`);

      // Instructions for API usage
      console.log(`\n${colors.cyan}═══════════════════════════════════════${colors.reset}`);
      console.log(`${colors.cyan}📚 API Endpoints:${colors.reset}`);
      console.log(`\n${colors.yellow}POST /api/organizers/auth/register${colors.reset}`);
      console.log(`   Create new organizer account`);
      console.log(`\n${colors.yellow}POST /api/organizers/auth/login${colors.reset}`);
      console.log(`   Login with email and password`);
      console.log(`\n${colors.yellow}GET /api/organizers/auth/profile${colors.reset}`);
      console.log(`   Get profile only`);
      console.log(`\n${colors.yellow}GET /api/organizers/auth/profile?include=summary${colors.reset}`);
      console.log(`   Get profile + events summary`);
      console.log(`\n${colors.yellow}GET /api/organizers/auth/profile?include=events${colors.reset}`);
      console.log(`   Get profile + full events list`);
      console.log(`\n${colors.yellow}PATCH /api/organizers/auth/profile${colors.reset}`);
      console.log(`   Update your profile`);
      console.log(`\n${colors.yellow}PATCH /api/organizers/auth/change-password${colors.reset}`);
      console.log(`   Change your password`);
      console.log(`\n${colors.yellow}GET /api/organizers/auth/logout${colors.reset}`);
      console.log(`   Logout`);

      console.log(`\n${colors.cyan}═══════════════════════════════════════${colors.reset}`);
      console.log(`\n${colors.green}✅ Test completed successfully!${colors.reset}\n`);

    } catch (error) {
      console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }
}

const tester = new OrganizerAuthTest();
tester.run();
