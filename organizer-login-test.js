#!/usr/bin/env node

/**
 * Organizer Login Test Script
 * Test organizer login and retrieve events
 * 
 * Usage: node organizer-login-test.js
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

class OrganizerLoginTest {
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
║   Organizer Login & Events Test        ║
║   Server: ${BASE_URL.padEnd(28)} ║
╚════════════════════════════════════════╝
${colors.reset}`);

    try {
      // Step 1: Get login credentials
      const email = await this.prompt(`\n${colors.yellow}Enter organizer email:${colors.reset} `);
      const password = await this.prompt(`${colors.yellow}Enter password:${colors.reset} `);

      if (!email || !password) {
        console.log(`${colors.red}❌ Email and password are required${colors.reset}`);
        process.exit(1);
      }

      // Step 2: Login
      console.log(`\n${colors.blue}🔐 Logging in...${colors.reset}`);
      const loginResponse = await this.request('POST', '/api/organizers/auth/login', {
        email,
        password
      });

      if (loginResponse.status !== 200) {
        console.log(`${colors.red}❌ Login failed${colors.reset}`);
        console.log(JSON.stringify(loginResponse.data, null, 2));
        process.exit(1);
      }

      const token = loginResponse.data.token;
      const organizer = loginResponse.data.data.organizer;

      console.log(`${colors.green}✅ Login Successful!${colors.reset}`);
      console.log(`\n${colors.cyan}👤 Organizer Information:${colors.reset}`);
      console.log(`   Name: ${organizer.name}`);
      console.log(`   Email: ${organizer.email}`);
      console.log(`   Phone: ${organizer.phone}`);
      console.log(`   Status: ${organizer.status}`);
      console.log(`   Total Events: ${organizer.totalEvents}`);
      console.log(`   Active Events: ${organizer.activeEvents}`);
      console.log(`   Last Login: ${new Date(organizer.lastLogin).toLocaleString()}`);

      // Step 3: Get details with events
      console.log(`\n${colors.blue}📊 Fetching organizer details with events...${colors.reset}`);
      const detailsResponse = await this.requestWithToken(
        'GET',
        '/api/organizers/auth/details-with-events',
        token
      );

      if (detailsResponse.status !== 200) {
        console.log(`${colors.red}❌ Failed to fetch details${colors.reset}`);
        console.log(JSON.stringify(detailsResponse.data, null, 2));
        process.exit(1);
      }

      const events = detailsResponse.data.data.events;

      console.log(`${colors.green}✅ Details Fetched!${colors.reset}`);
      console.log(`\n${colors.cyan}📅 Events Summary:${colors.reset}`);
      console.log(`   Total Events: ${events.total}`);
      console.log(`   Active Events: ${events.active}`);
      console.log(`   Past Events: ${events.past}`);

      if (events.list && events.list.length > 0) {
        console.log(`\n${colors.cyan}📋 Events List:${colors.reset}`);
        events.list.forEach((event, index) => {
          console.log(`\n   ${colors.yellow}${index + 1}. ${event.name}${colors.reset}`);
          console.log(`      Location: ${event.location}`);
          console.log(`      Date: ${new Date(event.date).toLocaleDateString()}`);
          console.log(`      Time: ${new Date(event.startTime).toLocaleTimeString()} - ${new Date(event.endTime).toLocaleTimeString()}`);
          console.log(`      Description: ${event.description}`);
          if (event.seatings && event.seatings.length > 0) {
            console.log(`      ${colors.gray}Seating Types:${colors.reset}`);
            event.seatings.forEach(seat => {
              console.log(`        - ${seat.seatType}: ₹${seat.price} (${seat.totalSeats} total, ${seat.seatsSold} sold)`);
            });
          }
        });
      } else {
        console.log(`\n${colors.gray}No events found${colors.reset}`);
      }

      // Step 4: Get my events
      console.log(`\n${colors.blue}🎪 Fetching your events list...${colors.reset}`);
      const myEventsResponse = await this.requestWithToken(
        'GET',
        '/api/organizers/auth/my-events',
        token
      );

      if (myEventsResponse.status === 200) {
        const myEventsSummary = myEventsResponse.data.data.summary;
        console.log(`${colors.green}✅ Events fetched!${colors.reset}`);
        console.log(`\n${colors.cyan}📊 My Events Summary:${colors.reset}`);
        console.log(`   Total: ${myEventsSummary.total}`);
        console.log(`   Active: ${myEventsSummary.active}`);
        console.log(`   Upcoming: ${myEventsSummary.upcoming}`);
        console.log(`   Past: ${myEventsSummary.past}`);
      }

      // Display JWT Token
      console.log(`\n${colors.green}🔑 JWT Token (valid for 7 days):${colors.reset}`);
      console.log(`${colors.gray}${token}${colors.reset}`);

      // Instructions for API usage
      console.log(`\n${colors.cyan}═══════════════════════════════════════${colors.reset}`);
      console.log(`${colors.cyan}📚 API Endpoints:${colors.reset}`);
      console.log(`\n${colors.yellow}GET /api/organizers/auth/profile${colors.reset}`);
      console.log(`   Get your profile information`);
      console.log(`\n${colors.yellow}GET /api/organizers/auth/details-with-events${colors.reset}`);
      console.log(`   Get profile with all events`);
      console.log(`\n${colors.yellow}GET /api/organizers/auth/my-events${colors.reset}`);
      console.log(`   Get only your events list`);
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

const tester = new OrganizerLoginTest();
tester.run();
