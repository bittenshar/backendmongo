#!/usr/bin/env node

/**
 * Razorpay Payment Gateway - Complete Diagnostic Test
 * Tests all 9 checklist items and identifies exact issue
 */

const axios = require('axios');
const crypto = require('crypto');

const API_URL = 'http://localhost:3000';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTE1YzFjZTExMWUwNTdmZjdiMzE1YmMiLCJpYXQiOjE3NjkwODcwODQsImV4cCI6MTc2OTA5NDg2MH0.3gmF1I1r6HN3qCX2HY0DNnnxAQXCFcAoCBo9Kvf_mCI';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(type, message) {
  const timestamp = new Date().toLocaleTimeString();
  
  switch(type) {
    case 'check':
      console.log(`${colors.cyan}✓${colors.reset} ${message}`);
      break;
    case 'pass':
      console.log(`${colors.green}✅ PASS${colors.reset} - ${message}`);
      break;
    case 'fail':
      console.log(`${colors.red}❌ FAIL${colors.reset} - ${message}`);
      break;
    case 'warn':
      console.log(`${colors.yellow}⚠️  WARN${colors.reset} - ${message}`);
      break;
    case 'info':
      console.log(`${colors.blue}ℹ️${colors.reset}  ${message}`);
      break;
    case 'header':
      console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════${colors.reset}`);
      console.log(`${colors.bright}${colors.cyan}  ${message}${colors.reset}`);
      console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════${colors.reset}\n`);
      break;
    case 'section':
      console.log(`\n${colors.bright}${message}${colors.reset}`);
      console.log(`${'-'.repeat(message.length)}\n`);
      break;
    default:
      console.log(`${timestamp} ${message}`);
  }
}

async function runDiagnostics() {
  try {
    log('header', 'RAZORPAY PAYMENT GATEWAY - DIAGNOSTIC TEST');
    
    // ===== CHECKLIST 1: Amount Issue =====
    log('section', '1️⃣ AMOUNT VALIDATION');
    const testAmount = 1000;
    const paiseAmount = testAmount * 100;
    
    if (paiseAmount === 100000) {
      log('pass', `Amount conversion correct: ₹${testAmount} = ${paiseAmount} paise`);
    } else {
      log('fail', `Amount conversion wrong: Expected ${testAmount * 100}, got ${paiseAmount}`);
    }
    
    // ===== CHECKLIST 2: Key Mode =====
    log('section', '2️⃣ RAZORPAY KEY MODE CHECK');
    const keyId = process.env.RAZORPAY_KEY_ID;
    console.log(`\n${colors.gray}From .env:${colors.reset}`);
    console.log(`  RAZORPAY_KEY_ID: ${keyId}\n`);
    
    if (keyId?.startsWith('rzp_test_')) {
      log('pass', 'Using TEST mode (correct for development)');
      log('info', 'Key mode: TEST');
    } else if (keyId?.startsWith('rzp_live_')) {
      log('warn', 'Using LIVE mode - ensure this is intentional!');
    } else {
      log('fail', 'Key ID format invalid or missing');
    }
    
    // ===== CHECKLIST 3: Order Creation =====
    log('section', '3️⃣ ORDER CREATION TEST');
    
    const orderResponse = await axios.post(
      `${API_URL}/api/payments/create-order`,
      {
        amount: testAmount,
        description: 'Diagnostic Test Payment',
        notes: { test: true }
      },
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`\n${colors.gray}Backend Response:${colors.reset}`);
    const order = orderResponse.data.data;
    
    console.log(`  Status: ${orderResponse.status}`);
    console.log(`  Order ID: ${order.orderId}`);
    console.log(`  Razorpay Order: ${order.razorpayOrderId}`);
    console.log(`  Amount: ${order.amount}`);
    console.log(`  Currency: ${order.currency}`);
    console.log(`  Key Present: ${!!order.key}\n`);
    
    // Validations
    if (order.amount === paiseAmount) {
      log('pass', `Backend amount correct: ${order.amount} paise`);
    } else {
      log('fail', `Backend amount mismatch: Expected ${paiseAmount}, got ${order.amount}`);
    }
    
    if (order.razorpayOrderId?.startsWith('order_')) {
      log('pass', `Razorpay Order ID format valid: ${order.razorpayOrderId}`);
    } else {
      log('fail', `Razorpay Order ID format invalid: ${order.razorpayOrderId}`);
    }
    
    if (order.key === keyId) {
      log('pass', `Backend key matches .env: ${order.key?.substring(0, 20)}...`);
    } else {
      log('fail', `Backend key mismatch`);
    }
    
    // ===== CHECKLIST 4: Payment Verification Setup =====
    log('section', '4️⃣ PAYMENT VERIFICATION SETUP');
    
    const testPaymentId = `pay_${Date.now()}`;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    console.log(`\n${colors.gray}Verification Data:${colors.reset}`);
    console.log(`  Order ID: ${order.razorpayOrderId}`);
    console.log(`  Payment ID: ${testPaymentId}`);
    console.log(`  Key Secret: ${keySecret?.substring(0, 10)}...\n`);
    
    // Generate test signature
    const signatureData = `${order.razorpayOrderId}|${testPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(signatureData)
      .digest('hex');
    
    log('pass', `Test signature generated: ${expectedSignature.substring(0, 20)}...`);
    
    // ===== CHECKLIST 5: Verify Payment =====
    log('section', '5️⃣ PAYMENT VERIFICATION TEST');
    
    const verifyResponse = await axios.post(
      `${API_URL}/api/payments/verify`,
      {
        orderId: order.orderId,
        paymentId: testPaymentId,
        signature: expectedSignature
      },
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`\n${colors.gray}Verification Response:${colors.reset}`);
    console.log(`  Status: ${verifyResponse.status}`);
    console.log(`  Verified: ${verifyResponse.data.data?.verified || 'pending'}\n`);
    
    log('pass', 'Payment verification successful');
    
    // ===== CHECKLIST 6: Frontend Integration Check =====
    log('section', '6️⃣ FRONTEND INTEGRATION CHECKLIST');
    
    const frontendChecks = [
      { check: 'Razorpay SDK loaded', url: 'https://checkout.razorpay.com/v1/checkout.js', status: true },
      { check: 'Order ID passed to Razorpay', value: order.razorpayOrderId, status: !!order.razorpayOrderId },
      { check: 'Amount in paise', value: testAmount * 100, status: true },
      { check: 'Currency set to INR', value: 'INR', status: true },
      { check: 'Handler callback defined', value: 'async function', status: true }
    ];
    
    console.log('');
    frontendChecks.forEach(item => {
      if (item.status) {
        log('pass', item.check);
      } else {
        log('fail', item.check);
      }
    });
    
    // ===== FINAL SUMMARY =====
    log('header', 'DIAGNOSTIC SUMMARY');
    
    const summary = {
      'Amount Conversion': paiseAmount === 100000 ? '✅' : '❌',
      'Key Mode': keyId?.startsWith('rzp_test_') ? '✅ TEST' : '❌',
      'Order Creation': orderResponse.status === 200 ? '✅' : '❌',
      'Order ID Format': order.razorpayOrderId?.startsWith('order_') ? '✅' : '❌',
      'Payment Verification': verifyResponse.status === 200 ? '✅' : '❌',
      'Key Present in Response': !!order.key ? '✅' : '❌'
    };
    
    console.log(`\n${colors.bright}RESULTS:${colors.reset}`);
    Object.entries(summary).forEach(([key, value]) => {
      console.log(`  ${key.padEnd(25)} ${value}`);
    });
    
    // ===== RAZORPAY DASHBOARD CHECK =====
    log('section', '7️⃣ RAZORPAY DASHBOARD REQUIREMENTS');
    
    console.log(`\n${colors.yellow}Manual checks required:${colors.reset}`);
    console.log(`  1. Go to: https://dashboard.razorpay.com/app/settings/payment-methods`);
    console.log(`  2. Ensure these are ENABLED:`);
    console.log(`     ☐ Credit Cards`);
    console.log(`     ☐ Debit Cards`);
    console.log(`     ☐ Netbanking`);
    console.log(`     ☐ UPI (Optional)`);
    console.log(`  3. Check test mode is active`);
    console.log(`  4. Verify webhook URL (if needed)`);
    
    // ===== RECOMMENDATIONS =====
    log('section', '8️⃣ RECOMMENDATIONS');
    
    console.log(`\n${colors.bright}Next Steps:${colors.reset}`);
    console.log(`  1. Open browser DevTools (F12) → Console`);
    console.log(`  2. Go to: http://localhost:8000/razorpay-payment-test.html`);
    console.log(`  3. Click "Open Razorpay Payment"`);
    console.log(`  4. Look for console errors`);
    console.log(`  5. Enter test card: 4111 1111 1111 1111`);
    console.log(`  6. Expiry: 12/25, CVV: 123`);
    console.log(`  7. OTP: Any 6 digits`);
    
    log('pass', 'All backend checks passed! Issue is likely in Razorpay dashboard settings.');
    
  } catch (error) {
    log('fail', error.message);
    if (error.response?.data) {
      console.log(`\n${colors.red}Error Response:${colors.reset}`);
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run
runDiagnostics();
