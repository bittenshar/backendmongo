const axios = require('axios');
const BASE_URL = 'http://localhost:3000/api';

(async () => {
  try {
    console.log('📋 Checking event structure...');
    const eventRes = await axios.get(`${BASE_URL}/events/694291bb1e613c43e1b18a76`);
    console.log('Full Event Response:', JSON.stringify(eventRes.data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
})();
