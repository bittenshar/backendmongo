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
 * Get current time in Indian Standard Time (IST)
 * IST is UTC+5:30
 */
const getCurrentIST = () => {
  const now = new Date();
  // IST offset is UTC+5:30 (330 minutes)
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000) - (now.getTimezoneOffset() * 60 * 1000));
  return istTime;
};

/**
 * Convert UTC date to IST
 */
const convertToIST = (utcDate) => {
  const date = new Date(utcDate);
  return new Date(date.getTime() + (5.5 * 60 * 60 * 1000) - (date.getTimezoneOffset() * 60 * 1000));
};

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
  // Parse form data - handle both FormData and JSON requests
  let { seatings, language, agelimit, name, location, date, startTime, endTime, locationlink, description, organizer, coverImage, ...otherData } = req.body;

  // Parse stringified JSON fields from FormData
  if (typeof seatings === 'string') {
    try {
      seatings = JSON.parse(seatings);
    } catch (e) {
      return next(new AppError(`Invalid seatings JSON format. Seatings must be a valid JSON array string. Received: "${seatings}"`, 400));
    }
  }

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
  if (!locationlink || !locationlink.trim()) {
    return next(new AppError('Event location link is required', 400));
  }
  if (!description || !description.trim()) {
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
  
  // Validate organizer (required)
  if (!organizer) {
    return next(new AppError('Organizer is required', 400));
  }

  // Validate that image file is provided (required)
  if (!req.file) {
    return next(new AppError('Event cover image is required. Please upload an image file.', 400));
  }

  // Determine coverImage value - use placeholder during upload
  let finalCoverImage = 'uploading'; // Temporary placeholder during image processing

  const newEvent = await Event.create({
    name,
    location,
    language,
    agelimit,
    date,
    startTime,
    endTime,
    locationlink,
    description,
    ...otherData,
    seatings,
    coverImage: finalCoverImage, // 🔗 Include coverImage explicitly
    organizer: organizer || req.user.id  // Use provided organizer or fall back to logged-in user
  });

  // Handle cover image upload (required)
  console.log('📸 Processing image in 3:4 ratio...');
  const uploadResult = await imageService.uploadEventImageWithRatio(
    req.file.buffer,
    req.file.originalname,
    newEvent._id.toString()
  );

  if (!uploadResult.success) {
    // Delete the event if image upload fails (image is required)
    await Event.findByIdAndDelete(newEvent._id);
    console.error('❌ Image upload failed - event deleted:', uploadResult.message);
    return next(new AppError(`Image upload failed: ${uploadResult.message}. Event was not created.`, 500));
  }

  // Create encrypted image token - only contains event ID
  const imageToken = encryptUrl(`event-${newEvent._id}`);
  const encryptedImageUrl = `/api/images/encrypted/${encodeURIComponent(imageToken)}`;
  
  // Update event with S3 image data
  const updatedEvent = await Event.findByIdAndUpdate(
    newEvent._id,
    {
      s3ImageKey: uploadResult.s3Key,
      imageToken: imageToken,
      coverImage: encryptedImageUrl // 🔗 Update with encrypted URL directly
    },
    { new: true } // Return updated document
  );

  console.log('✅ Image uploaded and encrypted:', {
    eventId: newEvent._id,
    s3Key: uploadResult.s3Key,
    imageToken: imageToken,
    coverImage: encryptedImageUrl,
    ratio: uploadResult.ratio,
    size: uploadResult.size
  });

  const transformedEvent = transformEventResponse(updatedEvent);

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

  // Parse form data - handle both FormData and JSON requests
  let updateData = { ...req.body };

  // Parse stringified JSON fields from FormData
  if (typeof updateData.seatings === 'string') {
    try {
      updateData.seatings = JSON.parse(updateData.seatings);
    } catch (e) {
      return next(new AppError(`Invalid seatings JSON format. Seatings must be a valid JSON array string. Received: "${updateData.seatings}"`, 400));
    }
  }

  // Validate required fields if provided in update
  if (updateData.name !== undefined && (!updateData.name || !updateData.name.trim())) {
    return next(new AppError('Event name cannot be empty', 400));
  }
  if (updateData.location !== undefined && (!updateData.location || !updateData.location.trim())) {
    return next(new AppError('Event location cannot be empty', 400));
  }
  if (updateData.language !== undefined && (!updateData.language || !updateData.language.trim())) {
    return next(new AppError('Event language cannot be empty', 400));
  }
  if (updateData.agelimit !== undefined && (!updateData.agelimit || !updateData.agelimit.trim())) {
    return next(new AppError('Event age limit cannot be empty', 400));
  }
  if (updateData.locationlink !== undefined && (!updateData.locationlink || !updateData.locationlink.trim())) {
    return next(new AppError('Event location link is required', 400));
  }
  if (updateData.description !== undefined && (!updateData.description || !updateData.description.trim())) {
    return next(new AppError('Event description is required', 400));
  }

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
      const encryptedImageUrl = `/api/images/encrypted/${encodeURIComponent(imageToken)}`;
      
      updateData.s3ImageKey = uploadResult.s3Key;
      updateData.imageToken = imageToken;
      updateData.coverImage = encryptedImageUrl; // 🔗 Update coverImage with encrypted URL

      console.log('✅ Image uploaded and encrypted:', {
        eventId: req.params.id,
        s3Key: uploadResult.s3Key,
        coverImage: encryptedImageUrl,
        ratio: uploadResult.ratio,
        size: uploadResult.size
      });
    } else {
      console.warn('⚠️ Image upload failed:', uploadResult.message);
      updateData.coverImage = ''; // Clear if update fails
    }
  }

  const updatedEvent = await Event.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true
  });

  console.log('📋 Updated event being returned:', {
    id: updatedEvent._id,
    coverImage: updatedEvent.coverImage,
    s3ImageKey: updatedEvent.s3ImageKey
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

