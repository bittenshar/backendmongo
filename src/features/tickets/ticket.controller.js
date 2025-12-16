const Ticket = require('./ticket.model');
const AppError = require('../../shared/utils/appError');
const catchAsync = require('../../shared/utils/catchAsync');
const { sendNotificationService } = require('../../services/notification.service');
const { NOTIFICATION_TYPES } = require('../notificationfcm/constants/notificationTypes');
const { NOTIFICATION_DATA_TYPES } = require('../notificationfcm/constants/notificationDataTypes');

exports.getAllTickets = catchAsync(async (req, res, next) => {
  const tickets = await Ticket.find().populate('event user');

  res.status(200).json({
    status: 'success',
    results: tickets.length,
    data: {
      tickets
    }
  });
});

exports.getTicket = catchAsync(async (req, res, next) => {
  const ticket = await Ticket.findById(req.params.id).populate('event user');

  if (!ticket) {
    return next(new AppError('No ticket found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      ticket
    }
  });
});

exports.createTicket = catchAsync(async (req, res, next) => {
  const newTicket = await Ticket.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      ticket: newTicket
    }
  });
});

exports.updateTicket = catchAsync(async (req, res, next) => {
  const ticket = await Ticket.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!ticket) {
    return next(new AppError('No ticket found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      ticket
    }
  });
});

exports.verifyTicket = catchAsync(async (req, res, next) => {
  const { ticketId, faceImage } = req.body;

  // In a real app, you would verify the face against the user's stored face
  const ticket = await Ticket.findByIdAndUpdate(
    ticketId,
    { status: 'checked-in', faceVerified: true, checkInTime: Date.now() },
    { new: true }
  );

  if (!ticket) {
    return next(new AppError('No ticket found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      ticket
    }
  });
});

// Issue ticket after successful payment
exports.issueTicketAfterPayment = catchAsync(async (req, res, next) => {
  const { registrationId, paymentId, amount, price } = req.body;
  
  // Validate required fields
  if (!registrationId || !paymentId) {
    return next(new AppError('registrationId and paymentId are required', 400));
  }

  // Get registration details
  const UserEventRegistration = require('../registrations/userEventRegistration.model');
  const registration = await UserEventRegistration.findById(registrationId)
    .populate('userId')
    .populate('eventId');

  if (!registration) {
    return next(new AppError('No registration found with that ID', 404));
  }

  // Check if face verification and ticket availability are true/available
  if (!registration.faceVerificationStatus) {
    return next(new AppError('User does not have face verification', 400));
  }

  if (registration.ticketAvailabilityStatus !== 'available') {
    return next(new AppError('No tickets available for this event', 400));
  }

  // Check if ticket already issued
  if (registration.ticketIssued) {
    return next(new AppError('Ticket already issued for this registration', 400));
  }

  // Generate unique ticket ID
  const ticketId = `${registration.eventId._id}-${registration.userId._id}-${Date.now()}`;

  // Create ticket
  const ticket = await Ticket.create({
    event: registration.eventId._id,
    user: registration.userId._id,
    ticketId: ticketId,
    price: price || amount,
    purchaseDate: new Date(),
    status: 'active',
    faceVerified: true // Already verified during registration
  });

  // Update registration to mark ticket as issued
  await UserEventRegistration.findByIdAndUpdate(
    registrationId,
    {
      ticketIssued: true,
      ticketIssuedDate: new Date(),
      status: 'verified'
    },
    { new: true }
  );

  // Update event to increment ticketsSold
  const Event = require('../events/event.model');
  await Event.findByIdAndUpdate(
    registration.eventId._id,
    { $inc: { ticketsSold: 1 } }
  );

  // 🔔 Send notification to user
  await sendNotificationService({
    userId: registration.userId._id.toString(),
    type: NOTIFICATION_TYPES.TICKET_ISSUED,
    payload: {
      eventName: registration.eventId.name,
      ticketNumber: ticketId.substring(ticketId.length - 8),
    },
    data: {
      type: NOTIFICATION_DATA_TYPES.TICKET_ISSUED,
      ticketId: ticket._id.toString(),
      eventId: registration.eventId._id.toString(),
      registrationId: registrationId,
    },
  });

  res.status(201).json({
    status: 'success',
    message: 'Ticket issued successfully after payment',
    data: {
      ticket: {
        _id: ticket._id,
        ticketId: ticket.ticketId,
        eventId: registration.eventId._id,
        eventName: registration.eventId.name,
        userId: registration.userId._id,
        userName: registration.userId.name,
        userEmail: registration.userId.email,
        price: ticket.price,
        status: ticket.status,
        purchaseDate: ticket.purchaseDate,
        paymentId: paymentId,
        registrationId: registrationId
      }
    }
  });
});

// ============================================
// @desc    Get all tickets for a specific user
// @route   GET /api/tickets/user/:userId
// @access  Private
// ============================================
exports.getTicketsByUser = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  const tickets = await Ticket.find({ user: userId })
    .populate('event', 'name date location totalTickets ticketsSold price')
    .populate('user', 'name email phone');

  res.status(200).json({
    status: 'success',
    results: tickets.length,
    data: {
      tickets
    }
  });
});