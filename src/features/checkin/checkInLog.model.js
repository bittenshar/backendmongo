const mongoose = require('mongoose');

/**
 * Check-In Log Model - Detailed audit trail for venue entry
 * Tracks who checked in, when, where, and from which device
 * Essential for:
 * - Dispute resolution
 * - Fraud detection analytics
 * - Business intelligence
 */
const checkInLogSchema = new mongoose.Schema(
  {
    // Reference to the ticket that was checked in
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
      description: 'Reference to the ticket/booking document'
    },

    // Reference to the event
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
      description: 'Reference to the event being attended'
    },

    // Staff who validated the ticket
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      description: 'Reference to staff member who performed check-in'
    },

    // Venue location details
    gateNumber: {
      type: String,
      description: 'Gate/entrance number where check-in occurred'
    },

    locationName: {
      type: String,
      description: 'Named location/area of check-in (e.g., "Main Gate", "VIP Entrance")'
    },

    // Check-in timestamp
    checkInTime: {
      type: Date,
      default: Date.now,
      index: true,
      description: 'When the ticket was validated at venue'
    },

    // Device information
    deviceInfo: {
      type: String,
      description: 'Information about the scanning device (OS, model, app version)'
    },

    deviceId: {
      type: String,
      description: 'Unique identifier of the scanning device'
    },

    // Network information
    ipAddress: {
      type: String,
      description: 'IP address of the scanner/staff device'
    },

    userAgent: {
      type: String,
      description: 'User agent string from the scanner app'
    },

    // Verification method
    verificationMethod: {
      type: String,
      enum: ['qr_scan', 'face_recognition', 'manual'],
      default: 'qr_scan',
      description: 'How the ticket was validated'
    },

    // QR Verification details
    qrVerified: {
      type: Boolean,
      default: false,
      description: 'Whether QR token was successfully verified'
    },

    // Face verification details (if applicable)
    faceVerifyScore: {
      type: Number,
      min: 0,
      max: 100,
      description: 'Face match score if facial verification was used (0-100%)'
    },

    // Additional notes
    notes: {
      type: String,
      description: 'Any additional notes from staff (e.g., "ID verified", "VIP guest")'
    },

    // Reference to the user for quick lookup
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      description: 'Reference to the ticket owner for analytics'
    },

    // Dispute/Flag field
    isFlagged: {
      type: Boolean,
      default: false,
      description: 'Whether this check-in was flagged for review (potential fraud)'
    },

    flagReason: {
      type: String,
      description: 'Reason for flagging this check-in if isFlagged is true'
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
checkInLogSchema.index({ ticketId: 1, checkInTime: -1 }); // Latest check-in for a ticket
checkInLogSchema.index({ eventId: 1, checkInTime: -1 }); // Event analytics
checkInLogSchema.index({ eventId: 1, staffId: 1 }); // Staff analytics per event
checkInLogSchema.index({ userId: 1, eventId: 1 }); // User's check-ins per event
checkInLogSchema.index({ isFlagged: 1, eventId: 1 }); // Find flagged check-ins
checkInLogSchema.index({ checkInTime: -1 }); // Time-series queries

// Statics
/**
 * Get check-in statistics for an event
 */
checkInLogSchema.statics.getEventStats = function(eventId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        eventId: mongoose.Types.ObjectId(eventId),
        checkInTime: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: null,
        totalCheckIns: { $sum: 1 },
        uniqueTickets: { $addToSet: '$ticketId' },
        qrVerified: {
          $sum: { $cond: ['$qrVerified', 1, 0] }
        },
        faceVerified: {
          $sum: { $cond: [{ $gt: ['$faceVerifyScore', 0] }, 1, 0] }
        },
        flaggedCount: {
          $sum: { $cond: ['$isFlagged', 1, 0] }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalCheckIns: 1,
        uniqueTickets: { $size: '$uniqueTickets' },
        qrVerified: 1,
        faceVerified: 1,
        flaggedCount: 1
      }
    }
  ]);
};

/**
 * Find flagged check-ins for review
 */
checkInLogSchema.statics.getFlaggedCheckIns = function(eventId, limit = 50) {
  return this.find({ eventId, isFlagged: true })
    .populate('ticketId', 'ticketNumbers')
    .populate('userId', 'name email phone')
    .populate('staffId', 'name')
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Get check-in history for a ticket
 */
checkInLogSchema.statics.getTicketCheckInHistory = function(ticketId) {
  return this.find({ ticketId })
    .populate('staffId', 'name email')
    .popula('eventId', 'name')
    .sort({ checkInTime: -1 });
};

module.exports = mongoose.model('CheckInLog', checkInLogSchema);
