/**
 * Test Razorpay Payment Creation
 * Creates actual test payments directly via Razorpay API
 */

require('dotenv').config();
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function testRazorpayPayment() {
  try {
    console.log('🧪 Testing Razorpay Payment Creation\n');

    // Step 1: Create order directly via Razorpay API
    console.log('1️⃣  Creating Razorpay order...');
    const orderOptions = {
      amount: 50000, // 500 rupees in paise
      currency: 'INR',
      receipt: `test_${Date.now()}`,
      description: 'Test Payment',
      notes: {
        testId: Date.now(),
        purpose: 'Payment Testing'
      }
    };

    console.log('📝 Order options:', orderOptions);
    const order = await razorpay.orders.create(orderOptions);
    
    console.log('✅ Order created successfully:');
    console.log('   Order ID: ' + order.id);
    console.log('   Amount: ₹' + (order.amount / 100));
    console.log('   Status: ' + order.status);
    console.log('   Currency: ' + order.currency);
    console.log('   Receipt: ' + order.receipt);
    console.log('');

    // Step 2: List recent payments to show test payments made
    console.log('2️⃣  Fetching recent payments...');
    try {
      const payments = await razorpay.payments.all({ count: 5 });
      console.log('✅ Recent payments retrieved:');
      console.log('   Total count: ' + (payments.count || 0));
      if (payments.items && payments.items.length > 0) {
        payments.items.forEach((payment, index) => {
          console.log(`   Payment ${index + 1}:`);
          console.log(`     ID: ${payment.id}`);
          console.log(`     Amount: ₹${payment.amount / 100}`);
          console.log(`     Status: ${payment.status}`);
          console.log(`     Method: ${payment.method || 'N/A'}`);
        });
      } else {
        console.log('   No payments found yet');
      }
    } catch (payError) {
      console.log('ℹ️  Payment fetch info:', payError.message);
    }
    console.log('');

    // Step 3: Demonstrate how to create QR Code payments
    console.log('3️⃣  QR Code Payment Option (Available):');
    console.log('   QR Code payments allow customers to pay via UPI');
    console.log('   Features:');
    console.log('   - single_use: QR closes after one payment');
    console.log('   - multiple_use: QR accepts multiple payments');
    console.log('   - fixed_amount: Lock to specific amount');
    console.log('   - Example: Create QR for ₹500 fixed amount');
    console.log('');

    console.log('\n' + '='.repeat(70));
    console.log('💡 How to Complete Payments in Razorpay Test Mode:');
    console.log('='.repeat(70));
    console.log('');
    console.log('📊 Order Created:');
    console.log('   Order ID: ' + order.id);
    console.log('   Amount: ₹' + (order.amount / 100));
    console.log('   Status: ' + order.status);
    console.log('');
    console.log('💳 Test Card Details:');
    console.log('   Card Number: 4111111111111111');
    console.log('   Expiry: Any future date (MM/YY)');
    console.log('   CVV: Any 3-digit number');
    console.log('   Name: Any name');
    console.log('');
    console.log('📲 UPI Test ID: success@razorpay');
    console.log('');
    console.log('🔗 Complete Payment at:');
    console.log('   Dashboard: https://dashboard.razorpay.com');
    console.log('   Mode: Test');
    console.log('');
    console.log('✅ After Payment:');
    console.log('   You will receive: payment_id, razorpay_signature');
    console.log('   Verify signature: POST /api/payments/verify-payment');
    console.log('='.repeat(70));
    console.log('');

    // Step 4: Show test payment endpoints
    console.log('🛠️  Test Payment Endpoints:');
    console.log('');
    console.log('1. Create Order:');
    console.log('   POST /api/payments/create-order');
    console.log('   Body: { "amount": 500, "description": "Test Payment" }');
    console.log('');
    console.log('2. Verify Payment:');
    console.log('   POST /api/payments/verify-payment');
    console.log('   Body: {');
    console.log('     "orderId": "' + order.id + '",');
    console.log('     "paymentId": "pay_XXXXXXXXXX",');
    console.log('     "signature": "signature_hash"');
    console.log('   }');
    console.log('');
    console.log('3. Get Payment Status:');
    console.log('   GET /api/payments/status/:paymentId');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Full error details:');
    console.error(error);
    process.exit(1);
  }
}

testRazorpayPayment();
