/**
 * Test/Debug Controller for CheckInLog
 * Creates test check-in records for testing blue color
 */

const CheckInLog = require('../checkin/checkInLog.model');
const Booking = require('../booking/booking_model');
const mongoose = require('mongoose');

/**
 * Create a test CheckInLog entry
 * POST /api/face-verify/test-checkin
 * Body: { bookingId: "...", eventId: "..." }
 */
exports.createTestCheckIn = async (req, res) => {
  try {
    const { bookingId, eventId } = req.body;

    if (!bookingId || !eventId) {
      return res.status(400).json({
        success: false,
        message: 'bookingId and eventId are required'
      });
    }

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bookingId format'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid eventId format'
      });
    }

    // Create CheckInLog entry
    const checkIn = await CheckInLog.create({
      ticketId: new mongoose.Types.ObjectId(bookingId),
      eventId: new mongoose.Types.ObjectId(eventId),
      checkInTime: new Date(),
      verificationMethod: 'face_recognition',
      faceVerifyScore: 95
    });

    console.log('✅ Test CheckInLog created:', checkIn._id);

    return res.status(201).json({
      success: true,
      message: 'Test check-in created successfully',
      checkInId: checkIn._id,
      details: {
        ticketId: checkIn.ticketId,
        eventId: checkIn.eventId,
        checkInTime: checkIn.checkInTime,
        verificationMethod: checkIn.verificationMethod
      }
    });

  } catch (error) {
    console.error('❌ Error creating test check-in:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to create test check-in',
      error: error.message
    });
  }
};

/**
 * Get all CheckInLogs for a booking
 * GET /api/face-verify/checkin-logs/:bookingId
 */
exports.getCheckInLogs = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bookingId format'
      });
    }

    const logs = await CheckInLog.find({
      ticketId: new mongoose.Types.ObjectId(bookingId)
    }).sort({ checkInTime: -1 });

    return res.status(200).json({
      success: true,
      count: logs.length,
      logs: logs
    });

  } catch (error) {
    console.error('❌ Error fetching check-in logs:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch check-in logs',
      error: error.message
    });
  }
};
