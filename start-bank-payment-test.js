/**
 * Test Bank Payment Server
 * Serves test pages for bank/card/UPI payments
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/') {
    // Serve index with links
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Test Dashboard</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            text-align: center;
          }
          h1 { color: #333; margin-bottom: 30px; }
          .btn {
            display: block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 15px;
            border-radius: 6px;
            margin: 10px 0;
            font-weight: 600;
            transition: transform 0.2s;
          }
          .btn:hover {
            transform: translateY(-2px);
          }
          .btn.secondary {
            background: #6c757d;
          }
          .info {
            background: #f0f4ff;
            padding: 15px;
            border-radius: 6px;
            margin-top: 20px;
            text-align: left;
            font-size: 14px;
            color: #555;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>💳 Payment Testing Dashboard</h1>
          
          <a href="/debug" class="btn">🔧 Debug Payment Flow</a>
          <a href="/test-payment" class="btn secondary">🏦 Simple Bank Test</a>
          
          <div class="info">
            <strong>Test Card:</strong> 4111111111111111<br>
            <strong>Expiry:</strong> Any future date<br>
            <strong>CVV:</strong> Any 3 digits<br>
            <strong>UPI:</strong> success@razorpay
          </div>
        </div>
      </body>
      </html>
    `);
  } else if (req.url === '/debug' || req.url === '/debug.html') {
    const filePath = path.join(__dirname, 'payment-debug.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>Error loading debug page</h1><p>' + err.message + '</p>');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else if (req.url === '/test-payment' || req.url === '/test-payment.html') {
    const filePath = path.join(__dirname, 'test-bank-payment.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>Error loading payment test page</h1><p>' + err.message + '</p>');
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
  console.log('\n' + '='.repeat(70));
  console.log('🏦 Test Payment Server Started');
  console.log('='.repeat(70));
  console.log('');
  console.log('📱 Open in your browser:');
  console.log(`   Dashboard: http://localhost:${PORT}`);
  console.log(`   Debug Test: http://localhost:${PORT}/debug`);
  console.log(`   Simple Test: http://localhost:${PORT}/test-payment`);
  console.log('');
  console.log('='.repeat(70));
});
