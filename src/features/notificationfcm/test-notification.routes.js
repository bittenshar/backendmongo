/**
 * Simple Test Endpoint for Notifications
 * Add this route to your Express app to test notifications
 * 
 * Usage:
 * POST http://localhost:5000/api/notification/test
 * Body: { userId: "693ea01e54d3374df909ec22" }
 * 
 * Or send all 19 types:
 * POST http://localhost:5000/api/notification/test-all
 * Body: { userId: "693ea01e54d3374df909ec22" }
 */

const express = require('express');
const router = express.Router();
const { sendNotificationService } = require('./notification.service');
const { NOTIFICATION_TYPES } = require('./constants/notificationTypes');
const { NOTIFICATION_DATA_TYPES } = require('./constants/notificationDataTypes');

/**
 * Test single notification
 * POST /api/notification/test
 * Body: { userId: "..." }
 */
router.post('/test', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    console.log(`\n🧪 Testing notification for user: ${userId}`);

    const result = await sendNotificationService({
      userId,
      type: NOTIFICATION_TYPES.TICKET_ISSUED,
      payload: {
        eventName: 'Test Event 2025',
        ticketNumber: 'TEST123',
      },
      data: {
        type: NOTIFICATION_DATA_TYPES.TICKET_ISSUED,
        ticketId: 'test-ticket-id',
        eventId: 'test-event-id',
      },
    });

    res.json({
      success: true,
      message: '🎉 Test notification sent',
      result,
    });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Test all 19 notifications
 * POST /api/notification/test-all
 * Body: { userId: "..." }
 */
router.post('/test-all', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    console.log(`\n🧪 Testing ALL 19 notifications for user: ${userId}`);

    const tests = [
      {
        name: '🎟 Ticket Confirmed',
        type: NOTIFICATION_TYPES.TICKET_CONFIRMED,
        payload: { eventName: 'Tech Conference 2025' },
        data: { type: NOTIFICATION_DATA_TYPES.TICKET_CONFIRMED, ticketId: 'TKT123' },
      },
      {
        name: '🎟 Ticket Issued',
        type: NOTIFICATION_TYPES.TICKET_ISSUED,
        payload: { eventName: 'Tech Conference 2025', ticketNumber: 'ABC12345' },
        data: { type: NOTIFICATION_DATA_TYPES.TICKET_ISSUED, ticketId: 'TKT123', eventId: 'EVT123' },
      },
      {
        name: '❌ Ticket Cancelled',
        type: NOTIFICATION_TYPES.TICKET_CANCELLED,
        payload: { eventName: 'Tech Conference 2025', reason: 'Event rescheduled' },
        data: { type: NOTIFICATION_DATA_TYPES.TICKET_CANCELLED, ticketId: 'TKT123' },
      },
      {
        name: '✅ Face Verification Approved',
        type: NOTIFICATION_TYPES.FACE_VERIFICATION_APPROVED,
        payload: {},
        data: { type: NOTIFICATION_DATA_TYPES.FACE_VERIFICATION_APPROVED },
      },
      {
        name: '❌ Face Verification Rejected',
        type: NOTIFICATION_TYPES.FACE_VERIFICATION_REJECTED,
        payload: { reason: 'Face does not match required quality' },
        data: { type: NOTIFICATION_DATA_TYPES.FACE_VERIFICATION_REJECTED },
      },
      {
        name: '⏳ Face Verification Submitted',
        type: NOTIFICATION_TYPES.FACE_VERIFICATION_SUBMITTED,
        payload: {},
        data: { type: NOTIFICATION_DATA_TYPES.FACE_VERIFICATION_SUBMITTED },
      },
      {
        name: '✅ Registration Confirmed',
        type: NOTIFICATION_TYPES.REGISTRATION_CONFIRMED,
        payload: { eventName: 'Tech Conference 2025' },
        data: { type: NOTIFICATION_DATA_TYPES.REGISTRATION_CONFIRMED, registrationId: 'REG123' },
      },
      {
        name: '❌ Registration Rejected',
        type: NOTIFICATION_TYPES.REGISTRATION_REJECTED,
        payload: { eventName: 'Tech Conference 2025', reason: 'Duplicate registration' },
        data: { type: NOTIFICATION_DATA_TYPES.REGISTRATION_REJECTED },
      },
      {
        name: '⏳ Registration Awaiting Payment',
        type: NOTIFICATION_TYPES.REGISTRATION_AWAITING_PAYMENT,
        payload: { eventName: 'Tech Conference 2025', amount: '₹5000' },
        data: { type: NOTIFICATION_DATA_TYPES.REGISTRATION_AWAITING_PAYMENT },
      },
      {
        name: '🚫 Event Show Full',
        type: NOTIFICATION_TYPES.SHOW_FULL,
        payload: { eventName: 'Tech Conference 2025' },
        data: { type: NOTIFICATION_DATA_TYPES.SHOW_FULL, eventId: 'EVT123' },
      },
      {
        name: '📝 Event Updated',
        type: NOTIFICATION_TYPES.EVENT_UPDATED,
        payload: { eventName: 'Tech Conference 2025', updateType: 'Date changed' },
        data: { type: NOTIFICATION_DATA_TYPES.EVENT_UPDATED, eventId: 'EVT123' },
      },
      {
        name: '❌ Event Cancelled',
        type: NOTIFICATION_TYPES.EVENT_CANCELLED,
        payload: { eventName: 'Tech Conference 2025', reason: 'Venue unavailable' },
        data: { type: NOTIFICATION_DATA_TYPES.EVENT_CANCELLED, eventId: 'EVT123' },
      },
      {
        name: '💸 Refund Initiated',
        type: NOTIFICATION_TYPES.REFUND_INITIATED,
        payload: { amount: '₹5000' },
        data: { type: NOTIFICATION_DATA_TYPES.REFUND_INITIATED },
      },
      {
        name: '✅ Refund Completed',
        type: NOTIFICATION_TYPES.REFUND_COMPLETED,
        payload: { amount: '₹5000' },
        data: { type: NOTIFICATION_DATA_TYPES.REFUND_COMPLETED },
      },
      {
        name: '🎉 Waitlist Offer',
        type: NOTIFICATION_TYPES.WAITLIST_OFFER,
        payload: { eventName: 'Tech Conference 2025', offerExpiry: '24 hours' },
        data: { type: NOTIFICATION_DATA_TYPES.WAITLIST_OFFER, eventId: 'EVT123' },
      },
      {
        name: '📊 Waitlist Position',
        type: NOTIFICATION_TYPES.WAITLIST_POSITION_UPDATED,
        payload: { eventName: 'Tech Conference 2025', position: '5' },
        data: { type: NOTIFICATION_DATA_TYPES.WAITLIST_POSITION_UPDATED, eventId: 'EVT123' },
      },
      {
        name: '👤 Account Created',
        type: NOTIFICATION_TYPES.USER_ACCOUNT_CREATED,
        payload: { adminName: 'Admin User' },
        data: { type: NOTIFICATION_DATA_TYPES.USER_ACCOUNT_CREATED },
      },
      {
        name: '📝 Account Updated',
        type: NOTIFICATION_TYPES.USER_ACCOUNT_UPDATED,
        payload: { updateType: 'Profile updated' },
        data: { type: NOTIFICATION_DATA_TYPES.USER_ACCOUNT_UPDATED },
      },
      {
        name: '🔒 Account Suspended',
        type: NOTIFICATION_TYPES.USER_ACCOUNT_SUSPENDED,
        payload: { reason: 'Violation of ToS' },
        data: { type: NOTIFICATION_DATA_TYPES.USER_ACCOUNT_SUSPENDED },
      },
    ];

    const results = [];
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      try {
        await sendNotificationService({
          userId,
          type: test.type,
          payload: test.payload,
          data: test.data,
        });
        results.push({
          index: i + 1,
          name: test.name,
          status: 'sent',
        });
        sent++;
        console.log(`✅ [${i + 1}/19] ${test.name}`);
      } catch (error) {
        results.push({
          index: i + 1,
          name: test.name,
          status: 'failed',
          error: error.message,
        });
        failed++;
        console.log(`❌ [${i + 1}/19] ${test.name} - ${error.message}`);
      }

      // Small delay between sends
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    res.json({
      success: true,
      message: `Sent ${sent} notifications`,
      summary: {
        total: tests.length,
        sent,
        failed,
      },
      results,
    });
  } catch (error) {
    console.error('Test all notifications error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get all tokens for a user
 * GET /api/notification/tokens/:userId
 */
router.get('/tokens/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const UserFcmToken = require('./userFcmToken.model');

    const tokens = await UserFcmToken.find({ userId });

    res.json({
      success: true,
      userId,
      tokenCount: tokens.length,
      tokens: tokens.map((t) => ({
        token: t.token.substring(0, 50) + '...',
        deviceType: t.deviceType,
        deviceId: t.deviceId,
        isActive: t.isActive,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Delete a specific token
 * DELETE /api/notification/tokens/:token
 */
router.delete('/tokens/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const UserFcmToken = require('./userFcmToken.model');

    await UserFcmToken.deleteOne({ token });

    res.json({
      success: true,
      message: 'Token deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
