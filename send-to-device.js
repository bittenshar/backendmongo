/**
 * Send Notifications Directly to FCM Token
 * This script sends all 19 notifications directly using a real FCM token
 */

require('dotenv').config({ path: './src/config/config.env' });

const { admin, initialized: firebaseInitialized } = require('./src/features/notificationfcm/firebase');
const { buildNotificationFromTemplate } = require('./src/features/notificationfcm/notification.helper');
const { NOTIFICATION_TYPES } = require('./src/features/notificationfcm/constants/notificationTypes');
const { NOTIFICATION_DATA_TYPES } = require('./src/features/notificationfcm/constants/notificationDataTypes');

if (!firebaseInitialized) {
  console.error('❌ Firebase not initialized');
  process.exit(1);
}

// Your actual FCM token
const FCM_TOKEN = 'eZUttMITQ1aqQGCR9fYgrT:APA91bGYnv9sbOrN_oYebwzJM4YAWCYWENf6ZowqLi5BRoFT9nTWr32fBaNL0zqujom8Nn8IW87XytDCzzTYH3y743PYZxMqY7KS-l9tkris6dTxHvLhFZ0';
const USER_ID = '693ea01e54d3374df909ec22';

console.log('\n' + '='.repeat(80));
console.log('📱 SENDING ALL 19 NOTIFICATIONS TO YOUR REAL DEVICE');
console.log('='.repeat(80));
console.log(`FCM Token: ${FCM_TOKEN.substring(0, 50)}...`);
console.log(`User ID: ${USER_ID}\n`);

const notificationTests = [
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
    payload: { eventName: 'Tech Conference 2025', reason: 'Duplicate registration detected' },
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
    payload: { eventName: 'Tech Conference 2025', updateType: 'Date changed to Jan 15' },
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
    name: '📊 Waitlist Position Updated',
    type: NOTIFICATION_TYPES.WAITLIST_POSITION_UPDATED,
    payload: { eventName: 'Tech Conference 2025', position: '5' },
    data: { type: NOTIFICATION_DATA_TYPES.WAITLIST_POSITION_UPDATED, eventId: 'EVT123' },
  },
  {
    name: '👤 User Account Created',
    type: NOTIFICATION_TYPES.USER_ACCOUNT_CREATED,
    payload: { adminName: 'Admin User' },
    data: { type: NOTIFICATION_DATA_TYPES.USER_ACCOUNT_CREATED },
  },
  {
    name: '📝 User Account Updated',
    type: NOTIFICATION_TYPES.USER_ACCOUNT_UPDATED,
    payload: { updateType: 'Profile information updated' },
    data: { type: NOTIFICATION_DATA_TYPES.USER_ACCOUNT_UPDATED },
  },
  {
    name: '🔒 User Account Suspended',
    type: NOTIFICATION_TYPES.USER_ACCOUNT_SUSPENDED,
    payload: { reason: 'Violation of terms and conditions' },
    data: { type: NOTIFICATION_DATA_TYPES.USER_ACCOUNT_SUSPENDED },
  },
];

const sendNotifications = async () => {
  let sent = 0;
  let failed = 0;

  console.log(`Sending ${notificationTests.length} notifications...\n`);

  for (let i = 0; i < notificationTests.length; i++) {
    const test = notificationTests[i];
    try {
      // Build notification from template
      const notification = buildNotificationFromTemplate(test.type, test.payload);

      // Create FCM message
      const message = {
        token: FCM_TOKEN,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          ...test.data,
          userId: USER_ID,
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              'mutable-content': 1,
            },
          },
        },
        webpush: {
          notification: {
            icon: 'https://www.gstatic.com/devrel-devsite/prod/v2210deb6920cd4a55bd580441aa58e7853afc04b39a9d9ac4198e1cd7fbe04ef/firebase/images/favicons/favicon.ico',
            badge: 'https://www.gstatic.com/devrel-devsite/prod/v2210deb6920cd4a55bd580441aa58e7853afc04b39a9d9ac4198e1cd7fbe04ef/firebase/images/favicons/favicon.ico',
          },
        },
      };

      if (notification.imageUrl) {
        message.notification.imageUrl = notification.imageUrl;
        message.apns.payload.aps['mutable-content'] = 1;
      }

      const response = await admin.messaging().send(message);

      console.log(`✅ [${i + 1}/${notificationTests.length}] ${test.name}`);
      console.log(`   Message ID: ${response}\n`);
      sent++;

      // Small delay between notifications
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.log(`❌ [${i + 1}/${notificationTests.length}] ${test.name}`);
      console.log(`   Error: ${error.message}\n`);
      failed++;
    }
  }

  console.log('='.repeat(80));
  console.log('📊 RESULTS');
  console.log('='.repeat(80));
  console.log(`✅ Sent:   ${sent}/${notificationTests.length}`);
  console.log(`❌ Failed: ${failed}/${notificationTests.length}`);

  if (sent > 0) {
    console.log('\n🎉 NOTIFICATIONS SENT TO YOUR DEVICE!');
    console.log('\n📱 Check your phone for all notifications\n');
  } else {
    console.log('\n❌ All notifications failed\n');
  }

  process.exit(sent > 0 ? 0 : 1);
};

sendNotifications().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
