# Real User Testing Guide

## 1. Signup - Create a New User

**Endpoint:** `POST http://localhost:3000/api/auth/signup`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "phone": "+91-9876543210",
  "lastname": "Doe",
  "uploadedPhoto": null
}
```

**Expected Response (201):**
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "xxx",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+91-9876543210",
      "role": "user"
    }
  }
}
```

---

## 2. Login - Authenticate User

**Endpoint:** `POST http://localhost:3000/api/auth/login`

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

**Expected Response (200):**
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "xxx",
      "name": "John Doe",
      "email": "john.doe@example.com"
    }
  }
}
```

---

## 3. Get Current User Profile

**Endpoint:** `GET http://localhost:3000/api/auth/me`

**Headers:**
```
Authorization: Bearer {token_from_login}
```

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "xxx",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+91-9876543210"
    }
  }
}
```

---

## 4. Get All Users (Admin Only)

**Endpoint:** `GET http://localhost:3000/api/users`

**Headers:**
```
Authorization: Bearer {admin_token}
```

**Expected Response (200):**
```json
{
  "status": "success",
  "results": 1,
  "data": {
    "users": [
      {
        "_id": "xxx",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "phone": "+91-9876543210",
        "role": "user"
      }
    ]
  }
}
```

---

## 5. Get Single User

**Endpoint:** `GET http://localhost:3000/api/users/{userId}`

**Headers:**
```
Authorization: Bearer {token}
```

**Example:** `GET http://localhost:3000/api/users/65f000000000000000000001`

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "65f000000000000000000001",
      "name": "John Doe",
      "email": "john.doe@example.com"
    }
  }
}
```

---

## 6. Update User

**Endpoint:** `PATCH http://localhost:3000/api/users/{userId}`

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "name": "Jane Doe",
  "phone": "+91-9876543211"
}
```

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "xxx",
      "name": "Jane Doe",
      "phone": "+91-9876543211"
    }
  }
}
```

---

## 7. Test Notifications - Register FCM Token

**Endpoint:** `POST http://localhost:3000/api/notifications/register-token`

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "token": "eZUttMITQ1aqQGCR9fYgrT:APA91bGYnv9sbOrN_oYebwzJM4YAWCYWENf6ZowqLi5BRoFT9nTWr32fBaNL0zqujom8Nn8IW87XytDCzzTYH3y743PYZxMqY7KS-l9tkris6dTxHvLhFZ0",
  "deviceId": "device123",
  "deviceType": "android"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "FCM token registered"
}
```

---

## 8. Test Image Encryption - Get Image Proxy URL

**Endpoint:** `POST http://localhost:3000/api/images/encrypt`

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "url": "https://event-images-collection.s3.ap-south-1.amazonaws.com/events/temp/cover-f8cc724d-a19e-4674-9448-4b0e9c3ab36d.jpg",
  "expiryHours": 24
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "token": "abcc1ceae408587f4571fee8a9ac1514:1db2d72c0d030ba008373923ab7ae66e19e92f3ff12da5866d0583ea8d83ca42...",
  "proxyUrl": "/api/images/proxy/abcc1ceae408587f4571fee8a9ac1514:1db2d72c0d030ba008373923ab7ae66e19e92f3ff12da5866d0583ea8d83ca42..."
}
```

---

## 9. Test Image Proxy - Serve Encrypted Image

**Endpoint:** `GET http://localhost:3000/api/images/proxy/{token}`

**Example:** `GET http://localhost:3000/api/images/proxy/abcc1ceae408587f4571fee8a9ac1514:1db2d72c0d030ba008373923ab7ae66e19e92f3ff12da5866d0583ea8d83ca42`

**Expected Response:** Image file (binary data)

---

## 10. Create Event with Cover Image

**Endpoint:** `POST http://localhost:3000/api/events`

**Headers:**
```
Authorization: Bearer {admin_token}
Content-Type: multipart/form-data
```

**Form Data:**
- `title`: "Annual Tech Conference 2025"
- `description`: "A conference about latest tech trends"
- `location`: "New York"
- `eventDate`: "2025-12-25"
- `startTime`: "09:00"
- `endTime`: "17:00"
- `capacity`: 500
- `image`: (upload a file)

**Expected Response (201):**
```json
{
  "status": "success",
  "data": {
    "event": {
      "_id": "xxx",
      "title": "Annual Tech Conference 2025",
      "coverImageUrl": "/api/images/proxy/token_here",
      "location": "New York"
    }
  }
}
```

Note: The response will have `coverImageUrl` (encrypted proxy) instead of raw S3 URL

---

## Testing Steps

1. **Signup** → Get token
2. **Login** → Verify token works
3. **Get Profile** → Verify auth middleware
4. **Get Users** → Test admin endpoints
5. **Update User** → Test PATCH
6. **Register FCM Token** → Test notifications
7. **Encrypt Image** → Get proxy URL
8. **Test Proxy** → Serve image with token
9. **Create Event** → Test S3 upload with encryption
10. **Get Events** → Verify encrypted URLs in response

---

## Using cURL

```bash
# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "password": "SecurePass123!",
    "phone": "+91-9876543210",
    "lastname": "Doe"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123!"
  }'

# Get Profile (replace TOKEN with actual token)
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer TOKEN"

# Get All Users
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer TOKEN"
```

---

## Key Features to Test

✅ **User Authentication** - Signup, Login, Auth middleware
✅ **User Management** - Get all, get one, update, delete
✅ **Image Encryption** - Convert S3 URLs to encrypted tokens
✅ **Image Proxy** - Serve images via encrypted proxy
✅ **Notifications** - FCM token registration
✅ **Event Management** - Create with S3 image upload
✅ **Response Optimization** - No raw S3 URLs in responses

