const ListYourShowInquiry = require('./listyourshow_inquiry.model');
const User = require('../auth/auth.model');
const AppError = require('../../shared/utils/appError');

/**
 * Get all inquiries (Admin only)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
exports.getAllInquiries = async (req, res, next) => {
  try {
    const { status, partnershipType, city, sort } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (partnershipType) filter.partnershipType = partnershipType;
    if (city) filter.city = { $regex: city, $options: 'i' };

    // Get total count
    const total = await ListYourShowInquiry.countDocuments(filter);

    // Get inquiries with pagination
    let query = ListYourShowInquiry.find(filter).populate('userId', 'name email phone').populate('reviewedBy', 'name email');

    // Apply sorting
    if (sort === 'oldest') {
      query = query.sort({ submittedAt: 1 });
    } else if (sort === 'name') {
      query = query.sort({ fullName: 1 });
    } else {
      query = query.sort({ submittedAt: -1 }); // Default: newest first
    }

    const inquiries = await query
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    res.status(200).json({
      status: 'success',
      data: {
        inquiries,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          currentPage: page,
          limit
        }
      }
    });
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    return next(new AppError(error.message, 500));
  }
};

/**
 * Get user's own inquiries
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
exports.getMyInquiries = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const total = await ListYourShowInquiry.countDocuments({ userId });

    const inquiries = await ListYourShowInquiry.find({ userId })
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    res.status(200).json({
      status: 'success',
      data: {
        inquiries,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          currentPage: page,
          limit
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user inquiries:', error);
    return next(new AppError(error.message, 500));
  }
};

/**
 * Get inquiry details
 * Authenticated users can view their own inquiries
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
exports.getInquiryDetails = async (req, res, next) => {
  try {
    const { inquiryId } = req.params;

    const inquiry = await ListYourShowInquiry.findById(inquiryId)
      .populate('userId', 'name email phone')
      .populate('reviewedBy', 'name email');

    if (!inquiry) {
      return next(new AppError('Inquiry not found', 404));
    }

    // Check if user has access (own inquiry or admin)
    if (inquiry.userId && inquiry.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new AppError('You do not have permission to view this inquiry', 403));
    }

    res.status(200).json({
      status: 'success',
      data: {
        inquiry
      }
    });
  } catch (error) {
    console.error('Error fetching inquiry details:', error);
    return next(new AppError(error.message, 500));
  }
};

/**
 * Create a new partner inquiry
 * Public endpoint - no authentication required
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
exports.createInquiry = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      phone,
      organizationName,
      city,
      state,
      partnershipType,
      eventType,
      experienceLevel,
      message
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !phone || !organizationName || !city || !state || !partnershipType || !eventType || !experienceLevel || !message) {
      return next(new AppError('Please provide all required fields', 400));
    }

    // Validate message length
    if (message.length < 20) {
      return next(new AppError('Message must be at least 20 characters long', 400));
    }

    // Check if same email already has a pending inquiry for same organization
    const existingInquiry = await ListYourShowInquiry.findOne({
      email,
      organizationName,
      status: { $in: ['submitted', 'under-review'] }
    });

    if (existingInquiry) {
      return next(
        new AppError(
          'An inquiry for this organization from this email is already pending. Please wait for our response.',
          400
        )
      );
    }

    // Create new inquiry
    const inquiry = await ListYourShowInquiry.create({
      userId: req.user?._id || null, // Optional - for authenticated users only
      fullName,
      email,
      phone,
      organizationName,
      city,
      state,
      partnershipType,
      eventType,
      experienceLevel,
      message
    });

    res.status(201).json({
      status: 'success',
      message: 'Inquiry submitted successfully. We will review it and contact you soon.',
      data: {
        inquiry
      }
    });
  } catch (error) {
    console.error('Error creating inquiry:', error);
    if (error.name === 'ValidationError') {
      return next(new AppError(Object.values(error.errors).map((e) => e.message).join(', '), 400));
    }
    return next(new AppError(error.message, 500));
  }
};

/**
 * Update inquiry status (Admin only)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
exports.updateInquiryStatus = async (req, res, next) => {
  try {
    const { inquiryId } = req.params;
    const { status, adminNotes } = req.body;

    if (!status || !['submitted', 'under-review', 'approved', 'rejected', 'contacted'].includes(status)) {
      return next(new AppError('Please provide a valid status', 400));
    }

    const inquiry = await ListYourShowInquiry.findByIdAndUpdate(
      inquiryId,
      {
        status,
        adminNotes: adminNotes || inquiry?.adminNotes,
        reviewedBy: req.user._id,
        reviewedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!inquiry) {
      return next(new AppError('Inquiry not found', 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Inquiry status updated successfully',
      data: {
        inquiry
      }
    });
  } catch (error) {
    console.error('Error updating inquiry status:', error);
    return next(new AppError(error.message, 500));
  }
};

/**
 * Delete an inquiry
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */


/**
 * Get inquiry statistics (Admin only)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
exports.getInquiryStats = async (req, res, next) => {
  try {
    const stats = await ListYourShowInquiry.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const byPartnershipType = await ListYourShowInquiry.aggregate([
      {
        $group: {
          _id: '$partnershipType',
          count: { $sum: 1 }
        }
      }
    ]);

    const byEventType = await ListYourShowInquiry.aggregate([
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        byStatus: stats,
        byPartnershipType,
        byEventType,
        total: stats.reduce((sum, item) => sum + item.count, 0)
      }
    });
  } catch (error) {
    console.error('Error fetching inquiry statistics:', error);
    return next(new AppError(error.message, 500));
  }
};
