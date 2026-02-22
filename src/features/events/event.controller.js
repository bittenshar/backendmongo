const Event = require('./event.model');
const Booking = require('../booking/booking_model');
const AppError = require('../../shared/utils/appError');
const catchAsync = require('../../shared/utils/catchAsync');
const urlEncryption = require('../../shared/services/urlEncryption.service');
const { encryptUrl, decryptUrl } = require('../../shared/services/urlEncryption2.service');
const { sendNotificationService } = require('../../services/notification.service');
const imageService = require('../../shared/services/encryptedImageService');
const { NOTIFICATION_TYPES } = require('../notificationfcm/constants/notificationTypes');
const { NOTIFICATION_DATA_TYPES } = require('../notificationfcm/constants/notificationDataTypes');

/**
 * Transform event data to hide S3 URLs
 * Only exposes encrypted image token with event ID (no AWS bucket/region info)
 */
const transformEventResponse = (eventDoc) => {
  const eventObj = eventDoc.toObject ? eventDoc.toObject() : eventDoc;
  
  if (eventObj.s3ImageKey && eventObj.imageToken) {
    // URL encode token to handle base64 characters like / and +
    const encodedToken = encodeURIComponent(eventObj.imageToken);
    // Expose only encrypted token - no AWS/bucket/region info visible
    eventObj.coverImage = `/api/images/encrypted/${encodedToken}`;
    eventObj.imageId = `event-${eventObj._id}`;
  }
  
  // Remove raw S3 data from response
  delete eventObj.s3ImageKey;
  delete eventObj.imageToken; // Don't expose token in list responses
  delete eventObj.s3BucketName;
  
  return eventObj;
};

exports.getAllEvents = catchAsync(async (req, res) => {
  const page = +req.query.page || 1;
  const limit = +req.query.limit || 20;

  const events = await Event.find()
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('organizer');

  const transformedEvents = events.map(transformEventResponse);

  res.status(200).json({
    status: 'success',
    results: transformedEvents.length,
    data: { events: transformedEvents },
  });
});


exports.getEvent = catchAsync(async (req, res, next) => {
  // Validate if ID is a valid MongoDB ObjectId
  if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid event ID format', 400));
  }

  const event = await Event.findById(req.params.id).populate('organizer');

  if (!event) {
    return next(new AppError('No event found with that ID', 404));
  }

  // Transform event to hide S3 URL
  const transformedEvent = transformEventResponse(event);

  res.status(200).json({
    status: 'success',
    data: {
      event: transformedEvent
    }
  });
});

exports.createEvent = catchAsync(async (req, res, next) => {
  const { seatings, language, agelimit, name, location, date, startTime, endTime, ...otherData } = req.body;

  // Validate required fields
  if (!name || !name.trim()) {
    return next(new AppError('Event name is required', 400));
  }
  if (!location || !location.trim()) {
    return next(new AppError('Event location is required', 400));
  }
  if (!language || !language.trim()) {
    return next(new AppError('Event language is required', 400));
  }
  if (!agelimit || !agelimit.trim()) {
    return next(new AppError('Event age limit is required', 400));
  }
  if (!req.body.locationlink || !req.body.locationlink.trim()) {
    return next(new AppError('Event location link is required', 400));
  }
  if (!req.body.description || !req.body.description.trim()) {
    return next(new AppError('Event description is required', 400));
  }
  if (!date) {
    return next(new AppError('Event date is required', 400));
  }
  if (!startTime) {
    return next(new AppError('Event start time is required', 400));
  }
  if (!endTime) {
    return next(new AppError('Event end time is required', 400));
  }
  if (!seatings || !Array.isArray(seatings) || seatings.length === 0) {
    return next(new AppError('At least one seating configuration is required', 400));
  }

  const newEvent = await Event.create({
    name,
    location,
    language,
    agelimit,
    date,
    startTime,
    endTime,
    ...otherData,
    seatings,
    organizer: req.user.id  // Auto-assign organizer to logged-in user
  });

  // Handle cover image upload if provided
  if (req.file) {
    console.log('📸 Processing image in 3:4 ratio...');
    const uploadResult = await imageService.uploadEventImageWithRatio(
      req.file.buffer,
      req.file.originalname,
      newEvent._id.toString()
    );

    if (uploadResult.success) {
      // Create encrypted image token - only contains event ID
      const imageToken = encryptUrl(`event-${newEvent._id}`);
      
      await Event.findByIdAndUpdate(
        newEvent._id,
        {
          s3ImageKey: uploadResult.s3Key,
          imageToken: imageToken
        }
      );

      console.log('✅ Image uploaded and encrypted:', {
        eventId: newEvent._id,
        ratio: uploadResult.ratio,
        size: uploadResult.size
      });
    } else {
      console.warn('⚠️ Image upload failed:', uploadResult.message);
    }
  }

  // Fetch updated event with image data
  const eventWithImage = await Event.findById(newEvent._id);
  const transformedEvent = transformEventResponse(eventWithImage);

  res.status(201).json({
    status: 'success',
    data: {
      event: transformedEvent
    }
  });
});

exports.updateEvent = catchAsync(async (req, res, next) => {
  // Validate if ID is a valid MongoDB ObjectId
  if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid event ID format', 400));
  }

  const event = await Event.findById(req.params.id);

  if (!event) {
    return next(new AppError('No event found with that ID', 404));
  }

  // Validate required fields if provided in update
  if (req.body.name !== undefined && (!req.body.name || !req.body.name.trim())) {
    return next(new AppError('Event name cannot be empty', 400));
  }
  if (req.body.location !== undefined && (!req.body.location || !req.body.location.trim())) {
    return next(new AppError('Event location cannot be empty', 400));
  }
  if (req.body.language !== undefined && (!req.body.language || !req.body.language.trim())) {
    return next(new AppError('Event language cannot be empty', 400));
  }
  if (req.body.agelimit !== undefined && (!req.body.agelimit || !req.body.agelimit.trim())) {
    return next(new AppError('Event age limit cannot be empty', 400));
  }
   if (!req.body.locationlink || !req.body.locationlink.trim()) {
    return next(new AppError('Event location link is required', 400));
  }
  if (!req.body.description || !req.body.description.trim()) {
    return next(new AppError('Event description is required', 400));
  }

  let updateData = { ...req.body };

  // Handle cover image update if provided
  if (req.file) {
    console.log('📸 Processing image in 3:4 ratio...');
    
    // Delete old image if exists
    if (event.s3ImageKey) {
      await imageService.deleteEventImage(event.s3ImageKey);
      console.log('🗑️ Old image deleted');
    }

    // Upload new image
    const uploadResult = await imageService.uploadEventImageWithRatio(
      req.file.buffer,
      req.file.originalname,
      req.params.id
    );

    if (uploadResult.success) {
      // Create encrypted image token
      const imageToken = encryptUrl(`event-${req.params.id}`);
      
      updateData.s3ImageKey = uploadResult.s3Key;
      updateData.imageToken = imageToken;

      console.log('✅ Image uploaded and encrypted:', {
        eventId: req.params.id,
        ratio: uploadResult.ratio,
        size: uploadResult.size
      });
    } else {
      console.warn('⚠️ Image upload failed:', uploadResult.message);
    }
  }

  const updatedEvent = await Event.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true
  });

  // 🔔 Send event updated notification to all registered users
  const registrations = await Booking.find({ eventId: req.params.id, status: 'confirmed' })
    .select('userId')
    .distinct('userId');

  for (const userId of registrations) {
    await sendNotificationService({
      userId: userId.toString(),
      type: NOTIFICATION_TYPES.EVENT_UPDATED,
      payload: {
        eventName: updatedEvent.name,
        updateType: 'Event details have been updated',
      },
      data: {
        type: NOTIFICATION_DATA_TYPES.EVENT_UPDATED,
        eventId: req.params.id,
        userId: userId.toString(),
      },
    });
  }

  // Transform event to hide S3 URL
  const transformedEvent = transformEventResponse(updatedEvent);

  res.status(200).json({
    status: 'success',
    data: {
      event: transformedEvent
    }
  });
});

exports.deleteEvent = catchAsync(async (req, res, next) => {
  // Validate if ID is a valid MongoDB ObjectId
  if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid event ID format', 400));
  }

  const event = await Event.findByIdAndDelete(req.params.id);

  if (!event) {
    return next(new AppError('No event found with that ID', 404));
  }

  // Delete image from S3 if exists
  if (event.s3ImageKey) {
    await imageService.deleteEventImage(event.s3ImageKey);
    console.log('🗑️ Event image deleted from S3');
  }

  // 🔔 Send event cancelled notification to all registered users
  const registrations = await Booking.find({ eventId: req.params.id, status: 'confirmed' })
    .select('userId')
    .distinct('userId');

  for (const userId of registrations) {
    await sendNotificationService({
      userId: userId.toString(),
      type: NOTIFICATION_TYPES.EVENT_CANCELLED,
      payload: {
        eventName: event.name,
        reason: 'The event has been cancelled.',
      },
      data: {
        type: NOTIFICATION_DATA_TYPES.EVENT_CANCELLED,
        eventId: req.params.id,
        userId: userId.toString(),
      },
    });
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

