const twilio = require('twilio');

// Initialize Twilio client with validation
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

// Validate Twilio credentials
if (!accountSid || !authToken || !verifyServiceSid) {
  console.warn('⚠️  Warning: Twilio credentials not configured in .env');
  console.warn('Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID');
}

let client = null;

// Only initialize if credentials exist
if (accountSid && authToken) {
  try {
    client = twilio(accountSid, authToken);
    console.log('✅ Twilio client initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Twilio client:', error.message);
  }
}

// ============================================
// @desc    Send OTP to phone number
// @access  Public
// ============================================
exports.sendOTP = async (phoneNumber) => {
  try {
    // Check if Twilio is configured
    if (!client || !verifyServiceSid) {
      return {
        success: false,
        message: 'Twilio OTP service not configured. Please add credentials to .env',
        error: 'TWILIO_NOT_CONFIGURED'
      };
    }

    // Format phone number to international format if needed
    if (!phoneNumber.startsWith('+')) {
      // Add country code if not present
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '+91' + phoneNumber.slice(1);
      } else if (!phoneNumber.startsWith('+')) {
        phoneNumber = '+91' + phoneNumber;
      }
    }

    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: phoneNumber,
        channel: 'sms'
      });

    console.log(`✅ OTP sent to ${phoneNumber}, SID: ${verification.sid}`);

    return {
      success: true,
      message: 'OTP sent successfully',
      sid: verification.sid,
      status: verification.status
    };
  } catch (error) {
    console.error('❌ Failed to send OTP:', error.message);
    return {
      success: false,
      message: error.message || 'Failed to send OTP'
    };
  }
};

// ============================================
// @desc    Verify OTP code
// @access  Public
// ============================================
exports.verifyOTP = async (phoneNumber, code) => {
  try {
    // Check if Twilio is configured
    if (!client || !verifyServiceSid) {
      return {
        success: false,
        message: 'Twilio OTP service not configured. Please add credentials to .env',
        error: 'TWILIO_NOT_CONFIGURED'
      };
    }

    // Format phone number
    if (!phoneNumber.startsWith('+')) {
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '+91' + phoneNumber.slice(1);
      } else if (!phoneNumber.startsWith('+')) {
        phoneNumber = '+91' + phoneNumber;
      }
    }

    const verificationCheck = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({
        to: phoneNumber,
        code: code.toString()
      });

    console.log(`✅ OTP verification ${verificationCheck.status} for ${phoneNumber}`);

    return {
      success: verificationCheck.status === 'approved',
      message: verificationCheck.status === 'approved' 
        ? 'OTP verified successfully'
        : 'OTP verification failed',
      status: verificationCheck.status,
      valid: verificationCheck.valid
    };
  } catch (error) {
    console.error('❌ Failed to verify OTP:', error.message);
    return {
      success: false,
      message: error.message || 'Failed to verify OTP',
      status: 'failed'
    };
  }
};

// ============================================
// @desc    Resend OTP to phone number
// @access  Public
// ============================================
exports.resendOTP = async (phoneNumber) => {
  try {
    if (!phoneNumber.startsWith('+')) {
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '+91' + phoneNumber.slice(1);
      } else if (!phoneNumber.startsWith('+')) {
        phoneNumber = '+91' + phoneNumber;
      }
    }

    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: phoneNumber,
        channel: 'sms'
      });

    console.log(`✅ OTP resent to ${phoneNumber}`);

    return {
      success: true,
      message: 'OTP resent successfully',
      sid: verification.sid
    };
  } catch (error) {
    console.error('❌ Failed to resend OTP:', error.message);
    return {
      success: false,
      message: error.message || 'Failed to resend OTP'
    };
  }
};

module.exports = exports;
