/**
 * Notification Troubleshooting Script
 * Helps identify why notifications aren't being received
 */

require('dotenv').config({ path: './src/config/config.env' });

const mongoose = require('mongoose');
const { admin, initialized: firebaseInitialized } = require('./src/features/notificationfcm/firebase');

console.log('\n' + '='.repeat(80));
console.log('🔧 NOTIFICATION TROUBLESHOOTING SCRIPT');
console.log('='.repeat(80) + '\n');

const USER_ID = '693ea01e54d3374df909ec22';

// Step 1: Check Firebase
console.log('Step 1: Firebase Configuration');
console.log('-'.repeat(80));
if (firebaseInitialized) {
  console.log('✅ Firebase Admin SDK initialized successfully');
} else {
  console.log('❌ Firebase Admin SDK failed to initialize');
  console.log('   Check if firebase-service-account.json exists and is valid');
  process.exit(1);
}

// Step 2: Connect to MongoDB and check tokens
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('\n✅ MongoDB Connected\n');

    // Import model after connection
    const UserFcmToken = require('./src/features/notificationfcm/userFcmToken.model');

    // Step 3: Check if user has any FCM tokens
    console.log('Step 2: Check FCM Tokens for User');
    console.log('-'.repeat(80));
    console.log(`Looking for tokens for user: ${USER_ID}\n`);

    const tokens = await UserFcmToken.find({ userId: USER_ID });

    if (!tokens || tokens.length === 0) {
      console.log('❌ NO FCM TOKENS FOUND FOR THIS USER');
      console.log('\n📱 You need to register your device token first.');
      console.log('\nTo fix this:');
      console.log('1. Start your server: npm start');
      console.log('2. On your phone/app, call the register endpoint:');
      console.log('   POST /api/notification/register-token');
      console.log('   Body: {');
      console.log('     "token": "YOUR_FCM_TOKEN_HERE",');
      console.log('     "deviceType": "android" or "ios",');
      console.log('     "deviceId": "your_device_id"');
      console.log('   }');
      console.log('\n3. After registering, run this script again to verify\n');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`✅ Found ${tokens.length} FCM token(s):\n`);
    tokens.forEach((t, i) => {
      console.log(`Token ${i + 1}:`);
      console.log(`  - Token: ${t.token.substring(0, 50)}...`);
      console.log(`  - Device Type: ${t.deviceType || 'not specified'}`);
      console.log(`  - Device ID: ${t.deviceId || 'not specified'}`);
      console.log(`  - Active: ${t.isActive}`);
      console.log(`  - Registered: ${t.createdAt?.toLocaleDateString()}`);
      console.log();
    });

    // Step 4: Try sending a test notification
    console.log('Step 3: Send Test Notification');
    console.log('-'.repeat(80));
    console.log('Attempting to send test notification...\n');

    let successCount = 0;
    let failureCount = 0;
    const results = [];

    for (let i = 0; i < tokens.length; i++) {
      const tokenDoc = tokens[i];
      try {
        const testMessage = {
          token: tokenDoc.token,
          notification: {
            title: '🧪 Test Notification',
            body: 'If you see this on your phone, notifications are working!',
          },
          data: {
            type: 'TEST',
            timestamp: new Date().toISOString(),
          },
        };

        // Add platform-specific settings
        if (tokenDoc.deviceType === 'android') {
          testMessage.android = {
            priority: 'high',
            notification: {
              sound: 'default',
              click_action: 'FLUTTER_NOTIFICATION_CLICK',
            },
          };
        } else if (tokenDoc.deviceType === 'ios') {
          testMessage.apns = {
            payload: {
              aps: {
                alert: {
                  title: '🧪 Test Notification',
                  body: 'If you see this on your phone, notifications are working!',
                },
                sound: 'default',
                badge: 1,
              },
            },
          };
        }

        const response = await admin.messaging().send(testMessage);
        console.log(`✅ Token ${i + 1}: Sent successfully`);
        console.log(`   Message ID: ${response}\n`);
        successCount++;
        results.push({ token: tokenDoc.token, success: true, messageId: response });
      } catch (error) {
        console.log(`❌ Token ${i + 1}: Failed to send`);
        console.log(`   Error: ${error.message}\n`);
        failureCount++;
        results.push({ token: tokenDoc.token, success: false, error: error.message });

        // Check if it's an invalid token
        if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
          console.log(`   ⚠️  This token is invalid and should be removed from the database\n`);
          await UserFcmToken.deleteOne({ token: tokenDoc.token });
        }
      }
    }

    // Summary
    console.log('Step 4: Test Results Summary');
    console.log('-'.repeat(80));
    console.log(`✅ Successful: ${successCount}/${tokens.length}`);
    console.log(`❌ Failed: ${failureCount}/${tokens.length}`);

    if (successCount > 0) {
      console.log('\n🎉 TEST NOTIFICATION SENT SUCCESSFULLY!');
      console.log('\n📱 Check your phone:');
      console.log('- If you receive the notification, your setup is working!');
      console.log('- If you DON\'T receive it, check:');
      console.log('  1. Your phone has internet connection');
      console.log('  2. Your app is installed on the phone');
      console.log('  3. Your app has notification permissions enabled');
      console.log('  4. Your app is properly implementing FCM');
      console.log('  5. Your Firebase project allows notifications');
    } else {
      console.log('\n❌ All notifications failed to send');
      console.log('Possible causes:');
      console.log('- Invalid FCM tokens (register new ones)');
      console.log('- Firebase credentials not working');
      console.log('- Firebase project not properly configured');
    }

    console.log('\n' + '='.repeat(80) + '\n');

    await mongoose.connection.close();
    process.exit(successCount > 0 ? 0 : 1);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
};

connectDB();
