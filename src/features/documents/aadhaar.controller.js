const Aadhaar = require('./aadhaar.model');
const User = require('../auth/auth.model');
const urlEncryption = require('../../shared/services/urlEncryption.service');
const AppError = require('../../shared/utils/appError');
const axios = require('axios');

/**
 * Upload Aadhaar document
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.uploadAadhaarDocument = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const {
      aadhaarNumber,
      fullName,
      dateOfBirth,
      gender,
      address,
      frontImageS3Key,
      backImageS3Key // Optional
    } = req.body;

    // Validate inputs
    if (!aadhaarNumber || !fullName || !dateOfBirth || !gender || !address || !frontImageS3Key) {
      return next(new AppError('Missing required fields', 400));
    }

    // Validate Aadhaar number format
    if (!/^\d{12}$/.test(aadhaarNumber)) {
      return next(new AppError('Invalid Aadhaar number format. Must be 12 digits.', 400));
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Check if Aadhaar already exists for this user
    let aadhaar = await Aadhaar.findOne({ userId });
    
    if (aadhaar) {
      // Update existing Aadhaar document
      aadhaar.aadhaarNumber = aadhaarNumber;
      aadhaar.fullName = fullName;
      aadhaar.dateOfBirth = new Date(dateOfBirth);
      aadhaar.gender = gender;
      aadhaar.address = address;
      aadhaar.frontImageS3Key = frontImageS3Key;
      if (backImageS3Key) aadhaar.backImageS3Key = backImageS3Key;
      aadhaar.verificationStatus = 'pending'; // Reset to pending after update
    } else {
      // Create new Aadhaar document
      aadhaar = await Aadhaar.create({
        userId,
        aadhaarNumber,
        fullName,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        address,
        frontImageS3Key,
        backImageS3Key
      });
    }

    // Generate encryption tokens for images
    const frontToken = urlEncryption.generateImageToken(frontImageS3Key, 168); // 7 days
    let backToken = null;
    if (backImageS3Key) {
      backToken = urlEncryption.generateImageToken(backImageS3Key, 168);
    }

    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 168); // 7 days

    await aadhaar.updateImageTokens(frontToken, backToken, expiryDate);

    res.status(201).json({
      status: 'success',
      message: 'Aadhaar document uploaded successfully',
      data: {
        aadhaar: aadhaar.getPublicData(),
        imageTokens: {
          front: frontToken,
          back: backToken
        },
        proxyUrls: {
          front: `/api/aadhaar/proxy/${frontToken}`,
          back: backToken ? `/api/aadhaar/proxy/${backToken}` : null
        }
      }
    });
  } catch (error) {
    console.error('❌ Upload Aadhaar Error:', error);
    return next(new AppError(error.message, 500));
  }
};

/**
 * Get Aadhaar document for a user
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.getAadhaarDocument = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const aadhaar = await Aadhaar.findOne({ userId }).populate('userId', 'name email');

    if (!aadhaar) {
      return next(new AppError('Aadhaar document not found', 404));
    }

    // Generate new tokens if expired
    let frontToken = aadhaar.frontImageToken;
    let backToken = aadhaar.backImageToken;

    if (aadhaar.isExpired) {
      frontToken = urlEncryption.generateImageToken(aadhaar.frontImageS3Key, 168);
      if (aadhaar.backImageS3Key) {
        backToken = urlEncryption.generateImageToken(aadhaar.backImageS3Key, 168);
      }
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 168);
      await aadhaar.updateImageTokens(frontToken, backToken, expiryDate);
    }

    res.status(200).json({
      status: 'success',
      data: {
        aadhaar: aadhaar.toObject(),
        imageTokens: {
          front: frontToken,
          back: backToken
        },
        proxyUrls: {
          front: `/api/aadhaar/proxy/${frontToken}`,
          back: backToken ? `/api/aadhaar/proxy/${backToken}` : null
        }
      }
    });
  } catch (error) {
    console.error('❌ Get Aadhaar Error:', error);
    return next(new AppError(error.message, 500));
  }
};

/**
 * Verify Aadhaar document (Admin only)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.verifyAadhaarDocument = async (req, res, next) => {
  try {
    const { aadhaarId } = req.params;
    const { notes } = req.body;
    const adminId = req.user._id; // Assumes authentication middleware sets req.user

    const aadhaar = await Aadhaar.findById(aadhaarId);

    if (!aadhaar) {
      return next(new AppError('Aadhaar document not found', 404));
    }

    await aadhaar.verify(adminId, notes);

    res.status(200).json({
      status: 'success',
      message: 'Aadhaar document verified successfully',
      data: {
        aadhaar: aadhaar.getPublicData()
      }
    });
  } catch (error) {
    console.error('❌ Verify Aadhaar Error:', error);
    return next(new AppError(error.message, 500));
  }
};

/**
 * Reject Aadhaar document (Admin only)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.rejectAadhaarDocument = async (req, res, next) => {
  try {
    const { aadhaarId } = req.params;
    const { notes } = req.body;
    const adminId = req.user._id;

    if (!notes) {
      return next(new AppError('Rejection notes are required', 400));
    }

    const aadhaar = await Aadhaar.findById(aadhaarId);

    if (!aadhaar) {
      return next(new AppError('Aadhaar document not found', 404));
    }

    await aadhaar.reject(adminId, notes);

    res.status(200).json({
      status: 'success',
      message: 'Aadhaar document rejected',
      data: {
        aadhaar: aadhaar.getPublicData()
      }
    });
  } catch (error) {
    console.error('❌ Reject Aadhaar Error:', error);
    return next(new AppError(error.message, 500));
  }
};

/**
 * Delete Aadhaar document
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.deleteAadhaarDocument = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user._id;

    // Users can only delete their own documents
    if (userId !== requestingUserId.toString() && req.user.role !== 'admin') {
      return next(new AppError('Not authorized to delete this document', 403));
    }

    const aadhaar = await Aadhaar.findOneAndDelete({ userId });

    if (!aadhaar) {
      return next(new AppError('Aadhaar document not found', 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Aadhaar document deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete Aadhaar Error:', error);
    return next(new AppError(error.message, 500));
  }
};

/**
 * Get all pending Aadhaar verifications (Admin only)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.getPendingAadhaarDocuments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const documents = await Aadhaar.find({ verificationStatus: 'pending' })
      .populate('userId', 'name email phone')
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Aadhaar.countDocuments({ verificationStatus: 'pending' });

    res.status(200).json({
      status: 'success',
      data: {
        documents,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('❌ Get Pending Aadhaar Error:', error);
    return next(new AppError(error.message, 500));
  }
};

/**
 * Get Aadhaar verification statistics (Admin only)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.getAadhaarStatistics = async (req, res, next) => {
  try {
    const stats = await Aadhaar.aggregate([
      {
        $group: {
          _id: '$verificationStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalDocuments = await Aadhaar.countDocuments();

    res.status(200).json({
      status: 'success',
      data: {
        statistics: stats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        total: totalDocuments
      }
    });
  } catch (error) {
    console.error('❌ Get Aadhaar Statistics Error:', error);
    return next(new AppError(error.message, 500));
  }
};
