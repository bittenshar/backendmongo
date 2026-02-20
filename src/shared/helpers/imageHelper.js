/**
 * Image Retrieval Helper Module
 * Ready-to-use functions for getting images by link
 * 
 * Usage:
 * const imageHelper = require('./imageHelper');
 * const imageUrl = await imageHelper.getPublicImageUrl(eventId);
 * const encryptedUrl = await imageHelper.getSecureImageUrl(s3Url);
 */

const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

/**
 * Get event and its cover image URL (public)
 * @param {String} eventId - MongoDB event ID
 * @returns {Promise<Object>} - { success, imageUrl, event }
 */
const getEventImage = async (eventId) => {
  try {
    if (!eventId.match(/^[0-9a-fA-F]{24}$/)) {
      return {
        success: false,
        error: 'Invalid event ID format'
      };
    }

    const response = await axios.get(`${API_BASE}/api/events/${eventId}`, {
      timeout: 10000
    });

    const event = response.data.data.event;

    return {
      success: true,
      imageUrl: `${API_BASE}${event.coverImageUrl}`,
      event: {
        id: event._id,
        name: event.name,
        location: event.location,
        imageLocation: event.imageLocation
      }
    };
  } catch (error) {
    console.error('❌ Error fetching event image:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get public image URL (no authentication required)
 * @param {String} s3Key - S3 key/path (e.g., "events/694291bb.../cover.jpeg")
 * @returns {String} - Full image URL
 */
const getPublicImageUrl = (s3Key) => {
  if (!s3Key) {
    throw new Error('S3 key is required');
  }
  return `${API_BASE}/api/images/public/${s3Key}`;
};

/**
 * Encrypt S3 URL using AES-256-CBC
 * @param {String} s3Url - Full S3 URL
 * @returns {Promise<Object>} - { success, encryptedToken, secureUrl }
 */
const encryptImageUrl = async (s3Url) => {
  try {
    if (!s3Url.includes('amazonaws.com')) {
      return {
        success: false,
        error: 'Invalid S3 URL'
      };
    }

    const response = await axios.post(
      `${API_BASE}/api/images/encrypt-aes`,
      { url: s3Url },
      { timeout: 10000 }
    );

    const data = response.data.data;

    return {
      success: true,
      encryptedToken: data.encryptedToken,
      secureUrl: `${API_BASE}${data.secureUrl}`,
      message: data.message
    };
  } catch (error) {
    console.error('❌ Encryption error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get secure image URL (encrypted)
 * @param {String} eventId - MongoDB event ID
 * @returns {Promise<String>} - Secure image URL with encrypted token
 */
const getSecureImageUrl = async (eventId) => {
  try {
    // 1. Get event with image location
    const eventResult = await getEventImage(eventId);
    if (!eventResult.success) {
      throw new Error(eventResult.error);
    }

    const s3Url = eventResult.event.imageLocation.directS3Url;
    
    // 2. Encrypt the S3 URL
    const encryptResult = await encryptImageUrl(s3Url);
    if (!encryptResult.success) {
      throw new Error(encryptResult.error);
    }

    return encryptResult.secureUrl;
  } catch (error) {
    console.error('❌ Error getting secure image URL:', error.message);
    throw error;
  }
};

/**
 * Fetch image as buffer (for processing/storage)
 * @param {String} imageUrl - Image URL (public or secure)
 * @returns {Promise<Buffer>} - Image buffer
 */
const fetchImageBuffer = async (imageUrl) => {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    return response.data;
  } catch (error) {
    console.error('❌ Error fetching image:', error.message);
    throw error;
  }
};

/**
 * Stream image directly to HTTP response
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {String} eventId - MongoDB event ID
 * @param {Boolean} secure - Use encrypted URL (default: false)
 */
const streamEventImage = async (req, res, eventId, secure = false) => {
  try {
    let imageUrl;

    if (secure) {
      imageUrl = await getSecureImageUrl(eventId);
    } else {
      const result = await getEventImage(eventId);
      if (!result.success) {
        return res.status(404).json({ error: result.error });
      }
      imageUrl = result.imageUrl;
    }

    // Stream image
    const response = await axios.get(imageUrl, {
      responseType: 'stream',
      timeout: 30000
    });

    // Set headers
    res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=31536000');
    res.set('Content-Length', response.headers['content-length']);

    // Stream to client
    response.data.pipe(res);
  } catch (error) {
    console.error('❌ Stream error:', error.message);
    res.status(500).json({ error: 'Failed to stream image' });
  }
};

/**
 * Download image to file
 * @param {String} imageUrl - Image URL
 * @param {String} filePath - Where to save file
 * @returns {Promise<Boolean>} - Success status
 */
const downloadImage = async (imageUrl, filePath) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Create directory if not exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const response = await axios.get(imageUrl, {
      responseType: 'stream',
      timeout: 30000
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(true));
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('❌ Download error:', error.message);
    return false;
  }
};

/**
 * Preload image headers (check if valid)
 * @param {String} imageUrl - Image URL
 * @returns {Promise<Object>} - { valid, contentType, contentLength }
 */
const checkImageUrl = async (imageUrl) => {
  try {
    const response = await axios.head(imageUrl, {
      timeout: 10000
    });

    return {
      valid: true,
      contentType: response.headers['content-type'],
      contentLength: response.headers['content-length'],
      lastModified: response.headers['last-modified']
    };
  } catch (error) {
    console.error('❌ URL check failed:', error.message);
    return {
      valid: false,
      error: error.message
    };
  }
};

/**
 * Get all event images (for batch operations)
 * @param {Array<String>} eventIds - Array of event IDs
 * @returns {Promise<Array>} - Array of { eventId, imageUrl, success }
 */
const getMultipleEventImages = async (eventIds) => {
  try {
    const results = await Promise.all(
      eventIds.map(async (eventId) => {
        const result = await getEventImage(eventId);
        return {
          eventId,
          imageUrl: result.success ? result.imageUrl : null,
          success: result.success,
          error: result.error
        };
      })
    );

    return results;
  } catch (error) {
    console.error('❌ Batch error:', error.message);
    return [];
  }
};

/**
 * Generate image URL with encryption (backend-only)
 * @param {String} directS3Url - Raw S3 URL
 * @returns {Promise<String>} - Encrypted image URL for secure transmission
 */
const createSecureImageLink = async (directS3Url) => {
  const result = await encryptImageUrl(directS3Url);
  if (!result.success) {
    throw new Error(`Failed to create secure link: ${result.error}`);
  }
  return result.secureUrl;
};

module.exports = {
  // Main functions
  getEventImage,
  getPublicImageUrl,
  getSecureImageUrl,
  encryptImageUrl,
  
  // Utility functions
  fetchImageBuffer,
  streamEventImage,
  downloadImage,
  checkImageUrl,
  getMultipleEventImages,
  createSecureImageLink
};
