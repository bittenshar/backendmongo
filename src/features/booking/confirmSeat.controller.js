const Event = require('../events/event.model');
const Booking = require('./booking_model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

/**
 * FINAL CONFIRMATION AFTER PAYMENT SUCCESS
 * Converts temporary lock to final booking
 */
exports.confirmSeatAfterPayment = catchAsync(async (req, res, next) => {
  const { bookingId, paymentId, paymentMethod = 'card' } = req.body;

  // Validation
  if (!bookingId || !paymentId) {
    return next(new AppError('Booking ID and Payment ID are required', 400));
  }

  // Find booking
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  // Check if already confirmed
  if (booking.status === 'confirmed') {
    return next(new AppError('Booking already confirmed', 400));
  }

  // Get event first (before checking expiry)
  const event = await Event.findById(booking.eventId);
  if (!event) {
    return next(new AppError('Event not found', 404));
  }

  // Check if expired
  if (booking.status === 'temporary' && booking.expiresAt && new Date() > booking.expiresAt) {
    // Release the locked seats since this booking has expired
    const seating = event.seatings.id(booking.seatingId);
    if (seating) {
      seating.lockedSeats = Math.max(0, seating.lockedSeats - booking.quantity);
      await event.save();
    }
    return next(new AppError('Booking has expired. Please book again to proceed.', 400));
  }

  // Get seating
  const seating = event.seatings.id(booking.seatingId);
  if (!seating) {
    return next(new AppError('Seating not found', 404));
  }

  // Verify locked seats are still reserved for this booking
  // We need at least the quantity that was booked
  if (seating.lockedSeats < booking.quantity) {
    // Seats may have been released due to expiry or other issues
    return next(new AppError('Reserved seats are no longer available. The booking may have expired. Please book again.', 400));
  }

  try {
    // Start transaction-like process
    // 1. Convert locked → sold in event
    seating.lockedSeats -= booking.quantity;
    seating.seatsSold += booking.quantity;

    // 2. Confirm booking
    await booking.confirm(paymentId, paymentMethod);

    // 3. Generate ticket numbers
    await booking.generateTickets();

    // 4. Save event changes
    await event.save();

    res.status(200).json({
      status: 'success',
      message: 'Booking confirmed successfully',
      data: {
        booking: {
          bookingId: booking._id,
          eventId: booking.eventId,
          seatingId: booking.seatingId,
          seatType: booking.seatType,
          quantity: booking.quantity,
          totalPrice: booking.totalPrice,
          status: booking.status,
          ticketNumbers: booking.ticketNumbers,
          confirmedAt: booking.confirmedAt
        },
        event: {
          eventId: event._id,
          seatingSold: seating.seatsSold,
          seatingLocked: seating.lockedSeats,
          remainingSeats:
            seating.totalSeats - seating.seatsSold - seating.lockedSeats
        }
      }
    });
  } catch (error) {
    // Rollback on error
    console.error('Error confirming booking:', error);
    
    // Release locked seats if confirmation fails
    seating.lockedSeats += booking.quantity;
    await event.save();
    
    return next(new AppError('Failed to confirm booking', 500));
  }
});
