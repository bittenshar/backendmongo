# Event Ticket Purchase Flow with Face Verification - API Documentation

## Overview

This document describes the complete API endpoints for the event ticket purchase flow with face verification. The flow ensures that:
1. Users register for events
2. Their face is verified against their stored profile photo
3. Tickets are issued if verification succeeds and tickets are available
4. Users are added to a waitlist if tickets are sold out or verification fails
5. Admins can review failed verifications and override decisions

## Base URL

```
http://localhost:3000/api
```

---

## 1. Registration Flow

### 1.1 Create Registration

**Endpoint:** `POST /registrations`

Create a new event registration for a user. This initiates the ticket purchase process.

**Request Body:**
```json
{
  "userId": "user_id_here",
  "eventId": "event_id_here",
  "adminBooked": false,
  "adminOverrideReason": null
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Registration created successfully",
  "data": {
    "registration": {
      "_id": "registration_id",
      "userId": {
        "_id": "user_id",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "1234567890"
      },
      "eventId": {
        "_id": "event_id",
        "name": "Tech Conference 2025",
        "date": "2025-12-15",
        "location": "San Francisco"
      },
      "status": "pending",
      "faceVerificationStatus": "pending",
      "ticketAvailabilityStatus": "pending",
      "ticketIssued": false,
      "verificationAttempts": 0
    }
  }
}
```

---

### 1.2 Get Registration Status

**Endpoint:** `GET /registrations/:registrationId/status`

Get the current status of a registration and determine next steps.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "status": "PENDING",
    "message": "Registration in progress",
    "registration": { ... },
    "nextStep": "VERIFY_FACE",
    "faceVerificationStatus": "pending",
    "verificationAttempts": 0
  }
}
```

**Possible nextStep values:**
- `UPLOAD_PHOTO` - User needs to upload a profile photo first
- `VERIFY_FACE` - User needs to upload a face image for verification
- `RETRY_VERIFICATION` - Previous verification failed, user can retry
- `TICKET_ISSUED` - Ticket already issued, registration complete

---

## 2. Face Verification Flow

### 2.1 Validate Face Image

**Endpoint:** `POST /registrations/:registrationId/validate-face-image`

Validate that the uploaded face image meets quality requirements.

**Request Body:**
```json
{
  "faceImageKey": "s3-key-to-face-image"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "message": "Face image is valid",
    "confidence": 98.5,
    "quality": {
      "brightness": 85.2,
      "sharpness": 92.1
    },
    "attributes": {
      "ageRange": { "Low": 25, "High": 35 },
      "eyesOpen": { "Value": true, "Confidence": 99.2 },
      "mouthOpen": { "Value": false, "Confidence": 97.8 },
      "emotions": [
        { "type": "HAPPY", "confidence": 85.3 },
        { "type": "CALM", "confidence": 78.2 }
      ]
    }
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "status": "fail",
  "message": "No face detected in the image"
}
```

---

### 2.2 Verify Face and Issue Ticket

**Endpoint:** `POST /registrations/:registrationId/verify-face`

Compare the provided face image with the user's stored profile photo and issue a ticket if:
- Face verification succeeds
- Tickets are available

**Request Body:**
```json
{
  "faceImageKey": "s3-key-to-face-image",
  "similarityThreshold": 80
}
```

**Response - Success with Ticket (200 OK):**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "message": "Registration completed successfully. Ticket issued!",
    "action": "TICKET_ISSUED",
    "registration": {
      "_id": "registration_id",
      "status": "verified",
      "faceVerificationStatus": "success",
      "ticketIssued": true,
      "ticketIssuedDate": "2025-11-12T10:30:00.000Z"
    },
    "ticket": {
      "_id": "ticket_id",
      "ticketId": "TKT-user-event-1731405000",
      "seatNumber": "SEAT-5432",
      "price": 99.99,
      "status": "active",
      "purchaseDate": "2025-11-12T10:30:00.000Z"
    }
  }
}
```

**Response - Success but Added to Waitlist (200 OK):**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "message": "Face verification successful, but tickets are sold out. Added to waitlist.",
    "action": "ADDED_TO_WAITLIST",
    "registration": { ... },
    "waitlist": {
      "_id": "waitlist_id",
      "position": 5,
      "status": "waiting",
      "joinedAt": "2025-11-12T10:30:00.000Z",
      "reason": "tickets_sold_out"
    }
  }
}
```

**Response - Face Verification Failed (400 Bad Request):**
```json
{
  "status": "fail",
  "data": {
    "success": false,
    "message": "Face verification failed. Please try again or contact support.",
    "action": "ADDED_TO_WAITLIST",
    "similarityScore": 65.3,
    "threshold": 80,
    "registration": {
      "status": "rejected",
      "faceVerificationStatus": "failed"
    }
  }
}
```

---

### 2.3 Retry Face Verification

**Endpoint:** `POST /registrations/:registrationId/retry-verification`

Retry face verification after a failed attempt. Maximum 3 attempts allowed.

**Request Body:**
```json
{
  "faceImageKey": "s3-key-to-new-face-image"
}
```

**Response:** Same as 2.2 (Verify Face and Issue Ticket)

**Error Response (429 Too Many Requests):**
```json
{
  "status": "fail",
  "message": "Maximum verification attempts exceeded. Please contact support."
}
```

---

## 3. Waitlist Management

### 3.1 Get Event Waitlist

**Endpoint:** `GET /waitlist/event/:eventId`

Get the complete waitlist for an event, optionally filtered by status.

**Query Parameters:**
- `status` (optional): Filter by status - `waiting`, `offered`, `accepted`, `rejected`, `expired`

**Response (200 OK):**
```json
{
  "status": "success",
  "results": 3,
  "data": {
    "waitlist": [
      {
        "_id": "waitlist_id_1",
        "position": 1,
        "status": "waiting",
        "userId": {
          "_id": "user_id",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "eventId": {
          "_id": "event_id",
          "name": "Tech Conference 2025",
          "date": "2025-12-15"
        },
        "reason": "tickets_sold_out",
        "joinedAt": "2025-11-12T10:00:00.000Z"
      },
      // ... more entries
    ]
  }
}
```

---

### 3.2 Get User's Waitlist Position

**Endpoint:** `GET /waitlist/user/:userId/event/:eventId`

Get a specific user's position on the waitlist for an event.

**Response - User on Waitlist (200 OK):**
```json
{
  "status": "success",
  "data": {
    "onWaitlist": true,
    "position": {
      "position": 5,
      "status": "waiting",
      "joinedAt": "2025-11-12T10:30:00.000Z",
      "reason": "face_verification_failed",
      "event": {
        "_id": "event_id",
        "name": "Tech Conference 2025",
        "date": "2025-12-15"
      }
    }
  }
}
```

**Response - User Not on Waitlist (200 OK):**
```json
{
  "status": "success",
  "data": {
    "onWaitlist": false,
    "message": "User is not on the waitlist"
  }
}
```

---

### 3.3 Accept Waitlist Offer

**Endpoint:** `POST /waitlist/offer/:waitlistId/accept`

Accept a ticket offer from the waitlist. This issues the ticket.

**Authentication:** Required (user must be authenticated)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "message": "Offer accepted. Ticket issued!"
  }
}
```

---

### 3.4 Reject Waitlist Offer

**Endpoint:** `POST /waitlist/offer/:waitlistId/reject`

Reject a ticket offer from the waitlist.

**Authentication:** Required (user must be authenticated)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "message": "Offer rejected"
  }
}
```

---

### 3.5 Process Waitlist (Admin)

**Endpoint:** `POST /waitlist/process/:eventId`

**Authentication:** Required (admin only)

Process the waitlist and offer available tickets to users at the top of the queue.

**Request Body:**
```json
{
  "slotsAvailable": 5
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "message": "Offered 3 ticket(s) from waitlist",
    "issued": [
      {
        "userId": "user_id_1",
        "eventId": "event_id",
        "position": 1,
        "expiresAt": "2025-11-13T10:30:00.000Z"
      },
      // ... more offers
    ]
  }
}
```

---

### 3.6 Cleanup Expired Offers (Admin)

**Endpoint:** `POST /waitlist/cleanup`

**Authentication:** Required (admin only)

Move users with expired offers back to "waiting" status.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "message": "Cleaned up 2 expired offers"
  }
}
```

---

## 4. Admin Review and Override

### 4.1 Get Failed Verifications

**Endpoint:** `GET /registrations/admin/failed-verifications`

**Authentication:** Required (admin only)

Get all registrations with failed face verification.

**Query Parameters:**
- `eventId` (optional): Filter by event

**Response (200 OK):**
```json
{
  "status": "success",
  "results": 2,
  "data": {
    "failedVerifications": [
      {
        "_id": "registration_id",
        "status": "rejected",
        "faceVerificationStatus": "failed",
        "verificationAttempts": 3,
        "userId": {
          "_id": "user_id",
          "name": "Jane Smith",
          "email": "jane@example.com"
        },
        "eventId": {
          "_id": "event_id",
          "name": "Tech Conference 2025"
        },
        "lastVerificationAttempt": "2025-11-12T10:50:00.000Z"
      },
      // ... more entries
    ]
  }
}
```

---

### 4.2 Admin Override Issue Ticket

**Endpoint:** `POST /registrations/:registrationId/admin/override-ticket`

**Authentication:** Required (admin only)

Force issue a ticket without face verification. Useful for resolving edge cases.

**Request Body:**
```json
{
  "overrideReason": "Customer provided alternative ID verification"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "message": "Ticket issued by admin override",
    "registration": {
      "_id": "registration_id",
      "status": "verified",
      "adminBooked": true,
      "adminOverrideReason": "Customer provided alternative ID verification",
      "ticketIssued": true
    },
    "ticket": {
      "_id": "ticket_id",
      "ticketId": "TKT-ADM-user-1731405000",
      "seatNumber": "SEAT-8765",
      "status": "active"
    }
  }
}
```

---

### 4.3 Review Verification Failure

**Endpoint:** `POST /registrations/:registrationId/admin/review-failure`

**Authentication:** Required (admin only)

Review and take action on a failed verification. Supports three actions:

**Request Body:**
```json
{
  "action": "approve|reject|request_retry",
  "reason": "Detailed reason for the action"
}
```

**Action: approve**
Issues a ticket for the registration.

**Action: reject**
Keeps the registration in rejected status with admin notes.

**Action: request_retry**
Resets verification attempts and allows user to retry.

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Ticket approved and issued by admin",
  "data": {
    "success": true,
    "registration": { ... },
    "ticket": { ... }
  }
}
```

---

## 5. Registration Statistics

### 5.1 Get Registration Statistics

**Endpoint:** `GET /registrations/stats`

Get overall statistics for registrations and ticket issuance.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "statusStats": [
      { "_id": "pending", "count": 15 },
      { "_id": "verified", "count": 42 },
      { "_id": "rejected", "count": 3 }
    ],
    "faceVerificationStats": [
      { "_id": "pending", "count": 8 },
      { "_id": "success", "count": 40 },
      { "_id": "failed", "count": 2 }
    ],
    "ticketStats": {
      "totalRegistrations": 60,
      "ticketsIssued": 42,
      "adminBooked": 2
    }
  }
}
```

---

## Error Codes

| Code | Message | Cause |
|------|---------|-------|
| 400 | Invalid user ID format | Malformed ObjectId |
| 400 | Invalid event ID format | Malformed ObjectId |
| 400 | No face detected in the image | Face image validation failed |
| 400 | Multiple faces detected | Face image has more than one face |
| 400 | Face verification failed | Similarity score below threshold |
| 400 | Ticket already issued | Registration already has a ticket |
| 400 | No tickets available | Event is sold out |
| 404 | Registration not found | Registration ID doesn't exist |
| 404 | User not found on waitlist | User is not on the waitlist |
| 429 | Maximum verification attempts exceeded | User exceeded 3 attempts |
| 500 | Face verification service error | AWS Rekognition API error |

---

## Complete Flow Example

### User Journey

1. **User Registers for Event**
   ```
   POST /api/registrations
   → Registration created with status: pending
   ```

2. **User Uploads Face for Verification**
   ```
   POST /api/registrations/:id/validate-face-image
   → Face image validated
   ```

3. **System Verifies Face and Issues Ticket**
   ```
   POST /api/registrations/:id/verify-face
   → Ticket issued OR added to waitlist OR verification failed
   ```

4. **If Verification Failed, User Can Retry**
   ```
   POST /api/registrations/:id/retry-verification
   → Retry verification (max 3 attempts)
   ```

5. **If Added to Waitlist, User Waits for Offer**
   ```
   GET /api/waitlist/user/:userId/event/:eventId
   → Check waitlist position
   ```

6. **If Offered Ticket from Waitlist, User Accepts**
   ```
   POST /api/waitlist/offer/:waitlistId/accept
   → Ticket issued
   ```

### Admin Journey

1. **Admin Reviews Failed Verifications**
   ```
   GET /api/registrations/admin/failed-verifications
   → See all failed verifications
   ```

2. **Admin Reviews Specific Failure**
   ```
   POST /api/registrations/:id/admin/review-failure
   → Approve, Reject, or Request Retry
   ```

3. **Admin Processes Waitlist**
   ```
   POST /api/waitlist/process/:eventId
   → Offer available tickets to waitlisted users
   ```

---

## Notes

- Face similarity threshold is set to 80 by default (0-100 scale)
- Maximum face verification attempts: 3
- Waitlist offers expire after 24 hours
- All timestamps are in ISO 8601 format (UTC)
- AWS Rekognition is used for face detection and comparison
- Face images must be stored in S3 bucket specified in environment
