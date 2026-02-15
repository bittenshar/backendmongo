const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
/*
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  firstname: { type: String },
  lastname: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  role: { type: String, enum: ['user', 'employee', 'admin'], default: 'user' },
  permissions: [{ type: String }],
  avatar: { type: String },
  faceId: { type: String },
  verificationStatus: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected'], 
    default: 'pending' 
  },
  aadhaarPhoto: { type: String },
  aadhaarPhotoAt: { type: Date },
  uploadedPhoto: { type: String },
  uploadedPhotoAt: { type: Date },
  lastLogin: { type: Date },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  
  // OTP Verification Fields
  phoneVerified: { type: Boolean, default: false },
  phoneVerifiedAt: { type: Date },
  otpAttempts: { type: Number, default: 0 },
  otpLastSentAt: { type: Date },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  // Split name into firstname and lastname if they don't exist
  if (this.name && !this.firstname && !this.lastname) {
    const nameParts = this.name.trim().split(' ');
    this.firstname = nameParts[0] || '';
    this.lastname = nameParts.slice(1).join(' ') || '';
  }
  
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

*/

const userSchema = new mongoose.Schema({
  name: { type: String, },
  firstname: { type: String ,default: 'Thriller' },
  lastname: { type: String },
  email: { type: String, unique: true },
  password: { type: String},
  phone: { type: String , required: [true, 'Phone number is required'] , unique: true  , trim: true},
  role: { type: String, enum: ['user', 'employee', 'admin'], default: 'user' },
  permissions: [{ type: String }],
  avatar: { type: String },
  faceId: { type: String },
  userId: { type: String, unique: true, sparse: true },
  isTemp: { type: Boolean, default: false },
  verificationStatus: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected'], 
    default: 'pending' 
  },
  aadhaarPhoto: { type: String },
  aadhaarPhotoAt: { type: Date },
  uploadedPhoto: { type: String },
  uploadedPhotoAt: { type: Date },
  lastLogin: { type: Date },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  state: { type: String, default: null },
  
  // OTP Verification Fields
  phoneVerified: { type: Boolean, default: false },
  phoneVerifiedAt: { type: Date },
  otpAttempts: { type: Number, default: 0 },
  otpLastSentAt: { type: Date },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  // Split name into firstname and lastname if they don't exist
  if (this.name && !this.firstname && !this.lastname) {
    const nameParts = this.name.trim().split(' ');
    this.firstname = nameParts[0] || '';
    this.lastname = nameParts.slice(1).join(' ') || '';
  }
  
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Add indexes for better query performance
// Note: phone and email already have unique: true in schema definition
userSchema.index({ isTemp: 1, createdAt: 1 });

// Check if model already exists before defining it
const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;