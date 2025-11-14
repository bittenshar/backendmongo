# Face Verification Implementation - Quick Reference

## What Was Implemented

A complete event ticket purchase flow with AWS Rekognition-based face verification and automatic waitlist management.

## New Files Created

### Services
1. **`src/shared/services/faceVerification.service.js`** (NEW)
   - Face detection using AWS Rekognition
   - Face comparison for identity verification
   - Image quality validation
   - Single face detection enforcement

2. **`src/features/registrations/registration-flow.service.js`** (NEW)
   - Orchestrates the complete ticket purchase flow
   - Manages face verification → ticket issuance → waitlist logic
   - Admin override capabilities
   - Registration status tracking

3. **`src/features/waitlist/waitlist.service.js`** (NEW)
   - Waitlist management (add, remove, update position)
   - Ticket offer processing and expiration
   - Batch processing for admins
   - Automatic cleanup of expired offers

### Models
1. **`src/features/waitlist/waitlist.model.js`** (NEW)
   - Mongoose schema for waitlist entries
   - Indexes for performance

### Controllers
1. **`src/features/waitlist/waitlist.controller.js`** (NEW)
   - Request handlers for all waitlist endpoints
   - Validation and response formatting

### Routes
1. **`src/features/waitlist/waitlist.routes.js`** (NEW)
   - All waitlist endpoints
   - Public and admin routes

### Updated Files
1. **`src/features/registrations/userEventRegistration.controller.js`** (UPDATED)
   - Added face verification endpoints
   - Added admin review endpoints
   - `verifyFaceAndIssueTicket()`
   - `validateFaceImage()`
   - `getRegistrationStatus()`
   - `retryFaceVerification()`
   - `getFailedVerifications()`
   - `adminOverrideIssueTicket()`
   - `reviewVerificationFailure()`

2. **`src/features/registrations/userEventRegistration.routes.js`** (UPDATED)
   - New routes for face verification
   - Admin review routes

3. **`src/server.js`** (UPDATED)
   - Mounted waitlist routes

### Documentation
1. **`src/docs/event-ticket-face-verification-api.md`** (NEW)
   - Complete API documentation
   - Request/response examples
   - Error codes and handling

2. **`src/docs/face-verification-implementation.md`** (NEW)
   - Implementation architecture
   - Component overview
   - Integration requirements
   - Testing flows

## Key Endpoints

### Registration Flow
```
POST   /api/registrations                              Create registration
GET    /api/registrations/:id/status                   Get status
POST   /api/registrations/:id/verify-face              Verify face & issue ticket
POST   /api/registrations/:id/validate-face-image      Validate image
POST   /api/registrations/:id/retry-verification       Retry verification
```

### Waitlist Management
```
GET    /api/waitlist/event/:eventId                    Get event waitlist
GET    /api/waitlist/user/:userId/event/:eventId       Get user position
POST   /api/waitlist/offer/:waitlistId/accept          Accept offer
POST   /api/waitlist/offer/:waitlistId/reject          Reject offer
POST   /api/waitlist/process/:eventId                  Process waitlist (Admin)
POST   /api/waitlist/cleanup                           Cleanup expired (Admin)
```

### Admin Review
```
GET    /api/registrations/admin/failed-verifications   View failures
POST   /api/registrations/:id/admin/override-ticket    Force ticket
POST   /api/registrations/:id/admin/review-failure     Review & act
```

## Database Schema Changes

### UserEventRegistration (Already had these fields)
- `faceVerificationStatus`: pending, processing, success, failed
- `ticketAvailabilityStatus`: pending, available, unavailable
- `verificationAttempts`: Number (max 3)
- `ticketIssued`: Boolean
- `ticketIssuedDate`: Date
- `adminBooked`: Boolean
- `adminOverrideReason`: String

### Waitlist (NEW Collection)
- `eventId`: ObjectId ref Event
- `userId`: ObjectId ref User
- `registrationId`: ObjectId ref Registration
- `position`: Number (queue order)
- `status`: waiting, offered, accepted, rejected, expired
- `reason`: tickets_sold_out, face_verification_failed
- `ticketOfferedDate`: Date
- `offerExpiresAt`: Date (24 hours)
- `joinedAt`: Date
- Indexes on: (eventId, position), userId, status, (eventId, status)

## Flow Logic

### Standard Registration Flow
```
1. User creates registration
   → status: pending, faceVerificationStatus: pending
   
2. User uploads face image to S3
   
3. System validates face image
   → Single face detection + quality check
   
4. User triggers face verification
   → Compare with stored profile photo
   
   IF success AND tickets available
      → Issue ticket, status: verified
      
   ELSE IF success AND NO tickets
      → Add to waitlist, status: pending
      
   ELSE IF failed
      → Add to waitlist, status: rejected
      → Allow retry (max 3 attempts)
```

### Waitlist Offer Flow
```
1. Admin processes waitlist (or automatic)
   
2. System offers tickets to top N users
   → Offer expires in 24 hours
   
3. User accepts offer
   → Ticket issued, removed from waitlist
   
4. User rejects or offer expires
   → Moved back to waiting, position updated
```

### Admin Override Flow
```
1. Admin reviews failed verification
   
2. Admin chooses action:
   - Approve: Issue ticket immediately
   - Reject: Keep rejected status
   - Request Retry: Reset attempts, let user try again
```

## AWS Integration

### S3 Bucket
- Stores user profile photos and face verification images
- Environment: `AWS_S3_BUCKET`

### Rekognition
- Detects faces in images
- Compares faces for identity verification
- Returns confidence scores and face details
- Auto-initialized via aws-robust.js

### Required Permissions
```
s3:GetObject
s3:PutObject
rekognition:DetectFaces
rekognition:CompareFaces
```

## Testing Steps

### 1. Setup
```bash
# Ensure .env has valid AWS credentials and MongoDB URI
# MongoDB must be running
# S3 bucket must exist and be accessible
```

### 2. Create Test Admin
```bash
POST /api/admin-public/register
{
  "name": "Test Admin",
  "email": "admin@test.com",
  "password": "Password123",
  "passwordConfirm": "Password123"
}
```

### 3. Login Admin
```bash
POST /api/auth/admin-login
{
  "email": "admin@test.com",
  "password": "Password123"
}
```

### 4. Create Test Event
```bash
POST /api/events (with admin token)
{
  "name": "Test Event",
  "date": "2025-12-25",
  "startTime": "10:00",
  "endTime": "18:00",
  "location": "Test Location",
  "totalTickets": 5,
  "ticketPrice": 50
}
```

### 5. Register User
```bash
POST /api/registrations
{
  "userId": "user_id",
  "eventId": "event_id"
}
```

### 6. Verify Face
```bash
POST /api/registrations/:id/verify-face
{
  "faceImageKey": "path/to/face.jpg",
  "similarityThreshold": 80
}
```

## Configuration

### Face Verification Threshold
Default: 80/100. Adjust in `registration-flow.service.js`:
```javascript
// Line in processRegistrationWithFaceVerification()
similarityThreshold || 80  // Change 80 to your threshold
```

### Waitlist Offer Expiry
Default: 24 hours. Adjust in `waitlist.service.js`:
```javascript
// Line in processWaitlist()
const offerExpiresIn = 24;  // Change to hours you prefer
```

### Max Verification Attempts
Default: 3. Adjust in `registration-flow.service.js`:
```javascript
// Line in retryFaceVerification()
if (registration.verificationAttempts >= 3)  // Change 3 to your limit
```

## Error Handling

The system handles:
- ✓ Invalid face images
- ✓ Multiple faces in image
- ✓ Low-quality face images
- ✓ Face mismatch (low similarity)
- ✓ Sold-out events
- ✓ Invalid registrations
- ✓ Expired offers
- ✓ Max retry attempts exceeded
- ✓ AWS API errors

See `event-ticket-face-verification-api.md` for error codes.

## Performance Notes

- Face verification runs only when triggered (not automatic)
- Waitlist queries use indexes for fast lookups
- Position reordering is optimized (only updates affected records)
- Batch processing for admin waitlist operations
- AWS Rekognition is asynchronous but awaited

## Security

- ✓ Face verification requires authenticated user
- ✓ Admin operations require admin role
- ✓ Verification attempts are tracked and limited
- ✓ Offer expiration prevents indefinite holds
- ✓ Ticket IDs are unique (user + event + timestamp)
- ✓ Admin actions include reason tracking

## Next Steps

Optional enhancements:
1. Add scheduled job for automatic offer expiry cleanup
2. Add email/SMS notifications for waitlist offers
3. Add liveness detection to prevent spoofing
4. Add analytics dashboard for verification stats
5. Add webhook integration for external systems
6. Add bulk registration/verification endpoints

## Support

- API Documentation: `src/docs/event-ticket-face-verification-api.md`
- Implementation Guide: `src/docs/face-verification-implementation.md`
- Check server logs for AWS Rekognition errors
- Ensure S3 images are publicly readable for Rekognition access
