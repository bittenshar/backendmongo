const http = require('http');

// First login to get token
const loginData = JSON.stringify({
  email: 'd@example.com',
  password: 'Test@1234'
});

const loginOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

console.log('🔍 Logging in to get JWT token...\n');

const loginReq = http.request(loginOptions, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const loginResponse = JSON.parse(data);
      const token = loginResponse.token;
      const userId = loginResponse.data.user.userId;
      
      console.log('✅ Login successful!');
      console.log(`Token: ${token.substring(0, 50)}...`);
      console.log(`UserId: ${userId}\n`);
      
      // Now test image status endpoint
      console.log('🔍 Testing /api/get-image-status endpoint...\n');
      
      const imageStatusOptions = {
        hostname: 'localhost',
        port: 3000,
        path: `/api/get-image-status/${userId}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };
      
      const imageReq = http.request(imageStatusOptions, (res) => {
        let statusData = '';
        res.on('data', chunk => statusData += chunk);
        res.on('end', () => {
          console.log('✅ Response received:\n');
          console.log(JSON.stringify(JSON.parse(statusData), null, 2));
        });
      });
      
      imageReq.on('error', (e) => {
        console.error('❌ Error:', e.message);
      });
      
      imageReq.end();
      
    } catch (e) {
      console.error('❌ Login failed:', e.message);
      console.error('Response:', data);
    }
  });
});

loginReq.on('error', (e) => {
  console.error('❌ Login request error:', e.message);
});

loginReq.write(loginData);
loginReq.end();
