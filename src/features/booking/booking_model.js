const mongoose = require('mongoose');

/**
 * Booking Model - Tracks all user seat bookings
 * Handles temporary locks and final confirmations
 */
const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      
      index: true
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true
    },
    seatingId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    seatType: {
      type: String,
      required: true
      // Dynamic seatType provided by organizer
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    pricePerSeat: {
      type: Number,
      required: true
    },
    totalPrice: {
      type: Number,
      required: true
    },
    // Booking status
    status: {
      type: String,
      enum: ['temporary', 'confirmed', 'cancelled', 'used', 'refunded'],
      default: 'temporary',
      index: true
    },
    // Payment details
    razorpayOrderId: {
      type: String,
      index: true
    },
    razorpayPaymentId: {
      type: String
    },
    razorpaySignature: {
      type: String
    },
    paymentVerified: {
      type: Boolean,
      default: false
    },
    paymentVerificationDetails: {
      type: mongoose.Schema.Types.Mixed
    },
    paymentId: {
      type: String
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'upi', 'netbanking', 'wallet', 'razorpay'],
      default: null
    },
    // Booking timestamps
    bookedAt: {
      type: Date,
      default: Date.now
    },
    confirmedAt: {
      type: Date
    },
    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 0 } // Auto-delete after expiry
    },
    // Cancellation info
    cancelledAt: {
      type: Date
    },
    cancellationReason: {
      type: String
    },
    refundAmount: {
      type: Number,
      default: 0
    },
    // Notes
    specialRequirements: {
      type: String
    },
    notes: {
      type: String
    },
    // Ticket information
    ticketNumbers: [{
      type: String
    }],
    qrCodes: [{
      type: String // S3 keys for QR code images
    }],
    ticketDownloadCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Indexes
bookingSchema.index({ userId: 1, eventId: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ bookedAt: -1 });
bookingSchema.index({ expiresAt: 1 });

// Virtual: Check if booking is expired
bookingSchema.virtual('isExpired').get(function() {
  return this.status === 'temporary' && this.expiresAt && new Date() > this.expiresAt;
});

// Methods
bookingSchema.methods.confirm = function(paymentId, paymentMethod = 'card') {
  this.status = 'confirmed';
  this.paymentId = paymentId;
  this.paymentMethod = paymentMethod;
  this.paymentStatus = 'completed';
  this.confirmedAt = new Date();
  this.expiresAt = null; // Remove expiry once confirmed
  return this.save();
};

bookingSchema.methods.cancel = function(reason = 'User cancelled') {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  this.expiresAt = null;
  return this.save();
};

bookingSchema.methods.generateTickets = function() {
  // Generate ticket numbers
  this.ticketNumbers = Array.from({ length: this.quantity }, (_, i) => 
    `TKT-${this.eventId}-${this.userId}-${i + 1}-${Date.now()}`
  );
  return this.save();
};

// Statics
bookingSchema.statics.findUserBookings = function(userId, status = null) {
  const query = { userId };
  if (status) query.status = status;
  return this.find(query).populate('eventId', 'name date').sort({ bookedAt: -1 });
};

bookingSchema.statics.findExpiredTemporaryBookings = function() {
  return this.find({
    status: 'temporary',
    expiresAt: { $lt: new Date() }
  });
};

bookingSchema.statics.getEventBookingStats = function(eventId) {
  return this.aggregate([
    {
      $match: { eventId: mongoose.Types.ObjectId(eventId) }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        revenue: { $sum: '$totalPrice' }
      }
    }
  ]);
};

module.exports = mongoose.model('Booking', bookingSchema);
