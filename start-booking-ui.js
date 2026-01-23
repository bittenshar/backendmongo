/**
 * Simple HTTP Server for Booking UI
 * Serves the HTML file and enables testing of the booking system
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/' || req.url === '/booking') {
    const filePath = path.join(__dirname, 'booking-ui.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>Error loading booking page</h1>');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>404 - Page Not Found</h1>');
  }
});

server.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🌐 Booking UI Server Started');
  console.log('='.repeat(60));
  console.log('');
  console.log('📱 Open in your browser:');
  console.log(`   👉 http://localhost:${PORT}/booking`);
  console.log('');
  console.log('✨ Features:');
  console.log('   ✓ Face verification check');
  console.log('   ✓ Event booking form');
  console.log('   ✓ Razorpay payment integration');
  console.log('   ✓ Real checkout modal');
  console.log('');
  console.log('🎟️  Test Credentials:');
  console.log('   Email: test@example.com');
  console.log('   Password: test123');
  console.log('');
  console.log('💳 Test Card:');
  console.log('   Card: 4111111111111111');
  console.log('   Expiry: Any future date');
  console.log('   CVV: Any 3 digits');
  console.log('');
  console.log('='.repeat(60));
  console.log('');
});

process.on('SIGINT', () => {
  console.log('\n🛑 Server shutting down...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});
