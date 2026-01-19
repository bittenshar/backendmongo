// ============================================
// WATI WhatsApp OTP Service
// ============================================
// Sends OTP via WhatsApp using WATI API
// Replaces mock-otp.service.js with real WhatsApp delivery

const axios = require('axios');

// In-memory store for OTP tracking (consider Redis for production)
const otpStore = new Map();
const otpExpiry = 5 * 60 * 1000; // 5 minutes expiry

// ============================================
// Validate WATI configuration
// ============================================
const validateConfig = () => {
  if (!process.env.WATI_API_KEY) {
    throw new Error('WATI_API_KEY is not configured in environment variables');
  }
  if (!process.env.WATI_BASE_URL) {
    throw new Error('WATI_BASE_URL is not configured in environment variables');
  }
};

// ============================================
// @desc    Send OTP via WhatsApp using WATI
// @access  Public
// ============================================
exports.sendOTP = async (phoneNumber) => {
  try {
    validateConfig();

    // Validate phone number format
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return {
        success: false,
        message: 'Invalid phone number format'
      };
    }

    // Ensure phone number has country code (91 for India)
    let formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone; // Add India country code
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with expiry
    const expiresAt = Date.now() + otpExpiry;
    otpStore.set(phoneNumber, {
      otp,
      expiresAt,
      attempts: 0,
      formattedPhone
    });

    console.log(`\n🔐 [WATI OTP] Sending OTP to ${phoneNumber}`);
    console.log(`📝 OTP Code: ${otp}`);

    // Send via WATI WhatsApp
    const response = await sendWATIMessage(formattedPhone, otp);

    if (!response.success) {
      // Clean up OTP if sending failed
      otpStore.delete(phoneNumber);
      return {
        success: false,
        message: response.message || 'Failed to send OTP via WhatsApp'
      };
    }

    return {
      success: true,
      message: 'OTP sent successfully via WhatsApp',
      sid: response.messageId || `wati-${Date.now()}`,
      otp: process.env.NODE_ENV !== 'production' ? otp : undefined, // Only show in dev
      expiresIn: '5 minutes'
    };
  } catch (error) {
    console.error('❌ [WATI OTP] Error sending OTP:', error.message);
    return {
      success: false,
      message: 'Failed to send OTP',
      error: error.message
    };
  }
};

// ============================================
// @desc    Send message via WATI API
// @access  Private
// ============================================
const sendWATIMessage = async (phone, otp) => {
  try {
    // WATI API endpoint: append /api/v1/sendTemplateMessage to base URL
    // WATI_BASE_URL should be: https://live-mt-server.wati.io/1080383
    const url = `${process.env.WATI_BASE_URL}/api/v1/sendTemplateMessage`;

    console.log(`🔄 [WATI API] Sending to endpoint: ${url}`);
    console.log(`🔑 [WATI API] Using API Key: ${process.env.WATI_API_KEY?.substring(0, 20)}...`);

    const payload = {
      whatsappNumber: phone,
      template_name: process.env.WATI_TEMPLATE_NAME || 'login_otp',
      broadcast_name: 'otp_auth',
      parameters: [
        {
          name: 'otp',
          value: otp
        }
      ]
    };

    console.log(`📤 [WATI API] Payload:`, JSON.stringify(payload, null, 2));

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${process.env.WATI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });

    console.log(`✅ [WATI API] Message sent successfully`);
    console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));

    return {
      success: true,
      messageId: response.data.result?.messageId || response.data.result?.message_id,
      data: response.data
    };
  } catch (error) {
    console.error('❌ [WATI API] Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      fullError: JSON.stringify(error.response?.data, null, 2)
    });

    // Handle specific WATI errors
    if (error.response?.status === 401) {
      return {
        success: false,
        message: 'WATI API authentication failed. Check WATI_API_KEY.'
      };
    }

    if (error.response?.status === 404) {
      return {
        success: false,
        message: 'WATI template not found. Check WATI_TEMPLATE_NAME and WATI_BASE_URL.'
      };
    }

    if (error.response?.status === 400) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Bad request';
      console.error('❌ [WATI API] 400 Error Details:', errorMsg);
      return {
        success: false,
        message: `WATI API Error: ${errorMsg}`
      };
    }

    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

// ============================================
// @desc    Verify OTP code
// @access  Public
// ============================================
exports.verifyOTP = async (phoneNumber, code) => {
  try {
    // Check if OTP exists
    const storedOTP = otpStore.get(phoneNumber);

    if (!storedOTP) {
      return {
        success: false,
        message: 'No OTP found for this phone number. Please send OTP first.'
      };
    }

    // Check if OTP has expired
    if (Date.now() > storedOTP.expiresAt) {
      otpStore.delete(phoneNumber);
      return {
        success: false,
        message: 'OTP has expired. Please request a new one.'
      };
    }

    // Check max attempts (3 attempts)
    if (storedOTP.attempts >= 3) {
      otpStore.delete(phoneNumber);
      return {
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      };
    }

    // Verify OTP code
    if (storedOTP.otp !== code.toString()) {
      storedOTP.attempts += 1;
      const remainingAttempts = 3 - storedOTP.attempts;
      return {
        success: false,
        message: `Invalid OTP. ${remainingAttempts} attempts remaining.`
      };
    }

    // OTP verified successfully - clear it
    otpStore.delete(phoneNumber);

    console.log(`✅ [WATI OTP] OTP verified for ${phoneNumber}`);

    return {
      success: true,
      message: 'OTP verified successfully',
      verified: true
    };
  } catch (error) {
    console.error('❌ [WATI OTP] Error verifying OTP:', error.message);
    return {
      success: false,
      message: 'Failed to verify OTP',
      error: error.message
    };
  }
};

// ============================================
// @desc    Get stored OTP (for testing only)
// @access  Private
// ============================================
exports.getStoredOTP = (phoneNumber) => {
  const storedOTP = otpStore.get(phoneNumber);
  if (storedOTP) {
    return storedOTP.otp;
  }
  return null;
};

// ============================================
// @desc    Clear all stored OTPs (for testing)
// @access  Private
// ============================================
exports.clearAllOTPs = () => {
  otpStore.clear();
  console.log('✅ All OTPs cleared');
};

// ============================================
// @desc    Get OTP status (for debugging)
// @access  Private
// ============================================
exports.getOTPStatus = (phoneNumber) => {
  const storedOTP = otpStore.get(phoneNumber);
  if (!storedOTP) {
    return null;
  }

  const timeRemaining = Math.max(0, storedOTP.expiresAt - Date.now());

  return {
    phone: phoneNumber,
    hasOTP: true,
    expiresIn: `${Math.ceil(timeRemaining / 1000)} seconds`,
    attempts: storedOTP.attempts,
    attemptsRemaining: 3 - storedOTP.attempts
  };
};
