const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Initialize S3 client
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-south-1'
});

const EVENT_IMAGES_BUCKET = process.env.AWS_EVENT_IMAGES_BUCKET || 'event-images-collection';

/**
 * Upload event cover image to S3
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {String} fileName - Original file name
 * @param {String} eventId - MongoDB event ID (optional, for organizing)
 * @returns {Promise<Object>} - {success, message, url, key}
 */
const uploadEventImage = async (fileBuffer, fileName, eventId = null) => {
  try {
    if (!fileBuffer || fileBuffer.length === 0) {
      return {
        success: false,
        message: 'No file provided'
      };
    }

    // Generate unique key for S3
    const fileExtension = fileName.split('.').pop();
    const uniqueKey = `events/${eventId || 'temp'}/cover-${uuidv4()}.${fileExtension}`;

    const params = {
      Bucket: EVENT_IMAGES_BUCKET,
      Key: uniqueKey,
      Body: fileBuffer,
      ContentType: `image/${fileExtension}`
      // Removed ACL: 'public-read' - let bucket policy handle permissions
    };

    const result = await s3.upload(params).promise();

    return {
      success: true,
      message: 'Event image uploaded successfully',
      url: result.Location,
      key: result.Key,
      bucket: result.Bucket,
      etag: result.ETag
    };
  } catch (error) {
    console.error('❌ S3 Upload Error:', error.message);
    return {
      success: false,
      message: `Upload failed: ${error.message}`,
      error
    };
  }
};

/**
 * Generate presigned URL for event image upload
 * Allows frontend to upload directly to S3
 * @param {String} eventId - MongoDB event ID
 * @param {String} fileName - File name for upload
 * @param {String} contentType - MIME type (e.g., 'image/jpeg')
 * @returns {Promise<Object>} - {success, message, presignedUrl, key}
 */
const getPresignedUploadUrl = async (eventId, fileName, contentType = 'image/jpeg') => {
  try {
    if (!eventId || !fileName) {
      return {
        success: false,
        message: 'eventId and fileName are required'
      };
    }

    const fileExtension = fileName.split('.').pop();
    const key = `events/${eventId}/cover-${uuidv4()}.${fileExtension}`;

    const params = {
      Bucket: EVENT_IMAGES_BUCKET,
      Key: key,
      Expires: 3600, // 1 hour
      ContentType: contentType
      // Removed ACL - let bucket policy handle permissions
    };

    const presignedUrl = s3.getSignedUrl('putObject', params);

    return {
      success: true,
      message: 'Presigned URL generated successfully',
      presignedUrl,
      key,
      expiresIn: 3600
    };
  } catch (error) {
    console.error('❌ Presigned URL Generation Error:', error);
    return {
      success: false,
      message: `Failed to generate presigned URL: ${error.message}`,
      error
    };
  }
};

/**
 * Generate URL for reading/viewing event image
 * Returns direct S3 URL since bucket is now public
 * @param {String} s3Key - S3 object key
 * @returns {Promise<Object>} - {success, message, viewUrl}
 */
const getPresignedViewUrl = async (s3Key) => {
  try {
    if (!s3Key) {
      return {
        success: false,
        message: 'S3 key is required'
      };
    }

    // Generate direct URL since bucket is public
    const viewUrl = `https://${EVENT_IMAGES_BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${s3Key}`;

    return {
      success: true,
      message: 'View URL generated successfully',
      viewUrl
    };
  } catch (error) {
    console.error('❌ View URL Error:', error);
    return {
      success: false,
      message: `Failed to generate view URL: ${error.message}`,
      error
    };
  }
};

/**
 * Delete event image from S3
 * @param {String} s3Key - S3 object key
 * @returns {Promise<Object>} - {success, message}
 */
const deleteEventImage = async (s3Key) => {
  try {
    if (!s3Key) {
      return {
        success: false,
        message: 'S3 key is required'
      };
    }

    const params = {
      Bucket: EVENT_IMAGES_BUCKET,
      Key: s3Key
    };

    await s3.deleteObject(params).promise();

    return {
      success: true,
      message: 'Event image deleted successfully',
      key: s3Key
    };
  } catch (error) {
    console.error('❌ S3 Delete Error:', error);
    return {
      success: false,
      message: `Delete failed: ${error.message}`,
      error
    };
  }
};

/**
 * Update event image (delete old, upload new)
 * @param {Buffer} newFileBuffer - New image buffer
 * @param {String} newFileName - New file name
 * @param {String} oldS3Key - Old S3 key to delete (optional)
 * @param {String} eventId - Event ID
 * @returns {Promise<Object>} - {success, message, url, key}
 */
const updateEventImage = async (newFileBuffer, newFileName, oldS3Key, eventId) => {
  try {
    // Upload new image
    const uploadResult = await uploadEventImage(newFileBuffer, newFileName, eventId);

    if (!uploadResult.success) {
      return uploadResult;
    }

    // Delete old image if provided
    if (oldS3Key) {
      await deleteEventImage(oldS3Key);
    }

    return uploadResult;
  } catch (error) {
    console.error('❌ Update Image Error:', error);
    return {
      success: false,
      message: `Update failed: ${error.message}`,
      error
    };
  }
};

/**
 * Batch delete event images (for event deletion)
 * @param {Array<String>} s3Keys - Array of S3 keys
 * @returns {Promise<Object>} - {success, message, deleted, failed}
 */
const deleteEventImageBatch = async (s3Keys) => {
  try {
    if (!Array.isArray(s3Keys) || s3Keys.length === 0) {
      return {
        success: true,
        message: 'No images to delete',
        deleted: 0,
        failed: 0
      };
    }

    const objects = s3Keys.map(key => ({ Key: key }));

    const params = {
      Bucket: EVENT_IMAGES_BUCKET,
      Delete: {
        Objects: objects
      }
    };

    const result = await s3.deleteObjects(params).promise();

    return {
      success: true,
      message: 'Batch delete completed',
      deleted: result.Deleted ? result.Deleted.length : 0,
      failed: result.Errors ? result.Errors.length : 0
    };
  } catch (error) {
    console.error('❌ Batch Delete Error:', error);
    return {
      success: false,
      message: `Batch delete failed: ${error.message}`,
      error
    };
  }
};

module.exports = {
  uploadEventImage,
  getPresignedUploadUrl,
  getPresignedViewUrl,
  deleteEventImage,
  updateEventImage,
  deleteEventImageBatch,
  EVENT_IMAGES_BUCKET
};
