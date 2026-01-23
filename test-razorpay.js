/**
 * Quick Razorpay test
 */

require('dotenv').config();
const Razorpay = require('razorpay');

console.log('🧪 Testing Razorpay Configuration\n');

console.log('Configuration:');
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? '✅ Set' : '❌ Missing');
console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? '✅ Set' : '❌ Missing');
console.log('');

try {
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  console.log('✅ Razorpay instance created successfully\n');

  // Test creating an order
  (async () => {
    try {
      console.log('Creating test order...\n');
      
      const order = await razorpay.orders.create({
        amount: 50000, // 500 rupees in paise
        currency: 'INR',
        receipt: 'test_' + Date.now(),
        description: 'Test Order'
      });

      console.log('✅ Order created successfully!\n');
      console.log('Order ID:', order.id);
      console.log('Amount:', order.amount, 'paise (₹' + (order.amount / 100) + ')');
      console.log('Status:', order.status);
      console.log('Created At:', new Date(order.created_at * 1000).toLocaleString());

    } catch (error) {
      console.error('❌ Error creating order:', error.message);
      if (error.response) {
        console.error('Response:', error.response.body);
      }
    }
  })();

} catch (error) {
  console.error('❌ Failed to initialize Razorpay:', error.message);
  process.exit(1);
}
