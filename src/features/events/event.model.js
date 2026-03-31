const mongoose = require('mongoose');

const seatingSchema = new mongoose.Schema(
  {
    seatType: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    totalSeats: { type: Number, required: true, min: 1 },
    lockedSeats: { type: Number, default: 0 },
    seatsSold: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

seatingSchema.virtual('status').get(function () {
  const remaining = this.totalSeats - this.seatsSold - this.lockedSeats;
  if (remaining <= 0) return 'sold_out';
  if (remaining <= this.totalSeats * 0.2) return 'fast_filling';
  return 'available';
});

const eventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    location: { type: String, required: true },
    language: { type: String, required: true },
    agelimit: { type: String, required: true },
    description: { type: String, required: true },
    locationlink: { type: String, required: true },



    date: { type: Date, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },

    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organizer',
      required: true,
    },

    seatings: [seatingSchema], // ⭐ Dynamic seating array

    coverImage: { 
      type: String, 
      required: true,
      description: 'Event cover image URL or local path (required)'
    },
    s3ImageKey: { 
      type: String, 
      default: null,

    },
    imageToken: {
      type: String,
      default: null,
      description: 'Encrypted token for secure image access via /api/images/encrypted/:token'
    },
    
    isCancelled: {
      type: Boolean,
      default: false,
      description: 'Explicitly mark event as cancelled'
    },

    // ===== QR CHECK-IN SYSTEM =====
    isActive: {
      type: Boolean,
      default: true,
      index: true,
      description: 'Whether event is active for check-ins (can be disabled for venue control)'
    },
    // ===== END QR CHECK-IN FIELDS =====
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual getter for automatic status calculation based on event times
eventSchema.virtual('status').get(function () {
  // Check if explicitly cancelled
  if (this.isCancelled) {
    return 'cancelled';
  }
  
  const now = new Date();
  
  // Check if active (between start and end time)
  if (now >= this.startTime && now <= this.endTime) {
    return 'active';
  }
  
  // Check if completed (after end time)
  if (now > this.endTime) {
    return 'completed';
  }
  
  // Default to upcoming (before start time)
  return 'upcoming';
});

module.exports = mongoose.model('Event', eventSchema);
