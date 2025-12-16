# Notification Testing Guide

## ⚠️ Important: FCM Token vs Auth Token

- **JWT Auth Token** (from login): `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  - Used in `Authorization: Bearer` header
  - NOT used as FCM token

- **FCM Device Token** (from Firebase): `dxxxxxx:APA91bxxxxxxxxxxxxxxxxxxxxxx`
  - Obtained from Firebase Cloud Messaging SDK on the device
  - Used in notification requests

---

## 🔄 Correct Testing Flow

### Step 1: Get Auth Token
**POST** `/api/auth/login`
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```
**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": { "user": {...} }
}
```
**Save this token for Authorization header ↓**

---

### Step 2: Register Device FCM Token
**POST** `/api/notifications/register-token`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Body:**
```json
{
  "token": "dxxxxxx:APA91bxxxxxxxxxxxxxxxxxxxxxx",
  "deviceId": "device_123",
  "deviceType": "android"
}
```
**Response:**
```json
{
  "success": true,
  "message": "FCM token registered"
}
```

---

### Step 3: Send Notification
**POST** `/api/notifications/send`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "token": "dxxxxxx:APA91bxxxxxxxxxxxxxxxxxxxxxx",
  "title": "Test Notification",
  "body": "This is a test notification"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Notifications sent",
  "responses": [
    {
      "token": "dxxxxxx:APA91bxxxxxxxxxxxxxxxxxxxxxx",
      "response": {
        "messageId": "0:1702561234567890%abc123xyz"
      },
      "success": true
    }
  ]
}
```

---

## 📱 How to Get a Real FCM Token

### For Android (React Native / Flutter / Native)
```javascript
// Firebase Cloud Messaging
import * as messaging from 'react-native-firebase/messaging';

const token = await messaging().getToken();
console.log('FCM Token:', token);
// Output: dxxxxxx:APA91bxxxxxxxxxxxxxxxxxxxxxx
```

### For Web (JavaScript)
```javascript
import { getMessaging, getToken } from 'firebase/messaging';

const messaging = getMessaging();
const token = await getToken(messaging, {
  vapidKey: 'YOUR_VAPID_PUBLIC_KEY'
});
console.log('FCM Token:', token);
```

### For iOS (React Native)
```javascript
import messaging from '@react-native-firebase/messaging';

const token = await messaging().getAPNSToken();
// For FCM token:
const fcmToken = await messaging().getToken();
```

---

## 🧪 Test Scenarios

### Scenario 1: Test with Mock FCM Token (for development)
When you don't have a real device/Firebase, use a dummy FCM token:

**POST** `/api/notifications/send`
```json
{
  "token": "mock_fcm_token_12345",
  "title": "Development Test",
  "body": "Testing without real Firebase"
}
```
**Response:** Mock response (Firebase not configured)
```json
{
  "success": true,
  "message": "Notifications sent",
  "responses": [
    {
      "token": "mock_fcm_token_12345",
      "response": {
        "messageId": "mock-1702561234567"
      },
      "success": true
    }
  ]
}
```

### Scenario 2: Send to Registered User
After registering an FCM token:

**POST** `/api/notifications/send`
```json
{
  "userId": "693ea01e54d3374df909ec22",
  "title": "User Update",
  "body": "You have a new event notification"
}
```

### Scenario 3: Send Batch to All Users
**POST** `/api/notifications/send-batch`
```json
{
  "title": "Announcement",
  "body": "Check out our new feature!"
}
```

---

## ❌ Common Errors

### Error: "The registration token is not a valid FCM registration token"
**Cause:** Sending JWT auth token instead of FCM token
**Fix:** Use actual FCM token from device, not the auth JWT

```javascript
// ❌ WRONG - This is JWT token
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
POST /api/notifications/send { token }

// ✅ CORRECT - This is FCM token
const token = "dxxxxxx:APA91bxxxxxxxxxxxxxxxxxxxxxx";
POST /api/notifications/send { token }
```

### Error: "No tokens found"
**Cause:** No FCM token registered for that userId
**Fix:** Register FCM token first using `/api/notifications/register-token`

### Error: "Either token or userId is required"
**Cause:** Request body missing both token and userId
**Fix:** Send at least one of:
```json
{
  "token": "fcm_token_here"  // OR
  "userId": "user_id_here"
}
```

---

## 📋 Complete cURL Examples

### Register FCM Token
```bash
curl -X POST http://localhost:3000/api/notifications/register-token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "dxxxxxx:APA91bxxxxxxxxxxxxxxxxxxxxxx",
    "deviceId": "device_123",
    "deviceType": "android"
  }'
```

### Send Notification (Direct Token)
```bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "token": "dxxxxxx:APA91bxxxxxxxxxxxxxxxxxxxxxx",
    "title": "Test Notification",
    "body": "This is a test"
  }'
```

### Send Notification (Registered User)
```bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "693ea01e54d3374df909ec22",
    "title": "User Notification",
    "body": "Hello user!"
  }'
```

### Send Batch Notifications
```bash
curl -X POST http://localhost:3000/api/notifications/send-batch \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Batch Message",
    "body": "Sent to all users"
  }'
```

---

## 🎯 Summary

| Endpoint | Purpose | Requires Auth | Input |
|----------|---------|---------------|-------|
| `/api/auth/login` | Get JWT token | No | email, password |
| `/api/notifications/register-token` | Register device FCM token | Yes (JWT) | FCM token, deviceId, deviceType |
| `/api/notifications/send` | Send to device or user | No | token OR userId |
| `/api/notifications/send-batch` | Send to all users | No | title, body |

