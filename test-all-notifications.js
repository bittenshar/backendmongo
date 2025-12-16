/**
 * Test All Notification Templates
 * This script tests all 19 notification types to verify templates work correctly
 */

const { NOTIFICATION_TYPES } = require('./src/features/notificationfcm/constants/notificationTypes');
const { NOTIFICATION_DATA_TYPES } = require('./src/features/notificationfcm/constants/notificationDataTypes');
const { NOTIFICATION_TITLES } = require('./src/features/notificationfcm/constants/notificationTitles');
const { buildNotificationFromTemplate } = require('./src/features/notificationfcm/notification.helper');

console.log('\n' + '='.repeat(70));
console.log('🔔 NOTIFICATION TEMPLATE TEST SUITE');
console.log('='.repeat(70) + '\n');

const tests = [
  {
    name: '🎟 Ticket Confirmed',
    type: NOTIFICATION_TYPES.TICKET_CONFIRMED,
    payload: { eventName: 'Tech Conference 2025' },
  },
  {
    name: '🎟 Ticket Issued',
    type: NOTIFICATION_TYPES.TICKET_ISSUED,
    payload: { eventName: 'Tech Conference 2025', ticketNumber: 'ABC12345' },
  },
  {
    name: '❌ Ticket Cancelled',
    type: NOTIFICATION_TYPES.TICKET_CANCELLED,
    payload: { eventName: 'Tech Conference 2025', reason: 'Event rescheduled' },
  },
  {
    name: '✅ Face Verification Approved',
    type: NOTIFICATION_TYPES.FACE_VERIFICATION_APPROVED,
    payload: {},
  },
  {
    name: '❌ Face Verification Rejected',
    type: NOTIFICATION_TYPES.FACE_VERIFICATION_REJECTED,
    payload: { reason: 'Face does not match required quality' },
  },
  {
    name: '⏳ Face Verification Submitted',
    type: NOTIFICATION_TYPES.FACE_VERIFICATION_SUBMITTED,
    payload: {},
  },
  {
    name: '✅ Registration Confirmed',
    type: NOTIFICATION_TYPES.REGISTRATION_CONFIRMED,
    payload: { eventName: 'Tech Conference 2025' },
  },
  {
    name: '❌ Registration Rejected',
    type: NOTIFICATION_TYPES.REGISTRATION_REJECTED,
    payload: { eventName: 'Tech Conference 2025', reason: 'Duplicate registration detected' },
  },
  {
    name: '⏳ Registration Awaiting Payment',
    type: NOTIFICATION_TYPES.REGISTRATION_AWAITING_PAYMENT,
    payload: { eventName: 'Tech Conference 2025', amount: '₹5000' },
  },
  {
    name: '🚫 Show Full',
    type: NOTIFICATION_TYPES.SHOW_FULL,
    payload: { eventName: 'Tech Conference 2025' },
  },
  {
    name: '📝 Event Updated',
    type: NOTIFICATION_TYPES.EVENT_UPDATED,
    payload: { eventName: 'Tech Conference 2025', updateType: 'Date changed to Jan 15' },
  },
  {
    name: '❌ Event Cancelled',
    type: NOTIFICATION_TYPES.EVENT_CANCELLED,
    payload: { eventName: 'Tech Conference 2025', reason: 'Venue unavailable' },
  },
  {
    name: '💸 Refund Initiated',
    type: NOTIFICATION_TYPES.REFUND_INITIATED,
    payload: { amount: '₹5000' },
  },
  {
    name: '✅ Refund Completed',
    type: NOTIFICATION_TYPES.REFUND_COMPLETED,
    payload: { amount: '₹5000' },
  },
  {
    name: '🎉 Waitlist Offer',
    type: NOTIFICATION_TYPES.WAITLIST_OFFER,
    payload: { eventName: 'Tech Conference 2025', offerExpiry: '24 hours' },
  },
  {
    name: '📊 Waitlist Position Updated',
    type: NOTIFICATION_TYPES.WAITLIST_POSITION_UPDATED,
    payload: { eventName: 'Tech Conference 2025', position: '5' },
  },
  {
    name: '👤 User Account Created',
    type: NOTIFICATION_TYPES.USER_ACCOUNT_CREATED,
    payload: { adminName: 'Admin User' },
  },
  {
    name: '📝 User Account Updated',
    type: NOTIFICATION_TYPES.USER_ACCOUNT_UPDATED,
    payload: { updateType: 'Profile information updated' },
  },
  {
    name: '🔒 User Account Suspended',
    type: NOTIFICATION_TYPES.USER_ACCOUNT_SUSPENDED,
    payload: { reason: 'Violation of terms and conditions' },
  },
];

let passed = 0;
let failed = 0;

console.log(`Testing ${tests.length} notification templates...\n`);

tests.forEach((test, index) => {
  try {
    const notification = buildNotificationFromTemplate(test.type, test.payload);

    // Validate required fields
    if (!notification.title || !notification.body) {
      throw new Error('Missing title or body');
    }

    console.log(`✅ Test ${index + 1}/${tests.length}: ${test.name}`);
    console.log(`   Title: ${notification.title}`);
    console.log(`   Body:  ${notification.body.substring(0, 60)}${notification.body.length > 60 ? '...' : ''}`);
    console.log(`   Image: ${notification.imageUrl ? '✅ Set' : '⚠️  Not set'}`);
    console.log();

    passed++;
  } catch (error) {
    console.log(`❌ Test ${index + 1}/${tests.length}: ${test.name}`);
    console.log(`   Error: ${error.message}`);
    console.log();
    failed++;
  }
});

console.log('='.repeat(70));
console.log(`📊 TEST RESULTS`);
console.log('='.repeat(70));
console.log(`✅ Passed: ${passed}/${tests.length}`);
console.log(`❌ Failed: ${failed}/${tests.length}`);
console.log(`Total:   ${passed + failed}/${tests.length}`);

if (failed === 0) {
  console.log('\n🎉 ALL TESTS PASSED! All notification templates are working correctly.\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failed} test(s) failed. Please review the errors above.\n`);
  process.exit(1);
}
