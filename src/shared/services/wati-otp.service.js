// src/features/auth/wati-otp.service.js

const axios = require('axios');

// ============================================
// In-memory OTP store (use Redis in prod)
// ============================================
const otpStore = new Map();
const OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes

// ============================================
// Validate ENV config
// ============================================
const validateConfig = () => {
  if (!process.env.WATI_API_KEY) {
    throw new Error('WATI_API_KEY is missing');
  }
  if (!process.env.WATI_BASE_URL) {
    throw new Error('WATI_BASE_URL is missing');
  }
};

// ============================================
// Normalize phone number (India)
// ============================================
const normalizePhone = (phone) => {
  let cleaned = String(phone).replace(/\D/g, '');

  // If only 10 digits, assume India
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }

  // Final validation
  if (!/^91\d{10}$/.test(cleaned)) {
    return null;
  }

  return cleaned; // NO "+"
};

// ============================================
// Send OTP
// ============================================
exports.sendOTP = async (phone) => {
  try {
    validateConfig();

    if (!phone) {
      return {
        success: false,
        message: 'Invalid phone number format'
      };
    }

    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      return {
        success: false,
        message: 'Invalid phone number format'
      };
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP
    otpStore.set(normalizedPhone, {
      otp,
      expiresAt: Date.now() + OTP_EXPIRY,
      attempts: 0
    });

    console.log('🔐 [WATI OTP] Sending OTP');
    console.log('📱 Phone:', normalizedPhone);
    console.log('📝 OTP:', otp);

    // Send via WATI
    const response = await sendWATIMessage(normalizedPhone, otp);

    if (!response.success) {
      otpStore.delete(normalizedPhone);
      return response;
    }

    return {
      success: true,
      message: 'OTP sent successfully',
      expiresIn: '5 minutes',
      otp: process.env.NODE_ENV !== 'production' ? otp : undefined
    };
  } catch (error) {
    console.error('❌ [WATI OTP] Error:', error.message);
    return {
      success: false,
      message: 'Failed to send OTP'
    };
  }
};

// ============================================
// Send WhatsApp message via WATI
// ============================================
const sendWATIMessage = async (phone, otp) => {
  try {
    const baseUrl = process.env.WATI_BASE_URL;
    const templateName = process.env.WATI_TEMPLATE_NAME || 'thrill_login';
    const apiKey = process.env.WATI_API_KEY;

    const payload = {
      phoneNumber: phone,
      template_name: templateName,
      template_language: 'en',
      parameters: [
        {
          name: 'otp',
          value: otp
        }
      ]
    };

    console.log('📤 [WATI API] Attempting to send template message');
    console.log('📱 Phone:', phone);
    console.log('📋 Template:', templateName);
    console.log('📝 OTP:', otp);
    console.log('🔗 Base URL:', baseUrl);

    // Try multiple endpoint variations
    const endpoints = [
      `${baseUrl}/api/v1/sendTemplateMessage`,
      `${baseUrl}/api/sendTemplateMessage`,
      `${baseUrl}/sendTemplateMessage`,
      `${baseUrl}/api/v1/send-template-message`
    ];

    let lastError = null;
    let response = null;

    for (let i = 0; i < endpoints.length; i++) {
      const url = endpoints[i];
      try {
        console.log(`\n  Attempt ${i + 1}/${endpoints.length}: ${url}`);
        
        response = await axios.post(url, payload, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        console.log(`✅ [WATI API] Success with endpoint ${i + 1}!`);
        console.log('📊 Response:', response.data);
        break;
      } catch (err) {
        lastError = err;
        console.log(`❌ Attempt ${i + 1} failed (${err.response?.status}): ${err.message}`);
      }
    }

    if (!response) {
      throw lastError;
    }


    console.log('✅ [WATI API] Message sent successfully');
    console.log('✅ [WATI API] Auth method that worked logged above');

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('\n❌ [WATI API] ALL ATTEMPTS FAILED');
    console.error('❌ [WATI API] Error:', error.response?.data || error.message);
    console.error('❌ [WATI API] Status:', error.response?.status);
    console.error('❌ [WATI API] Full Response:', JSON.stringify(error.response?.data, null, 2));

    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.response?.data?.error ||
        'WATI API Error: ' + error.message
    };
  }
};

// ============================================
// Verify OTP
// ============================================
exports.verifyOTP = async (phone, code) => {
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    return { success: false, message: 'Invalid phone number' };
  }

  const stored = otpStore.get(normalizedPhone);

  if (!stored) {
    return { success: false, message: 'OTP not found' };
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(normalizedPhone);
    return { success: false, message: 'OTP expired' };
  }

  if (stored.attempts >= 3) {
    otpStore.delete(normalizedPhone);
    return { success: false, message: 'Too many attempts' };
  }

  if (stored.otp !== String(code)) {
    stored.attempts += 1;
    return {
      success: false,
      message: `Invalid OTP. ${3 - stored.attempts} attempts left`
    };
  }

  otpStore.delete(normalizedPhone);

  return {
    success: true,
    message: 'OTP verified successfully'
  };
};
