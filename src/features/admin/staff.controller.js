const jwt = require('jsonwebtoken');
const Staff = require('./staff.model');

/**
 * Staff Authentication Controller
 * Handles login for QR scanner operators and venue staff
 */

/**
 * Staff Login
 * Scanner staff must authenticate before scanning QR tickets
 */
const staffLogin = async (req, res) => {
  try {
    const { email, password, eventId, ipAddress } = req.body;

    // ===== Validation =====
    if (!email || !password || !eventId) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and event ID are required'
      });
    }

    // ===== Find Staff =====
    const staff = await Staff.findOne({ email }).select('+password');

    if (!staff) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        error: 'STAFF_NOT_FOUND'
      });
    }

    // ===== Check Account Status =====
    if (!staff.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated',
        error: 'ACCOUNT_DEACTIVATED',
        deactivatedAt: staff.deactivatedAt,
        deactivationReason: staff.deactivationReason
      });
    }

    // ===== Check Lock Status =====
    if (staff.isAccountLocked()) {
      const minutesUntilUnlock = Math.ceil(
        (staff.lockedUntil - new Date()) / (60 * 1000)
      );
      return res.status(403).json({
        success: false,
        message: `Account is locked due to too many failed login attempts. Try again in ${minutesUntilUnlock} minutes.`,
        error: 'ACCOUNT_LOCKED',
        lockedUntil: staff.lockedUntil,
        attemptsRemaining: 5 - staff.loginAttempts
      });
    }

    // ===== Verify Event Assignment =====
    if (staff.eventId.toString() !== eventId) {
      return res.status(403).json({
        success: false,
        message: 'Staff is not assigned to this event',
        error: 'EVENT_MISMATCH'
      });
    }

    // ===== Verify Password =====
    const isPasswordValid = await staff.comparePassword(password);

    if (!isPasswordValid) {
      // Record failed attempt
      await staff.recordFailedLoginAttempt();

      const attemptsRemaining = Math.max(0, 5 - staff.loginAttempts);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        error: 'INVALID_PASSWORD',
        attemptsRemaining: attemptsRemaining,
        note: attemptsRemaining === 0 ? 'Account will be locked' : undefined
      });
    }

    // ===== Record Successful Login =====
    await staff.recordSuccessfulLogin(ipAddress || 'Unknown');

    // ===== Generate JWT Token =====
    const token = jwt.sign(
      {
        staffId: staff._id.toString(),
        email: staff.email,
        name: staff.name,
        role: staff.role,
        eventId: staff.eventId.toString(),
        assignedGates: staff.assignedGates,
        organizerId: staff.organizerId.toString()
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '8h' } // Scanner session expires in 8 hours
    );

    // ===== Success Response =====
    return res.json({
      success: true,
      message: 'Staff login successful',
      data: {
        staffId: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        eventId: staff.eventId,
        assignedGates: staff.assignedGates,
        totalCheckIns: staff.totalCheckIns,
        checkInsToday: staff.checkInsToday
      },
      token: token,
      expiresIn: '8h',
      note: 'Use this token in Authorization: Bearer <token> header for scanner operations'
    });

  } catch (err) {
    console.error('Staff login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      error: err.message
    });
  }
};

/**
 * Create Staff Member
 * Organizer/Admin creates new scanner staff
 */
const createStaff = async (req, res) => {
  try {
    const { name, email, phone, password, eventId, assignedGates, organizerId } = req.body;

    // ===== Validation =====
    if (!name || !email || !phone || !password || !eventId || !organizerId) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, password, event ID, and organizer ID are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // ===== Check Duplicates =====
    const existingEmail = await Staff.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use',
        error: 'DUPLICATE_EMAIL'
      });
    }

    const existingPhone = await Staff.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already in use',
        error: 'DUPLICATE_PHONE'
      });
    }

    // ===== Create Staff Member =====
    const newStaff = new Staff({
      name,
      email,
      phone,
      password,
      eventId,
      assignedGates: assignedGates || [],
      organizerId,
      role: 'scanner'
    });

    await newStaff.save();

    return res.status(201).json({
      success: true,
      message: 'Staff member created successfully',
      data: {
        staffId: newStaff._id,
        name: newStaff.name,
        email: newStaff.email,
        phone: newStaff.phone,
        role: newStaff.role,
        eventId: newStaff.eventId,
        assignedGates: newStaff.assignedGates
      }
    });

  } catch (err) {
    console.error('Create staff error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create staff member',
      error: err.message
    });
  }
};

/**
 * Get Staff Details
 */
const getStaffDetails = async (req, res) => {
  try {
    const staffId = req.user?.staffId || req.params.staffId;

    const staff = await Staff.findById(staffId)
      .select('-password')
      .populate('eventId', 'name location');

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    return res.json({
      success: true,
      data: {
        staffId: staff._id,
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        event: staff.eventId,
        assignedGates: staff.assignedGates,
        isActive: staff.isActive,
        totalCheckIns: staff.totalCheckIns,
        checkInsToday: staff.checkInsToday,
        lastLoginTime: staff.lastLoginTime,
        lastLoginIp: staff.lastLoginIp
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve staff details',
      error: err.message
    });
  }
};

/**
 * Get All Staff for Event
 * Admin endpoint to view all scanners for an event
 */
const getEventStaff = async (req, res) => {
  try {
    const { eventId } = req.params;

    const staff = await Staff.getActiveStaffForEvent(eventId);

    return res.json({
      success: true,
      data: staff
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve event staff',
      error: err.message
    });
  }
};

/**
 * Update Staff Gate Assignment
 * Change which gates a staff member can scan at
 */
const updateStaffGates = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { assignedGates } = req.body;

    if (!assignedGates || !Array.isArray(assignedGates)) {
      return res.status(400).json({
        success: false,
        message: 'assignedGates must be an array of gate numbers'
      });
    }

    const staff = await Staff.findByIdAndUpdate(
      staffId,
      { assignedGates },
      { new: true }
    ).select('-password');

    return res.json({
      success: true,
      message: 'Gate assignment updated',
      data: {
        staffId: staff._id,
        name: staff.name,
        assignedGates: staff.assignedGates
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update gate assignment',
      error: err.message
    });
  }
};

/**
 * Deactivate Staff
 * Remove staff access to scanner
 */
const deactivateStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { reason } = req.body;

    const staff = await Staff.findByIdAndUpdate(
      staffId,
      {
        isActive: false,
        deactivatedAt: new Date(),
        deactivationReason: reason || 'No reason provided'
      },
      { new: true }
    ).select('-password');

    return res.json({
      success: true,
      message: 'Staff member deactivated',
      data: {
        staffId: staff._id,
        name: staff.name,
        isActive: staff.isActive,
        deactivatedAt: staff.deactivatedAt
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to deactivate staff',
      error: err.message
    });
  }
};

/**
 * Unlock Staff Account
 * Manually unlock account locked due to failed login attempts
 */
const unlockStaffAccount = async (req, res) => {
  try {
    const { staffId } = req.params;

    const staff = await Staff.findById(staffId);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    await staff.resetLoginAttempts();

    return res.json({
      success: true,
      message: 'Staff account unlocked',
      data: {
        staffId: staff._id,
        name: staff.name,
        isLocked: staff.isLocked,
        loginAttempts: staff.loginAttempts
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to unlock account',
      error: err.message
    });
  }
};

module.exports = {
  staffLogin,
  createStaff,
  getStaffDetails,
  getEventStaff,
  updateStaffGates,
  deactivateStaff,
  unlockStaffAccount
};
