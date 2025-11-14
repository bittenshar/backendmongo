const UserEventRegistration = require('./userEventRegistration.model');
const AppError = require('../../shared/utils/appError');
const catchAsync = require('../../shared/utils/catchAsync');
const BusinessRulesService = require('../../shared/services/businessRules.service');
const mongoose = require('mongoose');
const dynamodbService = require('../../services/aws/dynamodb.service');

// Helper: validate Mongo ObjectId for any ':id' route params
const validateObjectIdParam = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};
exports.getAllRegistrations = catchAsync(async (req, res, next) => {
  const registrations = await UserEventRegistration.find()
    .populate('userId', 'fullName email phone')
    .populate('eventId', 'name date location')
    .lean();

  res.status(200).json({
    status: 'success',
    results: registrations.length,
    data: {
      registrations
    }
  });
});

exports.getRegistration = catchAsync(async (req, res, next) => {
  // Validate id format to avoid Mongoose CastError when a non-ObjectId path segment is passed
  if (!validateObjectIdParam(req.params.id)) {
    return next(new AppError('Invalid registration ID format.', 400));
  }
  const registration = await UserEventRegistration.findById(req.params.id)
    .populate('userId', 'fullName email phone')
    .populate('eventId', 'name date location')
    .lean();

  if (!registration) {
    return next(new AppError('No registration found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      registration
    }
  });
});

exports.createRegistration = catchAsync(async (req, res, next) => {
  const { userId, eventId, user, event, adminBooked = false, adminOverrideReason } = req.body;
  
  // Support both new field names and legacy field names
  const userIdToUse = userId || user;
  const eventIdToUse = eventId || event;
  
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(userIdToUse)) {
    return next(new AppError('Invalid user ID format.', 400));
  }
  
  if (!mongoose.Types.ObjectId.isValid(eventIdToUse)) {
    return next(new AppError('Invalid event ID format.', 400));
  }
  
  // Validate registration data integrity using business rules
  await BusinessRulesService.validateRegistrationIntegrity({
    userId: userIdToUse,
    eventId: eventIdToUse
  });

  // Validate event capacity
  await BusinessRulesService.validateEventCapacity(eventIdToUse);
  
  // Get user to check hasFaceRecord
  const User = require('../auth/auth.model');
  const user_doc = await User.findById(userIdToUse).lean();
  
  // Get event to check ticket availability
  const Event = require('../events/event.model');
  const event_doc = await Event.findById(eventIdToUse).lean();
  
  // Check if user has face record (from DynamoDB or stored faceId)
  let hasFaceRecord = false;
  if (user_doc && user_doc.faceId) {
    hasFaceRecord = true;
  } else if (user_doc && user_doc._id) {
    // Check DynamoDB for face record
    const faceExists = await dynamodbService.checkIfUserFaceExists(user_doc._id.toString());
    hasFaceRecord = faceExists;
  }
  
  // Calculate ticket availability
  let ticketAvailable = false;
  if (event_doc) {
    const ticketsAvailable = event_doc.totalTickets - (event_doc.ticketsSold || 0);
    ticketAvailable = ticketsAvailable > 0;
  }
  
  const registrationData = {
    userId: userIdToUse,
    eventId: eventIdToUse,
    registrationDate: new Date(),
    status: 'pending',
    waitingStatus: 'queued',
    faceVerificationStatus: hasFaceRecord, // Boolean: true if user has face record
    ticketAvailabilityStatus: ticketAvailable ? 'available' : 'pending', // 'available' or 'pending'
    adminBooked,
    adminOverrideReason: adminBooked ? adminOverrideReason : null
  };
  
  const registration = await UserEventRegistration.create(registrationData);
  
  const populatedRegistration = await UserEventRegistration.findById(registration._id)
    .populate('userId', 'fullName email phone')
    .populate('eventId', 'name date location')
    .lean();

  res.status(201).json({
    status: 'success',
    message: 'Registration created successfully',
    data: {
      registration: populatedRegistration
    }
  });
});

exports.updateRegistration = catchAsync(async (req, res, next) => {
  if (!validateObjectIdParam(req.params.id)) {
    return next(new AppError('Invalid registration ID format.', 400));
  }
  const registration = await UserEventRegistration.findByIdAndUpdate(
    req.params.id, 
    req.body, 
    {
      new: true,
      runValidators: true
    }
  ).populate('userId', 'fullName email phone')
   .populate('eventId', 'name date location')
   .lean();

  if (!registration) {
    return next(new AppError('No registration found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      registration
    }
  });
});

exports.deleteRegistration = catchAsync(async (req, res, next) => {
  if (!validateObjectIdParam(req.params.id)) {
    return next(new AppError('Invalid registration ID format.', 400));
  }
  const registration = await UserEventRegistration.findByIdAndDelete(req.params.id);

  if (!registration) {
    return next(new AppError('No registration found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.checkInUser = catchAsync(async (req, res, next) => {
  if (!validateObjectIdParam(req.params.id)) {
    return next(new AppError('Invalid registration ID format.', 400));
  }
  const registration = await UserEventRegistration.findByIdAndUpdate(
    req.params.id,
    { 
      status: 'verified',
      checkInTime: new Date(),
      waitingStatus: 'complete'
    },
    { new: true }
  ).populate('userId', 'fullName email phone')
   .populate('eventId', 'name date location')
   .lean();

  if (!registration) {
    return next(new AppError('No registration found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'User checked in successfully',
    data: {
      registration
    }
  });
});

exports.getEventRegistrations = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  
  const registrations = await UserEventRegistration.find({ eventId })
    .populate('userId', 'fullName email phone')
    .populate('eventId', 'name date location')
    .lean();

  res.status(200).json({
    status: 'success',
    results: registrations.length,
    data: {
      registrations
    }
  });
});

exports.getUserRegistrations = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  
  // First get the registrations with full event details for ticket calculation
  let registrations = await UserEventRegistration.find({ userId })
    .populate('userId', 'fullName email phone userId')  // IMPORTANT: Include userId field
    .populate('eventId', 'name date location totalTickets ticketsSold')  // Include ticket info
    .lean();

  // NEW: Check face verification status and ticket availability for each registration
  const registrationsWithFaceStatus = await Promise.all(
    registrations.map(async (registration) => {
      let hasFaceRecord = false;
      let faceId = null;
      let ticketAvailabilityStatus = 'available'; // Default until checked
      
      // Extract the ACTUAL userId (the string field from User model, NOT MongoDB _id)
      let dynamoDbUserId = null;
      if (registration.userId && typeof registration.userId === 'object') {
        // If userId is populated as an object, get the userId field (the string identifier)
        dynamoDbUserId = registration.userId.userId;
        if (!dynamoDbUserId) {
          // Fallback: if userId field is not present, use the _id
          console.warn(`⚠️ userId field missing, falling back to _id for user:`, registration.userId._id);
          dynamoDbUserId = registration.userId._id?.toString();
        }
      } else if (registration.userId && typeof registration.userId === 'string') {
        dynamoDbUserId = registration.userId;
      }
      
      // Check if user has face record in DynamoDB
      if (process.env.DYNAMODB_FACE_VALIDATION_TABLE && dynamoDbUserId) {
        try {
          console.log(`🔍 Checking face record for userId (from User model): ${dynamoDbUserId}`);
          hasFaceRecord = await dynamodbService.checkIfUserFaceExists(dynamoDbUserId);
          
          if (hasFaceRecord) {
            try {
              const faceRecord = await dynamodbService.getUserFaceRecord(dynamoDbUserId);
              faceId = faceRecord?.data?.RekognitionId || faceRecord?.data?.rekognitionId;
              console.log(`✅ Face found - userId: ${dynamoDbUserId}, faceId: ${faceId}`);
            } catch (err) {
              console.warn(`⚠️ Could not retrieve face ID for userId: ${dynamoDbUserId}`, err.message);
            }
          } else {
            console.log(`ℹ️ No face record - userId: ${dynamoDbUserId}`);
          }
        } catch (err) {
          console.warn(`⚠️ Warning: Could not check face record for userId ${dynamoDbUserId}:`, err.message);
        }
      } else {
        console.warn(`⚠️ Skipping face check - DYNAMODB_FACE_VALIDATION_TABLE: ${process.env.DYNAMODB_FACE_VALIDATION_TABLE}, userId: ${dynamoDbUserId}`);
      }
      
      // NEW: Automatically check ticket availability status
      // Always has eventId in registrations, so we calculate availability
      const availableTickets = registration.eventId.totalTickets - registration.eventId.ticketsSold;
      
      if (availableTickets > 0) {
        ticketAvailabilityStatus = 'available';
        console.log(`✅ Tickets available - Event: ${registration.eventId.name}, Available: ${availableTickets}`);
      } else {
        // All tickets sold, user is on waiting list (pending)
        ticketAvailabilityStatus = 'pending';
        console.log(`⏳ Waiting list - Event: ${registration.eventId.name}, All ${registration.eventId.totalTickets} tickets sold`);
      }
      
      return {
        ...registration,
        hasFaceRecord,              // NEW: Face verification status (true/false)
        faceId,                     // NEW: Face ID if exists
        ticketAvailabilityStatus    // UPDATED: Auto-calculated (available/sold_out/pending)
      };
    })
  );

  res.status(200).json({
    status: 'success',
    results: registrationsWithFaceStatus.length,
    data: {
      registrations: registrationsWithFaceStatus
    }
  });
});

// New methods for comprehensive schema support

exports.startFaceVerification = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (!validateObjectIdParam(id)) {
    return next(new AppError('Invalid registration ID format.', 400));
  }
  const { faceVerificationId } = req.body;
  
  const registration = await UserEventRegistration.findByIdAndUpdate(
    id,
    {
      faceVerificationStatus: 'processing',
      $inc: { verificationAttempts: 1 },
      lastVerificationAttempt: new Date(),
      waitingStatus: 'processing'
    },
    { new: true }
  ).populate('userId', 'fullName email phone')
   .populate('eventId', 'name date location')
   .lean();

  if (!registration) {
    return next(new AppError('No registration found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Face verification started',
    data: {
      registration
    }
  });
});

exports.completeFaceVerification = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (!validateObjectIdParam(id)) {
    return next(new AppError('Invalid registration ID format.', 400));
  }
  const { success, ticketAvailable = false } = req.body;
  
  const updateData = {
    faceVerificationStatus: success ? 'success' : 'failed',
    ticketAvailabilityStatus: success && ticketAvailable ? 'available' : 'unavailable',
    waitingStatus: success ? 'complete' : 'queued'
  };
  
  // If verification successful and ticket available, issue ticket
  if (success && ticketAvailable) {
    updateData.ticketIssued = true;
    updateData.ticketIssuedDate = new Date();
    updateData.status = 'verified';
  }
  
  const registration = await UserEventRegistration.findByIdAndUpdate(
    id,
    updateData,
    { new: true }
  ).populate('userId', 'fullName email phone')
   .populate('eventId', 'name date location')
   .lean();

  if (!registration) {
    return next(new AppError('No registration found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    message: `Face verification ${success ? 'completed successfully' : 'failed'}`,
    data: {
      registration
    }
  });
});

exports.issueTicket = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (!validateObjectIdParam(id)) {
    return next(new AppError('Invalid registration ID format.', 400));
  }
  
  const registration = await UserEventRegistration.findById(id);
  
  if (!registration) {
    return next(new AppError('No registration found with that ID', 404));
  }
  
  // Apply business rules validation for ticket issuance
  BusinessRulesService.validateTicketIssuanceRules(registration);
  
  const updatedRegistration = await UserEventRegistration.findByIdAndUpdate(
    id,
    {
      ticketIssued: true,
      ticketIssuedDate: new Date(),
      ticketAvailabilityStatus: 'available',
      status: 'verified'
    },
    { new: true }
  ).populate('userId', 'fullName email phone')
   .populate('eventId', 'name date location')
   .lean();

  res.status(200).json({
    status: 'success',
    message: 'Ticket issued successfully',
    data: {
      registration: updatedRegistration
    }
  });
});

exports.adminOverride = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (!validateObjectIdParam(id)) {
    return next(new AppError('Invalid registration ID format.', 400));
  }
  const { overrideReason, issueTicket = false } = req.body;
  
  if (!overrideReason) {
    return next(new AppError('Override reason is required', 400));
  }
  
  const updateData = {
    adminBooked: true,
    adminOverrideReason: overrideReason,
    status: 'verified',
    waitingStatus: 'complete'
  };
  
  if (issueTicket) {
    updateData.ticketIssued = true;
    updateData.ticketIssuedDate = new Date();
    updateData.ticketAvailabilityStatus = 'available';
  }
  
  const registration = await UserEventRegistration.findByIdAndUpdate(
    id,
    updateData,
    { new: true }
  ).populate('userId', 'fullName email phone')
   .populate('eventId', 'name date location')
   .lean();

  if (!registration) {
    return next(new AppError('No registration found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Admin override applied successfully',
    data: {
      registration
    }
  });
});

exports.getRegistrationsByStatus = catchAsync(async (req, res, next) => {
  const { status } = req.params;
  
  const validStatuses = ['pending', 'verified', 'rejected'];
  if (!validStatuses.includes(status)) {
    return next(new AppError('Invalid status. Must be: pending, verified, or rejected', 400));
  }
  
  const registrations = await UserEventRegistration.find({ status })
    .populate('userId', 'fullName email phone')
    .populate('eventId', 'name date location')
    .sort({ registrationDate: -1 })
    .lean();

  res.status(200).json({
    status: 'success',
    results: registrations.length,
    data: {
      registrations
    }
  });
});

exports.getRegistrationStats = catchAsync(async (req, res, next) => {
  const stats = await UserEventRegistration.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const faceVerificationStats = await UserEventRegistration.aggregate([
    {
      $group: {
        _id: '$faceVerificationStatus',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const ticketStats = await UserEventRegistration.aggregate([
    {
      $group: {
        _id: null,
        totalRegistrations: { $sum: 1 },
        ticketsIssued: {
          $sum: { $cond: [{ $eq: ['$ticketIssued', true] }, 1, 0] }
        },
        adminBooked: {
          $sum: { $cond: [{ $eq: ['$adminBooked', true] }, 1, 0] }
        }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      statusStats: stats,
      faceVerificationStats,
      ticketStats: ticketStats[0] || { totalRegistrations: 0, ticketsIssued: 0, adminBooked: 0 }
    }
  });
});

// Face verification and ticket issuance routes
const registrationFlowService = require('./registration-flow.service');

exports.verifyFaceAndIssueTicket = catchAsync(async (req, res, next) => {
  const { registrationId } = req.params;
  const { faceImageKey, similarityThreshold } = req.body;

  if (!faceImageKey) {
    return next(new AppError('Face image key is required', 400));
  }

  const result = await registrationFlowService.processRegistrationWithFaceVerification(
    registrationId,
    faceImageKey,
    similarityThreshold || 80
  );

  res.status(result.success ? 200 : 400).json({
    status: result.success ? 'success' : 'fail',
    data: result
  });
});

exports.validateFaceImage = catchAsync(async (req, res, next) => {
  const { registrationId } = req.params;
  const { faceImageKey } = req.body;

  if (!faceImageKey) {
    return next(new AppError('Face image key is required', 400));
  }

  const registration = await UserEventRegistration.findById(registrationId);
  if (!registration) {
    return next(new AppError('Registration not found', 404));
  }

  const userId = registration.userId.toString();

  // Validate face image
  const result = await registrationFlowService.validateFaceImage(userId, faceImageKey);

  // Store face record in DynamoDB (with duplicate prevention)
  if (process.env.DYNAMODB_FACE_VALIDATION_TABLE) {
    try {
      // Get user info for name field
      const User = require('../users/user.model');
      const user = await User.findById(userId).select('fullName');
      const userName = user?.fullName || 'Unknown';

      // Store with duplicate checking - will throw 409 if userId already exists
      await dynamodbService.storeFaceRecord(
        userId,
        `face_${Date.now()}`, // Unique face ID
        userName, // User name for metadata
        {
          status: 'success',
          confidence: result.confidence || 0,
          quality: result.quality || 'UNKNOWN',
          faceImageKey: faceImageKey,
          attributes: result.attributes || {},
          eventId: registration.eventId.toString(),
          ipAddress: req.ip || req.connection.remoteAddress
        }
      );
      console.log(`✅ Face record stored in DynamoDB for userId: ${userId}`);
    } catch (dynamoError) {
      // If it's a 409 Conflict (duplicate), propagate error
      if (dynamoError.statusCode === 409) {
        return next(dynamoError);
      }
      // For other errors, warn but don't fail the validation
      console.warn('⚠️  Warning: Failed to store face in DynamoDB:', dynamoError.message);
    }
  }

  res.status(200).json({
    status: 'success',
    message: 'Face validation successful',
    data: result,
    dynamodbStored: process.env.DYNAMODB_FACE_VALIDATION_TABLE ? true : false
  });
});

exports.getRegistrationStatus = catchAsync(async (req, res, next) => {
  const { registrationId } = req.params;

  const status = await registrationFlowService.getRegistrationStatus(registrationId);

  res.status(200).json({
    status: 'success',
    data: status
  });
});

exports.retryFaceVerification = catchAsync(async (req, res, next) => {
  const { registrationId } = req.params;
  const { faceImageKey, similarityThreshold } = req.body;

  if (!faceImageKey) {
    return next(new AppError('Face image key is required', 400));
  }

  const result = await registrationFlowService.retryFaceVerification(
    registrationId,
    faceImageKey
  );

  res.status(result.success ? 200 : 400).json({
    status: result.success ? 'success' : 'fail',
    data: result
  });
});

// Admin review endpoints
exports.getFailedVerifications = catchAsync(async (req, res, next) => {
  const { eventId } = req.query;
  
  const query = { faceVerificationStatus: 'failed', status: 'rejected' };
  if (eventId) {
    query.eventId = eventId;
  }

  const failedVerifications = await UserEventRegistration.find(query)
    .populate('userId', 'name email uploadedPhoto')
    .populate('eventId', 'name date')
    .sort({ lastVerificationAttempt: -1 })
    .lean();

  res.status(200).json({
    status: 'success',
    results: failedVerifications.length,
    data: {
      failedVerifications
    }
  });
});

exports.adminOverrideIssueTicket = catchAsync(async (req, res, next) => {
  const { registrationId } = req.params;
  const { overrideReason } = req.body;

  if (!overrideReason) {
    return next(new AppError('Override reason is required', 400));
  }

  const result = await registrationFlowService.adminOverrideIssueTicket(
    registrationId,
    overrideReason
  );

  res.status(200).json({
    status: 'success',
    data: result
  });
});

exports.reviewVerificationFailure = catchAsync(async (req, res, next) => {
  const { registrationId } = req.params;
  const { action, reason } = req.body; // action: 'approve', 'reject', or 'request_retry'

  const registration = await UserEventRegistration.findById(registrationId);
  if (!registration) {
    return next(new AppError('Registration not found', 404));
  }

  if (registration.faceVerificationStatus !== 'failed') {
    return next(new AppError('This registration has not failed verification', 400));
  }

  switch (action) {
    case 'approve':
      // Force issue ticket
      const result = await registrationFlowService.adminOverrideIssueTicket(
        registrationId,
        `Admin override: ${reason}`
      );
      res.status(200).json({
        status: 'success',
        message: 'Ticket approved and issued by admin',
        data: result
      });
      break;

    case 'reject':
      // Keep rejected status
      registration.adminOverrideReason = reason;
      await registration.save();
      res.status(200).json({
        status: 'success',
        message: 'Registration rejected',
        data: { registration: registration.toObject() }
      });
      break;

    case 'request_retry':
      // Reset verification attempts and status
      registration.faceVerificationStatus = 'pending';
      registration.verificationAttempts = 0;
      registration.adminOverrideReason = `Admin requested retry: ${reason}`;
      await registration.save();
      res.status(200).json({
        status: 'success',
        message: 'User requested to retry verification',
        data: { registration: registration.toObject() }
      });
      break;

    default:
      return next(new AppError('Invalid action. Use: approve, reject, or request_retry', 400));
  }
});

// ============================================================================
// DynamoDB Face Validation Endpoints (NEW - ONE RECORD PER USER)
// ============================================================================

/**
 * Validate User Before Creating Face Record
 * Call this endpoint FIRST to check if user can create a face record
 * Returns 409 Conflict if user already has face record (no duplicates allowed)
 */
exports.validateUserBeforeFaceCreation = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  if (!process.env.DYNAMODB_FACE_VALIDATION_TABLE) {
    return next(new AppError('DynamoDB face validation table not configured', 503));
  }

  try {
    // This will throw 409 if userId already exists
    await dynamodbService.validateBeforeVerification(userId);
    
    res.status(200).json({
      status: 'success',
      message: 'User is eligible for face verification - no existing record found',
      data: {
        userId,
        canCreateFace: true
      }
    });
  } catch (error) {
    if (error.statusCode === 409) {
      return next(error); // Duplicate user - propagate 409 error
    }
    return next(new AppError(`Validation check failed: ${error.message}`, 500));
  }
});

/**
 * Get User's Face Record
 * Retrieve the ONE face record for a user (if exists)
 */
exports.getUserFaceRecord = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  if (!process.env.DYNAMODB_FACE_VALIDATION_TABLE) {
    return next(new AppError('DynamoDB face validation table not configured', 503));
  }

  try {
    const result = await dynamodbService.getUserFaceRecord(userId);
    
    res.status(200).json({
      status: 'success',
      message: 'Face record retrieved successfully',
      data: result.data
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return next(new AppError(`No face record found for userId: ${userId}`, 404));
    }
    return next(new AppError(`Failed to retrieve face record: ${error.message}`, 500));
  }
});

/**
 * Update User's Face Record
 * Update fields in existing face record
 */
exports.updateUserFaceRecord = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const updateData = req.body;

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  if (!process.env.DYNAMODB_FACE_VALIDATION_TABLE) {
    return next(new AppError('DynamoDB face validation table not configured', 503));
  }

  try {
    const result = await dynamodbService.updateFaceRecord(userId, updateData);
    
    res.status(200).json({
      status: 'success',
      message: 'Face record updated successfully',
      data: result.data
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return next(new AppError(`No face record found for userId: ${userId}. Cannot update.`, 404));
    }
    return next(new AppError(`Failed to update face record: ${error.message}`, 500));
  }
});

/**
 * Delete User's Face Record (Admin/Reset)
 * Remove face record for a user - allows user to re-register
 */
exports.deleteUserFaceRecord = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  if (!process.env.DYNAMODB_FACE_VALIDATION_TABLE) {
    return next(new AppError('DynamoDB face validation table not configured', 503));
  }

  try {
    const result = await dynamodbService.deleteFaceRecord(userId);
    
    res.status(200).json({
      status: 'success',
      message: 'Face record deleted successfully - user can now re-register',
      data: result
    });
  } catch (error) {
    return next(new AppError(`Failed to delete face record: ${error.message}`, 500));
  }
});

/**
 * Check if User Exists in DynamoDB
 * Simple existence check (doesn't throw error like validation endpoint)
 */
exports.checkUserFaceExists = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  if (!process.env.DYNAMODB_FACE_VALIDATION_TABLE) {
    return next(new AppError('DynamoDB face validation table not configured', 503));
  }

  try {
    // Use checkIfUserFaceExists (doesn't throw errors, just returns true/false)
    const exists = await dynamodbService.checkIfUserFaceExists(userId);
    
    // If face exists, get the face record to extract the faceId (RekognitionId)
    let faceId = null;
    if (exists) {
      try {
        const faceRecord = await dynamodbService.getUserFaceRecord(userId);
        faceId = faceRecord?.data?.RekognitionId || faceRecord?.data?.rekognitionId;
      } catch (err) {
        console.warn(`⚠️ Could not retrieve face ID for userId: ${userId}`, err.message);
      }
    }
    
    res.status(200).json({
      status: 'success',
      message: exists ? 'User has face record' : 'User has no face record',
      data: {
        userId,
        hasFaceRecord: exists,
        faceId: faceId // Returns the RekognitionId if exists, null otherwise
      }
    });
  } catch (error) {
    return next(new AppError(`Check failed: ${error.message}`, 500));
  }
});

/**
 * Get All Face Records (Admin Use)
 * Retrieve all users with face records - WARNING: Expensive for large tables
 */
exports.getAllFaceRecords = catchAsync(async (req, res, next) => {
  const { limit = 100 } = req.query;

  if (!process.env.DYNAMODB_FACE_VALIDATION_TABLE) {
    return next(new AppError('DynamoDB face validation table not configured', 503));
  }

  try {
    const result = await dynamodbService.getAllFaceRecords(parseInt(limit));
    
    res.status(200).json({
      status: 'success',
      message: `Retrieved ${result.count} face records`,
      data: result
    });
  } catch (error) {
    return next(new AppError(`Failed to retrieve face records: ${error.message}`, 500));
  }
});

/**
 * Get User Face ID (RekognitionId)
 * Simple endpoint that returns ONLY the faceId for a user
 * Useful for Postman tests to extract and reuse faceId
 */
exports.getUserFaceId = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  if (!process.env.DYNAMODB_FACE_VALIDATION_TABLE) {
    return next(new AppError('DynamoDB face validation table not configured', 503));
  }

  try {
    const exists = await dynamodbService.checkIfUserFaceExists(userId);
    
    if (!exists) {
      return res.status(200).json({
        status: 'success',
        message: 'User has no face record',
        data: {
          userId,
          faceId: null,
          hasFaceRecord: false
        }
      });
    }

    // Get the face record to extract faceId
    const faceRecord = await dynamodbService.getUserFaceRecord(userId);
    const faceId = faceRecord?.data?.RekognitionId || faceRecord?.data?.rekognitionId;

    res.status(200).json({
      status: 'success',
      message: 'Face ID retrieved successfully',
      data: {
        userId,
        faceId: faceId,
        hasFaceRecord: true,
        createdAt: faceRecord?.data?.CreatedAt || faceRecord?.data?.createdAt
      }
    });
  } catch (error) {
    return next(new AppError(`Failed to retrieve face ID: ${error.message}`, 500));
  }
});

/**
 * [DEPRECATED] Get User Face Validation History
 * This endpoint is deprecated - use getUserFaceRecord instead
 * Old endpoint that relied on multi-record design
 */
exports.getUserFaceValidationHistory = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  if (!process.env.DYNAMODB_FACE_VALIDATION_TABLE) {
    return next(new AppError('DynamoDB face validation table not configured', 503));
  }

  try {
    // With new one-record design, this is equivalent to getUserFaceRecord
    const result = await dynamodbService.getUserFaceRecord(userId);
    
    res.status(200).json({
      status: 'success',
      message: 'Retrieved face record (one-per-user design)',
      data: {
        count: 1,
        data: [result.data]
      }
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(200).json({
        status: 'success',
        message: 'No face record found for user',
        data: { count: 0, data: [] }
      });
    }
    return next(new AppError(`Failed to retrieve face record: ${error.message}`, 500));
  }
});

/**
 * [DEPRECATED] Get Specific Face Validation Record
 * This endpoint is deprecated - use getUserFaceRecord instead
 * Old endpoint that required registrationId sort key
 */
exports.getFaceValidationRecord = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  if (!process.env.DYNAMODB_FACE_VALIDATION_TABLE) {
    return next(new AppError('DynamoDB face validation table not configured', 503));
  }

  try {
    // With new design, just get the one record for user
    const result = await dynamodbService.getUserFaceRecord(userId);
    
    res.status(200).json({
      status: 'success',
      message: 'Face record retrieved',
      data: result.data
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return next(new AppError(`No face record found for userId: ${userId}`, 404));
    }
    return next(new AppError(`Failed to retrieve validation record: ${error.message}`, 500));
  }
});

/**
 * [DEPRECATED] Get User Face Validation Stats
 * This endpoint is deprecated - no longer applies with one-record design
 */
exports.getUserFaceValidationStats = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  if (!process.env.DYNAMODB_FACE_VALIDATION_TABLE) {
    return next(new AppError('DynamoDB face validation table not configured', 503));
  }

  try {
    // With one-record design, stats are simple
    const exists = await dynamodbService.userFaceExists(userId);
    
    res.status(200).json({
      status: 'success',
      message: 'Face record statistics (simplified one-per-user design)',
      data: {
        userId,
        totalRecords: exists ? 1 : 0,
        hasFaceRecord: exists,
        note: 'One record per user maximum - duplicates not allowed'
      }
    });
  } catch (error) {
    return next(new AppError(`Failed to retrieve statistics: ${error.message}`, 500));
  }
});

/**
 * [DEPRECATED] Get Event Face Validations
 * This endpoint is deprecated - query MongoDB registrations instead
 */
exports.getEventFaceValidations = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;

  if (!eventId) {
    return next(new AppError('Event ID is required', 400));
  }

  if (!process.env.DYNAMODB_FACE_VALIDATION_TABLE) {
    return next(new AppError('DynamoDB face validation table not configured', 503));
  }

  try {
    // With new design, query MongoDB registrations for event face validations
    const registrations = await UserEventRegistration.find({
      eventId: eventId,
      faceVerificationStatus: 'success'
    }).populate('userId', 'fullName email');
    
    res.status(200).json({
      status: 'success',
      message: `Retrieved ${registrations.length} face verifications for event`,
      data: {
        count: registrations.length,
        data: registrations
      }
    });
  } catch (error) {
    return next(new AppError(`Failed to retrieve event validations: ${error.message}`, 500));
  }
});

/**
 * [DEPRECATED] Check Recent Validation
 * This endpoint is deprecated - use checkUserFaceExists instead
 */
exports.checkRecentValidation = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  if (!process.env.DYNAMODB_FACE_VALIDATION_TABLE) {
    return next(new AppError('DynamoDB face validation table not configured', 503));
  }

  try {
    const exists = await dynamodbService.userFaceExists(userId);
    const record = exists ? await dynamodbService.getUserFaceRecord(userId) : null;
    
    res.status(200).json({
      status: 'success',
      message: exists ? 'User has valid face record' : 'User has no face record',
      data: {
        userId,
        hasValidRecord: exists,
        record: record ? record.data : null
      }
    });
  } catch (error) {
    return next(new AppError(`Failed to check validation: ${error.message}`, 500));
  }
});


