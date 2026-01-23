const axios = require('axios');
const BASE_URL = 'http://localhost:3000/api';

(async () => {
  try {
    // Get fresh token
    console.log('🔑 Getting token...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, { 
      email: 'test@example.com', 
      password: 'test123' 
    });
    const token = loginRes.data.token;
    const userId = loginRes.data.data.user._id;
    console.log('✅ Got token:', token.substring(0, 20) + '...');
    console.log('✅ User ID:', userId);
    
    // Test booking endpoint
    console.log('\n📝 Testing booking initiation...');
    const response = await axios.post(`${BASE_URL}/booking-payment/initiate-with-verification`,
      { 
        userId, 
        eventId: '694291bb1e613c43e1b18a76', 
        seatingId: '694291bb1e613c43e1b18a77', 
        seatType: 'Premium', 
        quantity: 2, 
        pricePerSeat: 500 
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Booking initiated successfully!\n');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
})();
