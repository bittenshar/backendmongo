/**
 * FCM SETUP GUIDE FOR MOBILE APP
 * 
 * This file shows exactly what your mobile app needs to do
 * to receive notifications on your phone.
 * 
 * Follow these steps for both Android and iOS
 */

// ============================================================================
// STEP 1: INITIALIZE FIREBASE IN YOUR APP (during app startup)
// ============================================================================

// For React Native or Expo:
import messaging from '@react-native-firebase/messaging';

async function initializeFCM() {
  try {
    // Step 1.1: Request notification permission
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('✅ Notification permission granted');
      
      // Step 1.2: Get the FCM token (THIS IS CRITICAL!)
      const token = await messaging().getToken();
      console.log('📱 Your FCM Token:', token);
      
      // Step 1.3: Send token to your backend
      await registerTokenToBackend(token);
      
      // Step 1.4: Listen for notifications when app is in foreground
      setupForegroundNotificationHandler();
      
      // Step 1.5: Listen for notifications when app is in background/closed
      setupBackgroundNotificationHandler();
    } else {
      console.log('❌ Notification permission denied');
    }
  } catch (error) {
    console.error('FCM Initialization Error:', error);
  }
}

// ============================================================================
// STEP 2: REGISTER TOKEN TO BACKEND
// ============================================================================

async function registerTokenToBackend(token) {
  try {
    const userId = getUserIdFromLocalStorage(); // Your user ID
    const deviceType = Platform.OS; // 'android' or 'ios'
    const deviceId = getDeviceId(); // Unique device identifier

    const response = await fetch('http://YOUR_API_URL/api/notification/register-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`, // Your auth token
      },
      body: JSON.stringify({
        token: token,
        deviceType: deviceType,
        deviceId: deviceId,
      }),
    });

    const data = await response.json();
    if (data.success) {
      console.log('✅ Token registered successfully');
      // Save token locally in case you need it later
      saveTokenLocally(token);
    } else {
      console.log('❌ Failed to register token:', data.message);
    }
  } catch (error) {
    console.error('Error registering token:', error);
  }
}

// ============================================================================
// STEP 3: HANDLE FOREGROUND NOTIFICATIONS (when app is open)
// ============================================================================

function setupForegroundNotificationHandler() {
  // This runs when app is in the foreground (user can see it)
  const unsubscribe = messaging().onMessage(async (remoteMessage) => {
    console.log('📬 Foreground Notification Received:', remoteMessage);

    // Extract notification data
    const {
      notification: { title, body },
      data,
    } = remoteMessage;

    // Show notification to user (since it won't auto-show in foreground)
    showLocalNotification(title, body, data);

    // Handle the notification action
    handleNotificationPress(data);
  });

  return unsubscribe;
}

function showLocalNotification(title, body, data) {
  // Use react-native-notifee or similar to show notification
  // This ensures the user sees it even when app is open
  notifee.displayNotification({
    title: title,
    body: body,
    data: data,
    android: {
      channelId: 'default',
      smallIcon: 'ic_launcher',
      priority: 'high',
    },
    ios: {
      sound: 'default',
    },
  });
}

// ============================================================================
// STEP 4: HANDLE BACKGROUND NOTIFICATIONS (when app is closed/minimized)
// ============================================================================

function setupBackgroundNotificationHandler() {
  // This runs when notification is tapped while app is closed
  messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log('📲 Notification opened app:', remoteMessage);
    handleNotificationPress(remoteMessage.data);
  });

  // This runs when app is opened by tapping a notification
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log('📲 App opened from notification:', remoteMessage);
        handleNotificationPress(remoteMessage.data);
      }
    });

  // Handle notifications received in background
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('📬 Background Notification Received:', remoteMessage);
    // Notification will be shown automatically
    // You can process data here
    handleNotificationData(remoteMessage.data);
  });
}

// ============================================================================
// STEP 5: PROCESS NOTIFICATION DATA
// ============================================================================

function handleNotificationPress(data) {
  console.log('Processing notification action:', data);

  // Navigate to relevant screen based on notification type
  switch (data.type) {
    case 'TICKET_ISSUED':
      navigateTo('TicketsScreen', { ticketId: data.ticketId });
      break;
    case 'REGISTRATION_CONFIRMED':
      navigateTo('RegistrationsScreen', { registrationId: data.registrationId });
      break;
    case 'FACE_VERIFICATION_APPROVED':
      navigateTo('VerificationScreen');
      break;
    case 'EVENT_UPDATED':
      navigateTo('EventDetailsScreen', { eventId: data.eventId });
      break;
    case 'WAITLIST_OFFER':
      navigateTo('WaitlistScreen', { eventId: data.eventId });
      break;
    default:
      console.log('Unknown notification type:', data.type);
  }
}

function handleNotificationData(data) {
  console.log('Handling notification data:', data);
  // Refresh data, update UI, etc.
}

// ============================================================================
// STEP 6: TOKEN REFRESH (Optional but recommended)
// ============================================================================

function setupTokenRefreshHandler() {
  // When FCM token is refreshed (happens periodically)
  const unsubscribe = messaging().onTokenRefresh((token) => {
    console.log('🔄 FCM Token Refreshed:', token);
    // Re-register new token with backend
    registerTokenToBackend(token);
  });

  return unsubscribe;
}

// ============================================================================
// COMPLETE APP INITIALIZATION EXAMPLE
// ============================================================================

export async function setupNotifications() {
  // Call this in your App.tsx or main App component, ideally in useEffect
  await initializeFCM();
  setupTokenRefreshHandler();
  
  console.log('✅ Notification system initialized');
}

// ============================================================================
// FOR WEB/BROWSER (if you have a web app)
// ============================================================================

/*
// Web implementation using Firebase SDK:

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  // Your Firebase config from Firebase Console
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Request permission and get token
Notification.requestPermission().then(() => {
  getToken(messaging, {
    vapidKey: 'YOUR_VAPID_KEY_FROM_FIREBASE_CONSOLE'
  }).then((token) => {
    console.log('Web FCM Token:', token);
    registerTokenToBackend(token);
  });
});

// Listen for messages
onMessage(messaging, (payload) => {
  console.log('Message received:', payload);
  // Show notification
  new Notification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/icon.png'
  });
});
*/

// ============================================================================
// TROUBLESHOOTING CHECKLIST
// ============================================================================

/*
If you're not receiving notifications, check:

☐ 1. Firebase is initialized BEFORE requesting token
☐ 2. User granted notification permission
☐ 3. FCM token is being sent to backend
☐ 4. Backend can find the token in database (check MongoDB)
☐ 5. Device has internet connection (WiFi or mobile data)
☐ 6. Notification permissions enabled in phone settings
☐ 7. App is not blocking notifications
☐ 8. Your Firebase project credentials are correct
☐ 9. For iOS: APNs certificate configured in Firebase Console
☐ 10. For Android: Google Services configuration correctly added

TEST COMMAND:
  node send-real-notifications.js
  
Then check your phone for notifications!
*/
