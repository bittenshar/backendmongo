// ============================================
// Mock OTP Service (No Twilio Required)
// ============================================
// This service simulates OTP functionality for testing purposes
// In production, you can replace this with a real OTP provider like Twilio

const otpStore = new Map(); // In-memory store for testing
const otpExpiry = 10 * 60 * 1000; // 10 minutes in milliseconds

// ============================================
// @desc    Send OTP to phone number (Mock)
// @access  Public
// ============================================
exports.sendOTP = async (phoneNumber) => {
  try {
    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with expiry
    const expiresAt = Date.now() + otpExpiry;
    otpStore.set(phoneNumber, {
      otp,
      expiresAt,
      attempts: 0
    });

    // Log OTP for testing (in production, this would be sent via SMS/Twilio)
    console.log(`\n📱 OTP for ${phoneNumber}: ${otp}`);
    console.log(`⏱️  Expires in 10 minutes\n`);

    return {
      success: true,
      message: 'OTP sent successfully',
      sid: `mock-${Date.now()}`, // Mock session ID
      otp: otp // Return OTP for testing (remove in production)
    };
  } catch (error) {
    console.error('Error sending OTP:', error.message);
    return {
      success: false,
      message: 'Failed to send OTP',
      error: error.message
    };
  }
};

// ============================================
// @desc    Verify OTP code (Mock)
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
      return {
        success: false,
        message: `Invalid OTP. ${3 - storedOTP.attempts} attempts remaining.`
      };
    }

    // OTP verified successfully - clear it
    otpStore.delete(phoneNumber);

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
