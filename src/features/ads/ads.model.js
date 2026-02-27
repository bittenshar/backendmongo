const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const adSchema = new Schema(
  {
    // Organizer Info
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: 'Organizer',
      required: [true, 'Organizer ID is required'],
      index: true
    },

    // Ad Details
    title: {
      type: String,
      required: [true, 'Ad title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },

    // Image/Media
    imageUrl: {
      type: String,
      required: [true, 'Image URL is required']
    },
     image: {
      type: String,
      required: [true, 'Image is required']
    },


    imageKey: {
      type: String,
      description: 'S3 key for the image'
    },

    // Ad Configuration
    adType: {
      type: String,
      enum: ['banner', 'promotional', 'announcement', 'sponsored', 'event'],
      default: 'promotional'
    },

    targetUrl: {
      type: String,
      description: 'URL to redirect when ad is clicked'
    },

    // Display Settings
    displayDuration: {
      type: Number,
      default: 5,
      description: 'Duration in seconds to display ad'
    },

    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
      description: 'Priority for ad rotation (higher = more frequent)'
    },

    // Scheduling
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },

    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    // Tracking
    impressions: {
      type: Number,
      default: 0
    },

    clicks: {
      type: Number,
      default: 0
    },

    ctr: {
      type: Number,
      default: 0,
      description: 'Click-through rate (percentage)'
    },

    // Admin Approval (optional)
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'archived'],
      default: 'pending',
      index: true
    },

    rejectionReason: {
      type: String,
      description: 'Reason if ad is rejected'
    },

    // Metadata
    tags: [String],

    budget: {
      type: Number,
      description: 'Marketing budget for this ad'
    },

    targetAudience: {
      type: String,
      enum: ['all', 'premium', 'free', 'organizers', 'participants'],
      default: 'all'
    },

    createdAt: {
      type: Date,
      default: Date.now
    },

    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
adSchema.index({ organizerId: 1, isActive: 1 });
adSchema.index({ status: 1, isActive: 1 });
adSchema.index({ startDate: 1, endDate: 1 });

// Virtual for calculating CTR
adSchema.virtual('clickThroughRate').get(function () {
  if (this.impressions === 0) return 0;
  return ((this.clicks / this.impressions) * 100).toFixed(2);
});

// Method to check if ad is currently active (date-wise)
adSchema.methods.isCurrentlyActive = function () {
  const now = new Date();
  return this.isActive && this.startDate <= now && this.endDate >= now;
};

// Static method to get active ads for Android app
adSchema.statics.getActiveAds = async function (filter = {}) {
  const now = new Date();
  return this.find({
    ...filter,
    isActive: true,
    status: 'approved',
    startDate: { $lte: now },
    endDate: { $gte: now }
  })
    .sort({ priority: -1, createdAt: -1 })
    .lean();
};

// Static method to get ads by organizer
adSchema.statics.getOrganizerAds = async function (organizerId, filters = {}) {
  return this.find({
    organizerId,
    ...filters
  })
    .sort({ createdAt: -1 })
    .lean();
};

module.exports = mongoose.model('Ad', adSchema);
