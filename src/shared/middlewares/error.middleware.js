const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  // Handle E11000 duplicate key error
  if (err.keyPattern) {
    const field = Object.keys(err.keyPattern)[0];
    const value = err.keyValue ? err.keyValue[field] : 'null';
    
    if (value === null || value === undefined) {
      const message = `${field} field cannot be empty or null. Multiple users cannot have the same ${field}.`;
      return new AppError(message, 400);
    }
    
    const message = `Duplicate ${field}: "${value}". Please use another value!`;
    return new AppError(message, 400);
  }
  
  // Fallback for older error format
  const value = err.errmsg ? err.errmsg.match(/(["'])(\\?.)*?\1/)[0] : 'duplicate value';
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err, req, res) => {
  // Always send JSON for API errors
  if (req.originalUrl.startsWith('/api')) {
    console.log('🔴 Development Error:', {
      statusCode: err.statusCode,
      message: err.message,
      code: err.code
    });
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      error: err,
      stack: err.stack
    });
  }
  
  // For non-API routes, still send JSON
  return res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, req, res) => {
  // Always send JSON responses
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }
  
  // Programming or other unknown error: don't leak error details
  console.error('💥 Unhandled Error:', err);
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong! Please try again later.'
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};