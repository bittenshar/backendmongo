const Event = require('./event.model');
const Booking = require('../booking/booking_model');
const AppError = require('../../shared/utils/appError');
const catchAsync = require('../../shared/utils/catchAsync');
const s3EventImagesService = require('../../shared/services/s3EventImages.service');
const urlEncryption = require('../../shared/services/urlEncryption.service');
const { sendNotificationService } = require('../../services/notification.service');
const { NOTIFICATION_TYPES } = require('../notificationfcm/constants/notificationTypes');
const { NOTIFICATION_DATA_TYPES } = require('../notificationfcm/constants/notificationDataTypes');

/**
 * Transform event data to hide S3 URLs
 * Replaces direct S3 URLs with public image proxy URLs (no token required)
 */
const transformEventResponse = (eventDoc) => {
  const eventObj = eventDoc.toObject ? eventDoc.toObject() : eventDoc;
  
  if (eventObj.s3ImageKey) {
    // Use public endpoint (no token required)
    eventObj.coverImageUrl = `/api/images/public/${eventObj.s3ImageKey}`;
  } else if (eventObj.coverImage) {
    // Fallback: use public endpoint with coverImage data
    eventObj.coverImageUrl = `/api/images/public/${eventObj.coverImage}`;
  }
  
  // Remove raw S3 URLs from response
  delete eventObj.coverImage;
  delete eventObj.s3ImageKey;
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
  console.log('📝 Creating event with data:', req.body);
  console.log('📸 File info:', { hasFile: !!req.file, filename: req.file?.originalname, size: req.file?.size });
  
  try {
    let coverImageUrl = null;
    let s3Key = null;

    // Handle cover image upload if provided
    if (req.file) {
      console.log('📸 Uploading cover image to S3...');
      const uploadResult = await s3EventImagesService.uploadEventImage(
        req.file.buffer,
        req.file.originalname
      );

      if (uploadResult.success) {
        coverImageUrl = uploadResult.url;
        s3Key = uploadResult.key;
        console.log('✅ Image uploaded to S3:', coverImageUrl);
      } else {
        console.warn('⚠️ Image upload failed:', uploadResult.message);
      }
    } else {
      console.warn('⚠️ No file in request');
    }

    const eventData = {
      ...req.body,
      ...(coverImageUrl && { coverImage: coverImageUrl, s3ImageKey: s3Key })
    };

    const newEvent = await Event.create(eventData);
    console.log('✅ Event created successfully:', newEvent._id);

    // Transform event to hide S3 URL
    const transformedEvent = transformEventResponse(newEvent);

    res.status(201).json({
      status: 'success',
      data: {
        event: transformedEvent
      }
    });
  } catch (error) {
    console.error('❌ Error creating event:', error);
    return next(error);
  }
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

  let updateData = { ...req.body };

  // Handle cover image update if new image provided
  if (req.file) {
    console.log('📸 Updating cover image on S3...');
    const updateResult = await s3EventImagesService.updateEventImage(
      req.file.buffer,
      req.file.originalname,
      event.s3ImageKey,
      req.params.id  // Pass event ID for organized storage
    );

    if (updateResult.success) {
      updateData.coverImage = updateResult.url;
      updateData.s3ImageKey = updateResult.key;
      console.log('✅ Image updated on S3:', updateResult.url);
    } else {
      console.warn('⚠️ Image update failed:', updateResult.message);
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

  // Delete associated image from S3 if exists
  if (event.s3ImageKey) {
    console.log('🗑️ Deleting event image from S3...');
    await s3EventImagesService.deleteEventImage(event.s3ImageKey);
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

