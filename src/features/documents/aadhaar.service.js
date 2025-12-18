const Aadhaar = require('./aadhaar.model');
const User = require('../auth/auth.model');
const AppError = require('../../shared/utils/appError');

/**
 * ==========================================
 * AADHAAR SERVICE
 * ==========================================
 * Business logic for Aadhaar document operations
 */

/**
 * Validate Aadhaar number format
 * @param {string} aadhaarNumber - 12-digit Aadhaar number
 * @returns {boolean} Valid or not
 */
exports.validateAadhaarNumber = (aadhaarNumber) => {
  // Must be 12 digits
  if (!/^\d{12}$/.test(aadhaarNumber)) {
    return false;
  }

  // Verhoeff algorithm for Aadhaar validation
  // This is a simplified check - for production, use proper Verhoeff algorithm
  return true;
};

/**
 * Mask Aadhaar number for display
 * Shows only last 4 digits
 * @param {string} aadhaarNumber - Full Aadhaar number
 * @returns {string} Masked Aadhaar (XXXX XXXX 1234)
 */
exports.maskAadhaarNumber = (aadhaarNumber) => {
  if (!aadhaarNumber) return '';
  const lastFour = aadhaarNumber.slice(-4);
  return `XXXX XXXX ${lastFour}`;
};

/**
 * Check if user has verified Aadhaar
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if verified
 */
exports.userHasVerifiedAadhaar = async (userId) => {
  try {
    const aadhaar = await Aadhaar.findOne({
      userId,
      verificationStatus: 'verified',
      isActive: true
    });

    return !!aadhaar;
  } catch (error) {
    console.error('Error checking Aadhaar verification:', error);
    return false;
  }
};

/**
 * Get Aadhaar verification status
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Status details
 */
exports.getAadhaarVerificationStatus = async (userId) => {
  try {
    const aadhaar = await Aadhaar.findOne({ userId });

    if (!aadhaar) {
      return {
        hasDocument: false,
        status: 'not_uploaded'
      };
    }

    return {
      hasDocument: true,
      status: aadhaar.verificationStatus,
      uploadDate: aadhaar.uploadDate,
      verificationDate: aadhaar.verificationDate,
      maskedAadhaar: exports.maskAadhaarNumber(aadhaar.aadhaarNumber),
      notes: aadhaar.verificationNotes || null
    };
  } catch (error) {
    console.error('Error getting Aadhaar status:', error);
    throw error;
  }
};

/**
 * Bulk update Aadhaar verification status
 * @param {Array} aadhaarIds - Array of Aadhaar document IDs
 * @param {string} status - New status (verified, rejected, pending)
 * @param {string} adminId - Admin ID
 * @param {string} notes - Verification notes
 * @returns {Promise<Object>} Update result
 */
exports.bulkUpdateAadhaarStatus = async (aadhaarIds, status, adminId, notes = '') => {
  try {
    const validStatuses = ['pending', 'verified', 'rejected', 'expired'];
    
    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    const result = await Aadhaar.updateMany(
      { _id: { $in: aadhaarIds } },
      {
        verificationStatus: status,
        verificationDate: new Date(),
        verifiedBy: adminId,
        verificationNotes: notes
      }
    );

    return {
      success: true,
      matched: result.matchedCount,
      modified: result.modifiedCount
    };
  } catch (error) {
    console.error('Error in bulk update:', error);
    throw error;
  }
};

/**
 * Export Aadhaar data for admin report
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Export data
 */
exports.exportAadhaarData = async (filters = {}) => {
  try {
    const query = { isActive: true };

    // Add filters
    if (filters.status) query.verificationStatus = filters.status;
    if (filters.startDate || filters.endDate) {
      query.uploadDate = {};
      if (filters.startDate) query.uploadDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.uploadDate.$lte = new Date(filters.endDate);
    }

    const documents = await Aadhaar.find(query)
      .populate('userId', 'name email phone')
      .populate('verifiedBy', 'name email')
      .lean();

    // Format for export
    return documents.map(doc => ({
      aadhaarId: doc._id,
      userId: doc.userId._id,
      userName: doc.userId.name,
      userEmail: doc.userId.email,
      userPhone: doc.userId.phone,
      aadhaar: exports.maskAadhaarNumber(doc.aadhaarNumber),
      fullName: doc.fullName,
      dateOfBirth: doc.dateOfBirth,
      gender: doc.gender,
      status: doc.verificationStatus,
      uploadDate: doc.uploadDate,
      verificationDate: doc.verificationDate,
      verifiedBy: doc.verifiedBy?.name || 'N/A',
      notes: doc.verificationNotes || ''
    }));
  } catch (error) {
    console.error('Error exporting Aadhaar data:', error);
    throw error;
  }
};

/**
 * Get Aadhaar analytics
 * @returns {Promise<Object>} Analytics data
 */
exports.getAadhaarAnalytics = async () => {
  try {
    const [stats, dailyUploads, byGender] = await Promise.all([
      // Status breakdown
      Aadhaar.aggregate([
        {
          $group: {
            _id: '$verificationStatus',
            count: { $sum: 1 }
          }
        }
      ]),
      // Daily uploads (last 30 days)
      Aadhaar.aggregate([
        {
          $match: {
            uploadDate: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$uploadDate' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      // Gender distribution
      Aadhaar.aggregate([
        {
          $group: {
            _id: '$gender',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const total = await Aadhaar.countDocuments();
    const verified = await Aadhaar.countDocuments({ verificationStatus: 'verified' });

    return {
      total,
      verified,
      verificationRate: ((verified / total) * 100).toFixed(2) + '%',
      statusBreakdown: stats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      dailyUploads,
      genderDistribution: byGender.reduce((acc, item) => {
        acc[item._id || 'unknown'] = item.count;
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('Error getting analytics:', error);
    throw error;
  }
};

/**
 * Check duplicate Aadhaar number
 * @param {string} aadhaarNumber - Aadhaar number to check
 * @param {string} excludeUserId - User ID to exclude from check (for updates)
 * @returns {Promise<Object>} Duplicate check result
 */
exports.checkDuplicateAadhaar = async (aadhaarNumber, excludeUserId = null) => {
  try {
    const query = { aadhaarNumber, isActive: true };
    if (excludeUserId) {
      query.userId = { $ne: excludeUserId };
    }

    const existing = await Aadhaar.findOne(query);

    return {
      isDuplicate: !!existing,
      existingUser: existing ? existing.userId : null
    };
  } catch (error) {
    console.error('Error checking duplicate:', error);
    throw error;
  }
};

/**
 * Send Aadhaar verification reminder
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Reminder result
 */
exports.sendVerificationReminder = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const aadhaar = await Aadhaar.findOne({ userId });
    if (!aadhaar) {
      throw new AppError('No Aadhaar document found', 404);
    }

    if (aadhaar.verificationStatus !== 'pending') {
      throw new AppError('Aadhaar already verified or rejected', 400);
    }

    // TODO: Send email reminder
    // await emailService.sendAadhaarVerificationReminder(user.email, user.name);

    return {
      success: true,
      message: 'Reminder sent to user',
      userId: user._id,
      userEmail: user.email
    };
  } catch (error) {
    console.error('Error sending reminder:', error);
    throw error;
  }
};

/**
 * Archive old Aadhaar documents (mark as inactive)
 * @param {number} daysOld - Archive documents older than N days
 * @returns {Promise<Object>} Archive result
 */
exports.archiveOldDocuments = async (daysOld = 365) => {
  try {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await Aadhaar.updateMany(
      {
        uploadDate: { $lt: cutoffDate },
        isActive: true,
        verificationStatus: 'verified' // Only archive verified documents
      },
      { isActive: false }
    );

    return {
      success: true,
      archived: result.modifiedCount,
      message: `${result.modifiedCount} documents archived`
    };
  } catch (error) {
    console.error('Error archiving documents:', error);
    throw error;
  }
};

/**
 * Get Aadhaar document with all details
 * @param {string} aadhaarId - Aadhaar document ID
 * @returns {Promise<Object>} Complete document details
 */
exports.getAadhaarDetails = async (aadhaarId) => {
  try {
    const aadhaar = await Aadhaar.findById(aadhaarId)
      .populate('userId', 'name email phone')
      .populate('verifiedBy', 'name email');

    if (!aadhaar) {
      throw new AppError('Aadhaar document not found', 404);
    }

    return {
      _id: aadhaar._id,
      user: aadhaar.userId,
      personalInfo: {
        aadhaar: exports.maskAadhaarNumber(aadhaar.aadhaarNumber),
        fullName: aadhaar.fullName,
        dateOfBirth: aadhaar.dateOfBirth,
        gender: aadhaar.gender,
        address: aadhaar.address
      },
      verification: {
        status: aadhaar.verificationStatus,
        date: aadhaar.verificationDate,
        verifiedBy: aadhaar.verifiedBy,
        notes: aadhaar.verificationNotes
      },
      images: {
        frontImageKey: aadhaar.frontImageS3Key,
        backImageKey: aadhaar.backImageS3Key
      },
      dates: {
        uploaded: aadhaar.uploadDate,
        lastModified: aadhaar.lastModified
      }
    };
  } catch (error) {
    console.error('Error getting Aadhaar details:', error);
    throw error;
  }
};
