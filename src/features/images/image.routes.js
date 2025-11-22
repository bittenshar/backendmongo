const express = require('express');
const router = express.Router();
const axios = require('axios');
const urlEncryption = require('../../shared/services/urlEncryption.service');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

/**
 * GET /api/images/proxy/:token
 * Fetch image using encrypted S3 URL token
 * Returns image with proper content-type headers
 */
router.get('/proxy/:token', catchAsync(async (req, res, next) => {
  const { token } = req.params;

  // Verify token
  const tokenData = urlEncryption.verifyImageToken(token);

  if (!tokenData.valid) {
    return next(new AppError(tokenData.message, 401));
  }

  const s3Url = tokenData.url;

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
