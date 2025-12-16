const Event = require('../events/event.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

/**
 * TEMPORARY SEAT LOCK (BEFORE PAYMENT)
 * Called when user clicks "Proceed to Payment"
 */
exports.bookSeat = catchAsync(async (req, res, next) => {
  const { eventId, seatingId, quantity } = req.body;

  // ✅ Basic validation
  if (!eventId || !seatingId || !quantity || quantity <= 0) {
    return next(new AppError('Invalid booking request', 400));
  }

  // ✅ Fetch event
  const event = await Event.findById(eventId);
  if (!event) {
    return next(new AppError('Event not found', 404));
  }

  // ✅ Fetch seating
  const seating = event.seatings.id(seatingId);
  if (!seating || !seating.isActive) {
    return next(new AppError('Seating not available', 400));
  }

  // ✅ Check availability
  const remainingSeats =
    seating.totalSeats - seating.seatsSold - seating.lockedSeats;

  if (remainingSeats < quantity) {
    return next(new AppError('Not enough seats available', 400));
  }

  // 🔒 LOCK SEATS
  seating.lockedSeats += quantity;
  await event.save();

  res.status(200).json({
    status: 'success',
    message: 'Seats locked successfully',
    data: {
      eventId,
      seatingId,
      seatType: seating.seatType,
      quantity,
      lockedSeats: seating.lockedSeats,
      remainingSeats:
        seating.totalSeats -
        seating.seatsSold -
        seating.lockedSeats,
      status: seating.status, // virtual
    },
  });
});
