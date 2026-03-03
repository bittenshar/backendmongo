const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Staff Model - QR Scanner & Venue Management
 * Authenticates staff before they can scan QR codes
 * Tracks permissions and activity
 */
const staffSchema = new mongoose.Schema(
  {
    // Basic info
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      sparse: true
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      sparse: true
    },

    // Authentication
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false // Don't return password by default
    },

    // Authorization
    role: {
      type: String,
      enum: ['scanner', 'gate_manager', 'venue_admin'],
      default: 'scanner',
      description: 'Role determines what actions staff can perform'
    },

    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
      description: 'Event this staff member is assigned to'
    },

    assignedGates: [{
      type: String,
      description: 'Array of gate numbers this staff can scan at'
    }],

    // Access control
    isActive: {
      type: Boolean,
      default: true,
      index: true,
      description: 'Whether staff member can still access the system'
    },

    // Session tracking
    lastLoginTime: {
      type: Date,
      description: 'Last successful login timestamp'
    },

    lastLoginIp: {
      type: String,
      description: 'IP address of last login'
    },

    loginAttempts: {
      type: Number,
      default: 0,
      description: 'Failed login attempts (auto-reset after 24h)'
    },

    isLocked: {
      type: Boolean,
      default: false,
      description: 'Account locked after too many failed attempts'
    },

    lockedUntil: {
      type: Date,
      description: 'When the account will be unlocked'
    },

    // Statistics
    totalCheckIns: {
      type: Number,
      default: 0,
      description: 'Total tickets scanned by this staff'
    },

    checkInsToday: {
      type: Number,
      default: 0,
      description: 'Tickets scanned today'
    },

    // Organizer association
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organizer',
      required: true,
      index: true,
      description: 'Which organizer hired this staff'
    },

    // Notes
    notes: {
      type: String,
      description: 'Any special notes about this staff member'
    },

    // Deactivation
    deactivatedAt: {
      type: Date,
      description: 'When staff was deactivated'
    },

    deactivationReason: {
      type: String,
      description: 'Reason for deactivation'
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
staffSchema.index({ email: 1 });
staffSchema.index({ phone: 1 });
staffSchema.index({ eventId: 1, isActive: 1 });
staffSchema.index({ organizerId: 1, isActive: 1 });
staffSchema.index({ isLocked: 1 });

// Pre-save: Hash password
staffSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Methods
/**
 * Compare password for authentication
 */
staffSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Check if staff can access a gate
 */
staffSchema.methods.hasGateAccess = function(gateNumber) {
  if (this.role === 'venue_admin') return true;
  if (!this.assignedGates || this.assignedGates.length === 0) return false;
  return this.assignedGates.includes(gateNumber);
};

/**
 * Check if account is locked due to too many failed attempts
 */
staffSchema.methods.isAccountLocked = function() {
  return this.isLocked && new Date() < this.lockedUntil;
};

/**
 * Reset failed login attempts
 */
staffSchema.methods.resetLoginAttempts = function() {
  this.loginAttempts = 0;
  this.isLocked = false;
  this.lockedUntil = null;
  return this.save();
};

/**
 * Record a successful login
 */
staffSchema.methods.recordSuccessfulLogin = function(ipAddress) {
  this.lastLoginTime = new Date();
  this.lastLoginIp = ipAddress;
  this.loginAttempts = 0;
  this.isLocked = false;
  this.lockedUntil = null;
  return this.save();
};

/**
 * Record a failed login attempt
 */
staffSchema.methods.recordFailedLoginAttempt = function() {
  this.loginAttempts += 1;
  
  // Lock account after 5 failed attempts for 1 hour
  if (this.loginAttempts >= 5) {
    this.isLocked = true;
    this.lockedUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  }
  
  return this.save();
};

/**
 * Increment check-in count
 */
staffSchema.methods.recordCheckIn = function() {
  this.totalCheckIns += 1;
  this.checkInsToday += 1;
  return this.save();
};

// Statics
/**
 * Reset daily check-in counts (run daily via cron)
 */
staffSchema.statics.resetDailyCheckInCounts = function() {
  return this.updateMany({}, { checkInsToday: 0 });
};

/**
 * Get active staff for an event
 */
staffSchema.statics.getActiveStaffForEvent = function(eventId) {
  return this.find({ eventId, isActive: true })
    .select('-password')
    .sort({ name: 1 });
};

/**
 * Unlock locked accounts that have expired their lock time
 */
staffSchema.statics.unlockExpiredAccounts = function() {
  return this.updateMany(
    {
      isLocked: true,
      lockedUntil: { $lte: new Date() }
    },
    {
      $set: { isLocked: false, loginAttempts: 0 }
    }
  );
};

module.exports = mongoose.model('Staff', staffSchema);
