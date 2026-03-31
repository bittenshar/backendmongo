/**
 * Staff Authentication & Management Routes
 * For QR scanner login and account management
 */
const express = require('express');
const router = express.Router();
const {
  staffLogin,
  createStaff,
  getStaffDetails,
  getEventStaff,
  updateStaffGates,
  deactivateStaff,
  unlockStaffAccount
} = require('./staff.controller');

// Middleware placeholders
const validateAdminAuth = (req, res, next) => {
  // Verify admin JWT token
  // Sets req.user = { userId, role, organizerId }
  next();
};


const validateStaffAuth = (req, res, next) => {
  // Verify staff JWT token
  // Sets req.user = { staffId, eventId, role }
  next();
};

// ===== PUBLIC ENDPOINTS (No auth required) =====

/**
 * POST /api/staff/login
 * Staff login for QR scanner access
 *
 * Request body:
 * {
 *   email: "scanner@example.com",
 *   password: "your-password",
 *   eventId: "event_id_here",
 *   ipAddress: "192.168.1.100"
 * }
 *
 * Success Response:
 * {
 *   success: true,
 *   message: "Staff login successful",
 *   data: {
 *     staffId: "...",
 *     name: "John Scanner",
 *     email: "scanner@example.com",
 *     role: "scanner",
 *     eventId: "...",
 *     assignedGates: ["Gate-A", "Gate-B"],
 *     totalCheckIns: 150,
 *     checkInsToday: 23
 *   },
 *   token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   expiresIn: "8h"
 * }
 */
router.post('/login', staffLogin);

// ===== ADMIN/ORGANIZER ENDPOINTS =====

/**
 * POST /api/staff/create
 * Create a new QR scanner staff member
 *
 * Request body:
 * {
 *   name: "John Scanner",
 *   email: "scanner@example.com",
 *   phone: "+919876543210",
 *   password: "secure-password",
 *   eventId: "event_id_here",
 *   organizerId: "organizer_id_here",
 *   assignedGates: ["Gate-A", "Gate-B"]
 * }
 */
router.post('/create', validateAdminAuth, createStaff);

/**
 * GET /api/staff/details/:staffId
 * Get staff member details
 */
router.get('/details/:staffId', validateAdminAuth, getStaffDetails);

/**
 * GET /api/staff/event/:eventId
 * Get all active staff for an event
 */
router.get('/event/:eventId', validateAdminAuth, getEventStaff);

/**
 * PUT /api/staff/:staffId/gates
 * Update staff gate assignments
 *
 * Request body:
 * {
 *   assignedGates: ["Gate-A", "Gate-C"]
 * }
 */
router.put('/:staffId/gates', validateAdminAuth, updateStaffGates);

/**
 * PUT /api/staff/:staffId/deactivate
 * Deactivate a staff member
 *
 * Request body:
 * {
 *   reason: "No longer needed" | "Policy change" | etc.
 * }
 */
router.put('/:staffId/deactivate', validateAdminAuth, deactivateStaff);

/**
 * POST /api/staff/:staffId/unlock
 * Manually unlock a staff account locked due to failed login attempts
 */
router.post('/:staffId/unlock', validateAdminAuth, unlockStaffAccount);

// ===== ERROR HANDLING =====

router.use((err, req, res, next) => {
  console.error('Staff route error:', err);
  res.status(500).json({
    success: false,
    message: 'Staff endpoint error',
    error: err.message
  });
});

module.exports = router;
