const axios = require('axios');
const BASE_URL = 'http://localhost:3000/api';

const testPayload = {
  amount: 500.0,
  description: "Music Festival 2024",
  eventId: "694291bb1e613c43e1b18a76",
  quantity: 1,
  seatingId: "694291bb1e613c43e1b18a77"
};

(async () => {
  try {
    // Step 1: Authenticate
    console.log('🔑 Step 1: Authenticating user...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, { 
      email: 'test@example.com', 
      password: 'test123' 
    });
    const token = loginRes.data.token;
    const userId = loginRes.data.data.user._id;
    console.log('✅ Authenticated! User ID:', userId);
    console.log('✅ Token:', token.substring(0, 30) + '...\n');
    
    // Step 2: Verify Event & Seating exist
    console.log('📋 Step 2: Verifying event and seating...');
    const eventRes = await axios.get(`${BASE_URL}/events/${testPayload.eventId}`);
    const event = eventRes.data.data.event;
    console.log('✅ Event found:', event.name);
    
    const seating = event.seatings.find(s => s._id.toString() === testPayload.seatingId.toString());
    if (!seating) {
      throw new Error(`Seating ID ${testPayload.seatingId} not found in event`);
    }
    console.log('✅ Seating found:', {
      type: seating.seatType,
      price: seating.price,
      available: seating.totalSeats - seating.seatsSold - seating.lockedSeats
    });
    console.log();
    
    // Step 3: Test Create Order Endpoint
    console.log('💳 Step 3: Testing create-order endpoint...');
    console.log('📤 Sending payload:', JSON.stringify(testPayload, null, 2));
    console.log();
    
    const orderRes = await axios.post(
      `${BASE_URL}/payments/create-order`,
      testPayload,
      { 
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      }
    );
    
    console.log('✅ Order created successfully!');
    console.log('📊 Response:', JSON.stringify(orderRes.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.message) {
      console.error('💬 Error message:', error.response.data.message);
    }
  }
})();
