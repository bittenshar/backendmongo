// ============================================
// AiSensy OTP Service
// ============================================
// This service sends OTP via AiSensy WhatsApp API
// Replace mock OTP with real WhatsApp integration

const axios = require('axios');

const otpStore = new Map(); // In-memory store for verification
const otpExpiry = 10 * 60 * 1000; // 10 minutes in milliseconds

// AiSensy Configuration
const AISENSY_CONFIG = {
  baseURL: 'https://backend.aisensy.com/campaign/t1/api/v2',
  apiKey: process.env.AISENSY_API_KEY,
  campaignName: 'login_camp',
  userName: 'Thrillathon'
};

// ============================================
// @desc    Send OTP to phone number via AiSensy
// @access  Public
// ============================================
exports.sendOTP = async (phoneNumber) => {
  try {
    // Ensure phone number is in correct format
    const destination = phoneNumber.replace(/[^\d]/g, '');
    if (destination.length < 10) {
      return {
        success: false,
        message: 'Invalid phone number format'
      };
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Store OTP with expiry
    const expiresAt = Date.now() + otpExpiry;
    otpStore.set(destination, {
      otp,
      expiresAt,
      attempts: 0
    });

    // Prepare AiSensy payload
    const payload = {
      apiKey: AISENSY_CONFIG.apiKey,
      campaignName: AISENSY_CONFIG.campaignName,
      destination: destination,
      userName: AISENSY_CONFIG.userName,
      templateParams: [otp],
      buttons: [
        {
          type: 'button',
          sub_type: 'url',
          index: 0,
          parameters: [
            {
              type: 'text',
              text: otp
            }
          ]
        }
      ]
    };

    // Send OTP via AiSensy API
    const response = await axios.post(AISENSY_CONFIG.baseURL, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log(`✅ OTP sent via AiSensy to ${phoneNumber}`);
    console.log(`📱 OTP: ${otp} (Valid for 10 minutes)`);
    console.log(`🔄 API Response:`, response.data);

    return {
      success: true,
      message: 'OTP sent successfully via WhatsApp',
      destination: destination,
      timestamp: new Date(),
      expiresIn: '10 minutes'
    };
  } catch (error) {
    console.error('❌ Error sending OTP via AiSensy:', error.message);
    
    // Fallback to mock OTP for development
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  AiSensy API failed, using mock OTP for development');
      const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const destination = phoneNumber.replace(/[^\d]/g, '');
      otpStore.set(destination, {
        otp: mockOtp,
        expiresAt: Date.now() + otpExpiry,
        attempts: 0
      });
      console.log(`📱 Mock OTP: ${mockOtp}`);
      
      return {
        success: true,
        message: 'OTP sent (mock mode)',
        otp: mockOtp,
        mock: true
      };
    }

    return {
      success: false,
      message: error.response?.data?.message || 'Failed to send OTP',
      error: error.message
    };
  }
};

// ============================================
// @desc    Verify OTP code
// @access  Public
// ============================================
exports.verifyOTP = async (phoneNumber, code) => {
  try {
    const destination = phoneNumber.replace(/[^\d]/g, '');

    // Check if OTP exists
    const storedOTP = otpStore.get(destination);

    if (!storedOTP) {
      return {
        success: false,
        message: 'No OTP found for this phone number. Please send OTP first.'
      };
    }

    // Check if OTP has expired
    if (Date.now() > storedOTP.expiresAt) {
      otpStore.delete(destination);
      return {
        success: false,
        message: 'OTP has expired. Please request a new one.'
      };
    }

    // Check max attempts (3 attempts)
    if (storedOTP.attempts >= 3) {
      otpStore.delete(destination);
      return {
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      };
    }

    // Verify OTP code
    if (storedOTP.otp !== code.toString()) {
      storedOTP.attempts += 1;
      return {
        success: false,
        message: `Invalid OTP. ${3 - storedOTP.attempts} attempts remaining.`
      };
    }

    // OTP verified successfully - clear it
    otpStore.delete(destination);

    console.log(`✅ OTP verified successfully for ${phoneNumber}`);

    return {
      success: true,
      message: 'OTP verified successfully',
      verified: true
    };
  } catch (error) {
    console.error('Error verifying OTP:', error.message);
    return {
      success: false,
      message: 'Failed to verify OTP',
      error: error.message
    };
  }
};

// ============================================
// @desc    Resend OTP to phone number
// @access  Public
// ============================================
exports.resendOTP = async (phoneNumber) => {
  try {
    const destination = phoneNumber.replace(/[^\d]/g, '');

    // Clear previous OTP
    otpStore.delete(destination);

    // Send new OTP
    return await exports.sendOTP(phoneNumber);
  } catch (error) {
    console.error('Error resending OTP:', error.message);
    return {
      success: false,
      message: 'Failed to resend OTP',
      error: error.message
    };
  }
};

// ============================================
// @desc    Get stored OTP (for testing only)
// @access  Private
// ============================================
exports.getStoredOTP = (phoneNumber) => {
  const destination = phoneNumber.replace(/[^\d]/g, '');
  const storedOTP = otpStore.get(destination);
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

module.exports = exports;
