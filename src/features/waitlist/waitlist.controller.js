const waitlistService = require('./waitlist.service');
const AppError = require('../../shared/utils/appError');
const catchAsync = require('../../shared/utils/catchAsync');
const { sendNotificationService } = require('../../services/notification.service');
const { NOTIFICATION_TYPES } = require('../notificationfcm/constants/notificationTypes');
const { NOTIFICATION_DATA_TYPES } = require('../notificationfcm/constants/notificationDataTypes');
const Waitlist = require('./waitlist.model');

exports.getEventWaitlist = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const { status } = req.query;

  const waitlist = await waitlistService.getEventWaitlist(eventId, status);

  res.status(200).json({
    status: 'success',
    results: waitlist.length,
    data: {
      waitlist
    }
  });
});

exports.getUserWaitlistPosition = catchAsync(async (req, res, next) => {
  const { userId, eventId } = req.params;

  const position = await waitlistService.getUserWaitlistPosition(userId, eventId);

  if (!position) {
    return res.status(200).json({
      status: 'success',
      data: {
        onWaitlist: false,
        message: 'User is not on the waitlist'
      }
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      onWaitlist: true,
      position
    }
  });
});

exports.acceptOffer = catchAsync(async (req, res, next) => {
  const { waitlistId } = req.params;

  // Get waitlist entry with populated data
  const waitlistEntry = await Waitlist.findById(waitlistId)
    .populate('userId')
    .populate('eventId');

  if (!waitlistEntry) {
    return next(new AppError('Waitlist entry not found', 404));
  }

  const result = await waitlistService.acceptOffer(waitlistId);

  // 🔔 Send ticket confirmed notification to user
  await sendNotificationService({
    userId: waitlistEntry.userId._id.toString(),
    type: NOTIFICATION_TYPES.TICKET_CONFIRMED,
    payload: {
      eventName: waitlistEntry.eventId?.name,
    },
    data: {
      type: NOTIFICATION_DATA_TYPES.TICKET_CONFIRMED,
      eventId: waitlistEntry.eventId._id.toString(),
      userId: waitlistEntry.userId._id.toString(),
    },
  });

  res.status(200).json({
    status: 'success',
    data: result
  });
});

exports.rejectOffer = catchAsync(async (req, res, next) => {
  const { waitlistId } = req.params;

  // Get waitlist entry before rejection for notification
  const waitlistEntry = await Waitlist.findById(waitlistId)
    .populate('userId')
    .populate('eventId');

  if (!waitlistEntry) {
    return next(new AppError('Waitlist entry not found', 404));
  }

  const result = await waitlistService.rejectOffer(waitlistId);

  // 🔔 Send notification about offer rejection
  // (Optionally notify user that their position has been updated)
  // For now, we can skip this or send a different notification

  res.status(200).json({
    status: 'success',
    data: result
  });
});

exports.removeFromWaitlist = catchAsync(async (req, res, next) => {
  const { waitlistId } = req.params;

  const result = await waitlistService.removeFromWaitlist(
    req.body.userId,
    req.body.eventId
  );

  res.status(200).json({
    status: 'success',
    data: result
  });
});

exports.processWaitlist = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const { slotsAvailable } = req.body;

  const result = await waitlistService.processWaitlist(eventId, slotsAvailable || 1);

  // 🔔 Send notifications to offered users
  if (result.issued && result.issued.length > 0) {
    for (const offer of result.issued) {
      await sendNotificationService({
        userId: offer.userId.toString(),
        type: NOTIFICATION_TYPES.WAITLIST_OFFER,
        payload: {
          eventName: offer.eventId?.name || 'Your event',
          offerExpiry: '24 hours',
        },
        data: {
          type: NOTIFICATION_DATA_TYPES.WAITLIST_OFFER,
          eventId: offer.eventId.toString(),
          userId: offer.userId.toString(),
        },
      });
    }
  }

  res.status(200).json({
    status: 'success',
    data: result
  });
});

exports.cleanupExpiredOffers = catchAsync(async (req, res, next) => {
  const result = await waitlistService.cleanupExpiredOffers();

  res.status(200).json({
    status: 'success',
    data: result
  });
});
