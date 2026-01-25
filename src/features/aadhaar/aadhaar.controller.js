const AWS = require('aws-sdk');
const AadhaarImage = require('./aadhaar.model');
const User = require('../auth/auth.model');
const AppError = require('../../shared/utils/appError');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

/**
 * Upload Aadhaar Image
 * @route POST /api/aadhaar/upload-image
 * @access Private
 */
exports.uploadAadhaarImage = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { fullName } = req.body; // Get fullName from request body
    const imageType = 'front'; // Only front image

    // Validate inputs
    if (!req.file) {
      console.log('❌ No file in request. Available:', {
        hasFile: !!req.file,
        files: req.files,
        headers: req.headers
      });
      return next(new AppError('No image file provided. Make sure to send file as multipart/form-data with field name "file"', 400));
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${imageType}-${timestamp}.jpg`;
    // Include fullName in the S3 key path
    const fullNamePath = fullName ? fullName.toLowerCase().replace(/\s+/g, '-') : 'unknown';
    const s3Key = `uploads/aadhaar/${fullNamePath}/${userId}/${fileName}`;

    // Upload to S3
    const bucketName = process.env.AWS_S3_BUCKET || 'event-images-collection';
    console.log('📤 S3 Upload Params:', {
      bucketName,
      s3Key,
      envBucket: process.env.AWS_S3_BUCKET,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });

    const params = {
      Bucket: bucketName,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'private'
    };

    const s3Response = await s3.upload(params).promise();

    // Save to database
    let aadhaarImage = await AadhaarImage.findOne({ userId, imageType });

    if (aadhaarImage) {
      // Update existing image
      aadhaarImage.fullName = fullName;
      aadhaarImage.s3Key = s3Key;
      aadhaarImage.s3Url = s3Response.Location;
      aadhaarImage.fileName = fileName;
      aadhaarImage.fileSize = req.file.size;
      aadhaarImage.mimeType = req.file.mimetype;
      aadhaarImage.status = 'pending';
      await aadhaarImage.save();
    } else {
      // Create new image record
      aadhaarImage = await AadhaarImage.create({
        userId,
        fullName,
        imageType,
        s3Key,
        s3Url: s3Response.Location,
        fileName,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      });
    }

    res.status(201).json({
      success: true,
      message: 'Aadhaar image uploaded successfully',
      data: {
        imageId: aadhaarImage._id,
        userId: aadhaarImage.userId,
        fullName: aadhaarImage.fullName,
        imageType: aadhaarImage.imageType,
        s3Key: aadhaarImage.s3Key,
        fileName: aadhaarImage.fileName,
        fileSize: aadhaarImage.fileSize,
        uploadedAt: aadhaarImage.uploadedAt,
        status: aadhaarImage.status
      }
    });
  } catch (error) {
    console.error('❌ Aadhaar Image Upload Error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode
    });
    return next(new AppError(`Failed to upload Aadhaar image: ${error.message}`, 500));
  }
};

/**
 * Get Aadhaar Images by UserId (from token)
 * @route GET /api/aadhaar/images
 * @access Private - Only authenticated user can get their own images
 */
exports.getAadhaarImages = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get all images for the authenticated user
    const images = await AadhaarImage.find({ userId }).sort({ uploadedAt: -1 });

    res.status(200).json({
      success: true,
      count: images.length,
      data: images.map(img => ({
        _id: img._id,
        imageType: img.imageType,
        fileName: img.fileName,
        fileSize: img.fileSize,
        status: img.status,
        uploadedAt: img.uploadedAt,
        fullName: img.fullName
      }))
    });
  } catch (error) {
    console.error('❌ Get Aadhaar Images Error:', error.message);
    return next(new AppError('Failed to retrieve Aadhaar images', 500));
  }
};

/**
 * Check Aadhaar Upload Status by UserId
 * @route GET /api/aadhaar/status
 * @access Private - Only authenticated user can check their own status
 * Returns: { uploaded: boolean, status: "pending|approved|rejected", imageId: "..." }
 */
exports.checkAadhaarUploadStatus = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const image = await AadhaarImage.findOne({ userId, imageType: 'front' });

    if (!image) {
      return res.status(200).json({
        success: true,
        uploaded: false,
        message: 'No Aadhaar image uploaded yet',
        data: {
          userId: userId,
          uploaded: false,
          status: null,
          imageId: null
        }
      });
    }

    res.status(200).json({
      success: true,
      uploaded: true,
      message: `Aadhaar image ${image.status}`,
      data: {
        userId: userId,
        uploaded: true,
        imageId: image._id,
        status: image.status,
        fullName: image.fullName,
        uploadedAt: image.uploadedAt
      }
    });
  } catch (error) {
    console.error('❌ Check Upload Status Error:', error.message);
    return next(new AppError('Failed to check upload status', 500));
  }
};

/**
 * Get Specific Aadhaar Image by ImageId
 * @route GET /api/aadhaar/images/:imageId
 * @access Private - Only authenticated user can get their own specific image
 */
exports.getAadhaarImageById = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { imageId } = req.params;

    const image = await AadhaarImage.findById(imageId);

    if (!image) {
      return next(new AppError('Image not found', 404));
    }

    // Verify that the image belongs to the authenticated user
    if (image.userId.toString() !== userId.toString()) {
      return next(new AppError('Not authorized to access this image', 403));
    }

    res.status(200).json({
      success: true,
      data: image
    });
  } catch (error) {
    console.error('❌ Get Aadhaar Image Error:', error.message);
    return next(new AppError('Failed to retrieve Aadhaar image', 500));
  }
};

/**
 * Delete Aadhaar Image
 * @route DELETE /api/aadhaar/images/:imageId
 * @access Private
 */
exports.deleteAadhaarImage = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { imageId } = req.params;

    const aadhaarImage = await AadhaarImage.findById(imageId);

    if (!aadhaarImage) {
      return next(new AppError('Image not found', 404));
    }

    if (aadhaarImage.userId.toString() !== userId.toString()) {
      return next(new AppError('Not authorized to delete this image', 403));
    }

    // Delete from S3
    const deleteParams = {
      Bucket: process.env.AWS_S3_BUCKET || 'event-images-collection',
      Key: aadhaarImage.s3Key
    };

    await s3.deleteObject(deleteParams).promise();

    // Delete from database
    await AadhaarImage.findByIdAndDelete(imageId);

    res.status(200).json({
      success: true,
      message: 'Aadhaar image deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete Aadhaar Image Error:', error.message);
    return next(new AppError('Failed to delete Aadhaar image', 500));
  }
};
