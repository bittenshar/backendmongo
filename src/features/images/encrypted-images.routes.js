const express = require('express');
const router = express.Router();
const { decryptUrl } = require('../../shared/services/urlEncryption2.service');
const imageService = require('../../shared/services/encryptedImageService');
const Event = require('../events/event.model');
const AppError = require('../../shared/utils/appError');

/**
 * GET /api/images/health
 * Health check to verify routes are loaded
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Encrypted image routes loaded successfully',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/images/encrypted/:encryptedToken
 * Serve image using encrypted token
 * Token contains: "event-{eventId}"
 */
router.get('/encrypted/:encryptedToken', async (req, res, next) => {
  try {
    console.log('🔍 Fetching image with token:', req.params.encryptedToken.substring(0, 20) + '...');
    
    // Decrypt token to get event ID
    let eventData;
    try {
      eventData = decryptUrl(req.params.encryptedToken);
      console.log('✅ Token decrypted:', eventData);
    } catch (err) {
      console.error('❌ Token decryption failed:', err.message);
      return res.status(400).json({
        status: 'error',
        message: 'Invalid image token',
        error: err.message
      });
    }

    // Extract event ID from token (format: "event-{eventId}")
    const eventId = eventData.replace('event-', '');
    console.log('📌 Event ID extracted:', eventId);

    // Find event to get S3 key
    const event = await Event.findById(eventId);
    console.log('🔎 Event found:', !!event, event ? ` - has image: ${!!event.s3ImageKey}` : '');
    
    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    if (!event.s3ImageKey) {
      return res.status(404).json({
        status: 'error',
        message: 'Event has no image'
      });
    }

    // Fetch image from S3
    console.log('📦 Fetching image from S3:', event.s3ImageKey);
    const imageBuffer = await imageService.getEventImage(event.s3ImageKey);
    console.log('✅ Image fetched from S3:', imageBuffer.length, 'bytes');

    // Send image with proper headers
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache 24 hours
    res.set('Content-Disposition', `inline; filename="event-${eventId}.jpg"`);
    
    res.send(imageBuffer);
  } catch (error) {
    console.error('❌ Image serving error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/images/test-url
 * Generate a test encrypted image URL for debugging
 */
router.get('/test-url/:eventId', async (req, res) => {
  try {
    const { encryptUrl } = require('../../shared/services/urlEncryption2.service');
    const eventId = req.params.eventId;
    
    const event = await Event.findById(eventId);
    if (!event || !event.imageToken) {
      return res.status(404).json({
        status: 'error',
        message: 'Event or image not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        eventId,
        hasImage: !!event.s3ImageKey,
        imageUrl: `/api/images/encrypted/${event.imageToken}`,
        encryptedToken: event.imageToken
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;
