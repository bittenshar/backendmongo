// Simple WATI Test - Check if template exists
const axios = require('axios');
require('dotenv').config();

const apiKey = process.env.WATI_API_KEY;
const baseUrl = process.env.WATI_BASE_URL;
const templateName = process.env.WATI_TEMPLATE_NAME || 'login_otp';
const phone = '919876543210';
const otp = '123456';

const endpoint = `${baseUrl}/api/v1/sendTemplateMessage`;

const payload = {
  whatsappNumber: phone,
  template_name: templateName,
  broadcast_name: 'otp_auth',
  parameters: [{name: 'otp', value: otp}]
};

console.log('Testing WATI API...');
console.log('Endpoint:', endpoint);
console.log('Template:', templateName);
console.log('Phone:', phone);
console.log('');

axios.post(endpoint, payload, {
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
})
.then(res => {
  console.log('✅ SUCCESS!');
  console.log(JSON.stringify(res.data, null, 2));
})
.catch(err => {
  console.log('❌ ERROR');
  console.log('Status:', err.response?.status);
  console.log('Errors:');
  if (err.response?.data?.items) {
    err.response.data.items.forEach(item => {
      console.log(`  - ${item.code}: ${item.description}`);
    });
    console.log('');
    console.log('⚠️  REQUIRED ACTION:');
    console.log('You must CREATE the template "login_otp" in WATI first!');
    console.log('');
    console.log('Steps:');
    console.log('1. Go to https://live.wati.io/1080383');
    console.log('2. Find "Templates" menu');
    console.log('3. Click "Create Template"');
    console.log('4. Fill in:');
    console.log('   Name: login_otp');
    console.log('   Language: English');
    console.log('   Category: AUTHENTICATION');
    console.log('   Message: Your login OTP is {{otp}}. Do not share it with anyone.');
    console.log('5. Add parameter: name = "otp"');
    console.log('6. Click "Create"');
    console.log('7. Wait for approval (1-2 hours)');
    console.log('8. Then run this test again');
  }
});
