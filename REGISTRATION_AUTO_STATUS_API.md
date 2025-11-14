# Registration Auto-Status API Documentation

## Overview

The registration system now **automatically calculates** two important fields when a user registers for an event:

1. **`faceVerificationStatus`** - Boolean (true/false)
2. **`ticketAvailabilityStatus`** - String (available/pending)

## Automatic Calculations

### 1. Face Verification Status (Boolean)

**Logic:**
- `true` - User HAS a face record in the system (either in `faceId` field or DynamoDB)
- `false` - User does NOT have a face record

**How it works:**
```javascript
// Check 1: Look for faceId in User model
if (user_doc.faceId) {
  hasFaceRecord = true;
}

// Check 2: Look in DynamoDB for face verification
else {
  hasFaceRecord = await dynamodbService.checkIfUserFaceExists(userId);
}
```

### 2. Ticket Availability Status (String)

**Logic:**
- `"available"` - Event has unsold tickets
- `"pending"` - Event is sold out or no tickets available (user goes to waiting list)

**How it works:**
```javascript
const ticketsAvailable = event.totalTickets - event.ticketsSold;
ticketAvailable = ticketsAvailable > 0;

// Result:
// true → "available"
// false → "pending"
```

## API Endpoints

### Create Registration
```bash
POST /api/registrations
Content-Type: application/json
Authorization: Bearer <token>

Body:
{
  "userId": "6915c1ce111e057ff7b315bc",
  "eventId": "691337e4c4145e1999997a49"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Registration created successfully",
  "data": {
    "registration": {
      "_id": "6915e0c8298b216c751a126d",
      "userId": {...},
      "eventId": {...},
      "registrationDate": "2025-11-13T13:44:40.579Z",
      "status": "pending",
      "waitingStatus": "queued",
      "faceVerificationStatus": true,        // ✅ BOOLEAN
      "ticketAvailabilityStatus": "available", // ✅ AUTO-CALCULATED
      "verificationAttempts": 0,
      "ticketIssued": false,
      "createdAt": "2025-11-13T13:44:40.586Z"
    }
  }
}
```

### Get User Registrations (with Auto-Calculated Status)
```bash
GET /api/registrations/users/:userId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "results": 1,
  "data": {
    "registrations": [
      {
        "_id": "6915e0c8298b216c751a126d",
        "eventId": {
          "_id": "691337e4c4145e1999997a49",
          "name": "New Tech Conference",
          "totalTickets": 500,
          "ticketsSold": 0
        },
        "userId": {...},
        "registrationDate": "2025-11-13T13:44:40.579Z",
        "status": "pending",
        "waitingStatus": "queued",
        "faceVerificationStatus": true,        // ✅ From DynamoDB/User.faceId
        "ticketAvailabilityStatus": "available", // ✅ 500 - 0 = 500 available
        "verificationAttempts": 0,
        "lastVerificationAttempt": null,
        "ticketIssued": false
      }
    ]
  }
}
```

## Login Response (with Face Record Info)

When a user logs in, the response includes:

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "6915c1ce111e057ff7b315bc",
      "email": "d@example.com",
      "name": "daksh",
      "role": "user",
      "verificationStatus": "verified",
      "uploadedPhoto": "https://nfacialimagescollections.s3...",
      "hasFaceRecord": true,              // ✅ Indicates face verification
      "faceId": "130401df-6537-4918-...", // ✅ Unique Rekognition ID
      "createdAt": "2025-11-13T11:32:30.995Z"
    }
  }
}
```

## User Verification Endpoints

### Verify User (Approved)
```bash
PATCH /api/users/:userId/verify
Content-Type: application/json
Authorization: Bearer <admin-token>

Body:
{
  "verificationStatus": "verified"
}
```

### Reject User
```bash
PATCH /api/users/:userId/verify
Content-Type: application/json
Authorization: Bearer <admin-token>

Body:
{
  "verificationStatus": "rejected"
}
```

### Set User to Pending
```bash
PATCH /api/users/:userId/verify
Content-Type: application/json
Authorization: Bearer <admin-token>

Body:
{
  "verificationStatus": "pending"
}
```

## User Update Endpoints

### Update User (PUT - Full)
```bash
PUT /api/users/:userId
Content-Type: application/json
Authorization: Bearer <admin-token>

Body:
{
  "name": "Updated Name",
  "phone": "+919999999999"
}
```

### Update User (PATCH - Partial)
```bash
PATCH /api/users/:userId
Content-Type: application/json
Authorization: Bearer <admin-token>

Body:
{
  "phone": "+919999999999"
}
```

## Admin Endpoint - Get All Presigned URLs

### Get All Users with Presigned URLs
```bash
GET /api/signed-urls/admin/all-signed-urls
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Total users: 1 (1 uploaded, 0 pending)",
  "totalUsers": 1,
  "uploadedCount": 1,
  "pendingCount": 0,
  "data": [
    {
      "_id": "6915c1ce111e057ff7b315bc",
      "email": "d@example.com",
      "name": "daksh",
      "phone": "+918824223395",
      "verificationStatus": "verified",
      "uploadedPhoto": "https://nfacialimagescollections.s3...",
      "hasUpload": true,
      "uploadSource": "s3",
      "urls": {
        "uploadedPhoto": {
          "url": "https://nfacialimagescollections.s3...?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
          "originalUrl": "https://nfacialimagescollections.s3...",
          "filename": "6915c1ce111e057ff7b315bc_daksh",
          "isPublic": true,
          "uploadedAt": "2025-11-13T11:35:25.332Z"
        },
        "aadhaarPhoto": null
      }
    }
  ]
}
```

## Postman Collection

A complete Postman collection is available in: **`user-verification-api.postman_collection.json`**

Import this file into Postman to test all endpoints easily.

## Key Features

✅ **Automatic Face Verification Check**
- Queries DynamoDB and User.faceId field
- Boolean result for clarity

✅ **Automatic Ticket Availability**
- Calculates from event totalTickets - ticketsSold
- "available" or "pending" status

✅ **Admin Presigned URLs**
- Get all users' photo URLs in one request
- Automatically generates AWS S3 signed URLs
- 1-hour expiration for security

✅ **User Verification Management**
- PATCH endpoint to set status (verified/rejected/pending)
- Full and partial updates with PUT/PATCH

✅ **Complete User Management**
- Get all users
- Get specific user
- Update user profile
- Get user registrations with auto-calculated status

## Error Handling

All endpoints include proper error handling:
- 404: Not found
- 400: Invalid request
- 403: Unauthorized (admin required)
- 500: Server error

## Testing

Use the provided Postman collection to test all endpoints. Make sure to:
1. Replace `localhost:3000` with your actual server URL
2. Update the bearer token with a valid JWT
3. Use real MongoDB ObjectIds for userId and eventId
