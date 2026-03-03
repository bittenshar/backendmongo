/**
 * QR Ticket Check-In Routes
 * Public and authenticated endpoints for ticket validation
 */
const express = require('express');
const router = express.Router();
const {
  generateQRToken,
  checkIn,
  checkInWithFace,
  getCheckInStatus,
  getEventCheckInStats,
  flagCheckIn
} = require('./checkIn.controller');

// Middleware placeholders (implement in your auth middleware)
const validateStaffAuth = (req, res, next) => {
  // Verify staff JWT token from scanner
  // Expected: req.headers.authorization = "Bearer <staff-token>"
  // Sets req.user = { id: staffId, eventId, role }
  // Comment out or implement your actual auth logic
  next();
};

const validateAdminAuth = (req, res, next) => {
  // Verify admin/organizer JWT token
  // Sets req.user = { id: userId, role, organizerId }
  next();
};

// ===== PUBLIC ENDPOINTS (No auth required) =====

/**
 * GET /api/checkin
 * Verify ticket validity using QR token (from QR scan)
 *
 * Query params:
 * ?token=jwt_token_from_qr
 * 
 * Returns ticket and booking details for display/verification
 */
router.get('/', getCheckInStatus);

/**
 * POST /api/checkin/generate-qr
 * Generate QR token after successful payment
 *
 * Request body:
 * {
 *   bookingId: "booking_id_here"
 * }
 */
router.post('/generate-qr', generateQRToken);

/**
 * GET /api/checkin/status
 * Check if a ticket has been checked in
 *
 * Query params:
 * ?token=jwt_token_here
 */
router.get('/status', getCheckInStatus);

// ===== STAFF/SCANNER ENDPOINTS (Require staff authentication) =====

/**
 * POST /api/checkin/scanner
 * Main check-in endpoint for QR code scanning
 *
 * Request body:
 * {
 *   token: "qr_jwt_token_from_qr_code",
 *   gateNumber: "Gate-A",
 *   deviceInfo: "iOS-Scanner-v1.2",
 *   ipAddress: "192.168.1.100"
 * }
 *
 * Response on success:
 * {
 *   success: true,
 *   message: "Entry allowed - ticket validated",
 *   data: {
 *     ticketId: "...",
 *     eventName: "Concert XYZ",
 *     eventLocation: "Venue Name",
 *     checkInTime: "2026-03-03T10:30:00Z",
 *     gate: "Gate-A",
 *     message: "Guest entry confirmed"
 *   }
 * }
 *
 * Response on already checked in:
 * {
 *   success: false,
 *   message: "Ticket already checked in - duplicate entry prevented",
 *   error: "ALREADY_CHECKED_IN",
 *   checkInTime: "2026-03-03T09:15:00Z"
 * }
 */
router.post('/scanner', validateStaffAuth, checkIn);

/**
 * POST /api/checkin/face-verification
 * Check-in using face recognition (Future upgrade)
 *
 * Request body:
 * {
 *   bookingId: "booking_id_here",
 *   gateNumber: "Gate-B",
 *   faceImage: "base64_encoded_image",
 *   matchScore: 92.5,
 *   ipAddress: "192.168.1.101"
 * }
 *
 * Note: matchScore is confidence percentage from your ML model (0-100)
 * Default threshold: 85%
 */
router.post('/face-verification', validateStaffAuth, checkInWithFace);

// ===== ADMIN/MANAGER ENDPOINTS (Require admin authentication) =====

/**
 * GET /api/checkin/event/:eventId/stats
 * Get real-time check-in statistics for an event
 *
 * Route params:
 * :eventId - The event ID
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     totalCheckIns: 450,
 *     uniqueTickets: 450,
 *     qrVerified: 445,
 *     faceVerified: 5,
 *     flaggedCount: 2
 *   }
 * }
 */
router.get('/event/:eventId/stats', validateAdminAuth, getEventCheckInStats);

/**
 * POST /api/checkin/flag
 * Flag a check-in as suspicious for manual review
 * Used for fraud investigation and security audits
 *
 * Request body:
 * {
 *   checkInLogId: "check_in_log_id",
 *   reason: "Duplicate IP address detected" | "Unusual timing" | "Manual review needed"
 * }
 */
router.post('/flag', validateAdminAuth, flagCheckIn);

// ===== ERROR HANDLING =====

router.use((err, req, res, next) => {
  console.error('Check-in route error:', err);
  res.status(500).json({
    success: false,
    message: 'Check-in endpoint error',
    error: err.message
  });
});

module.exports = router;
