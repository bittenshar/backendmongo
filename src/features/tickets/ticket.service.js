const Ticket = require('./ticket.model');
const Registration = require('../registrations/userEventRegistration.model');
const Event = require('../events/event.model');
const AppError = require('../../shared/utils/appError');

/**
 * Issue pending tickets for a user based on their event registrations
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} Array of objects with ticket and event data
 */
exports.issuePendingTicketsForUser = async (userId) => {
  try {
    // Find all registrations for the user that don't have tickets yet
    const registrations = await Registration.find({ user: userId }).populate('event');

    const results = [];

    for (const registration of registrations) {
      // Check if a ticket already exists for this registration
      const existingTicket = await Ticket.findOne({
        user: userId,
        event: registration.event._id
      });

      if (!existingTicket) {
        // Create a new ticket for this registration
        const newTicket = await Ticket.create({
          event: registration.event._id,
          user: userId,
          ticketId: `TKT-${userId}-${registration.event._id}-${Date.now()}`,
          seatNumber: `SEAT-${Math.floor(Math.random() * 1000)}`,
          price: registration.event.ticketPrice || 0,
          status: 'active'
        });

        results.push({
          ticket: newTicket,
          event: registration.event
        });
      }
    }

    return results;
  } catch (error) {
    throw new AppError(`Error issuing tickets: ${error.message}`, 500);
  }
};

/**
 * Issue pending tickets for all users
 * @returns {Promise<Array>} Array of all issued tickets
 */
exports.issuePendingTicketsForAllUsers = async () => {
  try {
    const registrations = await Registration.find().populate('event');
    const allIssuedTickets = [];

    for (const registration of registrations) {
      const existingTicket = await Ticket.findOne({
        user: registration.user,
        event: registration.event._id
      });

      if (!existingTicket) {
        const newTicket = await Ticket.create({
          event: registration.event._id,
          user: registration.user,
          ticketId: `TKT-${registration.user}-${registration.event._id}-${Date.now()}`,
          seatNumber: `SEAT-${Math.floor(Math.random() * 1000)}`,
          price: registration.event.ticketPrice || 0,
          status: 'active'
        });

        allIssuedTickets.push(newTicket);
      }
    }

    return allIssuedTickets;
  } catch (error) {
    throw new AppError(`Error issuing tickets for all users: ${error.message}`, 500);
  }
};
