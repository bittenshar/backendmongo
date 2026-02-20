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
      required: [true, 'Cover image is required'] 
    },
    s3ImageKey: { 
      type: String, 
      required: [true, 'S3 image key is required'] 
    },
    
    status: {
      type: String,
      enum: ['upcoming', 'active', 'completed', 'cancelled'],
      default: 'upcoming',
    }
    ,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model('Event', eventSchema);
