const authService = require('./auth.service');
const AppError = require('../../shared/utils/appError');
const catchAsync = require('../../shared/utils/catchAsync');
const mockOtpService = require('../../shared/services/mock-otp.service');
const User = require('./auth.model');
const AadhaarImage = require('../aadhaar/aadhaar.model');

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await authService.signup({
    name: req.body.name,
    userId: req.body.userId,
    email: req.body.email,
    password: req.body.password,
    phone: req.body.phone,
    role: req.body.role || 'user',
    uploadedPhoto: req.body.uploadedPhoto || null, // Include uploadedPhoto in signup
    firstname: req.body.name, // Set firstname to name by default
    lastname: req.body.lastname || ''
  });

  authService.createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await authService.login(email, password);
  await authService.createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

exports.getCurrentUser = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user
    }
  });
});

exports.protect = authService.protect;
exports.restrictTo = authService.restrictTo;

// ============================================
// @desc    Send OTP to phone number via WhatsApp
// @route   POST /api/auth/send-otp
// @access  Public
// ============================================
exports.sendOTP = catchAsync(async (req, res, next) => {
  const { phone } = req.body;

  // Validate phone number
  if (!phone) {
    return next(new AppError('Please provide a phone number', 400));
  }

  const result = await mockOtpService.sendOTP(phone);

  if (!result.success) {
    return next(new AppError(result.message, 400));
  }

  res.status(200).json({
    status: 'success',
    message: result.message,
    data: {
      phone,
      sid: result.sid,
      expiresIn: result.expiresIn,
      otp: result.otp // For testing - remove in production
    }
  });
});

// ============================================
// @desc    Verify OTP code
// @route   POST /api/auth/verify-otp
// @access  Public
// ============================================
exports.verifyOTP = catchAsync(async (req, res, next) => {
  const { phone, code } = req.body;

  // Validate inputs
  if (!phone || !code) {
    return next(new AppError('Please provide phone number and OTP code', 400));
  }

  const result = await mockOtpService.verifyOTP(phone, code);

  if (!result.success) {
    return next(new AppError(result.message || 'OTP verification failed', 400));
  }

  // Find user by phone number
  const user = await User.findOne({ phone });

  if (!user) {
    return res.status(200).json({
      status: 'success',
      message: result.message,
      data: {
        phone,
        verified: result.verified,
        status: 'approved',
        userExists: false
      }
    });
  }

  // Generate JWT token and send response with user details (like login)
  await authService.createSendToken(user, 200, res);
});

// ============================================
// @desc    Resend OTP to phone number
// @route   POST /api/auth/resend-otp
// @access  Public
// ============================================
exports.resendOTP = catchAsync(async (req, res, next) => {
  const { phone } = req.body;

  // Validate phone number
  if (!phone) {
    return next(new AppError('Please provide a phone number', 400));
  }

  const result = await twilioService.resendOTP(phone);

  if (!result.success) {
    return next(new AppError(result.message, 400));
  }

  res.status(200).json({
    status: 'success',
    message: result.message,
    data: {
      phone,
      sid: result.sid
    }
  });
});












////////////////////////////////////////////////////////////////////

///////new      .//////////////////////////////////


exports.sendOTPnew = catchAsync(async (req, res, next) => {
  const { phone } = req.body;

  console.log(`📞 [Controller] Received phone from request:`, phone);
  console.log(`📞 [Controller] Request body:`, req.body);

  // Validate phone number
  if (!phone) {
    return next(new AppError('Please provide a phone number', 400));
  }

  // Check if user exists
  const user = await User.findOne({ phone });

  const phoneStatus = user ? 'existing' : 'new';

  // Send OTP using mock OTP Service
  const result = await mockOtpService.sendOTP(phone);

  if (!result.success) {
    return next(new AppError(result.message, 400));
  }

  // Response
  res.status(200).json({
    status: 'success',
    message: result.message,
    data: {
      phone,
      phoneStatus, // "existing" or "new"
      sid: result.sid,
      otp: result.otp // For testing - remove in production
    }
  });
});

/*
exports.sendOTPnew = catchAsync(async (req, res, next) => {
  // ✅ Accept multiple keys safely
  const phoneRaw =
    req.body.phone ||
    req.body.phoneNumber ||
    req.body.mobile;

  console.log('📞 [Controller] Request body:', req.body);
  console.log('📞 [Controller] Raw phone:', phoneRaw);

  if (!phoneRaw) {
    return next(new AppError('Please provide a phone number', 400));
  }

  // ✅ FORCE STRING
  const phone = String(phoneRaw);

  // Check if user exists
  const user = await User.findOne({ phone });
  const phoneStatus = user ? 'existing' : 'new';

  // Send OTP
  const result = await mockOtpService.sendOTP(phone);

  if (!result.success) {
    return next(new AppError(result.message, 400));
  }

  res.status(200).json({
    status: 'success',
    message: result.message,
    data: {
      phone,
      phoneStatus, // existing | new
      sid: result.sid,
      otp: result.otp // ⚠️ remove in production
    }
  });
});

*/
exports.verifyOTPnew = catchAsync(async (req, res, next) => {
  const { phone, code, otp } = req.body;
  const otpCode = code || otp; // Accept both 'code' and 'otp' parameter names

  if (!phone || !otpCode) {
    return next(new AppError('Please provide phone number and OTP code', 400));
  }

  // Verify OTP with mock OTP Service
  const verificationResult = await mockOtpService.verifyOTP(phone, otpCode);

  if (!verificationResult.success) {
    return next(new AppError(verificationResult.message, 400));
  }

  // Check if user exists
  let user = await User.findOne({ phone });

  if (user) {
    // User exists - Login flow
    if (!user.phoneVerified) {
      user.phoneVerified = true;
      await user.save({ validateBeforeSave: false });
    }
    
    // Generate token and send response
    await authService.createSendToken(user, 200, res);
    
  } else {
    // User doesn't exist - Signup flow
    // Create temporary user with phone and unique email
    const tempEmail = `temp_${phone}_${Date.now()}@temp.local`;
    const tempUser = await User.create({
      phone,
      email: tempEmail,
      name: 'Temp User',
      phoneVerified: true,
      isTemp: true
    });
    
    // Generate token and send response immediately
    await authService.createSendToken(tempUser, 201, res);
  }
});

// ============================================
// @desc    Get current user's profile details
// @route   GET /api/auth/complete-profile
// @access  Private - Requires authentication
// ============================================
exports.getCompleteProfile = catchAsync(async (req, res, next) => {
  const user = req.user;

  res.status(200).json({
    status: 'success',
    message: 'User profile retrieved successfully',
    data: {
      user: {
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        state: user.state || null,
        role: user.role,
        status: user.status,
        verificationStatus: user.verificationStatus,
        uploadedPhoto: user.uploadedPhoto || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        permissions: user.permissions || []
      }
    }
  });
});

// ============================================
// @desc    Update user's profile details
// @route   POST /api/auth/complete-profile
// @access  Private - Requires authentication
// ============================================
exports.completeProfile = catchAsync(async (req, res, next) => {
  const { tempUserId, name, email, lastname } = req.body;
  const userId = req.user._id;

  // If updating existing user (POST with auth token)
  if (userId && !tempUserId) {
    const user = await User.findById(userId);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Update user profile
    user.name = name || user.name;
    user.email = email || user.email;
    user.lastname = lastname || user.lastname;

    await user.save({ validateBeforeSave: false });

    // Get Aadhaar upload status
    const aadhaarImage = await AadhaarImage.findOne({ userId, imageType: 'front' });

    const aadhaarStatus = aadhaarImage ? {
      uploaded: true,
      imageId: aadhaarImage._id,
      status: aadhaarImage.status,
      fullName: aadhaarImage.fullName,
      uploadedAt: aadhaarImage.uploadedAt
    } : {
      uploaded: false,
      imageId: null,
      status: null
    };

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: {
          userId: user._id.toString(),
          name: `${user.firstname || ''} ${user.lastname || ''}`.trim(),
          email: user.email,
          phone: user.phone,
          state: user.state || null,
          role: user.role,
          status: user.status,
          verificationStatus: user.verificationStatus,
          uploadedPhoto: user.uploadedPhoto || null
        },
        aadhaarStatus: aadhaarStatus
      }
    });
    return;
  }

  // If completing temp user profile (old flow)
  if (!tempUserId) {
    return next(new AppError('Invalid session. Please start over.', 400));
  }

  if (!email) {
    return next(new AppError('Email is required.', 400));
  }

  // Find temp user
  const tempUser = await User.findById(tempUserId);

  if (!tempUser) {
    return next(new AppError('Session expired. Please start over.', 400));
  }

  // Update temp user with provided info
  tempUser.name = name || tempUser.name;
  tempUser.email = email;
  tempUser.lastname = lastname || '';
  tempUser.isTemp = false;

  await tempUser.save({ validateBeforeSave: false });

  // Generate token and send response
  await authService.createSendToken(tempUser, 201, res);
});

