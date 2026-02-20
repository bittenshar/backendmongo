const express = require('express');
const router = express.Router();
const { decryptUrl } = require('../../shared/services/urlEncryption2.service');
const imageService = require('../../shared/services/encryptedImageService');
const Event = require('../events/event.model');
const AppError = require('../../shared/utils/appError');

/**
 * GET /api/images/encrypted/:encryptedToken
 * Serve image using encrypted token
 * Token contains: "event-{eventId}"
 */
router.get('/encrypted/:encryptedToken', async (req, res, next) => {
  try {
    // Decrypt token to get event ID
    let eventData;
    try {
      eventData = decryptUrl(req.params.encryptedToken);
    } catch (err) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired image token'
      });
    }

    // Extract event ID from token (format: "event-{eventId}")
    const eventId = eventData.replace('event-', '');

    // Find event to get S3 key
    const event = await Event.findById(eventId);
    if (!event || !event.s3ImageKey) {
      return res.status(404).json({
        status: 'error',
        message: 'Image not found'
      });
    }

    // Fetch image from S3
    const imageBuffer = await imageService.getEventImage(event.s3ImageKey);

    // Send image with proper headers
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache 24 hours
    res.set('Content-Disposition', `inline; filename="event-${eventId}.jpg"`);
    
    res.send(imageBuffer);
  } catch (error) {
    console.error('❌ Image serving error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve image'
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
