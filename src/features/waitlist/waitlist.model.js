const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema({
  waitlistId: {
    type: String,
    default: function() {
      return this._id.toString();
    }
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  registrationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserEventRegistration'
  },
  position: {
    type: Number,
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['waiting', 'offered', 'accepted', 'rejected', 'expired'],
    default: 'waiting'
  },
  ticketOfferedDate: {
    type: Date,
    default: null
  },
  offerExpiresAt: {
    type: Date,
    default: null
  },
  reason: {
    type: String,
    enum: ['tickets_sold_out', 'face_verification_failed'],
    required: true
  },
  notificationSent: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
waitlistSchema.index({ eventId: 1, position: 1 });
waitlistSchema.index({ userId: 1 });
waitlistSchema.index({ status: 1 });
waitlistSchema.index({ eventId: 1, status: 1 });

// Get model or create if it doesn't exist
const Waitlist = mongoose.models.Waitlist || mongoose.model('Waitlist', waitlistSchema);

module.exports = Waitlist;
