const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');
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

const BUCKET = process.env.AWS_S3_BUCKET || 'event-images-collection';

/**
 * ImageID Mapping Pattern - Converts clean imageId to actual storage path
 * Examples:
 * - event-123-cover → events/123/cover.jpg
 * - event-456-thumbnail → events/456/thumbnail.png
 * - user-789-avatar → users/789/avatar.jpg
 * 
 * Pattern: {type}-{id}-{name}
 * Resolves to: {type}s/{id}/{name}.{extension}
 */
const mapImageIdToS3Key = (imageId) => {
  // Pattern: type-id-name
  const parts = imageId.split('-');
  if (parts.length < 3) {
    throw new Error('Invalid imageId format. Expected: type-id-name');
  }

  const type = parts[0]; // 'event', 'user', etc.
  const id = parts[1];   // numeric ID
  const name = parts.slice(2).join('-'); // remaining parts as name

  // Construct S3 key: types/id/name.ext (auto-detect common extensions)
  let s3Key = `${type}s/${id}/${name}`;

  // If no extension, we'll try common formats and let S3 handle 404
  return s3Key;
};

/**
 * Decode base64-encoded S3 key (for complex paths)
 * Usage: /api/images/url/base64EncodedKey
 */
const decodeS3Key = (encoded) => {
  try {
    return Buffer.from(encoded, 'base64').toString('utf-8');
  } catch (error) {
    throw new Error('Invalid base64 encoded key');
  }
};

/**
 * Generate SVG placeholder image
 */
const generatePlaceholders3Svg = (imageId) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#e0e0e0;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f5f5f5;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="400" height="300" fill="url(#grad1)"/>
  <text x="200" y="140" font-family="Arial, sans-serif" font-size="18" fill="#999" text-anchor="middle">No Image</text>
  <text x="200" y="170" font-family="Arial, sans-serif" font-size="12" fill="#bbb" text-anchor="middle">ID: ${imageId}</text>
</svg>`;
};

/**
 * GET /api/images/:imageId
 * Clean proxy endpoint - hides all infrastructure details
 * 
 * ImageID format: type-id-name
 * Examples:
 * - GET /api/images/event-123-cover → serves events/123/cover.jpg from storage
 * - GET /api/images/user-456-avatar → serves users/456/avatar.jpg from storage
 * 
 * Returns: Image with proper content-type and cache headers
 */
router.get('/:imageId', catchAsync(async (req, res, next) => {
  let { imageId } = req.params;

  if (!imageId || imageId === 'health' || imageId === 'url') {
    return next();
  }

  try {
    // Map clean imageId to actual S3 key
    let s3Key = mapImageIdToS3Key(imageId);

    console.log('🔍 Resolving imageId:', { imageId, mappedS3Key: s3Key });

    // Try common image extensions (jpg, png, jpeg, gif, webp, svg)
    const extensions = ['.jpg', '.png', '.jpeg', '.gif', '.webp', '.svg'];
    let foundObject = null;
    let actualKey = null;

    for (const ext of extensions) {
      const keyToTry = s3Key + ext;
      try {
        const headResult = await s3Client.headObject({
          Bucket: BUCKET,
          Key: keyToTry
        }).promise();

        foundObject = headResult;
        actualKey = keyToTry;
        break;
      } catch (err) {
        if (err.code !== 'NotFound') {
          console.warn(`⚠️ Unexpected error checking ${keyToTry}:`, err.code);
        }
        // Continue to next extension
      }
    }

    if (!foundObject || !actualKey) {
      console.warn('⚠️ Image not found for imageId:', imageId);
      const placeholderSvg = generatePlaceholders3Svg(imageId);
      res.set('Content-Type', 'image/svg+xml');
      res.set('Cache-Control', 'public, max-age=3600');
      res.set('Content-Length', Buffer.byteLength(placeholderSvg));
      return res.send(placeholderSvg);
    }

    // Get the actual object from S3
    const s3Object = await s3Client.getObject({
      Bucket: BUCKET,
      Key: actualKey
    }).promise();

    // Set response headers
    res.set('Content-Type', s3Object.ContentType || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    res.set('Content-Length', s3Object.ContentLength);

    // Hide infrastructure headers
    res.removeHeader('x-amz-id-2');
    res.removeHeader('x-amz-request-id');
    res.removeHeader('x-amz-version-id');

    console.log('✅ Serving image:', { imageId, actualKey });

    res.send(s3Object.Body);

  } catch (error) {
    console.error('❌ Image retrieval error:', {
      imageId,
      message: error.message,
      code: error.code
    });

    if (error.message.includes('Invalid imageId format')) {
      return next(new AppError('Invalid image ID format. Expected: type-id-name', 400));
    }

    return next(new AppError('Unable to retrieve image', 500));
  }
}));

/**
 * GET /api/images/url/:encodedKey
 * Alternative proxy for base64-encoded S3 keys
 * Useful for complex paths that don't fit the imageId pattern
 * 
 * Usage: GET /api/images/url/base64EncodedS3Key
 * Example: GET /api/images/url/ZXZlbnRzLzEyMy9jb3Zlci5qcGc=
 * (base64 of: events/123/cover.jpg)
 */
router.get('/url/:encodedKey', catchAsync(async (req, res, next) => {
  const { encodedKey } = req.params;

  if (!encodedKey) {
    return next(new AppError('Encoded S3 key is required', 400));
  }

  try {
    // Decode the S3 key from base64
    const s3Key = decodeS3Key(encodedKey);

    console.log('🔍 Fetching from encoded key:', { encodedKey: encodedKey.substring(0, 20) + '...', s3Key });

    // Get object from S3
    const s3Object = await s3Client.getObject({
      Bucket: BUCKET,
      Key: s3Key
    }).promise();

    // Set response headers
    res.set('Content-Type', s3Object.ContentType || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=31536000');
    res.set('Content-Length', s3Object.ContentLength);

    // Hide infrastructure headers
    res.removeHeader('x-amz-id-2');
    res.removeHeader('x-amz-request-id');

    console.log('✅ Serving image from encoded key:', s3Key);

    res.send(s3Object.Body);

  } catch (error) {
    console.error('❌ Encoded key retrieval error:', {
      message: error.message,
      code: error.code
    });

    if (error.message.includes('Invalid base64')) {
      return next(new AppError('Invalid base64-encoded key', 400));
    }

    if (error.code === 'NoSuchKey') {
      const placeholderSvg = generatePlaceholders3Svg('Unknown');
      res.set('Content-Type', 'image/svg+xml');
      res.set('Cache-Control', 'public, max-age=3600');
      return res.send(placeholderSvg);
    }

    return next(new AppError('Unable to retrieve image', 500));
  }
}));

/**
 * POST /api/images/encode
 * Utility endpoint to encode S3 keys to base64 for use with /url endpoint
 * Usage: POST with { "s3Key": "events/123/cover.jpg" }
 * Returns: { "encodedKey": "base64EncodedString" }
 */
router.post('/encode', catchAsync(async (req, res, next) => {
  const { s3Key } = req.body;

  if (!s3Key) {
    return next(new AppError('s3Key is required', 400));
  }

  const encodedKey = Buffer.from(s3Key).toString('base64');

  res.status(200).json({
    status: 'success',
    data: {
      s3Key,
      encodedKey,
      proxyUrl: `/api/images/url/${encodedKey}`
    }
  });
}));

/**
 * GET /api/images/health
 * Public health check endpoint
 * Shows service status without exposing infrastructure details
 */
router.get('/health', (req, res) => {
  const config = {
    status: 'success',
    message: 'Image service is operational',
    endpoints: [
      {
        path: 'GET /api/images/:imageId',
        description: 'Fetch image using clean ID (type-id-name format)',
        example: 'GET /api/images/event-123-cover'
      },
      {
        path: 'GET /api/images/url/:encodedKey',
        description: 'Fetch image using base64-encoded storage key',
        example: 'GET /api/images/url/ZXZlbnRzLzEyMy9jb3Zlci5qcGc='
      },
      {
        path: 'POST /api/images/encode',
        description: 'Encode storage key to base64 for /url endpoint',
        example: '{"s3Key":"events/123/cover.jpg"}'
      }
    ]
  };
  res.status(200).json(config);
});

module.exports = router;
