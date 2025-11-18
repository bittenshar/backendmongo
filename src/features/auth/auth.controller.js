const authService = require('./auth.service');
const AppError = require('../../shared/utils/appError');
const catchAsync = require('../../shared/utils/catchAsync');
const twilioService = require('../../shared/services/twilio.service');
const User = require('./auth.model');

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
// @desc    Send OTP to phone number
// @route   POST /api/auth/send-otp
// @access  Public
// ============================================
exports.sendOTP = catchAsync(async (req, res, next) => {
  const { phone } = req.body;

  // Validate phone number
  if (!phone) {
    return next(new AppError('Please provide a phone number', 400));
  }

  const result = await twilioService.sendOTP(phone);

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

  const result = await twilioService.verifyOTP(phone, code);

  if (!result.success) {
    return next(new AppError(result.message || 'OTP verification failed', 400));
  }

  res.status(200).json({
    status: 'success',
    message: result.message,
    data: {
      phone,
      verified: result.valid,
      status: result.status
    }
  });
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

  // Validate phone number
  if (!phone) {
    return next(new AppError('Please provide a phone number', 400));
  }

  // Check if user exists
  const user = await User.findOne({ phone });

  const phoneStatus = user ? 'existing' : 'new';

  // Send OTP using Twilio Service
  const result = await twilioService.sendOTP(phone);

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
      sid: result.sid
    }
  });
});


exports.verifyOTPnew = catchAsync(async (req, res, next) => {
  const { phone, code, otp } = req.body;
  const otpCode = code || otp; // Accept both 'code' and 'otp' parameter names

  if (!phone || !otpCode) {
    return next(new AppError('Please provide phone number and OTP code', 400));
  }

  // Verify OTP with Twilio
  const verificationResult = await twilioService.verifyOTP(phone, otpCode);

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
    // Create temporary user with phone only
    const tempUser = await authService.createTempUser(phone);
    
    res.status(200).json({
      status: 'success',
      message: 'OTP verified successfully. Please complete your profile.',
      data: {
        phone,
        phoneVerified: true,
        requiresProfile: true,
        tempUserId: tempUser._id
      }
    });
  }
});

exports.completeProfile = catchAsync(async (req, res, next) => {
  const { tempUserId, name, email, lastname } = req.body;

  if (!tempUserId) {
    return next(new AppError('Invalid session. Please start over.', 400));
  }

  // Find and validate temp user
  const tempUser = await User.findOne({ 
    _id: tempUserId, 
    isTemp: true 
  });

  if (!tempUser) {
    return next(new AppError('Session expired. Please start over.', 400));
  }

  // Convert temp user to permanent user
  const permanentUser = await authService.convertToPermanentUser(
    tempUser, 
    { name, email, lastname }
  );

  // Generate token and send response
  await authService.createSendToken(permanentUser, 201, res);
});





