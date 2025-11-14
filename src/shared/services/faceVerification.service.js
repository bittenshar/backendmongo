const { rekognition } = require('../../config/aws-robust');
const User = require('../../features/auth/auth.model');
const AppError = require('../utils/appError');

/**
 * Detect faces in an image using AWS Rekognition
 * @param {string} imageKey - S3 key of the image
 * @returns {Promise<Object>} Rekognition response with face details
 */
exports.detectFaces = async (imageKey) => {
  try {
    const params = {
      Image: {
        S3Object: {
          Bucket: process.env.AWS_S3_BUCKET,
          Name: imageKey
        }
      }
    };

    const response = await rekognition.detectFaces(params).promise();

    if (!response.FaceDetails || response.FaceDetails.length === 0) {
      throw new AppError('No face detected in the image', 400);
    }

    return {
      success: true,
      faceCount: response.FaceDetails.length,
      faceDetails: response.FaceDetails,
      imageKey: imageKey
    };
  } catch (error) {
    if (error.code === 'InvalidParameterException') {
      throw new AppError('Invalid image format or S3 key', 400);
    }
    throw new AppError(`Face detection failed: ${error.message}`, 500);
  }
};

/**
 * Compare user's face with their stored face image
 * @param {string} userId - User ID
 * @param {string} faceImageKey - S3 key of the face image to verify
 * @param {number} similarityThreshold - Similarity threshold (0-100, default 80)
 * @returns {Promise<Object>} Comparison result
 */
exports.verifyUserFace = async (userId, faceImageKey, similarityThreshold = 80) => {
  try {
    // Get user's stored face image
    const user = await User.findById(userId);
    
    if (!user || !user.uploadedPhoto) {
      throw new AppError('User does not have a stored face image', 400);
    }

    const storedFaceKey = user.uploadedPhoto;

    // Compare faces using AWS Rekognition
    const params = {
      SourceImage: {
        S3Object: {
          Bucket: process.env.AWS_S3_BUCKET,
          Name: storedFaceKey
        }
      },
      TargetImage: {
        S3Object: {
          Bucket: process.env.AWS_S3_BUCKET,
          Name: faceImageKey
        }
      },
      SimilarityThreshold: similarityThreshold
    };

    const response = await rekognition.compareFaces(params).promise();

    return {
      success: response.FaceMatches && response.FaceMatches.length > 0,
      faceMatches: response.FaceMatches || [],
      unMatchedFaces: response.UnmatchedFaces || [],
      similarityScore: response.FaceMatches?.[0]?.Similarity || 0,
      threshold: similarityThreshold,
      verified: response.FaceMatches && response.FaceMatches.length > 0 && 
                response.FaceMatches[0].Similarity >= similarityThreshold
    };
  } catch (error) {
    if (error.code === 'InvalidParameterException' || error.code === 'InvalidS3ObjectException') {
      throw new AppError('Invalid image or S3 reference', 400);
    }
    throw new AppError(`Face verification failed: ${error.message}`, 500);
  }
};

/**
 * Detect multiple faces and ensure single face detection
 * @param {string} imageKey - S3 key of the image
 * @returns {Promise<Object>} Validation result
 */
exports.validateSingleFace = async (imageKey) => {
  try {
    const params = {
      Image: {
        S3Object: {
          Bucket: process.env.AWS_S3_BUCKET,
          Name: imageKey
        }
      }
    };

    const response = await rekognition.detectFaces(params).promise();

    if (!response.FaceDetails || response.FaceDetails.length === 0) {
      throw new AppError('No face detected in the image', 400);
    }

    if (response.FaceDetails.length > 1) {
      throw new AppError('Multiple faces detected. Please provide an image with only one face', 400);
    }

    // Check face quality
    const face = response.FaceDetails[0];
    return {
      valid: true,
      confidence: face.Confidence,
      quality: {
        brightness: face.Quality.Brightness,
        sharpness: face.Quality.Sharpness
      },
      attributes: {
        ageRange: face.AgeRange,
        eyesOpen: face.EyesOpen?.Value,
        mouthOpen: face.MouthOpen?.Value,
        emotions: face.Emotions?.map(e => ({ type: e.Type, confidence: e.Confidence }))
      }
    };
  } catch (error) {
    if (error.code === 'InvalidParameterException') {
      throw new AppError('Invalid image format or S3 key', 400);
    }
    throw error;
  }
};

/**
 * Check if user has a valid face image
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if user has a valid face image
 */
exports.userHasValidFaceImage = async (userId) => {
  try {
    const user = await User.findById(userId);
    return !!(user && user.uploadedPhoto);
  } catch (error) {
    return false;
  }
};
