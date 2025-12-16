const UserEventRegistration = require('../registrations/userEventRegistration.model');
const Ticket = require('../tickets/ticket.model');
const Event = require('../events/event.model');
const User = require('../auth/auth.model');
const faceVerificationService = require('../../shared/services/faceVerification.service');
const waitlistService = require('../waitlist/waitlist.service');
const AppError = require('../../shared/utils/appError');

/**
 * ==========================================
 * REGISTRATION FLOW ORCHESTRATION
 * ==========================================
 * Main flow: Registration → Face Verification → Ticket/Waitlist
 */

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

/**
 * ==========================================
 * COMPLETE REGISTRATION-TICKET-WAITLIST FLOW
 * ==========================================
 */

/**
 * Main orchestration: Complete registration journey
 * Flow: User Registration → Photo Upload → Face Verification → Ticket/Waitlist
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @param {string} faceImageKey - S3 key of face image (optional for first step)
 * @returns {Promise<Object>} Complete flow result
 */
exports.initializeRegistrationFlow = async (userId, eventId, faceImageKey = null) => {
  try {
    // Step 1: Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Step 2: Check if event exists and has capacity
    const event = await Event.findById(eventId);
    if (!event) {
      throw new AppError('Event not found', 404);
    }

    // Step 3: Check if user already registered
    const existingRegistration = await UserEventRegistration.findOne({
      userId,
      eventId
    });

    if (existingRegistration && existingRegistration.status === 'verified') {
      throw new AppError('User already registered for this event', 400);
    }

    // Step 4: Create or update registration
    let registration;
    if (existingRegistration) {
      registration = existingRegistration;
    } else {
      registration = await UserEventRegistration.create({
        userId,
        eventId,
        registrationDate: new Date(),
        status: 'pending',
        faceVerificationStatus: 'pending'
      });
    }

    // Step 5: Check if photo is uploaded
    if (!user.uploadedPhoto) {
      return {
        success: true,
        currentStep: 'STEP_1_UPLOAD_PHOTO',
        message: 'Please upload your profile photo first',
        registration: registration.toObject(),
        nextAction: 'Upload profile photo to S3'
      };
    }

    // Step 6: If no face image provided, return next step
    if (!faceImageKey) {
      return {
        success: true,
        currentStep: 'STEP_2_VERIFY_FACE',
        message: 'Proceed with face verification',
        registration: registration.toObject(),
        nextAction: 'Capture face image for verification'
      };
    }

    // Step 7: Process face verification and continue flow
    return exports.processRegistrationWithFaceVerification(
      registration._id,
      faceImageKey,
      80
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Get complete registration-ticket-waitlist status
 * Shows current position in flow and next steps
 * @param {string} registrationId - Registration ID
 * @returns {Promise<Object>} Complete status info
 */
exports.getCompleteRegistrationFlowStatus = async (registrationId) => {
  try {
    const registration = await UserEventRegistration.findById(registrationId)
      .populate('userId', 'name email uploadedPhoto')
      .populate('eventId', 'name date totalTickets ticketsSold ticketPrice status');

    if (!registration) {
      throw new AppError('Registration not found', 404);
    }

    const result = {
      registrationId: registration._id,
      userId: registration.userId._id,
      eventId: registration.eventId._id,
      eventName: registration.eventId.name,
      registrationDate: registration.registrationDate,
      currentStatus: registration.status,
      flowSteps: []
    };

    // Determine flow stage and add details
    if (!registration.userId.uploadedPhoto) {
      result.currentStep = 'PENDING_PHOTO_UPLOAD';
      result.flowSteps = [
        { step: 1, name: 'Upload Photo', status: 'pending', completed: false },
        { step: 2, name: 'Face Verification', status: 'blocked', completed: false },
        { step: 3, name: 'Issue Ticket/Waitlist', status: 'blocked', completed: false }
      ];
      result.nextAction = 'Upload profile photo';
      result.progress = 0;
    } else if (registration.faceVerificationStatus === 'pending') {
      result.currentStep = 'PENDING_FACE_VERIFICATION';
      result.flowSteps = [
        { step: 1, name: 'Upload Photo', status: 'completed', completed: true },
        { step: 2, name: 'Face Verification', status: 'in-progress', completed: false },
        { step: 3, name: 'Issue Ticket/Waitlist', status: 'blocked', completed: false }
      ];
      result.nextAction = 'Verify your face';
      result.verificationAttempts = registration.verificationAttempts;
      result.progress = 33;
    } else if (registration.faceVerificationStatus === 'failed') {
      result.currentStep = 'FACE_VERIFICATION_FAILED';
      result.flowSteps = [
        { step: 1, name: 'Upload Photo', status: 'completed', completed: true },
        { step: 2, name: 'Face Verification', status: 'failed', completed: false },
        { step: 3, name: 'Issue Ticket/Waitlist', status: 'blocked', completed: false }
      ];
      result.nextAction = 'Retry face verification or contact support';
      result.verificationAttempts = registration.verificationAttempts;
      result.canRetry = registration.verificationAttempts < 3;
      result.progress = 33;
    } else if (registration.ticketIssued) {
      result.currentStep = 'TICKET_ISSUED';
      result.flowSteps = [
        { step: 1, name: 'Upload Photo', status: 'completed', completed: true },
        { step: 2, name: 'Face Verification', status: 'completed', completed: true },
        { step: 3, name: 'Issue Ticket', status: 'completed', completed: true }
      ];

      // Get ticket details
      const ticket = await Ticket.findOne({
        user: registration.userId._id,
        event: registration.eventId._id
      });

      result.ticketDetails = {
        ticketId: ticket?.ticketId,
        seatNumber: ticket?.seatNumber,
        price: ticket?.price,
        purchaseDate: ticket?.purchaseDate,
        status: ticket?.status
      };
      result.progress = 100;
    } else {
      // Check if on waitlist
      const waitlistPosition = await waitlistService.getUserWaitlistPosition(
        registration.userId._id,
        registration.eventId._id
      );

      if (waitlistPosition) {
        result.currentStep = 'ON_WAITLIST';
        result.flowSteps = [
          { step: 1, name: 'Upload Photo', status: 'completed', completed: true },
          { step: 2, name: 'Face Verification', status: 'completed', completed: true },
          { step: 3, name: 'Waitlisted', status: 'in-progress', completed: false }
        ];
        result.waitlistDetails = {
          position: waitlistPosition.position,
          reason: waitlistPosition.reason,
          dateAdded: waitlistPosition.dateAdded,
          totalWaitlistCount: await Waitlist.countDocuments({ eventId: registration.eventId._id, status: 'waiting' })
        };
        result.progress = 75;
      }
    }

    // Add event capacity info
    result.eventCapacity = {
      totalTickets: registration.eventId.totalTickets,
      ticketsSold: registration.eventId.ticketsSold,
      ticketsAvailable: registration.eventId.totalTickets - registration.eventId.ticketsSold,
      ticketPrice: registration.eventId.ticketPrice
    };

    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Process waitlist user to ticket when capacity becomes available
 * Called when a ticket is cancelled or refunded
 * @param {string} eventId - Event ID
 * @returns {Promise<Array>} Array of users promoted to ticket
 */
exports.promoteFromWaitlistToTicket = async (eventId) => {
  try {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new AppError('Event not found', 404);
    }

    const ticketsAvailable = event.totalTickets - event.ticketsSold;
    if (ticketsAvailable <= 0) {
      return {
        success: false,
        message: 'No tickets available for promotion',
        promotedUsers: []
      };
    }

    // Get waitlist entries with highest priority (earliest, verified face)
    const waitlistEntries = await Waitlist.find({
      eventId,
      status: 'waiting'
    })
      .sort({ position: 1 })
      .limit(ticketsAvailable)
      .populate('userId')
      .populate('registrationId');

    const promotedUsers = [];

    for (const entry of waitlistEntries) {
      try {
        // Create ticket
        const ticket = await Ticket.create({
          event: eventId,
          user: entry.userId._id,
          ticketId: `TKT-PROMO-${entry.userId._id}-${eventId}-${Date.now()}`,
          seatNumber: `SEAT-${Math.floor(Math.random() * 10000)}`,
          price: event.ticketPrice,
          status: 'active',
          promotedFromWaitlist: true,
          promotionDate: new Date()
        });

        // Update registration
        const registration = await UserEventRegistration.findById(entry.registrationId);
        if (registration) {
          registration.ticketIssued = true;
          registration.ticketIssuedDate = new Date();
          registration.status = 'verified';
          registration.ticketAvailabilityStatus = 'available';
          await registration.save();
        }

        // Remove from waitlist
        await Waitlist.findByIdAndUpdate(entry._id, { status: 'promoted' });

        promotedUsers.push({
          userId: entry.userId._id,
          userName: entry.userId.name,
          ticketId: ticket.ticketId,
          seatNumber: ticket.seatNumber
        });
      } catch (promotionError) {
        console.error(`Error promoting user ${entry.userId._id}:`, promotionError);
        continue;
      }
    }

    // Update event tickets sold
    event.ticketsSold += promotedUsers.length;
    await event.save();

    return {
      success: true,
      message: `${promotedUsers.length} users promoted from waitlist`,
      promotedUsers
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get registration flow analytics
 * Summary of all registrations and their flow status
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Flow analytics
 */
exports.getRegistrationFlowAnalytics = async (eventId) => {
  try {
    const event = await Event.findById(eventId).populate('registrations');
    if (!event) {
      throw new AppError('Event not found', 404);
    }

    const registrations = await UserEventRegistration.find({ eventId });

    const analytics = {
      eventId,
      eventName: event.name,
      totalRegistrations: registrations.length,
      flowBreakdown: {
        photoUploadPending: 0,
        faceVerificationPending: 0,
        faceVerificationFailed: 0,
        ticketsIssued: 0,
        onWaitlist: 0
      },
      flowStagePercentage: {},
      ticketCapacity: {
        total: event.totalTickets,
        sold: event.ticketsSold,
        available: event.totalTickets - event.ticketsSold
      }
    };

    // Analyze each registration
    for (const reg of registrations) {
      const user = await User.findById(reg.userId);

      if (!user || !user.uploadedPhoto) {
        analytics.flowBreakdown.photoUploadPending++;
      } else if (reg.faceVerificationStatus === 'pending') {
        analytics.flowBreakdown.faceVerificationPending++;
      } else if (reg.faceVerificationStatus === 'failed') {
        analytics.flowBreakdown.faceVerificationFailed++;
      } else if (reg.ticketIssued) {
        analytics.flowBreakdown.ticketsIssued++;
      } else {
        analytics.flowBreakdown.onWaitlist++;
      }
    }

    // Calculate percentages
    const total = registrations.length || 1;
    analytics.flowStagePercentage = {
      photoUploadPending: ((analytics.flowBreakdown.photoUploadPending / total) * 100).toFixed(2),
      faceVerificationPending: ((analytics.flowBreakdown.faceVerificationPending / total) * 100).toFixed(2),
      faceVerificationFailed: ((analytics.flowBreakdown.faceVerificationFailed / total) * 100).toFixed(2),
      ticketsIssued: ((analytics.flowBreakdown.ticketsIssued / total) * 100).toFixed(2),
      onWaitlist: ((analytics.flowBreakdown.onWaitlist / total) * 100).toFixed(2)
    };

    return analytics;
  } catch (error) {
    throw error;
  }
};

/**
 * Cancel registration and process waitlist promotion
 * @param {string} registrationId - Registration ID
 * @param {string} cancellationReason - Reason for cancellation
 * @returns {Promise<Object>} Cancellation result
 */
exports.cancelRegistration = async (registrationId, cancellationReason) => {
  try {
    const registration = await UserEventRegistration.findById(registrationId)
      .populate('eventId');

    if (!registration) {
      throw new AppError('Registration not found', 404);
    }

    // Delete associated ticket
    if (registration.ticketIssued) {
      await Ticket.findOneAndDelete({
        user: registration.userId,
        event: registration.eventId._id
      });

      // Update event
      const event = await Event.findById(registration.eventId._id);
      if (event && event.ticketsSold > 0) {
        event.ticketsSold -= 1;
        await event.save();
      }
    }

    // Remove from waitlist if on it
    await waitlistService.removeFromWaitlist(registration.userId, registration.eventId._id);

    // Update registration status
    registration.status = 'cancelled';
    registration.cancellationDate = new Date();
    registration.cancellationReason = cancellationReason;
    await registration.save();

    // Try to promote from waitlist
    const promotionResult = await exports.promoteFromWaitlistToTicket(registration.eventId._id);

    return {
      success: true,
      message: 'Registration cancelled successfully',
      registration: registration.toObject(),
      promotionResult
    };
  } catch (error) {
    throw error;
  }
};

// Import Waitlist model if not already imported
const Waitlist = require('../waitlist/waitlist.model');
