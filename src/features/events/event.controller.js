const Event = require('./event.model');
const AppError = require('../../shared/utils/appError');
const catchAsync = require('../../shared/utils/catchAsync');
const s3EventImagesService = require('../../shared/services/s3EventImages.service');
const urlEncryption = require('../../shared/services/urlEncryption.service');

/**
 * Transform event data to hide S3 URLs
 * Replaces direct S3 URLs with encrypted proxy URL only (optimized)
 */
const transformEventResponse = (eventDoc) => {
  const eventObj = eventDoc.toObject ? eventDoc.toObject() : eventDoc;
  
  if (eventObj.coverImage) {
    // Generate encrypted token
    const token = urlEncryption.generateImageToken(eventObj.coverImage, 24);
    // Return only the proxy URL (not duplicate token) for better performance
    eventObj.coverImageUrl = `/api/images/proxy/${token}`;
    // Remove raw S3 URL from response
    delete eventObj.coverImage;
  }
  
  // Remove S3-specific internal fields from response
  delete eventObj.s3ImageKey;
  delete eventObj.s3BucketName;
  
  return eventObj;
};

exports.getAllEvents = catchAsync(async (req, res, next) => {
  const events = await Event.find().populate('organizer');

  // Transform events to hide S3 URLs
  const transformedEvents = events.map(transformEventResponse);

  res.status(200).json({
    status: 'success',
    results: transformedEvents.length,
    data: {
      events: transformedEvents
    }
  });
});

exports.getEvent = catchAsync(async (req, res, next) => {
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
      event.s3ImageKey
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
  const event = await Event.findByIdAndDelete(req.params.id);

  if (!event) {
    return next(new AppError('No event found with that ID', 404));
  }

  // Delete associated image from S3 if exists
  if (event.s3ImageKey) {
    console.log('🗑️ Deleting event image from S3...');
    await s3EventImagesService.deleteEventImage(event.s3ImageKey);
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getEventStats = catchAsync(async (req, res, next) => {
  console.log('🔍 GET /api/events/stats endpoint hit');
  console.log('Request headers:', req.headers);
  console.log('Request origin:', req.get('Origin'));
  
  const stats = await Event.aggregate([
    {
      $group: {
        _id: null,
        totalEvents: { $sum: 1 },
        totalRevenue: { $sum: "$revenue" },
        avgTicketPrice: { $avg: "$ticketPrice" },
        minTicketPrice: { $min: "$ticketPrice" },
        maxTicketPrice: { $max: "$ticketPrice" }
      }
    }
  ]);

  console.log('📊 Stats calculated successfully');
  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});