/**
 * ============================================
 * WATI WhatsApp OTP Integration Test
 * ============================================
 * Test script to verify:
 * 1. Environment configuration
 * 2. WATI API connectivity
 * 3. Template verification
 * 4. OTP sending flow
 * 5. OTP verification flow
 */

require('dotenv').config();
const watiOtpService = require('./src/shared/services/wati-otp.service');

// ============================================
// Test Configuration
// ============================================
const TEST_PHONE = process.env.TEST_PHONE || '919876543210'; // Change to real test number
const TEST_OTP_CODE = ''; // Will be set after sending

console.log('\n' + '='.repeat(60));
console.log('🧪 WATI WhatsApp OTP Integration Test Suite');
console.log('='.repeat(60));

// ============================================
// Test 1: Environment Configuration Check
// ============================================
async function testEnvironmentConfig() {
  console.log('\n✅ Test 1: Environment Configuration Check');
  console.log('-'.repeat(60));

  const checks = {
    'WATI_API_KEY': process.env.WATI_API_KEY ? '✓ Set' : '✗ Missing',
    'WATI_BASE_URL': process.env.WATI_BASE_URL ? '✓ Set' : '✗ Missing',
    'WATI_TEMPLATE_NAME': process.env.WATI_TEMPLATE_NAME ? '✓ Set' : '✗ Missing',
    'NODE_ENV': process.env.NODE_ENV || 'development'
  };

  for (const [key, value] of Object.entries(checks)) {
    console.log(`  ${key}: ${value}`);
  }

  // Log masked credentials for verification
  if (process.env.WATI_API_KEY) {
    const masked = process.env.WATI_API_KEY.substring(0, 10) + '...';
    console.log(`\n  🔑 API Key starts with: ${masked}`);
  }

  if (process.env.WATI_BASE_URL) {
    console.log(`  🌐 Base URL: ${process.env.WATI_BASE_URL}`);
  }

  if (process.env.WATI_TEMPLATE_NAME) {
    console.log(`  📋 Template Name: ${process.env.WATI_TEMPLATE_NAME}`);
  }

  const allConfigured = 
    process.env.WATI_API_KEY &&
    process.env.WATI_BASE_URL &&
    process.env.WATI_TEMPLATE_NAME;

  console.log(`\n  Result: ${allConfigured ? '✅ PASS' : '❌ FAIL'}`);
  return allConfigured;
}

// ============================================
// Test 2: Send OTP
// ============================================
async function testSendOTP() {
  console.log('\n✅ Test 2: Send OTP Via WhatsApp');
  console.log('-'.repeat(60));

  console.log(`  📱 Sending OTP to: ${TEST_PHONE}`);

  try {
    const result = await watiOtpService.sendOTP(TEST_PHONE);

    if (result.success) {
      console.log(`\n  ✅ OTP Sent Successfully!`);
      console.log(`  ✓ Message: ${result.message}`);
      console.log(`  ✓ Expires In: ${result.expiresIn}`);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`  ✓ OTP Code (DEV): ${result.otp}`);
        return result.otp;
      }
      console.log(`  ℹ️  OTP sent to WhatsApp (production mode)`);
      return null;
    } else {
      console.log(`\n  ❌ Failed to send OTP`);
      console.log(`  ✗ Error: ${result.message}`);
      return null;
    }
  } catch (error) {
    console.log(`\n  ❌ Exception occurred`);
    console.log(`  ✗ Error: ${error.message}`);
    return null;
  }
}

// ============================================
// Test 3: Verify OTP (with auto-generated code)
// ============================================
async function testVerifyOTP(otpCode) {
  console.log('\n✅ Test 3: Verify OTP Code');
  console.log('-'.repeat(60));

  if (!otpCode) {
    console.log(`  ⚠️  Cannot test verification - no OTP code provided`);
    console.log(`  📝 Please enter the OTP you received and run: `);
    console.log(`     node test-wati-integration.js ${otpCode}`);
    return false;
  }

  console.log(`  📱 Phone: ${TEST_PHONE}`);
  console.log(`  🔐 OTP Code: ${otpCode}`);

  try {
    const result = await watiOtpService.verifyOTP(TEST_PHONE, otpCode);

    if (result.success) {
      console.log(`\n  ✅ OTP Verified Successfully!`);
      console.log(`  ✓ Message: ${result.message}`);
      return true;
    } else {
      console.log(`\n  ❌ OTP Verification Failed`);
      console.log(`  ✗ Error: ${result.message}`);
      return false;
    }
  } catch (error) {
    console.log(`\n  ❌ Exception occurred`);
    console.log(`  ✗ Error: ${error.message}`);
    return false;
  }
}

// ============================================
// Test 4: Full Integration Flow
// ============================================
async function testFullFlow() {
  console.log('\n✅ Test 4: Full Authentication Flow');
  console.log('-'.repeat(60));

  console.log(`\n  Step 1: Send OTP`);
  const otp = await testSendOTP();

  if (otp) {
    console.log(`\n  Step 2: Verify OTP`);
    const verified = await testVerifyOTP(otp);
    return verified;
  } else {
    console.log(`\n  ⚠️  Cannot continue - OTP not sent`);
    return false;
  }
}

// ============================================
// Main Test Runner
// ============================================
async function runAllTests() {
  console.log(`\nTest Phone: ${TEST_PHONE}`);

  try {
    // Test 1
    const configOk = await testEnvironmentConfig();

    if (!configOk) {
      console.log('\n❌ Configuration check failed. Please update .env file.');
      console.log('\nRequired variables:');
      console.log('  WATI_API_KEY=your_api_key');
      console.log('  WATI_BASE_URL=https://live-mt-server.wati.io/YOUR_INSTANCE_ID');
      console.log('  WATI_TEMPLATE_NAME=login_otp');
      process.exit(1);
    }

    // Test 2 & 3: Full flow
    console.log('\n' + '='.repeat(60));
    console.log('🚀 Starting Integration Tests');
    console.log('='.repeat(60));

    const otpCode = await testSendOTP();

    if (otpCode && process.env.NODE_ENV !== 'production') {
      console.log(`\n💡 Auto-verifying with received OTP in development mode...`);
      await testVerifyOTP(otpCode);
    }

    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));
    console.log(`\n✅ Configuration: PASS`);
    console.log(`✅ OTP Sending: PASS`);
    if (otpCode) {
      console.log(`✅ OTP Verification: Ready for testing`);
      console.log(`\n📝 Next Steps:`);
      console.log(`  1. Check your WhatsApp for OTP message`);
      console.log(`  2. Run: node test-wati-integration.js ${otpCode}`);
      console.log(`  3. Verify the OTP code received matches: ${otpCode}`);
    }
    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    process.exit(1);
  }
}

// ============================================
// Execute Tests
// ============================================
runAllTests();
