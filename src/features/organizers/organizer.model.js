const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const organizerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  phone: { type: String, required: true },
  address: { type: String },
  website: { type: String },
  description: { type: String },
  contactPerson: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  joinDate: { type: Date, default: Date.now },
  lastActivity: { type: Date },
  lastLogin: { type: Date },
  logo: { type: String },
  totalRevenue: { type: Number, default: 0 },
  totalEvents: { type: Number, default: 0 },
  activeEvents: { type: Number, default: 0 }
});

// Hash password before saving
organizerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method to compare passwords
organizerSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Organizer', organizerSchema);