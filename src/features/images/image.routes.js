const express = require('express');
const router = express.Router();
const axios = require('axios');
const AWS = require('aws-sdk');
const urlEncryption = require('../../shared/services/urlEncryption.service');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

// Initialize S3 client
const s3Client = new AWS.S3({
  apiVersion: '2006-03-01',
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

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
 * Serve images directly from S3 or external URLs (public access, no token required)
 * Usage: 
 * - S3 key: /api/images/public/path/to/image.jpg
 * - External URL: /api/images/public/https://example.com/image.jpg
 */
router.get('/public/*', catchAsync(async (req, res, next) => {
  let imageInput = req.params[0]; // Get the full path after /public/
  let isExternalUrl = false;

  if (!imageInput) {
    return next(new AppError('Image key or URL is required', 400));
  }

  try {
    // Check if it's an external URL (starts with http:// or https://)
    if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
      // It's already a full URL, use it directly with axios
      isExternalUrl = true;
      console.log('🔗 Fetching external URL:', imageInput);

      try {
        const response = await axios.get(imageInput, {
          responseType: 'stream',
          timeout: 30000,
          headers: {
            'User-Agent': 'AdminThrill-ImageProxy/1.0'
          }
        });

        res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=31536000');
        if (response.headers['content-length']) {
          res.set('Content-Length', response.headers['content-length']);
        }
        res.removeHeader('x-amz-id-2');
        res.removeHeader('x-amz-request-id');

        console.log('✅ Streaming external image:', imageInput);
        response.data.pipe(res);

        response.data.on('error', (err) => {
          console.error('❌ Stream error:', err.message);
          res.status(500).json({ status: 'error', message: 'Error streaming image' });
        });

      } catch (axiosError) {
        console.error('❌ External URL fetch failed:', {
          url: imageInput,
          status: axiosError.response?.status,
          message: axiosError.message
        });
        if (axiosError.response?.status === 404) {
          return next(new AppError('External image not found', 404));
        }
        throw axiosError;
      }
    } else {
      // It's an S3 key, use AWS SDK
      const bucket = process.env.AWS_S3_BUCKET || 'event-images-collection';
      console.log('📦 Fetching from S3:', { bucket, key: imageInput });

      const params = {
        Bucket: bucket,
        Key: imageInput
      };

      try {
        // Get object from S3
        const s3Object = await s3Client.getObject(params).promise();

        // Set proper headers
        res.set('Content-Type', s3Object.ContentType || 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=31536000');
        res.set('Content-Length', s3Object.ContentLength);

        // Remove AWS headers
        res.removeHeader('x-amz-id-2');
        res.removeHeader('x-amz-request-id');

        console.log('✅ Serving S3 image:', imageInput);

        // Send the image data
        res.send(s3Object.Body);

      } catch (s3Error) {
        console.error('❌ S3 Access Error:', {
          bucket,
          key: imageInput,
          code: s3Error.code,
          message: s3Error.message,
          statusCode: s3Error.statusCode
        });

        // Handle specific S3 errors
        if (s3Error.code === 'NoSuchKey') {
          // Return placeholder image instead of error
          console.warn('⚠️ Image not found in S3, returning placeholder');
          
          // Option A: Redirect to placeholder service
          const placeholderUrl = `https://via.placeholder.com/400x300?text=No+Image`;
          try {
            const placeholderResponse = await axios.get(placeholderUrl, {
              responseType: 'stream',
              timeout: 10000
            });
            res.set('Content-Type', 'image/svg+xml');
            res.set('Cache-Control', 'public, max-age=3600');
            return placeholderResponse.data.pipe(res);
          } catch (err) {
            console.error('Placeholder fetch failed:', err.message);
            return next(new AppError(`Image not found: ${imageInput}`, 404));
          }
        }
        if (s3Error.code === 'AccessDenied' || s3Error.code === 'Forbidden') {
          return next(new AppError('Access denied to S3 image (check AWS credentials/permissions)', 403));
        }
        if (s3Error.code === 'NoSuchBucket') {
          return next(new AppError(`S3 bucket not found: ${bucket}`, 404));
        }

        throw s3Error;
      }
    }

  } catch (error) {
    console.error('❌ Public Image Access Error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      input: imageInput,
      stack: error.stack
    });

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return next(new AppError('Unable to reach image source', 503));
    }
    if (error.code === 'ETIMEDOUT') {
      return next(new AppError('Request timeout while fetching image', 504));
    }

    return next(new AppError(`Failed to fetch image: ${error.message}`, 500));
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
 * Health check endpoint with S3 diagnostics
 */
router.get('/health', (req, res) => {
  const config = {
    status: 'success',
    message: 'Image service is running',
    s3Config: {
      bucket: process.env.AWS_S3_BUCKET || 'event-images-collection',
      region: process.env.AWS_REGION || 'ap-south-1',
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
    },
    endpoints: [
      'GET /api/images/proxy/:token (token-based, encrypted)',
      'GET /api/images/proxy?key=path/to/image (S3 key direct)',
      'GET /api/images/public/* (public S3 or external URLs)',
      'POST /api/images/encrypt (admin)',
      'POST /api/images/decrypt (admin)'
    ]
  };
  res.status(200).json(config);
});

module.exports = router;
