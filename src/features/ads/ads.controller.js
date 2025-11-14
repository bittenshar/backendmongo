const Ad = require('./ads.model');
const Organizer = require('../organizers/organizer.model');
const AWS = require('aws-sdk');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// ============================================
// @desc    Upload and create new ad
// @route   POST /api/ads
// @access  Private (Organizer)
// ============================================
exports.createAd = catchAsync(async (req, res, next) => {
  const { organizerId, title, description, adType, targetUrl, displayDuration, priority, startDate, endDate, tags, budget, targetAudience } = req.body;

  // Validate organizer exists
  const organizer = await Organizer.findById(organizerId);
  if (!organizer) {
    return next(new AppError('Organizer not found', 404));
  }

  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start >= end) {
    return next(new AppError('Start date must be before end date', 400));
  }

  // Upload image if provided
  let imageUrl = req.body.imageUrl;
  let imageKey = null;

  if (req.file) {
    try {
      const key = `ads/${organizerId}/${Date.now()}-${req.file.originalname}`;
      
      const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        ACL: 'public-read'
      };

      const result = await s3.upload(params).promise();
      imageUrl = result.Location;
      imageKey = key;
    } catch (error) {
      return next(new AppError(`Failed to upload image: ${error.message}`, 500));
    }
  }

  // Create ad
  const ad = await Ad.create({
    organizerId,
    title,
    description,
    imageUrl,
    imageKey,
    adType,
    targetUrl,
    displayDuration: displayDuration || 5,
    priority: priority || 0,
    startDate: start,
    endDate: end,
    tags: tags || [],
    budget: budget || 0,
    targetAudience: targetAudience || 'all',
    status: 'pending' // Requires approval
  });

  res.status(201).json({
    status: 'success',
    message: 'Ad created successfully. Awaiting admin approval.',
    data: {
      ad
    }
  });
});

// ============================================
// @desc    Get all active ads for Android app
// @route   GET /api/ads/active
// @access  Public
// ============================================
exports.getActiveAds = catchAsync(async (req, res, next) => {
  const { targetAudience } = req.query;

  let filter = { targetAudience: { $in: ['all'] } };

  if (targetAudience && targetAudience !== 'all') {
    filter.targetAudience.$in.push(targetAudience);
  }

  const ads = await Ad.getActiveAds(filter);

  // Increment impressions for each ad
  if (ads.length > 0) {
    const adIds = ads.map(ad => ad._id);
    await Ad.updateMany(
      { _id: { $in: adIds } },
      { $inc: { impressions: 1 } }
    );
  }

  res.status(200).json({
    status: 'success',
    results: ads.length,
    data: {
      ads
    }
  });
});

// ============================================
// @desc    Get ads by specific organizer
// @route   GET /api/ads/organizer/:organizerId
// @access  Private (Organizer or Admin)
// ============================================
exports.getAdsByOrganizer = catchAsync(async (req, res, next) => {
  const { organizerId } = req.params;
  const { status } = req.query;

  // Verify organizer exists
  const organizer = await Organizer.findById(organizerId);
  if (!organizer) {
    return next(new AppError('Organizer not found', 404));
  }

  const filter = status ? { status } : {};
  const ads = await Ad.getOrganizerAds(organizerId, filter);

  res.status(200).json({
    status: 'success',
    results: ads.length,
    data: {
      ads
    }
  });
});

// ============================================
// @desc    Get single ad details
// @route   GET /api/ads/:id
// @access  Public
// ============================================
exports.getAd = catchAsync(async (req, res, next) => {
  const ad = await Ad.findById(req.params.id);

  if (!ad) {
    return next(new AppError('Ad not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      ad
    }
  });
});

// ============================================
// @desc    Update ad
// @route   PATCH /api/ads/:id
// @access  Private (Organizer)
// ============================================
exports.updateAd = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { organizerId } = req.body;
  const updateData = { ...req.body };

  // Find ad
  const ad = await Ad.findById(id);
  if (!ad) {
    return next(new AppError('Ad not found', 404));
  }

  // Verify ownership
  if (ad.organizerId.toString() !== organizerId) {
    return next(new AppError('You do not have permission to update this ad', 403));
  }

  // Only pending ads can be edited
  if (ad.status !== 'pending') {
    return next(new AppError('Only pending ads can be edited', 400));
  }

  // Handle image update
  if (req.file) {
    try {
      // Delete old image
      if (ad.imageKey) {
        await s3.deleteObject({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: ad.imageKey
        }).promise();
      }

      // Upload new image
      const key = `ads/${organizerId}/${Date.now()}-${req.file.originalname}`;
      const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        ACL: 'public-read'
      };

      const result = await s3.upload(params).promise();
      updateData.imageUrl = result.Location;
      updateData.imageKey = key;
    } catch (error) {
      return next(new AppError(`Failed to update image: ${error.message}`, 500));
    }
  }

  // Update ad
  const updatedAd = await Ad.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    message: 'Ad updated successfully',
    data: {
      ad: updatedAd
    }
  });
});

// ============================================
// @desc    Delete ad
// @route   DELETE /api/ads/:id
// @access  Private (Organizer or Admin)
// ============================================
exports.deleteAd = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { organizerId } = req.body;

  const ad = await Ad.findById(id);
  if (!ad) {
    return next(new AppError('Ad not found', 404));
  }

  // Verify ownership
  if (ad.organizerId.toString() !== organizerId) {
    return next(new AppError('You do not have permission to delete this ad', 403));
  }

  // Delete image from S3
  if (ad.imageKey) {
    try {
      await s3.deleteObject({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: ad.imageKey
      }).promise();
    } catch (error) {
      console.log('Error deleting image from S3:', error);
    }
  }

  // Delete ad
  await Ad.findByIdAndDelete(id);

  res.status(204).json({
    status: 'success',
    message: 'Ad deleted successfully'
  });
});

// ============================================
// @desc    Record ad click
// @route   POST /api/ads/:id/click
// @access  Public
// ============================================
exports.recordClick = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const ad = await Ad.findByIdAndUpdate(
    id,
    { $inc: { clicks: 1 } },
    { new: true }
  );

  if (!ad) {
    return next(new AppError('Ad not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Click recorded',
    data: {
      clicks: ad.clicks,
      redirectUrl: ad.targetUrl
    }
  });
});

// ============================================
// @desc    Admin approve ad
// @route   PATCH /api/ads/:id/approve
// @access  Private (Admin)
// ============================================
exports.approveAd = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const ad = await Ad.findByIdAndUpdate(
    id,
    { status: 'approved' },
    { new: true }
  );

  if (!ad) {
    return next(new AppError('Ad not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Ad approved successfully',
    data: {
      ad
    }
  });
});

// ============================================
// @desc    Admin reject ad
// @route   PATCH /api/ads/:id/reject
// @access  Private (Admin)
// ============================================
exports.rejectAd = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { rejectionReason } = req.body;

  if (!rejectionReason) {
    return next(new AppError('Rejection reason is required', 400));
  }

  const ad = await Ad.findByIdAndUpdate(
    id,
    {
      status: 'rejected',
      rejectionReason
    },
    { new: true }
  );

  if (!ad) {
    return next(new AppError('Ad not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Ad rejected',
    data: {
      ad
    }
  });
});

// ============================================
// @desc    Get ad analytics
// @route   GET /api/ads/:id/analytics
// @access  Private (Organizer)
// ============================================
exports.getAnalytics = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const ad = await Ad.findById(id);
  if (!ad) {
    return next(new AppError('Ad not found', 404));
  }

  const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : 0;

  res.status(200).json({
    status: 'success',
    data: {
      analytics: {
        title: ad.title,
        impressions: ad.impressions,
        clicks: ad.clicks,
        ctr: `${ctr}%`,
        status: ad.status,
        startDate: ad.startDate,
        endDate: ad.endDate,
        budget: ad.budget,
        displayDuration: ad.displayDuration
      }
    }
  });
});

// ============================================
// @desc    Get pending ads for admin review
// @route   GET /api/ads/admin/pending
// @access  Private (Admin)
// ============================================
exports.getPendingAds = catchAsync(async (req, res, next) => {
  const ads = await Ad.find({ status: 'pending' })
    .populate('organizerId', 'name email')
    .sort({ createdAt: 1 });

  res.status(200).json({
    status: 'success',
    results: ads.length,
    data: {
      ads
    }
  });
});
