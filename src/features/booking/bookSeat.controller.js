const Event = require('../events/event.model');
const Booking = require('./booking_model');
const User = require('../auth/auth.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

/**
 * TEMPORARY SEAT LOCK (BEFORE PAYMENT)
 * Creates temporary booking with 15-minute expiry
 */
exports.bookSeat = catchAsync(async (req, res, next) => {
  const { eventId, seatingId, userId, specialRequirements = null } = req.body;
  const quantity = 1; // User can only book 1 ticket

  // ✅ Validation
  if (!eventId || !seatingId || !userId) {
    return next(new AppError('Missing required fields', 400));
  }

  // ✅ Check user exists
  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // ✅ Fetch event
  const event = await Event.findById(eventId);
  if (!event) {
    return next(new AppError('Event not found', 404));
  }

  // ✅ Check event status
  if (event.status !== 'active' && event.status !== 'upcoming') {
    return next(new AppError(`Event is ${event.status}. Cannot book seats`, 400));
  }

  // ✅ Fetch seating
  const seating = event.seatings.id(seatingId);
  if (!seating || !seating.isActive) {
    return next(new AppError('Seating category not available', 400));
  }

  // ✅ Check seat availability
  const remainingSeats =
    seating.totalSeats - seating.seatsSold - seating.lockedSeats;

  if (remainingSeats < quantity) {
    return next(new AppError(
      `Only ${remainingSeats} seats available. You requested ${quantity}`,
      400
    ));
  }

  try {
    // 🔒 LOCK SEATS IN EVENT
    seating.lockedSeats += quantity;
    await event.save();

    // 📝 CREATE TEMPORARY BOOKING RECORD
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15-minute lock

    const booking = await Booking.create({
      userId,
      eventId,
      seatingId,
      seatType: seating.seatType,
      quantity,
      pricePerSeat: seating.price,
      totalPrice: seating.price * quantity,
      status: 'temporary',
      expiresAt,
      specialRequirements,
      paymentStatus: 'pending'
    });

    res.status(201).json({
      status: 'success',
      message: 'Seats locked successfully. Proceeding to payment',
      data: {
        booking: {
          bookingId: booking._id,
          eventId: booking.eventId,
          seatingId: booking.seatingId,
          seatType: booking.seatType,
          quantity: booking.quantity,
          pricePerSeat: booking.pricePerSeat,
          totalPrice: booking.totalPrice,
          expiresAt: booking.expiresAt,
          expiresIn: 15 // minutes
        },
        event: {
          eventId: event._id,
          eventName: event.name,
          seatingLocked: seating.lockedSeats,
          remainingSeats:
            seating.totalSeats -
            seating.seatsSold -
            seating.lockedSeats
        }
      }
    });
  } catch (error) {
    console.error('Error booking seat:', error);
    
    // Rollback: Release locked seats
    seating.lockedSeats = Math.max(0, seating.lockedSeats - quantity);
    await event.save();
    
    return next(new AppError('Failed to create booking', 500));
  }
});

/**
 * Release seat lock (when user cancels payment)
 */
exports.releaseSeatLock = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  if (booking.status !== 'temporary') {
    return next(new AppError('Only temporary bookings can be released', 400));
  }

  try {
    // Get event and release seats
    const event = await Event.findById(booking.eventId);
    if (event) {
      const seating = event.seatings.id(booking.seatingId);
      if (seating) {
        seating.lockedSeats = Math.max(0, seating.lockedSeats - booking.quantity);
        await event.save();
      }
    }

    // Cancel booking
    await booking.cancel('User cancelled payment');

    res.status(200).json({
      status: 'success',
      message: 'Seat lock released',
      data: {
        bookingId: booking._id,
        status: booking.status
      }
    });
  } catch (error) {
    console.error('Error releasing seat lock:', error);
    return next(new AppError('Failed to release seat lock', 500));
  }
});
