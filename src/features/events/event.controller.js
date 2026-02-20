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
    
    // Add image location details for reference
    const bucket = process.env.AWS_EVENT_IMAGES_BUCKET || 'event-images-collection';
    const region = process.env.AWS_REGION || 'ap-south-1';
    eventObj.imageLocation = {
      bucket,
      region,
      s3Key: eventObj.s3ImageKey,
      directS3Url: `https://${bucket}.s3.${region}.amazonaws.com/${eventObj.s3ImageKey}`,
      apiUrl: eventObj.coverImageUrl
    };
  } else if (eventObj.coverImage) {
    // Fallback: use public endpoint with coverImage data
    eventObj.coverImageUrl = `/api/images/public/${eventObj.coverImage}`;
    
    // Add image location details for reference
    const bucket = process.env.AWS_EVENT_IMAGES_BUCKET || 'event-images-collection';
    const region = process.env.AWS_REGION || 'ap-south-1';
    eventObj.imageLocation = {
      bucket,
      region,
      s3Key: eventObj.coverImage,
      directS3Url: `https://${bucket}.s3.${region}.amazonaws.com/${eventObj.coverImage}`,
      apiUrl: eventObj.coverImageUrl
    };
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

/**
 * Test endpoint to create events folder in S3
 * GET /api/events/test/create-folder
 * Creates a sample image to initialize the events folder structure
 */
exports.testCreateEventsFolder = catchAsync(async (req, res, next) => {
  try {
    console.log('🧪 Testing Events Folder Creation...');
    
    // Use an existing event ID or create a test ID
    const testEventId = '694291bb1e613c43e1b18a71'; // Use actual event ID
    const testFileName = 'test-image.jpg';
    
    // Create a simple test image buffer (1x1 pixel JPEG)
    const testImageBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
      0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
      0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
      0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
      0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
      0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
      0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
      0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
      0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
      0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
      0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
      0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
      0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
      0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
      0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
      0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
      0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
      0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
      0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD4, 0xFF, 0xD9
    ]);
    
    // Upload test image
    const uploadResult = await s3EventImagesService.uploadEventImage(
      testImageBuffer,
      testFileName,
      testEventId
    );
    
    if (!uploadResult.success) {
      return next(new AppError(`Failed to create folder: ${uploadResult.message}`, 500));
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Events folder created successfully in S3!',
      data: {
        bucket: process.env.AWS_EVENT_IMAGES_BUCKET || 'event-images-collection',
        region: process.env.AWS_REGION || 'ap-south-1',
        s3Path: uploadResult.key,
        url: uploadResult.url,
        imageLocation: {
          bucket: uploadResult.bucket || (process.env.AWS_EVENT_IMAGES_BUCKET || 'event-images-collection'),
          region: process.env.AWS_REGION || 'ap-south-1',
          s3Key: uploadResult.key,
          directS3Url: `https://${uploadResult.bucket || (process.env.AWS_EVENT_IMAGES_BUCKET || 'event-images-collection')}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${uploadResult.key}`
        },
        message: '✅ You can now see the events folder in S3 bucket!'
      }
    });
  } catch (error) {
    console.error('❌ Test Error:', error);
    return next(new AppError(`Test failed: ${error.message}`, 500));
  }
});

