# 📱 HOW TO RECEIVE ALL NOTIFICATIONS ON YOUR REAL PHONE

## ✅ What's Ready Now

Your backend is **100% configured** and working! Here's what we've set up:

- ✅ Firebase Cloud Messaging (FCM) initialized and verified
- ✅ 19 notification types created with templates
- ✅ Notification service ready to send messages
- ✅ Test endpoints available to send notifications

## 🚀 HOW TO GET NOTIFICATIONS ON YOUR PHONE

### OPTION 1: Test via API Endpoints (Quickest)

**Start your server:**
```bash
npm start
```

**Then use Postman or curl to send a test notification:**

```bash
curl -X POST http://localhost:3000/api/notification/test \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "693ea01e54d3374df909ec22"
  }'
```

**Or send all 19 notifications at once:**
```bash
curl -X POST http://localhost:3000/api/notification/test-all \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "693ea01e54d3374df909ec22"
  }'
```

**Check your tokens:**
```bash
curl http://localhost:3000/api/notification/tokens/693ea01e54d3374df909ec22
```

---

### OPTION 2: Implement FCM in Your Mobile App (Recommended)

Your mobile app needs to implement these 5 steps:

#### Step 1: Install Firebase in Your App
```bash
# For React Native:
npm install @react-native-firebase/app @react-native-firebase/messaging

# For Flutter:
flutter pub add firebase_messaging

# For Web:
npm install firebase
```

#### Step 2: Initialize Firebase in App Startup
```javascript
import messaging from '@react-native-firebase/messaging';

async function setupNotifications() {
  // Request permission
  const authStatus = await messaging().requestPermission();
  
  // Get FCM token
  const token = await messaging().getToken();
  console.log('Your FCM Token:', token);
  
  // Send to backend
  await registerTokenToBackend(token);
}

setupNotifications();
```

#### Step 3: Send Token to Backend
```javascript
async function registerTokenToBackend(token) {
  const response = await fetch('http://YOUR_SERVER/api/notification/register-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: token,
      deviceType: 'android', // or 'ios'
      deviceId: 'device-id'
    })
  });
  console.log(await response.json());
}
```

#### Step 4: Listen for Notifications
```javascript
import messaging from '@react-native-firebase/messaging';

// Handle foreground messages
messaging().onMessage(async (remoteMessage) => {
  console.log('Notification:', remoteMessage.notification.title);
  // Show in-app notification
});

// Handle background messages
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Background notification:', remoteMessage);
});
```

#### Step 5: Get the FCM Setup Guide
📄 **See `FCM_SETUP_GUIDE.js` in the root folder for complete implementation**

---

## 🔧 WHAT YOUR APP NEEDS TO DO

1. **On App Start:**
   - Initialize Firebase
   - Request notification permission
   - Get FCM token
   - Call `/api/notification/register-token` with the token

2. **Listen for Notifications:**
   - Handle notifications when app is open
   - Handle notifications when app is closed
   - Process notification data (navigate to relevant screen)

3. **On Token Refresh:**
   - Re-register new token when Firebase refreshes it

---

## 📊 Available Test Endpoints

### Test Single Notification
```
POST /api/notification/test
Body: { "userId": "693ea01e54d3374df909ec22" }
```

### Test All 19 Notifications
```
POST /api/notification/test-all
Body: { "userId": "693ea01e54d3374df909ec22" }
```

### Check User's Tokens
```
GET /api/notification/tokens/693ea01e54d3374df909ec22
```

### Delete a Token
```
DELETE /api/notification/tokens/{token}
```

### Register New Token
```
POST /api/notification/register-token
Body: {
  "token": "YOUR_FCM_TOKEN",
  "deviceType": "android",
  "deviceId": "device-id"
}
```

---

## 🎯 NOTIFICATION TYPES (All 19)

| Type | Description |
|------|-------------|
| 🎟 TICKET_CONFIRMED | User's ticket confirmed |
| 🎟 TICKET_ISSUED | Ticket issued after payment |
| ❌ TICKET_CANCELLED | Ticket cancelled |
| ✅ FACE_VERIFICATION_APPROVED | Face verification passed |
| ❌ FACE_VERIFICATION_REJECTED | Face verification failed |
| ⏳ FACE_VERIFICATION_SUBMITTED | Face verification submitted |
| ✅ REGISTRATION_CONFIRMED | Event registration confirmed |
| ❌ REGISTRATION_REJECTED | Registration rejected |
| ⏳ REGISTRATION_AWAITING_PAYMENT | Waiting for payment |
| 🚫 SHOW_FULL | Event showing full capacity |
| 📝 EVENT_UPDATED | Event details updated |
| ❌ EVENT_CANCELLED | Event cancelled |
| 💸 REFUND_INITIATED | Refund started |
| ✅ REFUND_COMPLETED | Refund completed |
| 🎉 WAITLIST_OFFER | Offered spot from waitlist |
| 📊 WAITLIST_POSITION_UPDATED | Your waitlist position changed |
| 👤 USER_ACCOUNT_CREATED | Account created |
| 📝 USER_ACCOUNT_UPDATED | Account information updated |
| 🔒 USER_ACCOUNT_SUSPENDED | Account suspended |

---

## 🐛 TROUBLESHOOTING

**Problem: "No FCM tokens found for user"**
- Solution: User hasn't registered their token yet
- Action: Call `/api/notification/register-token` from your app

**Problem: "Notification sent successfully but I didn't receive it"**
- Check 1: Is your phone connected to internet?
- Check 2: Are notifications enabled in phone settings?
- Check 3: Is your app properly implementing FCM?
- Check 4: Is the FCM token still valid?
- Action: Run `curl http://localhost:3000/api/notification/tokens/693ea01e54d3374df909ec22` to verify tokens

**Problem: "Firebase not initialized"**
- Solution: Firebase credentials file not found
- Action: Verify `firebase-service-account.json` exists in `/src/features/notificationfcm/`

---

## 📝 QUICK CHECKLIST

- [ ] Mobile app has Firebase SDK installed
- [ ] App requests notification permission
- [ ] App gets FCM token on startup
- [ ] App calls `/api/notification/register-token`
- [ ] App listens for `onMessage` (foreground)
- [ ] App listens for background notifications
- [ ] Token is stored in MongoDB
- [ ] Server can find token in database
- [ ] Phone has notifications enabled
- [ ] Phone is connected to internet

---

## 🚀 QUICK START (Postman Users)

1. Open Postman
2. Create new POST request
3. URL: `http://localhost:3000/api/notification/test-all`
4. Body (JSON):
```json
{
  "userId": "693ea01e54d3374df909ec22"
}
```
5. Click Send
6. Check your phone for 19 notifications!

---

## 📂 Related Files

- **FCM_SETUP_GUIDE.js** - Complete mobile app implementation guide
- **send-real-notifications.js** - Script to send notifications from backend
- **troubleshoot-notifications.js** - Troubleshooting script
- **src/features/notificationfcm/notification.service.js** - Main service
- **src/features/notificationfcm/notification.controller.js** - API endpoints

---

## 🎓 Understanding the Flow

```
User's Phone
    ↓
1. App registers FCM token
    ↓
POST /api/notification/register-token
    ↓
Token stored in MongoDB
    ↓
When notification triggered:
API calls sendNotificationService()
    ↓
Service looks up user's tokens
    ↓
Sends via Firebase Cloud Messaging
    ↓
Firebase delivers to phone
    ↓
2. App receives notification
    ↓
User sees notification!
```

---

## 💡 NEXT STEPS

1. **Install your app on real phone**
2. **Log in with user ID: 693ea01e54d3374df909ec22**
3. **App will auto-register FCM token**
4. **Test with:**
   ```bash
   node send-real-notifications.js
   ```
5. **Check phone for all 19 notifications!**

**Need help?** Run the troubleshooting script:
```bash
node troubleshoot-notifications.js
```

---

🎉 **You're all set! Your notifications are ready to go!**
