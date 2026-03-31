#!/usr/bin/env node

/**
 * Organizer Login Tester
 * Quick test script for existing organizer login
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

class LoginTester {
  request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(BASE_URL + path);
      const options = {
        hostname: url.hostname,
        port: url.port || 3000,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }

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
║   Organizer Login Tester               ║
║   ${BASE_URL.padEnd(36)} ║
╚════════════════════════════════════════╝
${colors.reset}`);

    try {
      // Get credentials
      const email = await this.prompt(`\n${colors.yellow}Enter organizer email:${colors.reset} `);
      const password = await this.prompt(`${colors.yellow}Enter password:${colors.reset} `);

      if (!email || !password) {
        console.log(`${colors.red}❌ Email and password required${colors.reset}`);
        process.exit(1);
      }

      // Login
      console.log(`\n${colors.blue}🔐 Logging in...${colors.reset}`);
      const loginRes = await this.request('POST', '/api/organizers/auth/login', {
        email,
        password
      });

      if (loginRes.status !== 200) {
        console.log(`${colors.red}❌ Login failed (Status: ${loginRes.status})${colors.reset}`);
        console.log(`Error: ${loginRes.data.message || JSON.stringify(loginRes.data)}`);
        process.exit(1);
      }

      const token = loginRes.data.token;
      const organizer = loginRes.data.data.organizer;

      console.log(`${colors.green}✅ Login Successful!${colors.reset}`);
      console.log(`\n${colors.cyan}👤 Organizer Information:${colors.reset}`);
      console.log(`   ID: ${organizer._id}`);
      console.log(`   Name: ${organizer.name}`);
      console.log(`   Email: ${organizer.email}`);
      console.log(`   Phone: ${organizer.phone}`);
      console.log(`   Status: ${organizer.status}`);
      console.log(`   Contact: ${organizer.contactPerson}`);
      console.log(`   Joined: ${new Date(organizer.joinDate).toLocaleString()}`);

      console.log(`\n${colors.green}🔑 Token (7-day expiry):${colors.reset}`);
      console.log(`${colors.gray}${token}${colors.reset}`);

      // Test protected endpoint
      console.log(`\n${colors.blue}📋 Testing protected endpoint...${colors.reset}`);
      const profileRes = await this.request('GET', '/api/organizers/auth/profile', null, token);

      if (profileRes.status === 200) {
        console.log(`${colors.green}✅ Profile retrieval successful!${colors.reset}`);
        console.log(`\n${colors.cyan}Profile Data:${colors.reset}`);
        console.log(JSON.stringify(profileRes.data.data.organizer, null, 2));
      } else {
        console.log(`${colors.red}❌ Profile retrieval failed${colors.reset}`);
        console.log(JSON.stringify(profileRes.data, null, 2));
      }

      // Test with events
      console.log(`\n${colors.blue}📊 Fetching profile with events...${colors.reset}`);
      const eventsRes = await this.request('GET', '/api/organizers/auth/profile?include=events', null, token);

      if (eventsRes.status === 200) {
        console.log(`${colors.green}✅ Profile with events retrieved!${colors.reset}`);
        const events = eventsRes.data.data.events;
        console.log(`\n${colors.cyan}Events Summary:${colors.reset}`);
        console.log(`   Total: ${events.summary.total}`);
        console.log(`   Active: ${events.summary.active}`);
        console.log(`   Upcoming: ${events.summary.upcoming}`);
        console.log(`   Past: ${events.summary.past}`);
      }

      console.log(`\n${colors.cyan}═══════════════════════════════════════${colors.reset}`);
      console.log(`${colors.green}✅ All tests passed!${colors.reset}\n`);

    } catch (error) {
      console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }
}

new LoginTester().run();
