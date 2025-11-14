const jwt = require('jsonwebtoken');
const User = require('./auth.model');
const Admin = require('../admin/admin.model');
const { promisify } = require('util');
const { AppError } = require('../../shared/utils/');
const bcrypt = require('bcryptjs');

const signToken = (user) => {
  // sign with _id (userId)
  return jwt.sign(
    { userId: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

const createSendToken = async (user, statusCode, res) => {
  const token = signToken(user);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
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

  // Check if user has face record in DynamoDB
  let hasFaceRecord = false;
  let faceId = null;
  
  if (process.env.DYNAMODB_FACE_VALIDATION_TABLE && user._id) {
    try {
      const dynamodbService = require('../../services/aws/dynamodb.service');
      const userIdStr = user._id.toString();
      hasFaceRecord = await dynamodbService.checkIfUserFaceExists(userIdStr);
      
      if (hasFaceRecord) {
        try {
          const faceRecord = await dynamodbService.getUserFaceRecord(userIdStr);
          faceId = faceRecord?.data?.RekognitionId || faceRecord?.data?.rekognitionId;
        } catch (err) {
          console.warn(`⚠️ Could not retrieve face ID for userId: ${userIdStr}`, err.message);
        }
      }
      console.log(`✅ Face check in login - userId: ${userIdStr}, hasFaceRecord: ${hasFaceRecord}, faceId: ${faceId}`);
    } catch (err) {
      console.warn('⚠️ Warning: Could not check face record in login:', err.message);
    }
  }

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

module.exports = {
  signup,
  login,
  protect,
  restrictTo,
  createSendToken
};