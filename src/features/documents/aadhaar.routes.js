const express = require('express');
const router = express.Router();
const axios = require('axios');
const aadhaarController = require('./aadhaar.controller');
const urlEncryption = require('../../shared/services/urlEncryption.service');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

/**
 * ==========================================
 * AADHAAR DOCUMENT ROUTES
 * ==========================================
 */

/**
 * POST /api/aadhaar/upload/:userId
 * Upload Aadhaar document with front and back images
 */
router.post('/upload/:userId', catchAsync(aadhaarController.uploadAadhaarDocument));

/**
 * GET /api/aadhaar/:userId
 * Get Aadhaar document details
 */
router.get('/:userId', catchAsync(aadhaarController.getAadhaarDocument));

/**
 * DELETE /api/aadhaar/:userId
 * Delete Aadhaar document
 */
router.delete('/:userId', catchAsync(aadhaarController.deleteAadhaarDocument));

/**
 * PATCH /api/aadhaar/verify/:aadhaarId
 * Verify Aadhaar document (Admin only)
 */
router.patch('/verify/:aadhaarId', catchAsync(aadhaarController.verifyAadhaarDocument));

/**
 * PATCH /api/aadhaar/reject/:aadhaarId
 * Reject Aadhaar document (Admin only)
 */
router.patch('/reject/:aadhaarId', catchAsync(aadhaarController.rejectAadhaarDocument));

/**
 * GET /api/aadhaar/proxy/:token
 * Fetch Aadhaar image using encrypted token
 * Same as image proxy but specifically for Aadhaar documents
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
    res.set('Cache-Control', 'public, max-age=604800'); // Cache for 7 days
    res.set('Content-Length', response.headers['content-length']);

    // Remove AWS headers from being exposed
    res.removeHeader('x-amz-id-2');
    res.removeHeader('x-amz-request-id');

    // Add security headers
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');

    // Stream image to client
    response.data.pipe(res);
  } catch (error) {
    console.error('❌ Aadhaar Image Proxy Error:', error.message);
    return next(new AppError('Failed to fetch Aadhaar image', 500));
  }
}));

/**
 * GET /api/aadhaar/admin/pending
 * Get all pending Aadhaar verifications (Admin only)
 */
router.get('/admin/pending', catchAsync(aadhaarController.getPendingAadhaarDocuments));

/**
 * GET /api/aadhaar/admin/statistics
 * Get Aadhaar verification statistics (Admin only)
 */
router.get('/admin/statistics', catchAsync(aadhaarController.getAadhaarStatistics));

/**
 * POST /api/aadhaar/encrypt
 * Encrypt Aadhaar S3 URL for secure transmission
 */
router.post('/encrypt', catchAsync(async (req, res, next) => {
  const { url, expiryHours = 168 } = req.body; // Default 7 days

  if (!url) {
    return next(new AppError('URL is required', 400));
  }

  try {
    const token = urlEncryption.generateImageToken(url, expiryHours);

    if (!token) {
      return next(new AppError('Failed to encrypt URL', 500));
    }

    res.status(200).json({
      status: 'success',
      data: {
        token,
        expiryHours,
        proxyUrl: `/api/aadhaar/proxy/${token}`
      }
    });
  } catch (error) {
    console.error('❌ Aadhaar Encryption Error:', error);
    return next(new AppError('Failed to encrypt URL', 500));
  }
}));

/**
 * POST /api/aadhaar/decrypt
 * Decrypt Aadhaar token (Admin only)
 */
router.post('/decrypt', catchAsync(async (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return next(new AppError('Token is required', 400));
  }

  try {
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
  } catch (error) {
    console.error('❌ Aadhaar Decryption Error:', error);
    return next(new AppError('Failed to decrypt token', 500));
  }
}));

/**
 * GET /api/aadhaar/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Aadhaar service is running'
  });
});

module.exports = router;
