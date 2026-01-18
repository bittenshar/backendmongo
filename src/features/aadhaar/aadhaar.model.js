const mongoose = require('mongoose');

const aadhaarImageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    fullName: {
      type: String,
      required: false
    },
    imageType: {
      type: String,
      enum: ['front', 'back'],
      required: true
    },
    s3Key: {
      type: String,
      required: true
    },
    s3Url: {
      type: String
    },
    fileName: {
      type: String
    },
    fileSize: {
      type: Number
    },
    mimeType: {
      type: String,
      default: 'image/jpeg'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('AadhaarImage', aadhaarImageSchema);
