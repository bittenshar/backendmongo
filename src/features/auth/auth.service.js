const jwt = require('jsonwebtoken');
const User = require('./auth.model');
const Admin = require('../admin/admin.model');
const { promisify } = require('util');
const { AppError } = require('../../shared/utils/');
const bcrypt = require('bcryptjs');

const signToken = (user) => {
  // Validate JWT_SECRET exists
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }
  
  // sign with _id (userId)
  return jwt.sign(
    { userId: user._id.toString() },
    process.env.JWT_SECRET
  );
};

const createSendToken = async (user, statusCode, res) => {
  const token = signToken(user);

  const cookieExpiryDays = parseInt(process.env.JWT_COOKIE_EXPIRES_IN) || 90;
  const cookieOptions = {
    expires: new Date(
      Date.now() + cookieExpiryDays * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };

  res.cookie('jwt', token, cookieOptions);
  user.password = undefined;

  // Format lastLogin for better display
  if (user.lastLogin) {
    const now = new Date();
    const timeDiff = now - user.lastLogin;
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
      user.lastLoginFormatted = 'Today';
    } else if (daysDiff === 1) {
      user.lastLoginFormatted = 'Yesterday';
    } else {
      user.lastLoginFormatted = `${daysDiff} days ago`;
    }
  }

  // Check if user has face record - first check MongoDB user.faceId field
  let hasFaceRecord = false;
  let faceId = null;
  
  console.log(`\n🔍 [Face Check] Starting face record lookup for userId: ${user._id.toString()}`);
  
  // Primary check: User model's faceId field
  if (user.faceId) {
    hasFaceRecord = true;
    faceId = user.faceId;
    console.log(`✅ [Face Check] Face record found in MongoDB - faceId: ${faceId}`);
  } else {
    console.log(`ℹ️ [Face Check] No faceId in MongoDB user record`);
  }
  
  // Fallback: Check DynamoDB if available and no face record in MongoDB yet
  // SKIP DynamoDB if AWS credentials are missing/invalid - gracefully degrade
  if (!hasFaceRecord && user._id && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_ACCESS_KEY_ID !== 'YOUR_ACTUAL_ACCESS_KEY_HERE') {
    console.log(`🔄 [Face Check] Checking DynamoDB for face record...`);
    try {
      const dynamodbService = require('../../services/aws/dynamodb.service');
      const userIdStr = user._id.toString();
      
      console.log(`📍 [Face Check] DynamoDB Query - userId: ${userIdStr}, table: faceimage`);
      
      // Try to get face record from DynamoDB
      const faceRecord = await dynamodbService.getUserFaceRecord(userIdStr);
      
      console.log(`📊 [Face Check] DynamoDB Response:`, JSON.stringify(faceRecord, null, 2));
      
      // Handle both response formats (with .data wrapper or direct object)
      const data = faceRecord && (faceRecord.data || faceRecord);
      
      if (data && data.RekognitionId) {
        hasFaceRecord = true;
        // Get RekognitionId from the face record
        faceId = data.RekognitionId || data.rekognitionId;
        console.log(`✅ [Face Check] Face record found in DynamoDB!`);
        console.log(`   - RekognitionId: ${faceId}`);
        console.log(`   - FullName: ${data.FullName || data.fullName}`);
        console.log(`   - Status: ${data.Status || data.status}`);
      } else {
        console.log(`⚠️ [Face Check] DynamoDB returned but no data`);
      }
    } catch (err) {
      // Gracefully skip DynamoDB errors - not critical for login
      console.log(`⚠️ [Face Check] DynamoDB Query Error (will skip DynamoDB):`, {
        message: err.message,
        type: err.constructor.name
      });
      console.log(`ℹ️ [Face Check] Skipping DynamoDB - AWS credentials may be invalid`);
      hasFaceRecord = false;
      faceId = null;
    }
  } else if (!hasFaceRecord && (!process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID === 'YOUR_ACTUAL_ACCESS_KEY_HERE')) {
    console.log(`⚠️ [Face Check] AWS credentials not configured - skipping DynamoDB check`);
  }
  
  console.log(`\n📋 [Face Check] Final Result: hasFaceRecord=${hasFaceRecord}, faceId=${faceId}\n`);

  // Ensure uploadedPhoto is included in the response
  const userResponse = {
    userId: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    permissions: user.permissions || [],
    verificationStatus: user.verificationStatus,
    status: user.status,
    uploadedPhoto: user.uploadedPhoto || null,
    _id: user._id,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    firstname: user.firstname,
    lastname: user.lastname,
    __v: user.__v,
    lastLoginFormatted: user.lastLoginFormatted,
    hasFaceRecord: hasFaceRecord,
    faceId: faceId
  };

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user: userResponse }
  });
};




const signup = async (userObj) => {
  // Ensure all fields are properly captured
  const userData = {
    ...userObj,
    uploadedPhoto: userObj.uploadedPhoto || null,  // Initialize uploadedPhoto field
    verificationStatus: 'pending',  // Set initial verification status
    updatedAt: new Date(),
    createdAt: new Date()
  };

  const newUser = await User.create(userData);
  return newUser;
};

const login = async (email, password) => {
  // Check if email and password exist
  if (!email || !password) {
    throw new AppError('Please provide email and password', 400);
  }

  // Check if user exists in User collection first
  let user = await User.findOne({ email }).select('+password');
  
  // If not found in User collection, check Admin collection
  if (!user) {
    user = await Admin.findOne({ email }).select('+password');
  }

  // Check if user exists and password is correct
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Incorrect email or password', 401);
  }

  // Update last login timestamp
  if (user.constructor.modelName === 'User') {
    // For regular users
    await User.findByIdAndUpdate(user._id, { 
      lastLogin: new Date() 
    });
  } else if (user.constructor.modelName === 'AdminUser') {
    // For admin users
    await Admin.findByIdAndUpdate(user._id, { 
      lastLogin: new Date(),
      lastActivity: new Date()
    });
  }
  
  // Update the user object to include the new lastLogin time
  user.lastLogin = new Date();

  return user;
};




const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    // Decode
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // Find user by _id
    let currentUser = await User.findById(decoded.userId) || await Admin.findById(decoded.userId);

    if (!currentUser) {
      return next(new AppError('The user belonging to this token does no longer exist.', 401));
    }

    req.user = currentUser;
    next();
  } catch (error) {
    return next(new AppError('Invalid token. Please log in again!', 401));
  }
};






const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

// ============================================
// OTP Authentication Methods
// ============================================
const createTempUser = async (phone) => {
  const tempUser = await User.create({
    phone,
    phoneVerified: true,
    isTemp: true,
    role: 'user'
  });

  return tempUser;
};

const convertToPermanentUser = async (tempUser, profileData) => {
  const { name, email, lastname } = profileData;
  
  const updatedUser = await User.findByIdAndUpdate(
    tempUser._id,
    {
      name: name || 'User',
      firstname: name || 'User',
      lastname: lastname || '',
      email: email || null,
      isTemp: false,
      userId: generateUserId() // Generate unique user ID
    },
    { new: true, runValidators: false }
  );

  return updatedUser;
};

const generateUserId = () => {
  // Generate unique user ID
  return 'USER' + Date.now() + Math.floor(Math.random() * 1000);
};

module.exports = {
  signup,
  login,
  protect,
  restrictTo,
  createSendToken,
  createTempUser,
  convertToPermanentUser,
  generateUserId
};