const Booking = require('./booking_model');
const AppError = require('../../shared/utils/appError');
const Event = require('../events/event.model');

/**
 * Convert UTC date to IST for display/logging only
 * IST is UTC+5:30 (333 minutes)
 * WARNING: Never use IST for timezone-critical comparisons
 */
const toIST = (utcDate) => {
  const date = new Date(utcDate);
  // Add 5 hours 30 minutes for IST offset
  return new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
};

/**
 * Format IST date for display
 * Returns ISO string with proper timezone indication
 */
const formatIST = (utcDate) => {
  const istDate = toIST(utcDate);
  const iso = istDate.toISOString();
  // Replace Z with +05:30 to indicate IST
  return iso.replace('Z', '+05:30');
};

/**
 * Validate ticket for event check-in (Admin/Event Staff)
 * POST /api/booking/validate-ticket
 * 
 * Body:
 * - ticketNumber: The ticket number to validate
 * - eventId: The event ID (optional, for verification)
 */
exports.validateTicket = async (req, res, next) => {
  try {
    const { ticketNumber, eventId } = req.body;

    if (!ticketNumber) {
      return next(new AppError('Ticket number is required', 400));
    }

    // Find booking with this ticket number
    const booking = await Booking.findOne({
      ticketNumbers: ticketNumber
    })
      .populate('userId', 'name email phone')
      .populate('eventId', 'name date location');

    if (!booking) {
      return res.status(404).json({
        status: 'failed',
        message: 'Ticket not found',
        valid: false
      });
    }

    // Check if event ID matches (if provided)
    if (eventId && booking.eventId._id.toString() !== eventId) {
      return res.status(400).json({
        status: 'failed',
        message: 'Ticket does not belong to this event',
        valid: false
      });
    }

    // Check if booking is confirmed
    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        status: 'failed',
        message: `Ticket is ${booking.status}. Only confirmed tickets can be used.`,
        valid: false
      });
    }

    // Check if ticket has already been used
    if (booking.status === 'used') {
      return res.status(400).json({
        status: 'failed',
        message: 'Ticket has already been used',
        valid: false,
        usedAt: booking.confirmedAt
      });
    }

    // Calculate position of this ticket in the list
    const ticketIndex = booking.ticketNumbers.indexOf(ticketNumber);

    // Ticket is valid
    res.status(200).json({
      status: 'success',
      valid: true,
      message: 'Ticket is valid',
      data: {
        ticketNumber,
        position: ticketIndex + 1,
        totalTickets: booking.quantity,
        user: {
          name: booking.userId.name,
          email: booking.userId.email,
          phone: booking.userId.phone
        },
        event: {
          name: booking.eventId.name,
          date: booking.eventId.date,
          location: booking.eventId.location
        },
        seatType: booking.seatType,
        status: booking.status,
        confirmedAt: booking.confirmedAt
      }
    });

  } catch (error) {
    console.error('Error validating ticket:', error);
    return next(new AppError('Error validating ticket', 500));
  }
};

/**
 * Check in ticket (mark as used)
 * POST /api/booking/checkin-ticket
 */
exports.checkInTicket = async (req, res, next) => {
  try {
    const { ticketNumber, eventId } = req.body;

    if (!ticketNumber) {
      return next(new AppError('Ticket number is required', 400));
    }

    const booking = await Booking.findOne({
      ticketNumbers: ticketNumber
    })
      .populate('userId', 'name email phone')
      .populate('eventId', 'name date location');

    if (!booking) {
      return res.status(404).json({
        status: 'failed',
        message: 'Ticket not found',
        checkedIn: false
      });
    }

    // Check if event ID matches
    if (eventId && booking.eventId._id.toString() !== eventId) {
      return res.status(400).json({
        status: 'failed',
        message: 'Ticket does not belong to this event',
        checkedIn: false
      });
    }

    // Check if already checked in
    if (booking.status === 'used') {
      return res.status(400).json({
        status: 'failed',
        message: 'Ticket has already been checked in',
        checkedIn: false,
        checkedInAt: booking.confirmedAt
      });
    }

    // Mark booking as used
    booking.status = 'used';
    booking.usedAt = new Date();
    await booking.save();

    res.status(200).json({
      status: 'success',
      checkedIn: true,
      message: 'Ticket checked in successfully',
      data: {
        ticketNumber,
        user: booking.userId.name,
        event: booking.eventId.name,
        checkedInAt: booking.usedAt
      }
    });

  } catch (error) {
    console.error('Error checking in ticket:', error);
    return next(new AppError('Error checking in ticket', 500));
  }
};

/**
 * Validate ticket by QR code
 * POST /api/booking/validate-qr
 */
exports.validateQRCode = async (req, res, next) => {
  try {
    const { qrContent, eventId } = req.body;

    if (!qrContent) {
      return next(new AppError('QR code content is required', 400));
    }

    const qrcodeService = require('../../shared/services/ticket-qrcode.service');

    // Find booking with this ticket number
    const booking = await Booking.findOne({
      ticketNumbers: qrContent
    })
      .populate('userId', 'name email phone')
      .populate('eventId', 'name date location');

    if (!booking) {
      return res.status(404).json({
        status: 'failed',
        message: 'Invalid QR code. Ticket not found',
        valid: false
      });
    }

    // Validate QR code
    if (!qrcodeService.validateQRCode(qrContent, booking.ticketNumbers[0])) {
      return res.status(400).json({
        status: 'failed',
        message: 'QR code is invalid',
        valid: false
      });
    }

    // Check if event ID matches
    if (eventId && booking.eventId._id.toString() !== eventId) {
      return res.status(400).json({
        status: 'failed',
        message: 'QR code does not belong to this event',
        valid: false
      });
    }

    // Check booking status
    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        status: 'failed',
        message: `Booking is ${booking.status}. Only confirmed bookings can be checked in.`,
        valid: false
      });
    }

    res.status(200).json({
      status: 'success',
      valid: true,
      message: 'QR code is valid',
      data: {
        ticketNumber: qrContent,
        user: booking.userId.name,
        event: booking.eventId.name,
        status: booking.status
      }
    });

  } catch (error) {
    console.error('Error validating QR code:', error);
    return next(new AppError('Error validating QR code', 500));
  }
};

/**
 * Get ticket details by ticket number
 * GET /api/booking/ticket/:ticketNumber
 */
exports.getTicketDetails = async (req, res, next) => {
  try {
    const { ticketNumber } = req.params;

    const booking = await Booking.findOne({
      ticketNumbers: ticketNumber
    })
      .populate('userId', 'name email phone')
      .populate('eventId', 'name date startTime endTime location totalTickets');

    if (!booking) {
      return res.status(404).json({
        status: 'failed',
        message: 'Ticket not found'
      });
    }

    const ticketIndex = booking.ticketNumbers.indexOf(ticketNumber);

    res.status(200).json({
      status: 'success',
      data: {
        ticketNumber,
        position: ticketIndex + 1,
        totalTickets: booking.quantity,
        user: {
          name: booking.userId.name,
          email: booking.userId.email,
          phone: booking.userId.phone
        },
        event: {
          name: booking.eventId.name,
          date: booking.eventId.date,
          startTime: booking.eventId.startTime,
          endTime: booking.eventId.endTime,
          location: booking.eventId.location
        },
        booking: {
          seatType: booking.seatType,
          pricePerSeat: booking.pricePerSeat,
          totalPrice: booking.totalPrice,
          status: booking.status,
          bookedAt: booking.bookedAt,
          confirmedAt: booking.confirmedAt,
          usedAt: booking.usedAt
        }
      }
    });

  } catch (error) {
    console.error('Error getting ticket details:', error);
    return next(new AppError('Error getting ticket details', 500));
  }
};

exports.verifyEntry = async (req, res) => {
  try {
    const { userId, eventId } = req.body;

    // 2️⃣ Event validation
    const event = await Event.findById(eventId).lean();
    if (!event) {
      return res.json({ 
        status: 'RED', 
        reason: 'EVENT_NOT_FOUND',
        eventId
      });
    }

    if (event.status !== 'active') {
      return res.json({ 
        status: 'RED', 
        reason: 'EVENT_NOT_ACTIVE',
        eventName: event.name,
        eventStatus: event.status
      });
    }

    // ✅ CORRECT: All comparisons in UTC
    const nowUTC = new Date();
    const eventStartUTC = new Date(event.startTime);
    const eventEndUTC = new Date(event.endTime);

    const isOutsideEventTime = nowUTC < eventStartUTC || nowUTC > eventEndUTC;

    // 🔍 For display/logging: Convert to IST (but never use for comparisons)
    const nowIST = toIST(nowUTC);
    const eventStartIST = toIST(eventStartUTC);
    const eventEndIST = toIST(eventEndUTC);

    if (isOutsideEventTime) {
      return res.json({ 
        status: 'RED', 
        reason: 'OUTSIDE_EVENT_TIME',
        eventName: event.name,
        eventTime: {
          utc: {
            startTime: eventStartUTC.toISOString(),
            endTime: eventEndUTC.toISOString()
          },
          ist: {
            startTime: formatIST(eventStartUTC),
            endTime: formatIST(eventEndUTC)
          }
        },
        currentTime: {
          utc: nowUTC.toISOString(),
          ist: formatIST(nowUTC)
        },
        isEventRunning: false
      });
    }

    // 3️⃣ Find booking (ticket can be checked multiple times)
    let booking = await Booking.findOne({
      userId,
      eventId,
      tickettype: 'smart'
    });

    if (!booking) {
      return res.json({ 
        status: 'RED', 
        reason: 'NO_VALID_SMART_TICKET',
        eventName: event.name,
        eventTime: {
          utc: {
            startTime: eventStartUTC.toISOString(),
            endTime: eventEndUTC.toISOString()
          },
          ist: {
            startTime: formatIST(eventStartUTC),
            endTime: formatIST(eventEndUTC)
          }
        },
        currentTime: {
          utc: nowUTC.toISOString(),
          ist: formatIST(nowUTC)
        }
      });
    }

    // 4️⃣ Track multiple check-ins (increment counter + add timestamp)
    booking.checkInCount = (booking.checkInCount || 0) + 1;
    
    // Initialize checkIns array if not exists and store all timestamps
    if (!booking.checkIns) {
      booking.checkIns = [];
    }
    booking.checkIns.push({
      timestamp: nowUTC,
      timestampIST: formatIST(nowUTC),
      checkInNumber: booking.checkInCount
    });
    
    // Update status to 'used' on first check-in
    if (booking.status === 'confirmed') {
      booking.status = 'used';
      booking.usedAt = nowUTC;
    }

    await booking.save();

    // 5️⃣ Success - Multiple check-in allowed
    return res.json({
      status: 'GREEN',
      bookingId: booking._id,
      eventName: event.name,
      message: `Ticket is checked ${booking.checkInCount} time${booking.checkInCount > 1 ? 's' : ''}`,
      checkInCount: booking.checkInCount,
      eventTime: {
        utc: {
          startTime: eventStartUTC.toISOString(),
          endTime: eventEndUTC.toISOString()
        },
        ist: {
          startTime: formatIST(eventStartUTC),
          endTime: formatIST(eventEndUTC)
        }
      },
      currentTime: {
        utc: nowUTC.toISOString(),
        ist: formatIST(nowUTC)
      },
      isEventRunning: true,
      checkedInAt: nowUTC.toISOString(),
      checkedInAtIST: formatIST(nowUTC),
      allCheckIns: booking.checkIns
    });

  } catch (err) {
    console.error('ENTRY_VERIFY_ERROR:', err);
    return res.status(500).json({ 
      status: 'ERROR',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = exports;
