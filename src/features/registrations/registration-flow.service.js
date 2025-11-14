const UserEventRegistration = require('../registrations/userEventRegistration.model');
const Ticket = require('../tickets/ticket.model');
const Event = require('../events/event.model');
const User = require('../auth/auth.model');
const faceVerificationService = require('../../shared/services/faceVerification.service');
const waitlistService = require('../waitlist/waitlist.service');
const AppError = require('../../shared/utils/appError');

/**
 * Complete registration flow with face verification and ticket issuance
 * @param {string} registrationId - Registration ID
 * @param {string} faceImageKey - S3 key of the face image to verify
 * @param {number} similarityThreshold - Similarity threshold for face verification
 * @returns {Promise<Object>} Registration result with ticket or waitlist info
 */
exports.processRegistrationWithFaceVerification = async (
  registrationId,
  faceImageKey,
  similarityThreshold = 80
) => {
  try {
    // Get registration
    const registration = await UserEventRegistration.findById(registrationId)
      .populate('userId')
      .populate('eventId');

    if (!registration) {
      throw new AppError('Registration not found', 404);
    }

    // Check if already processed
    if (registration.ticketIssued) {
      throw new AppError('Ticket already issued for this registration', 400);
    }

    // Update status to processing
    registration.faceVerificationStatus = 'processing';
    registration.verificationAttempts += 1;
    registration.lastVerificationAttempt = new Date();
    await registration.save();

    // Verify face
    const verificationResult = await faceVerificationService.verifyUserFace(
      registration.userId._id,
      faceImageKey,
      similarityThreshold
    );

    if (!verificationResult.verified) {
      // Face verification failed
      registration.faceVerificationStatus = 'failed';
      registration.status = 'rejected';
      await registration.save();

      // Add to waitlist for retry
      await waitlistService.addToWaitlist(
        registration.eventId._id,
        registration.userId._id,
        registrationId,
        'face_verification_failed'
      );

      return {
        success: false,
        message: 'Face verification failed. Please try again or contact support.',
        registration: registration.toObject(),
        similarityScore: verificationResult.similarityScore,
        threshold: verificationResult.threshold,
        action: 'ADDED_TO_WAITLIST'
      };
    }

    // Face verification successful
    registration.faceVerificationStatus = 'success';

    // Check ticket availability
    const event = await Event.findById(registration.eventId._id);
    const ticketsAvailable = event.totalTickets - event.ticketsSold;

    if (ticketsAvailable <= 0) {
      // No tickets available, add to waitlist
      registration.ticketAvailabilityStatus = 'unavailable';
      registration.status = 'pending';
      await registration.save();

      const waitlistResult = await waitlistService.addToWaitlist(
        registration.eventId._id,
        registration.userId._id,
        registrationId,
        'tickets_sold_out'
      );

      return {
        success: true,
        message: 'Face verification successful, but tickets are sold out. Added to waitlist.',
        registration: registration.toObject(),
        waitlist: waitlistResult.waitlistEntry,
        action: 'ADDED_TO_WAITLIST'
      };
    }

    // Issue ticket
    const ticket = await Ticket.create({
      event: registration.eventId._id,
      user: registration.userId._id,
      ticketId: `TKT-${registration.userId._id}-${registration.eventId._id}-${Date.now()}`,
      seatNumber: `SEAT-${Math.floor(Math.random() * 10000)}`,
      price: event.ticketPrice,
      status: 'active',
      purchaseDate: new Date()
    });

    // Update registration
    registration.ticketAvailabilityStatus = 'available';
    registration.ticketIssued = true;
    registration.ticketIssuedDate = new Date();
    registration.status = 'verified';
    await registration.save();

    // Update event ticket count
    event.ticketsSold += 1;
    await event.save();

    return {
      success: true,
      message: 'Registration completed successfully. Ticket issued!',
      registration: registration.toObject(),
      ticket: ticket.toObject(),
      action: 'TICKET_ISSUED'
    };
  } catch (error) {
    // Update registration status to failed if error occurs
    try {
      await UserEventRegistration.findByIdAndUpdate(
        registrationId,
        { faceVerificationStatus: 'failed', status: 'rejected' }
      );
    } catch (updateError) {
      console.error('Error updating registration status:', updateError);
    }

    throw error;
  }
};

/**
 * Verify face image before processing registration
 * @param {string} userId - User ID
 * @param {string} faceImageKey - S3 key of the face image
 * @returns {Promise<Object>} Validation result
 */
exports.validateFaceImage = async (userId, faceImageKey) => {
  try {
    // Check if user has stored face
    const hasValidFace = await faceVerificationService.userHasValidFaceImage(userId);
    if (!hasValidFace) {
      throw new AppError('Please upload a profile photo first', 400);
    }

    // Validate single face in image
    const validation = await faceVerificationService.validateSingleFace(faceImageKey);

    return {
      success: true,
      message: 'Face image is valid',
      confidence: validation.confidence,
      quality: validation.quality,
      attributes: validation.attributes
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get registration status and next steps
 * @param {string} registrationId - Registration ID
 * @returns {Promise<Object>} Status and next steps
 */
exports.getRegistrationStatus = async (registrationId) => {
  try {
    const registration = await UserEventRegistration.findById(registrationId)
      .populate('userId', 'name email uploadedPhoto')
      .populate('eventId', 'name date totalTickets ticketsSold');

    if (!registration) {
      throw new AppError('Registration not found', 404);
    }

    // Check if already has ticket
    if (registration.ticketIssued) {
      const ticket = await Ticket.findOne({
        user: registration.userId._id,
        event: registration.eventId._id
      });

      return {
        status: 'TICKET_ISSUED',
        message: 'Your ticket has been issued',
        registration: registration.toObject(),
        ticket: ticket?.toObject()
      };
    }

    // Check waitlist status
    const waitlistPosition = await waitlistService.getUserWaitlistPosition(
      registration.userId._id,
      registration.eventId._id
    );

    if (waitlistPosition) {
      return {
        status: 'ON_WAITLIST',
        message: `You are on the waitlist at position ${waitlistPosition.position}`,
        waitlist: waitlistPosition
      };
    }

    // Determine next step
    let nextStep = 'VERIFY_FACE';
    if (!registration.userId.uploadedPhoto) {
      nextStep = 'UPLOAD_PHOTO';
    } else if (registration.faceVerificationStatus === 'pending') {
      nextStep = 'VERIFY_FACE';
    } else if (registration.faceVerificationStatus === 'failed') {
      nextStep = 'RETRY_VERIFICATION';
    }

    return {
      status: 'PENDING',
      message: 'Registration in progress',
      registration: registration.toObject(),
      nextStep,
      faceVerificationStatus: registration.faceVerificationStatus,
      verificationAttempts: registration.verificationAttempts
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Retry face verification after failed attempt
 * @param {string} registrationId - Registration ID
 * @param {string} faceImageKey - S3 key of new face image
 * @returns {Promise<Object>} Retry result
 */
exports.retryFaceVerification = async (registrationId, faceImageKey) => {
  try {
    const registration = await UserEventRegistration.findById(registrationId);

    if (!registration) {
      throw new AppError('Registration not found', 404);
    }

    // Max 3 attempts
    if (registration.verificationAttempts >= 3) {
      throw new AppError(
        'Maximum verification attempts exceeded. Please contact support.',
        429
      );
    }

    // Process with face verification
    return exports.processRegistrationWithFaceVerification(
      registrationId,
      faceImageKey,
      80
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Admin override - force issue ticket without verification
 * @param {string} registrationId - Registration ID
 * @param {string} overrideReason - Reason for override
 * @returns {Promise<Object>} Override result
 */
exports.adminOverrideIssueTicket = async (registrationId, overrideReason) => {
  try {
    const registration = await UserEventRegistration.findById(registrationId)
      .populate('userId')
      .populate('eventId');

    if (!registration) {
      throw new AppError('Registration not found', 404);
    }

    if (registration.ticketIssued) {
      throw new AppError('Ticket already issued', 400);
    }

    // Check ticket availability
    const event = await Event.findById(registration.eventId._id);
    const ticketsAvailable = event.totalTickets - event.ticketsSold;

    if (ticketsAvailable <= 0) {
      throw new AppError('No tickets available', 400);
    }

    // Create ticket with admin override
    const ticket = await Ticket.create({
      event: registration.eventId._id,
      user: registration.userId._id,
      ticketId: `TKT-ADM-${registration.userId._id}-${Date.now()}`,
      seatNumber: `SEAT-${Math.floor(Math.random() * 10000)}`,
      price: event.ticketPrice,
      status: 'active'
    });

    // Update registration
    registration.ticketIssued = true;
    registration.ticketIssuedDate = new Date();
    registration.status = 'verified';
    registration.adminBooked = true;
    registration.adminOverrideReason = overrideReason;
    registration.faceVerificationStatus = 'success'; // Mark as verified
    await registration.save();

    // Update event
    event.ticketsSold += 1;
    await event.save();

    // Remove from waitlist if on it
    await waitlistService.removeFromWaitlist(registration.userId._id, registration.eventId._id);

    return {
      success: true,
      message: 'Ticket issued by admin override',
      registration: registration.toObject(),
      ticket: ticket.toObject()
    };
  } catch (error) {
    throw error;
  }
};
