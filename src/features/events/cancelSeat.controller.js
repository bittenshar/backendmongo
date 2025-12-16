const Event = require('../events/event.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

/**
 * RELEASE LOCKED SEATS (PAYMENT FAILED / CANCELLED)
 */
exports.cancelSeatBooking = catchAsync(async (req, res, next) => {
  const { eventId, seatingId, quantity } = req.body;

  if (!eventId || !seatingId || !quantity || quantity <= 0) {
    return next(new AppError('Invalid cancel request', 400));
  }

  const event = await Event.findById(eventId);
  if (!event) return next(new AppError('Event not found', 404));

  const seating = event.seatings.id(seatingId);
  if (!seating) return next(new AppError('Seating not found', 404));

  // 🔓 RELEASE LOCK
  seating.lockedSeats = Math.max(
    seating.lockedSeats - quantity,
    0
  );

  await event.save();

  res.status(200).json({
    status: 'success',
    message: 'Seat lock released successfully',
  });
});
