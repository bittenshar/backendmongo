const Event = require('../events/event.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

/**
 * FINAL CONFIRMATION AFTER PAYMENT SUCCESS
 */
exports.confirmSeatAfterPayment = catchAsync(async (req, res, next) => {
  const { eventId, seatingId, quantity } = req.body;

  if (!eventId || !seatingId || !quantity || quantity <= 0) {
    return next(new AppError('Invalid confirmation request', 400));
  }

  const event = await Event.findById(eventId);
  if (!event) return next(new AppError('Event not found', 404));

  const seating = event.seatings.id(seatingId);
  if (!seating) return next(new AppError('Seating not found', 404));

  if (seating.lockedSeats < quantity) {
    return next(new AppError('Seats not locked or already confirmed', 400));
  }

  // ✅ CONVERT LOCK → SOLD
  seating.lockedSeats -= quantity;
  seating.seatsSold += quantity;

  await event.save();

  res.status(200).json({
    status: 'success',
    message: 'Seat confirmed successfully',
    data: {
      eventId,
      seatingId,
      seatType: seating.seatType,
      quantity,
      remainingSeats:
        seating.totalSeats -
        seating.seatsSold -
        seating.lockedSeats,
      status: seating.status,
    },
  });
});
