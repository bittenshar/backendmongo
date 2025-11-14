const waitlistService = require('./waitlist.service');
const AppError = require('../../shared/utils/appError');
const catchAsync = require('../../shared/utils/catchAsync');

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

  const result = await waitlistService.acceptOffer(waitlistId);

  res.status(200).json({
    status: 'success',
    data: result
  });
});

exports.rejectOffer = catchAsync(async (req, res, next) => {
  const { waitlistId } = req.params;

  const result = await waitlistService.rejectOffer(waitlistId);

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
