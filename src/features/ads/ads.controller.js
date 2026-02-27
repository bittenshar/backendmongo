const cloudinary  = require("../../shared/config/cloudinary");
const streamifier = require('streamifier');
const Ad = require('./ads.model');
const catchAsync = require("../../shared/utils/catchAsync");
const  AppError = require("../../shared/utils/appError");

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * Get active ads (public route)
 * Filters: targetAudience, adType, tags
 */
exports.getActiveAds = catchAsync(async (req, res, next) => {
  const { targetAudience, adType, tags } = req.query;

  const filter = {};
  if (targetAudience) filter.targetAudience = targetAudience;
  if (adType) filter.adType = adType;
  if (tags) filter.tags = { $in: tags.split(',') };

  const ads = await Ad.getActiveAds(filter);

  res.status(200).json({
    status: 'success',
    results: ads.length,
    data: {
      ads
    }
  });
});

/**
 * Get single ad by ID
 */
exports.getAd = catchAsync(async (req, res, next) => {
  const ad = await Ad.findById(req.params.id).populate('organizerId', 'name email');

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

/**
 * Record ad click
 */
exports.recordClick = catchAsync(async (req, res, next) => {
  const ad = await Ad.findByIdAndUpdate(
    req.params.id,
    { $inc: { clicks: 1 } },
    { new: true, runValidators: true }
  );

  if (!ad) {
    return next(new AppError('Ad not found', 404));
  }

  // Update CTR
  ad.ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : 0;
  await ad.save();

  res.status(200).json({
    status: 'success',
    data: {
      ad
    }
  });
});

// ============================================
// PROTECTED ROUTES
// ============================================

/**
 * Create new ad with image upload
 */
exports.createAd = catchAsync(async (req, res, next) => {
  const { title, description, adType, targetUrl, displayDuration, priority, startDate, endDate, tags, budget, targetAudience } = req.body;

  // Validate required fields
  if (!title || !startDate || !endDate) {
    return next(new AppError('Title, startDate, and endDate are required', 400));
  }

  if (!req.file) {
    return next(new AppError('Image file is required', 400));
  }

  // Validate dates
  if (new Date(startDate) >= new Date(endDate)) {
    return next(new AppError('Start date must be before end date', 400));
  }

  // Upload image to Cloudinary
  const imageUrl = await uploadToCloudinary(req.file);

  // Create ad
  const ad = await Ad.create({
    organizerId: req.user.id,
    title,
    description,
    imageUrl,
    image: imageUrl,
    imageKey: imageUrl.split('/').pop(), // Extract key from URL
    adType: adType || 'promotional',
    targetUrl,
    displayDuration: displayDuration || 5,
    priority: priority || 0,
    startDate,
    endDate,
    tags: tags ? (typeof tags === 'string' ? tags.split(',') : tags) : [],
    budget,
    targetAudience: targetAudience || 'all',
    status: 'approved', // Auto-approve ads when created
    isActive: true
  });

  res.status(201).json({
    status: 'success',
    message: 'Ad created successfully',
    data: {
      ad
    }
  });
});

/**
 * Get ads by organizer
 */
exports.getAdsByOrganizer = catchAsync(async (req, res, next) => {
  const { organizerId } = req.params;
  const { status, isActive } = req.query;

  const filters = {};
  if (status) filters.status = status;
  if (isActive !== undefined) filters.isActive = isActive === 'true';

  const ads = await Ad.getOrganizerAds(organizerId, filters);

  res.status(200).json({
    status: 'success',
    results: ads.length,
    data: {
      ads
    }
  });
});

/**
 * Update ad with optional image upload
 */
exports.updateAd = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { title, description, adType, targetUrl, displayDuration, priority, startDate, endDate, tags, budget, targetAudience, isActive } = req.body;

  // Find ad
  let ad = await Ad.findById(id);
  if (!ad) {
    return next(new AppError('Ad not found', 404));
  }

  // Check if user owns the ad or is admin
  if (ad.organizerId.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to update this ad', 403));
  }

  // Update image if provided
  let imageUrl = ad.imageUrl;
  if (req.file) {
    // Delete old image from Cloudinary
    if (ad.imageKey) {
      await deleteFromCloudinary(ad.imageKey);
    }
    // Upload new image
    imageUrl = await uploadToCloudinary(req.file);
  }

  // Update fields
  ad.title = title || ad.title;
  ad.description = description || ad.description;
  ad.imageUrl = imageUrl;
  ad.image = imageUrl;
  ad.imageKey = imageUrl.split('/').pop();
  ad.adType = adType || ad.adType;
  ad.targetUrl = targetUrl || ad.targetUrl;
  ad.displayDuration = displayDuration !== undefined ? displayDuration : ad.displayDuration;
  ad.priority = priority !== undefined ? priority : ad.priority;
  ad.budget = budget || ad.budget;
  ad.targetAudience = targetAudience || ad.targetAudience;
  ad.tags = tags ? (typeof tags === 'string' ? tags.split(',') : tags) : ad.tags;
  
  if (startDate) ad.startDate = startDate;
  if (endDate) ad.endDate = endDate;
  if (isActive !== undefined) ad.isActive = isActive;

  ad.updatedAt = new Date();
  await ad.save();

  res.status(200).json({
    status: 'success',
    message: 'Ad updated successfully',
    data: {
      ad
    }
  });
});

/**
 * Delete ad
 */
exports.deleteAd = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const ad = await Ad.findById(id);
  if (!ad) {
    return next(new AppError('Ad not found', 404));
  }

  // Check ownership
  if (ad.organizerId.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to delete this ad', 403));
  }

  // Delete image from Cloudinary
  if (ad.imageKey) {
    await deleteFromCloudinary(ad.imageKey);
  }

  // Delete ad
  await Ad.findByIdAndDelete(id);

  res.status(204).json({
    status: 'success',
    message: 'Ad deleted successfully'
  });
});

/**
 * Get ad analytics
 */
exports.getAnalytics = catchAsync(async (req, res, next) => {
  const ad = await Ad.findById(req.params.id);

  if (!ad) {
    return next(new AppError('Ad not found', 404));
  }

  // Check ownership
  if (ad.organizerId.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to view analytics for this ad', 403));
  }

  const analytics = {
    adId: ad._id,
    title: ad.title,
    impressions: ad.impressions,
    clicks: ad.clicks,
    ctr: ad.ctr,
    clickThroughRate: ad.clickThroughRate,
    status: ad.status,
    startDate: ad.startDate,
    endDate: ad.endDate,
    isCurrentlyActive: ad.isCurrentlyActive(),
    budget: ad.budget,
    costPerClick: ad.budget && ad.clicks > 0 ? (ad.budget / ad.clicks).toFixed(2) : 0
  };

  res.status(200).json({
    status: 'success',
    data: {
      analytics
    }
  });
});

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * Get pending ads for review
 */
exports.getPendingAds = catchAsync(async (req, res, next) => {
  const ads = await Ad.find({ status: 'pending' }).sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: ads.length,
    data: {
      ads
    }
  });
});

/**
 * Approve ad
 */
exports.approveAd = catchAsync(async (req, res, next) => {
  const ad = await Ad.findByIdAndUpdate(
    req.params.id,
    { status: 'approved' },
    { new: true, runValidators: true }
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

/**
 * Reject ad
 */
exports.rejectAd = catchAsync(async (req, res, next) => {
  const { rejectionReason } = req.body;

  if (!rejectionReason) {
    return next(new AppError('Rejection reason is required', 400));
  }

  const ad = await Ad.findByIdAndUpdate(
    req.params.id,
    { status: 'rejected', rejectionReason },
    { new: true, runValidators: true }
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
// CLOUDINARY HELPER FUNCTIONS
// ============================================

/**
 * Upload image to Cloudinary
 */
const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'adminthrill/ads',
        resource_type: 'auto',
        quality: 'auto',
        fetch_format: 'auto'
      },
      (error, result) => {
        if (error) {
          reject(new AppError(`Image upload failed: ${error.message}`, 400));
        } else {
          resolve(result.secure_url);
        }
      }
    );

    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};

/**
 * Delete image from Cloudinary
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(`adminthrill/ads/${publicId.split('/').pop().split('.')[0]}`);
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
  }
};

/**
 * Record ad impression
 */
exports.recordImpression = catchAsync(async (req, res, next) => {
  const ad = await Ad.findByIdAndUpdate(
    req.params.id,
    { $inc: { impressions: 1 } },
    { new: true, runValidators: true }
  );

  if (!ad) {
    return next(new AppError('Ad not found', 404));
  }

  // Update CTR
  ad.ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : 0;
  await ad.save();

  res.status(200).json({
    status: 'success',
    data: {
      ad
    }
  });
});
