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
 * Replaces direct S3 URLs with clean image proxy URLs
 * New format: /api/images/event-{id}-cover (no AWS/S3 references exposed)
 */
const transformEventResponse = (eventDoc) => {
  const eventObj = eventDoc.toObject ? eventDoc.toObject() : eventDoc;
  
  // Generate clean image URL using new imageId format
  // Pattern: /api/images/event-{eventId}-cover
  if (eventObj._id) {
    eventObj.coverImageUrl = `/api/images/event-${eventObj._id}-cover`;
  }
  
  // Remove raw S3 URLs and tokens from response (hide infrastructure)
  delete eventObj.coverImage;
  delete eventObj.s3ImageKey;
  delete eventObj.s3BucketName;
  delete eventObj.imageToken;
  
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
    // Step 1: Create event first (without image) to get MongoDB ID
    const eventData = { ...req.body };
    const newEvent = await Event.create(eventData);
    console.log('✅ Event created with ID:', newEvent._id);

    // Step 2: Upload image if provided (now we have the eventId)
    let s3Key = null;
    let imageId = null;

    if (req.file) {
      console.log('📸 Uploading cover image to S3 with eventId:', newEvent._id);
      const uploadResult = await s3EventImagesService.uploadEventImage(
        req.file.buffer,
        req.file.originalname,
        newEvent._id.toString()
      );

      if (uploadResult.success) {
        s3Key = uploadResult.key;
        imageId = uploadResult.imageId;
        console.log('✅ Image uploaded using clean naming pattern:', { s3Key, imageId });

        // Step 3: Update event with image information
        newEvent.s3ImageKey = s3Key;
        newEvent.coverImage = uploadResult.url;
        await newEvent.save();
        console.log('✅ Event updated with image metadata');
      } else {
        console.warn('⚠️ Image upload failed:', uploadResult.message);
      }
    } else {
      console.warn('⚠️ No image file provided in request');
    }

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
    console.log('📸 Updating cover image on S3 with clean naming pattern...');
    console.log('📄 File details:', { 
      originalName: req.file.originalname, 
      size: req.file.size,
      eventId: req.params.id
    });

    const updateResult = await s3EventImagesService.updateEventImage(
      req.file.buffer,
      req.file.originalname,
      event.s3ImageKey,
      req.params.id  // Pass eventId for clean naming pattern
    );

    if (updateResult.success) {
      updateData.coverImage = updateResult.url;
      updateData.s3ImageKey = updateResult.key;
      console.log('✅ Image updated successfully with clean naming pattern:', { 
        key: updateResult.key, 
        imageId: updateResult.imageId,
        url: updateResult.url
      });
    } else {
      console.error('❌ Image update failed with error:', {
        message: updateResult.message,
        error: updateResult.error
      });
      // Still update event but without image data
      console.warn('⚠️ Event will be updated without image data');
    }
  }

  const updatedEvent = await Event.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true
  });

  console.log('✅ Event document updated in DB:', {
    _id: updatedEvent._id,
    s3ImageKey: updatedEvent.s3ImageKey,
    hasImage: !!updatedEvent.s3ImageKey
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

