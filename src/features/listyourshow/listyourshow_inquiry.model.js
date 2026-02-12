const mongoose = require('mongoose');

/**
 * List Your Show - Partner Inquiry Model
 * Handles inquiry submissions from users who want to become partners/organizers
 */
const listYourShowInquirySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        'Please provide a valid email'
      ]
    },
    phone: {
      type: String,
      required: true,
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
    },
    organizationName: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    partnershipType: {
      type: String,
      enum: ['organizer', 'promoter', 'venue_partner', 'other'],
      required: true
    },
    eventType: {
      type: String,
      enum: ['concerts', 'theater', 'comedy', 'sports', 'workshops', 'conferences', 'other'],
      required: true
    },
    experienceLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'experienced', 'expert'],
      required: true
    },
    message: {
      type: String,
      required: true,
      minlength: 20,
      maxlength: 2000
    },
    attachmentUrl: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ['submitted', 'under-review', 'approved', 'rejected', 'contacted'],
      default: 'submitted',
      index: true
    },
    adminNotes: {
      type: String,
      default: null
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    contactAttempts: {
      type: Number,
      default: 0
    },
    lastContactedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    createdAt: 'submittedAt',
    updatedAt: 'updatedAt'
  }
);

// Index for efficient querying
listYourShowInquirySchema.index({ status: 1, submittedAt: -1 });
listYourShowInquirySchema.index({ email: 1 });
listYourShowInquirySchema.index({ userId: 1, submittedAt: -1 });

// Statics
listYourShowInquirySchema.statics.findByStatus = function (status) {
  return this.find({ status }).sort({ submittedAt: -1 });
};

listYourShowInquirySchema.statics.findUserInquiries = function (userId) {
  return this.find({ userId }).sort({ submittedAt: -1 });
};

const ListYourShowInquiry = mongoose.model('ListYourShowInquiry', listYourShowInquirySchema);

module.exports = ListYourShowInquiry;
