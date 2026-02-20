const express = require('express');
const router = express.Router();
const axios = require('axios');
const urlEncryption = require('../../shared/services/urlEncryption.service');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

/**
 * ==========================================
 * IMAGE ENCRYPTION & DECRYPTION WORKFLOW
 * ==========================================
 * 
 * PURPOSE:
 * Encrypt S3 URLs to secure tokens that can be stored in MongoDB
 * Serve images using encrypted tokens instead of raw URLs
 * 
 * WORKFLOW:
 * 1. Event uploaded with S3 image URL
 * 2. POST /api/images/encrypt-url → Get encrypted token
 * 3. Store encrypted token in MongoDB event document
 * 4. GET /api/images/encrypted/:token → Stream image from decrypted URL
 * 5. POST /api/images/decrypt-token → Get original URL (admin only)
 */

/**
 * POST /api/images/encrypt-url
 * Encrypt an S3 URL to a secure token
 * 
 * Request:
 *   {
 *     "url": "https://event-images-collection.s3.ap-south-1.amazonaws.com/events/temp/image.jpeg",
 *     "expiryHours": 24  // optional, defaults to 24 hours
 *   }
 * 
 * Response:
 *   {
 *     "status": "success",
 *     "data": {
 *       "token": "enc_abc123xyz...",
 *       "expiryHours": 24,
 *       "note": "Store this token in MongoDB, NOT the raw URL"
 *     }
 *   }
 */
router.post('/encrypt-url', catchAsync(async (req, res, next) => {
  const { url, expiryHours = 24 } = req.body;

  // Validate required fields
  if (!url) {
    return next(new AppError('URL is required', 400));
  }

  // Validate URL format
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return next(new AppError('URL must start with http:// or https://', 400));
  }

  try {
    // Generate encrypted token from URL
    const token = urlEncryption.generateImageToken(url, expiryHours);

    if (!token) {
      return next(new AppError('Failed to encrypt URL', 500));
    }

    res.status(200).json({
      status: 'success',
      data: {
        token,
        expiryHours,
        note: 'Store this token in MongoDB using the "imageToken" field'
      }
    });
  } catch (error) {
    console.error('❌ URL Encryption Error:', error.message);
    return next(new AppError('Failed to encrypt URL', 500));
  }
}));

/**
 * GET /api/images/encrypted/:token
 * Retrieve image using encrypted token
 * Decrypts token to get S3 URL and streams image directly
 * 
 * Usage:
 *   GET /api/images/encrypted/enc_abc123xyz...
 * 
 * Response:
 *   Image binary stream with proper Content-Type headers
 */
router.get('/encrypted/:token', catchAsync(async (req, res, next) => {
  const { token } = req.params;

  if (!token) {
    return next(new AppError('Token is required', 400));
  }

  try {
    // Decrypt token to get original S3 URL
    const tokenData = urlEncryption.verifyImageToken(token);

    if (!tokenData.valid) {
      console.warn('⚠️ Invalid or expired token:', token.substring(0, 20) + '...');
      return next(new AppError(tokenData.message || 'Token invalid or expired', 401));
    }

    // Token is valid, get S3 URL
    const s3Url = tokenData.url;
    console.log('🔓 Token decrypted successfully, fetching image...');

    // Fetch image from S3 using the decrypted URL
    const response = await axios.get(s3Url, {
      responseType: 'stream',
      timeout: 30000
    });

    // Set proper response headers
    res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    if (response.headers['content-length']) {
      res.set('Content-Length', response.headers['content-length']);
    }

    // Remove AWS metadata headers from response
    res.removeHeader('x-amz-id-2');
    res.removeHeader('x-amz-request-id');

    console.log('✅ Streaming encrypted image to client');

    // Stream image to client
    response.data.pipe(res);

    // Handle stream errors
    response.data.on('error', (err) => {
      console.error('❌ Stream error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ status: 'error', message: 'Error streaming image' });
      }
    });

  } catch (error) {
    console.error('❌ Image Serve Error:', {
      token: token.substring(0, 20) + '...',
      error: error.message,
      code: error.code
    });

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return next(new AppError('Unable to reach S3 image source', 503));
    }
    if (error.code === 'ETIMEDOUT') {
      return next(new AppError('Request timeout while fetching image', 504));
    }

    return next(new AppError('Failed to fetch image', 500));
  }
}));

/**
 * POST /api/images/decrypt-token
 * Decrypt an image token to retrieve original S3 URL
 * ADMIN ONLY - Use this to verify tokens or retrieve URLs for management
 * 
 * Request:
 *   {
 *     "token": "enc_abc123xyz..."
 *   }
 * 
 * Response:
 *   {
 *     "status": "success",
 *     "data": {
 *       "url": "https://event-images-collection.s3.ap-south-1.amazonaws.com/events/temp/image.jpeg",
 *       "valid": true
 *     }
 *   }
 */
router.post('/decrypt-token', catchAsync(async (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return next(new AppError('Token is required', 400));
  }

  try {
    // Verify and decrypt token
    const tokenData = urlEncryption.verifyImageToken(token);

    if (!tokenData.valid) {
      console.warn('⚠️ Token verification failed:', tokenData.message);
      return next(new AppError(tokenData.message || 'Token invalid or expired', 401));
    }

    res.status(200).json({
      status: 'success',
      data: {
        url: tokenData.url,
        valid: true,
        message: 'Token successfully decrypted'
      }
    });
  } catch (error) {
    console.error('❌ Token Decryption Error:', error.message);
    return next(new AppError('Failed to decrypt token', 500));
  }
}));

/**
 * GET /api/images/health
 * Health check endpoint with encryption service status
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Image encryption service is running',
    workflow: {
      step1: 'POST /api/images/encrypt-url (encrypt S3 URL)',
      step2: 'Store returned token in MongoDB event document',
      step3: 'GET /api/images/encrypted/:token (retrieve image using token)',
      step4: 'POST /api/images/decrypt-token (admin - verify tokens)'
    },
    s3Bucket: process.env.AWS_S3_BUCKET || 'event-images-collection',
    awsRegion: process.env.AWS_REGION || 'ap-south-1'
  });
});

module.exports = router;
