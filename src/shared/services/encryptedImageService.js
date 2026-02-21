const AWS = require('aws-sdk');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

// Initialize S3
const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const EVENT_IMAGES_BUCKET = process.env.AWS_EVENT_IMAGES_BUCKET || 'event-images-collection';

/**
 * Process image to 3:4 ratio and upload to S3
 * 3:4 ratio = height is 1.33x width (portrait)
 * @param {Buffer} fileBuffer - Original image buffer
 * @param {String} fileName - Original file name
 * @param {String} eventId - Event ID for organization
 * @returns {Promise<Object>} - {success, message, imageToken, encryptedS3Url}
 */
const uploadEventImageWithRatio = async (fileBuffer, fileName, eventId) => {
  try {
    if (!fileBuffer || fileBuffer.length === 0) {
      return { success: false, message: 'No file provided' };
    }

    if (!eventId) {
      return { success: false, message: 'Event ID is required' };
    }

    // Resize image to 3:4 ratio (e.g., 400x533 or 600x800)
    // Using 600x800 for good quality
    const processedBuffer = await sharp(fileBuffer)
      .resize(600, 800, {
        fit: 'cover', // Crop to exact ratio
        position: 'center'
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    // Generate S3 key - no real bucket/region info exposed
    const uniqueId = uuidv4().split('-')[0]; // Short unique ID
    const s3Key = `events/${eventId}/${uniqueId}`;

    const params = {
      Bucket: EVENT_IMAGES_BUCKET,
      Key: s3Key,
      Body: processedBuffer,
      ContentType: 'image/jpeg'
    };

    const result = await s3.upload(params).promise();

    console.log('✅ Image uploaded to S3:', {
      eventId,
      s3Key,
      size: processedBuffer.length,
      ratio: '3:4 (600x800)'
    });

    return {
      success: true,
      message: 'Image processed and uploaded successfully',
      eventId,
      s3Key: result.Key,
      imageId: `event-${eventId}`, // Only event ID exposed
      size: processedBuffer.length,
      ratio: '3:4'
    };
  } catch (error) {
    console.error('❌ Image processing error:', error.message);
    return {
      success: false,
      message: `Upload failed: ${error.message}`,
      error: error.message
    };
  }
};

/**
 * Delete image from S3
 * @param {String} s3Key - S3 key to delete
 * @returns {Promise<Object>}
 */
const deleteEventImage = async (s3Key) => {
  try {
    if (!s3Key) {
      return { success: true, message: 'No image to delete' };
    }

    await s3.deleteObject({
      Bucket: EVENT_IMAGES_BUCKET,
      Key: s3Key
    }).promise();

    console.log('✅ Image deleted from S3:', s3Key);
    return { success: true, message: 'Image deleted successfully' };
  } catch (error) {
    console.error('⚠️ Delete error:', error.message);
    return { success: false, message: error.message };
  }
};

/**
 * Get image from S3
 * @param {String} s3Key - S3 key
 * @returns {Promise<Buffer>}
 */
const getEventImage = async (s3Key) => {
  try {
    console.log('📦 Getting image from S3 - Bucket:', EVENT_IMAGES_BUCKET, 'Key:', s3Key);
    const params = {
      Bucket: EVENT_IMAGES_BUCKET,
      Key: s3Key
    };

    const data = await s3.getObject(params).promise();
    console.log('✅ Image retrieved from S3:', data.ContentLength, 'bytes');
    return data.Body;
  } catch (error) {
    console.error('❌ S3 Get image error:', {
      message: error.message,
      code: error.code,
      bucket: EVENT_IMAGES_BUCKET,
      key: s3Key,
      region: process.env.AWS_REGION
    });
    throw error;
  }
};

module.exports = {
  uploadEventImageWithRatio,
  deleteEventImage,
  getEventImage
};
