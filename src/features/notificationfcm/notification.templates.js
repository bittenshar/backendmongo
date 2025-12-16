const {
  NOTIFICATION_TYPES,
} = require("./constants/notificationTypes");

const {
  NOTIFICATION_TITLES,
} = require("./constants/notificationTitles");

module.exports = {
  // Face Verification Templates
  [NOTIFICATION_TYPES.FACE_VERIFICATION_REJECTED]: {
    title: NOTIFICATION_TITLES.FACE_VERIFICATION_REJECTED,
    body: ({ reason }) =>
      reason
        ? `Your face verification was rejected: ${reason}. Please try again.`
        : "Your face verification was rejected. Please try again.",
    imageUrl: "https://cdn.yourapp.com/notifications/face_failed.png",
  },

  [NOTIFICATION_TYPES.FACE_VERIFICATION_APPROVED]: {
    title: NOTIFICATION_TITLES.FACE_VERIFICATION_APPROVED,
    body: () => "Your identity has been successfully verified.",
    imageUrl: "https://cdn.yourapp.com/notifications/face_success.png",
  },

  [NOTIFICATION_TYPES.FACE_VERIFICATION_SUBMITTED]: {
    title: NOTIFICATION_TITLES.FACE_VERIFICATION_SUBMITTED,
    body: () => "Your face verification has been submitted for review. We'll notify you once it's verified.",
    imageUrl: "https://cdn.yourapp.com/notifications/face_pending.png",
  },

  // Ticket Templates
  [NOTIFICATION_TYPES.TICKET_CONFIRMED]: {
    title: NOTIFICATION_TITLES.TICKET_CONFIRMED,
    body: ({ eventName }) =>
      eventName
        ? `Your ticket for ${eventName} is confirmed.`
        : "Your ticket has been confirmed.",
    imageUrl: "https://cdn.yourapp.com/notifications/ticket_confirmed.png",
  },

  [NOTIFICATION_TYPES.TICKET_ISSUED]: {
    title: NOTIFICATION_TITLES.TICKET_ISSUED,
    body: ({ eventName, ticketNumber }) =>
      eventName
        ? `Your ticket for ${eventName} has been issued. Ticket #${ticketNumber || ""}`
        : "Your ticket has been issued.",
    imageUrl: "https://cdn.yourapp.com/notifications/ticket_issued.png",
  },

  [NOTIFICATION_TYPES.TICKET_CANCELLED]: {
    title: NOTIFICATION_TITLES.TICKET_CANCELLED,
    body: ({ eventName, reason }) =>
      eventName
        ? `Your ticket for ${eventName} has been cancelled. ${reason ? "Reason: " + reason : ""}`
        : "Your ticket has been cancelled.",
    imageUrl: "https://cdn.yourapp.com/notifications/ticket_cancelled.png",
  },

  // Registration Templates
  [NOTIFICATION_TYPES.REGISTRATION_CONFIRMED]: {
    title: NOTIFICATION_TITLES.REGISTRATION_CONFIRMED,
    body: ({ eventName }) =>
      eventName
        ? `Your registration for ${eventName} has been confirmed.`
        : "Your registration has been confirmed.",
    imageUrl: "https://cdn.yourapp.com/notifications/registration_confirmed.png",
  },

  [NOTIFICATION_TYPES.REGISTRATION_REJECTED]: {
    title: NOTIFICATION_TITLES.REGISTRATION_REJECTED,
    body: ({ eventName, reason }) =>
      eventName
        ? `Your registration for ${eventName} was rejected. ${reason || ""}`
        : "Your registration was rejected.",
    imageUrl: "https://cdn.yourapp.com/notifications/registration_rejected.png",
  },

  [NOTIFICATION_TYPES.REGISTRATION_AWAITING_PAYMENT]: {
    title: NOTIFICATION_TITLES.REGISTRATION_AWAITING_PAYMENT,
    body: ({ eventName, amount }) =>
      eventName && amount
        ? `Payment pending for ${eventName}. Amount: ₹${amount}`
        : "Payment is awaiting.",
    imageUrl: "https://cdn.yourapp.com/notifications/payment_pending.png",
  },

  // Event Templates
  [NOTIFICATION_TYPES.SHOW_FULL]: {
    title: NOTIFICATION_TITLES.SHOW_FULL,
    body: ({ eventName }) =>
      eventName
        ? `Sorry, all tickets for ${eventName} are sold out.`
        : "No seats are available for this event.",
    imageUrl: "https://cdn.yourapp.com/notifications/show_full.png",
  },

  [NOTIFICATION_TYPES.EVENT_UPDATED]: {
    title: NOTIFICATION_TITLES.EVENT_UPDATED,
    body: ({ eventName, updateType }) =>
      eventName
        ? `${eventName} has been updated. ${updateType || ""}`
        : "An event you're interested in has been updated.",
    imageUrl: "https://cdn.yourapp.com/notifications/event_updated.png",
  },

  [NOTIFICATION_TYPES.EVENT_CANCELLED]: {
    title: NOTIFICATION_TITLES.EVENT_CANCELLED,
    body: ({ eventName, reason }) =>
      eventName
        ? `${eventName} has been cancelled. ${reason || ""}`
        : "An event has been cancelled.",
    imageUrl: "https://cdn.yourapp.com/notifications/event_cancelled.png",
  },

  // Refund Templates
  [NOTIFICATION_TYPES.REFUND_INITIATED]: {
    title: NOTIFICATION_TITLES.REFUND_INITIATED,
    body: ({ amount }) =>
      amount
        ? `Your refund of ₹${amount} has been initiated.`
        : "Your refund has been initiated.",
    imageUrl: "https://cdn.yourapp.com/notifications/refund.png",
  },

  [NOTIFICATION_TYPES.REFUND_COMPLETED]: {
    title: NOTIFICATION_TITLES.REFUND_COMPLETED,
    body: ({ amount }) =>
      amount
        ? `Your refund of ₹${amount} has been completed.`
        : "Your refund has been completed.",
    imageUrl: "https://cdn.yourapp.com/notifications/refund_success.png",
  },

  // Waitlist Templates
  [NOTIFICATION_TYPES.WAITLIST_OFFER]: {
    title: NOTIFICATION_TITLES.WAITLIST_OFFER,
    body: ({ eventName, offerExpiry }) =>
      eventName
        ? `A seat is available for ${eventName}. Offer expires in ${offerExpiry || "24 hours"}.`
        : "A seat is now available!",
    imageUrl: "https://cdn.yourapp.com/notifications/waitlist_offer.png",
  },

  [NOTIFICATION_TYPES.WAITLIST_POSITION_UPDATED]: {
    title: NOTIFICATION_TITLES.WAITLIST_POSITION_UPDATED,
    body: ({ eventName, position }) =>
      eventName
        ? `Your position in the waitlist for ${eventName} is now #${position}.`
        : `Your waitlist position has been updated to #${position}.`,
    imageUrl: "https://cdn.yourapp.com/notifications/waitlist_position.png",
  },

  // Admin Action Templates
  [NOTIFICATION_TYPES.USER_ACCOUNT_CREATED]: {
    title: NOTIFICATION_TITLES.USER_ACCOUNT_CREATED,
    body: ({ adminName }) =>
      adminName
        ? `Welcome! Your account has been created by ${adminName}.`
        : "Welcome! Your account has been created.",
    imageUrl: "https://cdn.yourapp.com/notifications/account_created.png",
  },

  [NOTIFICATION_TYPES.USER_ACCOUNT_UPDATED]: {
    title: NOTIFICATION_TITLES.USER_ACCOUNT_UPDATED,
    body: ({ updateType }) =>
      updateType
        ? `Your account has been updated. Change: ${updateType}`
        : "Your account has been updated.",
    imageUrl: "https://cdn.yourapp.com/notifications/account_updated.png",
  },

  [NOTIFICATION_TYPES.USER_ACCOUNT_SUSPENDED]: {
    title: NOTIFICATION_TITLES.USER_ACCOUNT_SUSPENDED,
    body: ({ reason }) =>
      reason
        ? `Your account has been suspended. Reason: ${reason}`
        : "Your account has been suspended.",
    imageUrl: "https://cdn.yourapp.com/notifications/account_suspended.png",
  },
};
