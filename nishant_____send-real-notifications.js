/**
 * Send Real Notifications to Your Phone
 * This script sends all 19 notification types to your real FCM token using your user ID
 */

require('dotenv').config({ path: './src/config/config.env' });

const mongoose = require('mongoose');
const { sendNotificationService } = require('./src/features/notificationfcm/notification.service');
const { NOTIFICATION_TYPES } = require('./src/features/notificationfcm/constants/notificationTypes');
const { NOTIFICATION_DATA_TYPES } = require('./src/features/notificationfcm/constants/notificationDataTypes');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected\n');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

const USER_ID = '693ea01e54d3374df909ec22';

console.log('\n' + '='.repeat(70));
console.log('📱 SENDING REAL NOTIFICATIONS TO YOUR PHONE');
console.log('='.repeat(70));
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
  await connectDB();

  let sent = 0;
  let failed = 0;

  console.log(`Sending ${notificationTests.length} notifications...\n`);

  for (let i = 0; i < notificationTests.length; i++) {
    const test = notificationTests[i];
    try {
      await sendNotificationService({
        userId: USER_ID,
        type: test.type,
        payload: test.payload,
        data: test.data,
      });

      console.log(`✅ [${i + 1}/${notificationTests.length}] ${test.name}`);
      sent++;

      // Small delay between notifications to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.log(`❌ [${i + 1}/${notificationTests.length}] ${test.name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 NOTIFICATION SEND RESULTS');
  console.log('='.repeat(70));
  console.log(`✅ Sent:   ${sent}/${notificationTests.length}`);
  console.log(`❌ Failed: ${failed}/${notificationTests.length}`);
  console.log(`Total:   ${sent + failed}/${notificationTests.length}`);

  if (failed === 0) {
    console.log('\n🎉 ALL NOTIFICATIONS SENT SUCCESSFULLY!\n');
    console.log('📱 Check your phone for incoming notifications!\n');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${failed} notification(s) failed to send.\n`);
    console.log('Possible reasons:');
    console.log('- User has no FCM tokens registered');
    console.log('- Firebase credentials not configured');
    console.log('- Invalid user ID\n');
    process.exit(1);
  }
};

sendNotifications().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
