const Waitlist = require('./waitlist.model');
const UserEventRegistration = require('../registrations/userEventRegistration.model');
const Event = require('../events/event.model');
const AppError = require('../../shared/utils/appError');

/**
 * Add a user to the waitlist
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID
 * @param {string} registrationId - Registration ID
 * @param {string} reason - Reason for waitlist (tickets_sold_out or face_verification_failed)
 * @returns {Promise<Object>} Waitlist entry
 */
exports.addToWaitlist = async (eventId, userId, registrationId, reason) => {
  try {
    // Get current waitlist position
    const lastEntry = await Waitlist.findOne({ eventId })
      .sort({ position: -1 });
    
    const position = (lastEntry?.position || 0) + 1;

    const waitlistEntry = await Waitlist.create({
      eventId,
      userId,
      registrationId,
      position,
      reason,
      status: 'waiting'
    });

    return {
      success: true,
      message: `User added to waitlist at position ${position}`,
      waitlistEntry: await Waitlist.findById(waitlistEntry._id)
        .populate('userId', 'name email')
        .populate('eventId', 'name date')
    };
  } catch (error) {
    throw new AppError(`Failed to add user to waitlist: ${error.message}`, 500);
  }
};

/**
 * Remove user from waitlist
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Deletion result
 */
exports.removeFromWaitlist = async (userId, eventId) => {
  try {
    const removed = await Waitlist.findOneAndDelete({
      userId,
      eventId,
      status: 'waiting'
    });

    if (!removed) {
      throw new AppError('User not found on waitlist', 404);
    }

    // Reorder positions
    await reorderWaitlist(eventId);

    return {
      success: true,
      message: 'User removed from waitlist'
    };
  } catch (error) {
    throw new AppError(`Failed to remove from waitlist: ${error.message}`, 500);
  }
};

/**
 * Get waitlist for an event
 * @param {string} eventId - Event ID
 * @param {string} status - Optional filter by status
 * @returns {Promise<Array>} Waitlist entries
 */
exports.getEventWaitlist = async (eventId, status = null) => {
  try {
    const query = { eventId };
    if (status) {
      query.status = status;
    }

    const waitlist = await Waitlist.find(query)
      .sort({ position: 1 })
      .populate('userId', 'name email phone')
      .populate('eventId', 'name date totalTickets ticketsSold')
      .lean();

    return waitlist;
  } catch (error) {
    throw new AppError(`Failed to get waitlist: ${error.message}`, 500);
  }
};

/**
 * Process waitlist - issue tickets when slots become available
 * @param {string} eventId - Event ID
 * @param {number} slotsAvailable - Number of available slots
 * @returns {Promise<Object>} Processing result
 */
exports.processWaitlist = async (eventId, slotsAvailable = 1) => {
  try {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new AppError('Event not found', 404);
    }

    const ticketsAvailable = event.totalTickets - event.ticketsSold;
    const ticketsToIssue = Math.min(slotsAvailable, ticketsAvailable);

    if (ticketsToIssue <= 0) {
      return {
        success: true,
        message: 'No tickets available',
        issued: 0
      };
    }

    // Get users from top of waitlist
    const usersToOffer = await Waitlist.find({
      eventId,
      status: 'waiting'
    })
      .sort({ position: 1 })
      .limit(ticketsToIssue)
      .populate('registrationId');

    const issued = [];
    const offerExpiresIn = 24; // hours

    for (const entry of usersToOffer) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + offerExpiresIn);

      await Waitlist.findByIdAndUpdate(
        entry._id,
        {
          status: 'offered',
          ticketOfferedDate: new Date(),
          offerExpiresAt: expiresAt,
          notificationSent: true
        }
      );

      issued.push({
        userId: entry.userId,
        eventId: entry.eventId,
        position: entry.position,
        expiresAt
      });
    }

    return {
      success: true,
      message: `Offered ${issued.length} ticket(s) from waitlist`,
      issued
    };
  } catch (error) {
    throw new AppError(`Failed to process waitlist: ${error.message}`, 500);
  }
};

/**
 * Accept waitlist offer and issue ticket
 * @param {string} waitlistId - Waitlist entry ID
 * @returns {Promise<Object>} Result
 */
exports.acceptOffer = async (waitlistId) => {
  try {
    const entry = await Waitlist.findById(waitlistId);
    if (!entry) {
      throw new AppError('Waitlist entry not found', 404);
    }

    if (entry.status !== 'offered') {
      throw new AppError('This offer is not active', 400);
    }

    if (new Date() > entry.offerExpiresAt) {
      throw new AppError('This offer has expired', 400);
    }

    await Waitlist.findByIdAndUpdate(
      waitlistId,
      { status: 'accepted' }
    );

    // Update registration status
    if (entry.registrationId) {
      await UserEventRegistration.findByIdAndUpdate(
        entry.registrationId,
        { status: 'verified', ticketIssued: true, ticketIssuedDate: new Date() }
      );
    }

    return {
      success: true,
      message: 'Offer accepted. Ticket issued!'
    };
  } catch (error) {
    throw new AppError(`Failed to accept offer: ${error.message}`, 500);
  }
};

/**
 * Reject waitlist offer
 * @param {string} waitlistId - Waitlist entry ID
 * @returns {Promise<Object>} Result
 */
exports.rejectOffer = async (waitlistId) => {
  try {
    const entry = await Waitlist.findByIdAndUpdate(
      waitlistId,
      { status: 'rejected' },
      { new: true }
    );

    if (!entry) {
      throw new AppError('Waitlist entry not found', 404);
    }

    // Move other waitlist entries up by 1 position
    await reorderWaitlist(entry.eventId);

    return {
      success: true,
      message: 'Offer rejected'
    };
  } catch (error) {
    throw new AppError(`Failed to reject offer: ${error.message}`, 500);
  }
};

/**
 * Get user's waitlist position for an event
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Position info
 */
exports.getUserWaitlistPosition = async (userId, eventId) => {
  try {
    const entry = await Waitlist.findOne({
      userId,
      eventId,
      status: { $in: ['waiting', 'offered'] }
    }).populate('eventId', 'name date');

    if (!entry) {
      return null;
    }

    return {
      position: entry.position,
      status: entry.status,
      joinedAt: entry.joinedAt,
      reason: entry.reason,
      event: entry.eventId
    };
  } catch (error) {
    throw new AppError(`Failed to get waitlist position: ${error.message}`, 500);
  }
};

/**
 * Reorder waitlist positions after removal
 * @param {string} eventId - Event ID
 * @private
 */
async function reorderWaitlist(eventId) {
  try {
    const entries = await Waitlist.find({
      eventId,
      status: { $in: ['waiting', 'offered'] }
    }).sort({ position: 1 });

    for (let i = 0; i < entries.length; i++) {
      await Waitlist.findByIdAndUpdate(
        entries[i]._id,
        { position: i + 1 }
      );
    }
  } catch (error) {
    console.error('Error reordering waitlist:', error);
  }
}

/**
 * Clean up expired offers
 * @returns {Promise<Object>} Cleanup result
 */
exports.cleanupExpiredOffers = async () => {
  try {
    const expired = await Waitlist.updateMany(
      {
        status: 'offered',
        offerExpiresAt: { $lt: new Date() }
      },
      { status: 'waiting' }
    );

    return {
      success: true,
      message: `Cleaned up ${expired.modifiedCount} expired offers`
    };
  } catch (error) {
    throw new AppError(`Failed to cleanup expired offers: ${error.message}`, 500);
  }
};
