const Event = require('../events/event.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

exports.getSeatAvailability = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;

  const event = await Event.findById(eventId).select('seatings name');
  if (!event) return next(new AppError('Event not found', 404));

  const seatings = event.seatings
    .filter((s) => s.isActive)
    .map((s) => ({
      id: s._id,
      seatType: s.seatType,
      price: s.price,
      totalSeats: s.totalSeats,
      seatsSold: s.seatsSold,
      lockedSeats: s.lockedSeats,
      remainingSeats:
        s.totalSeats - s.seatsSold - s.lockedSeats,
      status: s.status, // virtual
    }));

  res.status(200).json({
    status: 'success',
    data: {
      eventId,
      eventName: event.name,
      seatings,
    },
  });
});
