const express = require('express');
const router = express.Router();
const axios = require('axios');
const urlEncryption = require('../../shared/services/urlEncryption.service');
const { decryptUrl, isValidEncryptedToken } = require('../../shared/services/urlEncryption2.service');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

/**
 * GET /api/images/proxy/:token
 * Fetch image using encrypted S3 URL token
 * OR fetch image using S3 key directly (public access)
 * Returns image with proper content-type headers
 * 
 * Usage:
 * - With token: /api/images/proxy/ENCRYPTED_TOKEN
 * - With S3 key: /api/images/proxy?key=s3-bucket-key
 */
router.get('/proxy/:token?', catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const { key } = req.query; // S3 key for direct public access
  let s3Url;

  // Method 1: Token-based (encrypted) access
  if (token) {
    const tokenData = urlEncryption.verifyImageToken(token);
    if (!tokenData.valid) {
      return next(new AppError(tokenData.message, 401));
    }
    s3Url = tokenData.url;
  }
  // Method 2: Direct S3 key access (public - no token required)
  else if (key) {
    // Construct S3 URL directly from the key
    const bucket = process.env.AWS_S3_BUCKET || 'adminthrill';
    const region = process.env.AWS_REGION || 'us-east-1';
    s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }
  // Method 3: No token and no key - error
  else {
    return next(new AppError('Token or key parameter required', 400));
  }

  try {
    // Fetch image from S3
    const response = await axios.get(s3Url, {
      responseType: 'stream',
      timeout: 30000
    });

    // Set proper headers to serve image
    res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.set('Content-Length', response.headers['content-length']);

    // Remove AWS headers from being exposed
    res.removeHeader('x-amz-id-2');
    res.removeHeader('x-amz-request-id');

    // Stream image to client
    response.data.pipe(res);
  } catch (error) {
    console.error('❌ Image Proxy Error:', error.message);
    return next(new AppError('Failed to fetch image', 500));
  }
}));


/**
 * GET /api/images/public/*
 * Serve images directly from S3 by key (public access, no token required)
 * Usage: /api/images/public/path/to/image.jpg
 */
router.get('/public/*', catchAsync(async (req, res, next) => {
  const s3Key = req.params[0]; // Get the full path after /public/

  if (!s3Key) {
    return next(new AppError('Image key is required', 400));
  }

  try {
    // Construct S3 URL directly
    const bucket = process.env.AWS_S3_BUCKET || 'adminthrill';
    const region = process.env.AWS_REGION || 'us-east-1';
    const s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;

    // Fetch image from S3
    const response = await axios.get(s3Url, {
      responseType: 'stream',
      timeout: 30000
    });

    // Set proper headers to serve image
    res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.set('Content-Length', response.headers['content-length']);

    // Remove AWS headers from being exposed
    res.removeHeader('x-amz-id-2');
    res.removeHeader('x-amz-request-id');

    // Stream image to client
    response.data.pipe(res);
  } catch (error) {
    console.error('❌ Public Image Access Error:', error.message);
    return next(new AppError('Failed to fetch image', 500));
  }
}));


/**
 * GET /api/images/secure/:encryptedToken
 * Serve images using AES-encrypted S3 URLs
 * Decrypts token on backend and streams image to client
 * Usage: /api/images/secure/q0R7n1lK9n8v4Xc...
 * 
 * Security Benefits:
 * - S3 URL is never exposed to frontend
 * - URL is encrypted in transit and at rest
 * - Decryption happens only on secure backend
 * - Can add additional auth/rate-limiting
 */
router.get('/secure/:encryptedToken', catchAsync(async (req, res, next) => {
  const { encryptedToken } = req.params;

  // Validate token format
  if (!isValidEncryptedToken(encryptedToken)) {
    return next(new AppError('Invalid token format', 400));
  }

  let s3Url;
  try {
    // Decrypt S3 URL on secure backend
    s3Url = decryptUrl(encryptedToken);
    console.log('🔓 S3 URL decrypted safely on backend');
  } catch (error) {
    console.error('❌ Token decryption failed:', error.message);
    return next(new AppError('Invalid or expired token', 401));
  }

  try {
    // Fetch image from S3
    const response = await axios.get(s3Url, {
      responseType: 'stream',
      timeout: 30000
    });

    // Set proper headers to serve image
    res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', 'private, max-age=31536000'); // Private cache (secure endpoint)
    res.set('Content-Length', response.headers['content-length']);

    // Remove AWS headers from being exposed
    res.removeHeader('x-amz-id-2');
    res.removeHeader('x-amz-request-id');

    // Stream image to client
    response.data.pipe(res);
    console.log('✅ Secure image served successfully');
  } catch (error) {
    console.error('❌ Secure Image Access Error:', error.message);
    return next(new AppError('Failed to fetch image', 500));
  }
}));


/**
 * POST /api/images/encrypt
 * Encrypt an S3 URL (admin endpoint)
 * Returns encrypted token instead of raw S3 URL
 */
router.post('/encrypt', catchAsync(async (req, res, next) => {
  const { url, expiryHours = 24 } = req.body;

  if (!url) {
    return next(new AppError('URL is required', 400));
  }

  const token = urlEncryption.generateImageToken(url, expiryHours);

  if (!token) {
    return next(new AppError('Failed to encrypt URL', 500));
  }

  res.status(200).json({
    status: 'success',
    data: {
      token,
      expiryHours,
      proxyUrl: `/api/images/proxy/${token}`
    }
  });
}));

/**
 * POST /api/images/decrypt
 * Decrypt an image token (admin/authorized only)
 * Returns the original S3 URL
 */
router.post('/decrypt', catchAsync(async (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return next(new AppError('Token is required', 400));
  }

  const tokenData = urlEncryption.verifyImageToken(token);

  if (!tokenData.valid) {
    return next(new AppError(tokenData.message, 401));
  }

  res.status(200).json({
    status: 'success',
    data: {
      url: tokenData.url,
      valid: true
    }
  });
}));

/**
 * POST /api/images/encrypt-aes
 * Encrypt S3 URL using AES-256-CBC encryption
 * Returns encrypted token for secure transmission
 * 
 * Request body:
 * { "url": "https://bucket.s3.region.amazonaws.com/path/to/image.jpg" }
 * 
 * Response:
 * {
 *   "status": "success",
 *   "data": {
 *     "encryptedToken": "q0R7n1lK9n8v4Xc...",
 *     "secureUrl": "/api/images/secure/q0R7n1lK9n8v4Xc...",
 *     "message": "Use secureUrl to serve image securely"
 *   }
 * }
 */
router.post('/encrypt-aes', catchAsync(async (req, res, next) => {
  const { url } = req.body;

  if (!url) {
    return next(new AppError('URL is required', 400));
  }

  if (!url.includes('s3') && !url.includes('amazonaws')) {
    return next(new AppError('Only S3 URLs are supported', 400));
  }

  try {
    const { encryptUrl } = require('../../shared/services/urlEncryption2.service');
    const encryptedToken = encryptUrl(url);

    res.status(200).json({
      status: 'success',
      data: {
        encryptedToken,
        secureUrl: `/api/images/secure/${encryptedToken}`,
        originalUrl: url,
        message: '🔐 URL encrypted using AES-256-CBC. Use secureUrl for secure transmission.'
      }
    });
  } catch (error) {
    console.error('❌ AES Encryption Error:', error.message);
    return next(new AppError(`Encryption failed: ${error.message}`, 500));
  }
}));

/**
 * GET /api/images/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Image service is running'
  });
});

module.exports = router;
