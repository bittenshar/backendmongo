const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');
const User = require('./user.model');
const { rekognition } = require('../../config/aws-robust');
const { sendNotificationService } = require('../../services/notification.service');
const { NOTIFICATION_TYPES } = require('../notificationfcm/constants/notificationTypes');
const { NOTIFICATION_DATA_TYPES } = require('../notificationfcm/constants/notificationDataTypes');

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find().select('-password');

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users
    }
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

exports.updateUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).select('-password');

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.verifyUserFace = catchAsync(async (req, res, next) => {
  const { userId, uploadedPhoto, aadhaarPhoto } = req.body;

  const params = {
    SourceImage: {
      S3Object: {
        Bucket: process.env.AWS_S3_BUCKET,
        Name: uploadedPhoto
      }
    },
    TargetImage: {
      S3Object: {
        Bucket: process.env.AWS_S3_BUCKET,
        Name: aadhaarPhoto
      }
    },
    SimilarityThreshold: 90
  };

  try {
    const data = await rekognition.compareFaces(params).promise();
    
    if (data.FaceMatches && data.FaceMatches.length > 0) {
      const similarity = data.FaceMatches[0].Similarity;
      
      if (similarity >= 90) {
        const user = await User.findByIdAndUpdate(
          userId,
          { verificationStatus: 'verified', faceId: data.FaceMatches[0].Face.FaceId },
          { new: true }
        );

        // 🔔 Send face verification approved notification
        await sendNotificationService({
          userId: userId.toString(),
          type: NOTIFICATION_TYPES.FACE_VERIFICATION_APPROVED,
          payload: {},
          data: {
            type: NOTIFICATION_DATA_TYPES.FACE_VERIFICATION_APPROVED,
            userId: userId.toString(),
          },
        });

        return res.status(200).json({
          status: 'success',
          data: {
            user,
            similarity
          }
        });
      }
    }

    // 🔔 Send face verification rejected notification
    await sendNotificationService({
      userId: userId.toString(),
      type: NOTIFICATION_TYPES.FACE_VERIFICATION_REJECTED,
      payload: {
        reason: 'Faces do not match. Please try again.',
      },
      data: {
        type: NOTIFICATION_DATA_TYPES.FACE_VERIFICATION_REJECTED,
        userId: userId.toString(),
      },
    });

    res.status(200).json({
      status: 'fail',
      message: 'Faces do not match',
      data: {
        similarity: data.FaceMatches ? data.FaceMatches[0].Similarity : 0
      }
    });
  } catch (err) {
    return next(new AppError('Error verifying face: ' + err.message, 500));
  }
});

exports.getMyProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('-password');

  res.status(200).json({
    status: 'success',
    data: {
      user: user,
      yourPermissions: user.permissions || [],
      yourRole: user.role
    }
  });
});

exports.verifyUser = catchAsync(async (req, res, next) => {
  const userId = req.params.id;
  const { verificationStatus } = req.body;

  // Validate verification status
  const validStatuses = ['pending', 'verified', 'rejected'];
  if (!verificationStatus || !validStatuses.includes(verificationStatus)) {
    return next(new AppError(`Verification status must be one of: ${validStatuses.join(', ')}`, 400));
  }
  
  const user = await User.findByIdAndUpdate(
    userId,
    { verificationStatus },
    { new: true }
  ).select('-password');

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  // 🔔 Send appropriate notification based on verification status
  if (verificationStatus === 'verified') {
    await sendNotificationService({
      userId: userId.toString(),
      type: NOTIFICATION_TYPES.FACE_VERIFICATION_APPROVED,
      payload: {},
      data: {
        type: NOTIFICATION_DATA_TYPES.FACE_VERIFICATION_APPROVED,
        userId: userId.toString(),
      },
    });
  } else if (verificationStatus === 'rejected') {
    await sendNotificationService({
      userId: userId.toString(),
      type: NOTIFICATION_TYPES.FACE_VERIFICATION_REJECTED,
      payload: {
        reason: 'Your account verification was rejected. Please contact support.',
      },
      data: {
        type: NOTIFICATION_DATA_TYPES.FACE_VERIFICATION_REJECTED,
        userId: userId.toString(),
      },
    });
  }

  res.status(200).json({
    status: 'success',
    message: `User verification status updated to: ${verificationStatus}`,
    data: {
      user
    }
  });
});