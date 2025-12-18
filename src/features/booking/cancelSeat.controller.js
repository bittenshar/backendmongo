const Event = require('../events/event.model');
const Booking = require('./booking_model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

/**
 * CANCEL BOOKING & RELEASE LOCKED SEATS
 * Handles both temporary (not paid) and confirmed (paid) bookings
 */
exports.cancelSeatBooking = catchAsync(async (req, res, next) => {
  const { bookingId, reason = 'User cancelled' } = req.body;

  // Validation
  if (!bookingId) {
    return next(new AppError('Booking ID is required', 400));
  }

  // Find booking
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  // Check if cancellable
  if (booking.status === 'cancelled' || booking.status === 'refunded') {
    return next(new AppError('Booking already cancelled', 400));
  }

  if (booking.status === 'used') {
    return next(new AppError('Cannot cancel used booking', 400));
  }

  try {
    // Get event
    const event = await Event.findById(booking.eventId);
    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    // Get seating
    const seating = event.seatings.id(booking.seatingId);
    if (!seating) {
      return next(new AppError('Seating not found', 404));
    }

    // Release or refund based on status
    if (booking.status === 'temporary') {
      // Release locked seats
      seating.lockedSeats = Math.max(0, seating.lockedSeats - booking.quantity);
    } else if (booking.status === 'confirmed') {
      // Refund sold seats
      seating.seatsSold = Math.max(0, seating.seatsSold - booking.quantity);
      booking.refundAmount = booking.totalPrice;
    }

    // Save event changes
    await event.save();

    // Cancel booking
    await booking.cancel(reason);

    res.status(200).json({
      status: 'success',
      message: 'Booking cancelled successfully',
      data: {
        booking: {
          bookingId: booking._id,
          status: booking.status,
          cancelledAt: booking.cancelledAt,
          cancellationReason: booking.cancellationReason,
          refundAmount: booking.refundAmount
        },
        event: {
          eventId: event._id,
          seatingLocked: seating.lockedSeats,
          seatingSold: seating.seatsSold,
          remainingSeats:
            seating.totalSeats - seating.seatsSold - seating.lockedSeats
        }
      }
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return next(new AppError('Failed to cancel booking', 500));
  }
});

/**
 * Cancel confirmed booking with refund
 * Admin can cancel any booking, users can only cancel their own
 */
exports.refundBooking = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;
  const { reason = 'Refund requested' } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  if (booking.status !== 'confirmed') {
    return next(new AppError('Only confirmed bookings can be refunded', 400));
  }

  try {
    // Get event and refund seats
    const event = await Event.findById(booking.eventId);
    if (event) {
      const seating = event.seatings.id(booking.seatingId);
      if (seating) {
        seating.seatsSold = Math.max(0, seating.seatsSold - booking.quantity);
        await event.save();
      }
    }

    // Set refund amount and cancel
    booking.refundAmount = booking.totalPrice;
    booking.status = 'refunded';
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason;
    await booking.save();

    res.status(200).json({
      status: 'success',
      message: 'Booking refunded successfully',
      data: {
        booking: {
          bookingId: booking._id,
          status: booking.status,
          refundAmount: booking.refundAmount,
          refundedAt: booking.cancelledAt
        }
      }
    });
  } catch (error) {
    console.error('Error refunding booking:', error);
    return next(new AppError('Failed to refund booking', 500));
  }
});
