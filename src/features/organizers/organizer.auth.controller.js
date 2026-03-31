const jwt = require('jsonwebtoken');
const Organizer = require('./organizer.model');
const Event = require('../events/event.model');
const AppError = require('../../shared/utils/appError');
const catchAsync = require('../../shared/utils/catchAsync');

/**
 * Sign JWT token for organizer
 */
const signToken = (organizerId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }

  return jwt.sign(
    { organizerId: organizerId.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Create and send JWT token
 */
const createSendToken = async (organizer, statusCode, res) => {
  const token = signToken(organizer._id);

  // Update last login
  organizer.lastLogin = new Date();
  await organizer.save();

  // Remove password from response
  organizer.password = undefined;

  // Set cookie
  const cookieExpiryDays = parseInt(process.env.JWT_COOKIE_EXPIRES_IN) || 7;
  const cookieOptions = {
    expires: new Date(Date.now() + cookieExpiryDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };

  res.cookie('organizerJwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      organizer
    }
  });
};

/**
 * Organizer Registration
 * POST /api/organizers/auth/register
 */
exports.register = catchAsync(async (req, res, next) => {
  const { email, password, confirmPassword, name, phone, contactPerson, address, website, description, logo } = req.body;

  // Validate required fields
  if (!email || !password || !confirmPassword || !name || !phone || !contactPerson) {
    return next(new AppError('Please provide email, password, name, phone, and contactPerson', 400));
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError('Please provide a valid email address', 400));
  }

  // Validate password strength
  if (password.length < 8) {
    return next(new AppError('Password must be at least 8 characters long', 400));
  }

  // Validate passwords match
  if (password !== confirmPassword) {
    return next(new AppError('Passwords do not match', 400));
  }

  // Check if organizer already exists
  const existingOrganizer = await Organizer.findOne({ email });
  if (existingOrganizer) {
    return next(new AppError('Email already registered. Please login or use a different email', 400));
  }

  // Create new organizer
  const organizer = await Organizer.create({
    email,
    password,
    name,
    phone,
    contactPerson,
    address: address || '',
    website: website || '',
    description: description || '',
    logo: logo || '',
    status: 'active'
  });

  // Send token
  await createSendToken(organizer, 201, res);
});

/**
 * Organizer Login
 * POST /api/organizers/auth/login
 */
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // Find organizer and select password field
  const organizer = await Organizer.findOne({ email }).select('+password');

  if (!organizer || !(await organizer.comparePassword(password))) {
    return next(new AppError('Invalid email or password', 401));
  }

  if (organizer.status !== 'active') {
    return next(new AppError('Organizer account is not active', 403));
  }

  await createSendToken(organizer, 200, res);
});

/**
 * Get Organizer Profile
 * GET /api/organizers/auth/profile
 * Query params:
 *   - include: 'events' (gets profile with events), 'summary' (events summary only)
 *   - Default: basic profile info
 * Protected route
 */
exports.getProfile = catchAsync(async (req, res, next) => {
  const { include } = req.query;
  
  // Use organizer from protect middleware (already loaded)
  const organizer = req.organizer;

  if (!organizer) {
    return next(new AppError('Organizer not found', 404));
  }

  const response = {
    status: 'success',
    data: {
      organizer
    }
  };

  // Include events if requested
  if (include === 'events' || include === 'summary') {
    const events = await Event.find({ organizer: organizer._id })
      .select('name location date startTime endTime description status seatings coverImage')
      .sort({ date: 1 });

    const now = new Date();
    const activeEvents = events.filter(e => new Date(e.date) > now);
    const upcomingEvents = events.filter(e => new Date(e.startTime) > now);
    const pastEvents = events.filter(e => new Date(e.date) <= now);

    const eventsSummary = {
      total: events.length,
      active: activeEvents.length,
      upcoming: upcomingEvents.length,
      past: pastEvents.length
    };

    response.data.events = include === 'summary' 
      ? { summary: eventsSummary }
      : { summary: eventsSummary, list: events };
  }

  res.status(200).json(response);
});

/**
 * Protect organizer routes
 * Verify JWT token and set req.organizer
 */
exports.protect = catchAsync(async (req, res, next) => {
  let token;

  // Get token from Authorization header or cookie
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.organizerJwt) {
    token = req.cookies.organizerJwt;
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please login to get access.', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.organizerId) {
      return next(new AppError('Invalid token structure. Please login again.', 401));
    }

    // Get organizer - convert ID to string to ensure proper matching
    const organizerId = decoded.organizerId.toString();
    const organizer = await Organizer.findById(organizerId).select('-password');

    if (!organizer) {
      return next(new AppError('The organizer belonging to this token no longer exists.', 401));
    }

    if (organizer.status !== 'active') {
      return next(new AppError('Organizer account is not active.', 403));
    }

    // Set organizer on request
    req.organizer = organizer;
    req.organizerId = organizerId;
    
    next();
  } catch (error) {
    // Log error for debugging
    console.error('Token verification error:', {
      message: error.message,
      name: error.name,
      tokenPrefix: token ? token.substring(0, 20) + '...' : 'no token'
    });
    
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please login again.', 401));
    }
    
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired. Please login again.', 401));
    }
    
    return next(new AppError('Authentication failed. Please login again.', 401));
  }
});

/**
 * Organizer Logout
 * GET /api/organizers/auth/logout
 */
exports.logout = (req, res) => {
  res.clearCookie('organizerJwt');
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
};

/**
 * Update Organizer Profile
 * PATCH /api/organizers/auth/profile
 * Protected route
 */
exports.updateProfile = catchAsync(async (req, res, next) => {
  // Prevent password update through this endpoint
  if (req.body.password) {
    return next(new AppError('This route is not for password updates', 400));
  }

  const allowedFields = ['name', 'phone', 'address', 'website', 'description', 'contactPerson', 'logo'];
  
  // Filter out unwanted fields
  const filteredBody = {};
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      filteredBody[key] = req.body[key];
    }
  });

  const organizer = await Organizer.findByIdAndUpdate(req.organizer._id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      organizer
    }
  });
});

/**
 * Update Organizer Password
 * PATCH /api/organizers/auth/change-password
 * Protected route
 */
exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // Validate input
  if (!currentPassword || !newPassword || !confirmPassword) {
    return next(new AppError('Please provide current password and new password', 400));
  }

  if (newPassword !== confirmPassword) {
    return next(new AppError('Passwords do not match', 400));
  }

  // Get organizer with password
  const organizer = await Organizer.findById(req.organizer._id).select('+password');

  // Verify current password
  if (!(await organizer.comparePassword(currentPassword))) {
    return next(new AppError('Current password is incorrect', 401));
  }

  // Update password
  organizer.password = newPassword;
  await organizer.save();

  await createSendToken(organizer, 200, res);
});
