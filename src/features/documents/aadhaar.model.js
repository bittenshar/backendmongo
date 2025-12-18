const mongoose = require('mongoose');

/**
 * Aadhaar Card Document Schema
 * Stores encrypted Aadhaar card image references and verification status
 */
const aadhaarSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    aadhaarNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^\d{12}$/ // Aadhaar is 12 digits
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    dateOfBirth: {
      type: Date,
      required: true
    },
    gender: {
      type: String,
      enum: ['M', 'F', 'Other'],
      required: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    // Image storage
    frontImageS3Key: {
      type: String,
      required: true // S3 key for front side of Aadhaar
    },
    backImageS3Key: {
      type: String,
      required: false // Optional: back side of Aadhaar
    },
    // Verification status
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'expired'],
      default: 'pending'
    },
    verificationDate: {
      type: Date
    },
    verificationNotes: {
      type: String
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User' // Admin who verified
    },
    // OCR/AI verification
    ocrData: {
      detected: Boolean,
      confidence: Number, // 0-100
      extractedDetails: {
        aadhaarNumber: String,
        name: String,
        dob: Date,
        gender: String,
        address: String
      }
    },
    // Encryption tokens
    frontImageToken: String,
    backImageToken: String,
    tokenExpiryDate: Date,
    // Metadata
    uploadDate: {
      type: Date,
      default: Date.now
    },
    lastModified: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Indexes
aadhaarSchema.index({ userId: 1 });
aadhaarSchema.index({ aadhaarNumber: 1 });
aadhaarSchema.index({ verificationStatus: 1 });
aadhaarSchema.index({ uploadDate: -1 });

// Pre-save validation
aadhaarSchema.pre('save', function(next) {
  // Validate Aadhaar number
  if (this.aadhaarNumber && !/^\d{12}$/.test(this.aadhaarNumber)) {
    throw new Error('Invalid Aadhaar number format');
  }
  
  this.lastModified = new Date();
  next();
});

// Virtual: Check if document is expired
aadhaarSchema.virtual('isExpired').get(function() {
  if (!this.tokenExpiryDate) return false;
  return new Date() > this.tokenExpiryDate;
});

// Method: Verify Aadhaar document
aadhaarSchema.methods.verify = function(verifiedBy, notes = '') {
  this.verificationStatus = 'verified';
  this.verificationDate = new Date();
  this.verifiedBy = verifiedBy;
  this.verificationNotes = notes;
  return this.save();
};

// Method: Reject Aadhaar document
aadhaarSchema.methods.reject = function(verifiedBy, notes = '') {
  this.verificationStatus = 'rejected';
  this.verificationDate = new Date();
  this.verifiedBy = verifiedBy;
  this.verificationNotes = notes;
  return this.save();
};

// Method: Update image tokens (for encryption)
aadhaarSchema.methods.updateImageTokens = function(frontToken, backToken, expiryDate) {
  this.frontImageToken = frontToken;
  this.backImageToken = backToken;
  this.tokenExpiryDate = expiryDate;
  return this.save();
};

// Method: Get public data (without sensitive fields)
aadhaarSchema.methods.getPublicData = function() {
  return {
    _id: this._id,
    userId: this.userId,
    verificationStatus: this.verificationStatus,
    fullName: this.fullName,
    dateOfBirth: this.dateOfBirth,
    uploadDate: this.uploadDate,
    verificationDate: this.verificationDate
  };
};

module.exports = mongoose.model('Aadhaar', aadhaarSchema);
