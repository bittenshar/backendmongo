const jwt = require('jsonwebtoken');
const Booking = require('./booking_model');
const Event = require('../events/event.model');
const CheckInLog = require('./checkInLog.model');
const Staff = require('../admin/staff.model');

/**
 * QR Ticket Check-In Controller
 * Implements complete check-in flow with validation, face recognition support, and fraud prevention
 */

/**
 * 1. Generate QR Token
 * Called after successful payment to create JWT token for QR code
 * Stores full QR URL in qrCodes field
 */
const generateQRToken = async (req, res) => {
  try {
    const { bookingId } = req.body;

    // Validate input
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId).populate('eventId');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Verify payment status
    if (booking.paymentStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment must be completed before generating QR'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        ticketId: booking._id.toString(),
        eventId: booking.eventId._id.toString(),
        userId: booking.userId.toString(),
        quantity: booking.quantity
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '365d' } // Valid for 1 year from purchase
    );

    // Generate QR code URL (contains the token)
    const qrUrl = `${process.env.APP_URL || 'http://localhost:3000'}/checkin?token=${token}`;

    // Save token to booking
    booking.qrToken = token;
    
    // Store full QR URL as string
    booking.qrCodes = qrUrl;
    
    await booking.save();

    return res.json({
      success: true,
      message: 'QR token generated successfully',
      data: {
        qrToken: token,
        qrUrl: qrUrl,
        qrCodes: booking.qrCodes,  // Full QR URL string
        bookingId: booking._id,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    });

  } catch (err) {
    console.error('Error generating QR token:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate QR token',
      error: err.message
    });
  }
};

/**
 * 2. Main Check-In Endpoint
 * Staff scans QR code which triggers this endpoint
 * Validates token, checks event status, prevents duplicate entry
 */
const checkIn = async (req, res) => {
  try {
    const { token, gateNumber, deviceInfo, ipAddress } = req.body;
    const staffId = req.user?.id; // From staff authentication middleware

    // ===== STEP 1: Validate Input =====
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'QR token is required',
        error: 'MISSING_TOKEN'
      });
    }

    if (!gateNumber) {
      return res.status(400).json({
        success: false,
        message: 'Gate number is required',
        error: 'MISSING_GATE'
      });
    }

    // ===== STEP 2: Verify JWT Token =====
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired QR token',
        error: 'INVALID_QR_TOKEN',
        details: err.message
      });
    }

    // ===== STEP 3: Fetch & Validate Ticket =====
    const booking = await Booking.findById(decoded.ticketId).populate('eventId');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
        error: 'TICKET_NOT_FOUND'
      });
    }

    // ===== STEP 4: Validate Payment Status =====
    if (booking.paymentStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment status does not allow entry',
        error: 'PAYMENT_INCOMPLETE',
        paymentStatus: booking.paymentStatus
      });
    }

    // ===== STEP 5: Prevent Duplicate Entry =====
    if (booking.checkedIn === true) {
      return res.status(400).json({
        success: false,
        message: 'Ticket already checked in - duplicate entry prevented',
        error: 'ALREADY_CHECKED_IN',
        checkInTime: booking.checkInTime,
        security: 'This prevents fraud through screenshot/forwarding'
      });
    }

    // ===== STEP 6: Validate Event Status =====
    const event = booking.eventId;

    if (!event.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Event is not active - check-in disabled by venue',
        error: 'EVENT_INACTIVE'
      });
    }

    // ===== STEP 7: Validate Event Timing =====
    const now = new Date();

    if (now < event.startTime) {
      return res.status(400).json({
        success: false,
        message: 'Event has not started yet',
        error: 'EVENT_NOT_STARTED',
        startTime: event.startTime
      });
    }

    if (now > event.endTime) {
      return res.status(400).json({
        success: false,
        message: 'Event has already ended',
        error: 'EVENT_ENDED',
        endTime: event.endTime
      });
    }

    // ===== STEP 8: Validate Event Cancellation =====
    if (event.isCancelled) {
      return res.status(400).json({
        success: false,
        message: 'Event has been cancelled - entry not allowed',
        error: 'EVENT_CANCELLED'
      });
    }

    // ===== STEP 9: Mark as Checked In =====
    booking.checkedIn = true;
    booking.checkInTime = new Date();
    booking.checkInGate = gateNumber;
    booking.checkInDeviceInfo = deviceInfo || 'Unknown';
    booking.checkInIpAddress = ipAddress || 'Unknown';
    await booking.save();

    // ===== STEP 10: Create Check-In Log (Audit Trail) =====
    const checkInLog = new CheckInLog({
      ticketId: booking._id,
      eventId: event._id,
      userId: booking.userId,
      staffId: staffId,
      gateNumber: gateNumber,
      checkInTime: booking.checkInTime,
      deviceInfo: deviceInfo,
      ipAddress: ipAddress,
      verificationMethod: 'qr_scan',
      qrVerified: true
    });

    await checkInLog.save();

    // ===== STEP 11: Increment Staff Check-In Count =====
    if (staffId) {
      try {
        const staff = await Staff.findById(staffId);
        if (staff) {
          await staff.recordCheckIn();
        }
      } catch (err) {
        console.error('Failed to update staff check-in count:', err);
        // Don't fail check-in if staff stats fail
      }
    }

    // ===== STEP 12: Success Response =====
    return res.json({
      success: true,
      message: 'Entry allowed - ticket validated',
      data: {
        ticketId: booking._id,
        eventName: event.name,
        eventLocation: event.location,
        checkInTime: booking.checkInTime,
        gate: gateNumber,
        userId: booking.userId,
        message: 'Guest entry confirmed'
      },
      security: {
        duplicatePreventionActive: true,
        timeWindowValidated: true,
        paymentVerified: true
      }
    });

  } catch (err) {
    console.error('Error during check-in:', err);
    return res.status(500).json({
      success: false,
      message: 'Check-in failed due to server error',
      error: err.message
    });
  }
};

/**
 * 3. Check-In with Face Verification (Future Upgrade)
 * Optional: Use face recognition as primary verification instead of QR
 */
const checkInWithFace = async (req, res) => {
  try {
    const { bookingId, gateNumber, faceImage, matchScore, ipAddress } = req.body;
    const staffId = req.user?.id;

    // Validate inputs
    if (!bookingId || !faceImage || matchScore === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID, face image, and match score are required'
      });
    }

    // Threshold for face match (adjust based on your ML model accuracy)
    const FACE_MATCH_THRESHOLD = 85; // 85% confidence

    if (matchScore < FACE_MATCH_THRESHOLD) {
      return res.status(400).json({
        success: false,
        message: `Face match score ${matchScore}% below threshold of ${FACE_MATCH_THRESHOLD}%`,
        error: 'FACE_VERIFICATION_FAILED',
        matchScore: matchScore
      });
    }

    // Fetch booking
    const booking = await Booking.findById(bookingId).populate('eventId');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Perform all same validations as QR check-in
    const event = booking.eventId;
    const now = new Date();

    // Quick validation checks
    if (booking.paymentStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment incomplete'
      });
    }

    if (booking.checkedIn) {
      return res.status(400).json({
        success: false,
        message: 'Already checked in'
      });
    }

    if (!event.isActive || event.isCancelled || now < event.startTime || now > event.endTime) {
      return res.status(400).json({
        success: false,
        message: 'Event is not available for check-in'
      });
    }

    // Mark as checked in with face verification
    booking.checkedIn = true;
    booking.checkInTime = new Date();
    booking.checkInGate = gateNumber;
    booking.checkInIpAddress = ipAddress || 'Unknown';
    booking.faceVerified = true;
    booking.faceVerificationTime = new Date();
    
    // Upgrade ticket type from 'traditional' to 'smart' after face verification
    if (booking.tickettype === 'traditional') {
      booking.tickettype = 'smart';
    }
    
    await booking.save();

    // Create check-in log with face details
    const checkInLog = new CheckInLog({
      ticketId: booking._id,
      eventId: event._id,
      userId: booking.userId,
      staffId: staffId,
      gateNumber: gateNumber,
      checkInTime: booking.checkInTime,
      ipAddress: ipAddress,
      verificationMethod: 'face_recognition',
      faceVerifyScore: matchScore
    });

    await checkInLog.save();

    return res.json({
      success: true,
      message: 'Entry allowed - face verified',
      data: {
        ticketId: booking._id,
        eventName: event.name,
        checkInTime: booking.checkInTime,
        faceMatchScore: matchScore,
        verified: true
      }
    });

  } catch (err) {
    console.error('Error during face verification check-in:', err);
    return res.status(500).json({
      success: false,
      message: 'Face verification check-in failed',
      error: err.message
    });
  }
};

/**
 * 4. Get Check-In Status
 * Query whether a ticket has been checked in
 */
const getCheckInStatus = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    const booking = await Booking.findById(decoded.ticketId).populate('eventId', 'name startTime endTime');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    return res.json({
      success: true,
      data: {
        ticketId: booking._id,
        checkedIn: booking.checkedIn,
        checkInTime: booking.checkInTime,
        checkInGate: booking.checkInGate,
        paymentStatus: booking.paymentStatus,
        eventName: booking.eventId.name,
        eventStartTime: booking.eventId.startTime,
        eventEndTime: booking.eventId.endTime,
        qrCodes: booking.qrCodes  // Show stored QR URLs
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve check-in status',
      error: err.message
    });
  }
};

/**
 * 5. Get Event Check-In Statistics
 * For venue managers to monitor real-time check-ins
 */
const getEventCheckInStats = async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required'
      });
    }

    // Get stats from check-in logs
    const stats = await CheckInLog.getEventStats(eventId, new Date('2020-01-01'), new Date());

    return res.json({
      success: true,
      data: stats[0] || {
        totalCheckIns: 0,
        uniqueTickets: 0,
        qrVerified: 0,
        faceVerified: 0,
        flaggedCount: 0
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve check-in statistics',
      error: err.message
    });
  }
};

/**
 * 6. Flag Check-In for Review (Fraud Investigation)
 * Mark a check-in as suspicious for manual review
 */
const flagCheckIn = async (req, res) => {
  try {
    const { checkInLogId, reason } = req.body;

    if (!checkInLogId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Check-in ID and reason are required'
      });
    }

    const checkInLog = await CheckInLog.findByIdAndUpdate(
      checkInLogId,
      {
        isFlagged: true,
        flagReason: reason
      },
      { new: true }
    );

    if (!checkInLog) {
      return res.status(404).json({
        success: false,
        message: 'Check-in log not found'
      });
    }

    return res.json({
      success: true,
      message: 'Check-in flagged for review',
      data: checkInLog
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to flag check-in',
      error: err.message
    });
  }
};

module.exports = {
  generateQRToken,
  checkIn,
  checkInWithFace,
  getCheckInStatus,
  getEventCheckInStats,
  flagCheckIn
};
