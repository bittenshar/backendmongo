# Event Ticket Purchase Flow with Face Verification - Implementation Summary

## Overview

This implementation provides a complete event ticket purchase system with AWS Rekognition-based face verification. The system ensures secure ticket distribution with automatic waitlist management.

## Architecture

### Components Created

1. **Face Verification Service** (`src/shared/services/faceVerification.service.js`)
   - Detects faces in images using AWS Rekognition
   - Compares user faces with stored profile photos
   - Validates single face detection and image quality
   - Returns similarity scores and verification results

2. **Registration Flow Service** (`src/features/registrations/registration-flow.service.js`)
   - Orchestrates the complete ticket purchase flow
   - Handles face verification, ticket issuance, and waitlist management
   - Manages verification attempts and admin overrides
   - Provides status tracking for registrations

3. **Waitlist Model & Service** 
   - **Model** (`src/features/waitlist/waitlist.model.js`): Tracks waitlist entries with position and offer status
   - **Service** (`src/features/waitlist/waitlist.service.js`): Manages waitlist operations, offers, and position tracking
   - Supports automatic position reordering and offer expiration cleanup

4. **Updated Registration Model** (`src/features/registrations/userEventRegistration.model.js`)
   - Already includes face verification fields:
     - `faceVerificationStatus`: pending, processing, success, failed
     - `ticketAvailabilityStatus`: pending, available, unavailable
     - `verificationAttempts`: Tracks retry attempts
     - `ticketIssued`: Boolean flag for ticket issuance
     - `adminBooked`: Flag for admin override

### Database Models

#### UserEventRegistration Schema
```
- userId: Reference to User
- eventId: Reference to Event
- status: pending | verified | rejected
- faceVerificationStatus: pending | processing | success | failed
- ticketAvailabilityStatus: pending | available | unavailable
- verificationAttempts: Number (max 3)
- ticketIssued: Boolean
- ticketIssuedDate: Date
- adminBooked: Boolean
- adminOverrideReason: String
```

#### Waitlist Schema
```
- eventId: Reference to Event
- userId: Reference to User
- registrationId: Reference to Registration
- position: Number (queue position)
- status: waiting | offered | accepted | rejected | expired
- reason: tickets_sold_out | face_verification_failed
- ticketOfferedDate: Date
- offerExpiresAt: Date (24 hours from offer)
- joinedAt: Date
```

## API Endpoints

### Registration & Face Verification
- `POST /api/registrations` - Create registration
- `GET /api/registrations/:registrationId/status` - Get registration status
- `POST /api/registrations/:registrationId/validate-face-image` - Validate face image
- `POST /api/registrations/:registrationId/verify-face` - Verify face and issue ticket
- `POST /api/registrations/:registrationId/retry-verification` - Retry verification

### Waitlist Management
- `GET /api/waitlist/event/:eventId` - Get event waitlist
- `GET /api/waitlist/user/:userId/event/:eventId` - Get user's waitlist position
- `POST /api/waitlist/offer/:waitlistId/accept` - Accept waitlist offer
- `POST /api/waitlist/offer/:waitlistId/reject` - Reject waitlist offer
- `POST /api/waitlist/process/:eventId` (Admin) - Process waitlist offers
- `POST /api/waitlist/cleanup` (Admin) - Clean up expired offers

### Admin Review & Override
- `GET /api/registrations/admin/failed-verifications` - View failed verifications
- `POST /api/registrations/:registrationId/admin/override-ticket` - Force issue ticket
- `POST /api/registrations/:registrationId/admin/review-failure` - Review failure and take action

## Flow Diagrams

### Standard Ticket Flow
```
User Registers
    ↓
User Uploads Face
    ↓
System Validates Face Quality
    ↓
System Compares with Stored Profile Photo
    ↓
    ├─ Success + Tickets Available → Issue Ticket ✓
    ├─ Success + No Tickets → Add to Waitlist
    └─ Failed → Add to Waitlist + Allow Retry (max 3 attempts)
```

### Waitlist Processing
```
Admin Processes Waitlist
    ↓
System Offers Tickets to Top Waitlist Users (24-hour expiry)
    ↓
    ├─ User Accepts → Issue Ticket ✓
    ├─ User Rejects → Remove from Offer, Reorder Queue
    └─ Offer Expires → Move Back to Waiting
```

### Admin Override Flow
```
Admin Reviews Failed Verification
    ↓
    ├─ Approve → Force Issue Ticket + Remove from Waitlist
    ├─ Reject → Keep Rejected, Add Admin Notes
    └─ Request Retry → Reset Attempts, Allow User to Try Again
```

## Key Features

### 1. Face Verification
- Uses AWS Rekognition for accurate face detection and comparison
- Validates single face detection (rejects multiple faces)
- Checks image quality (brightness, sharpness)
- Configurable similarity threshold (default 80/100)
- Tracks verification attempts (max 3 per registration)

### 2. Automatic Ticket Issuance
- Issues tickets immediately upon successful verification + availability
- Creates unique ticket IDs with timestamp
- Updates event ticket count automatically
- Records ticket issuance timestamp

### 3. Waitlist Management
- Automatic position assignment based on join time
- Tracks waitlist reason (sold out vs. verification failed)
- 24-hour offer expiration for fairness
- Automatic position reordering on removal
- Batch processing for multiple slots

### 4. Admin Capabilities
- View all failed verifications with timestamps
- Override individual registrations with reason tracking
- Approve/Reject/Request Retry for failed verifications
- Process entire waitlist at once
- Force ticket issuance for edge cases

### 5. Error Handling
- Graceful handling of invalid images
- Clear error messages for users
- Validation of face image quality
- User retry mechanism with attempt tracking
- Admin notification system ready

## Integration Requirements

### AWS Services
- **S3 Bucket**: Store face images (configured via `AWS_S3_BUCKET` env var)
- **Rekognition**: Face detection and comparison API (auto-initialized in aws-robust.js)

### Dependencies
- AWS SDK v3 (already installed)
- Express.js (routing)
- Mongoose (MongoDB ODM)
- bcrypt (password hashing for auth)

### Environment Variables Required
```
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-south-1
JWT_SECRET=your-jwt-secret
```

## Testing Flow

### 1. Create Admin Account
```bash
POST /api/admin-public/register
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "SecurePass123",
  "passwordConfirm": "SecurePass123",
  "phone": "1234567890"
}
```

### 2. Login as Admin
```bash
POST /api/auth/admin-login
{
  "email": "admin@example.com",
  "password": "SecurePass123"
}
```

### 3. Create Event
```bash
POST /api/events
{
  "name": "Tech Conference 2025",
  "date": "2025-12-15",
  "startTime": "09:00",
  "endTime": "17:00",
  "location": "San Francisco",
  "totalTickets": 100,
  "ticketPrice": 99.99,
  "description": "Annual tech conference"
}
```

### 4. Register User
```bash
POST /api/registrations
{
  "userId": "user_id_here",
  "eventId": "event_id_here"
}
```

### 5. Verify Face
```bash
POST /api/registrations/:registrationId/verify-face
{
  "faceImageKey": "path/to/face/image.jpg"
}
```

## File Structure

```
src/
├── features/
│   ├── registrations/
│   │   ├── userEventRegistration.model.js (updated)
│   │   ├── userEventRegistration.controller.js (updated with new endpoints)
│   │   ├── userEventRegistration.routes.js (updated with new routes)
│   │   └── registration-flow.service.js (NEW)
│   ├── waitlist/
│   │   ├── waitlist.model.js (NEW)
│   │   ├── waitlist.controller.js (NEW)
│   │   ├── waitlist.routes.js (NEW)
│   │   └── waitlist.service.js (NEW)
│   └── tickets/
│       └── ticket.service.js (NEW - for ticket issuance)
├── shared/
│   └── services/
│       └── faceVerification.service.js (NEW)
├── docs/
│   └── event-ticket-face-verification-api.md (NEW)
└── server.js (updated - added waitlist routes)
```

## Performance Considerations

1. **Database Indexes**: Waitlist has indexes on (eventId, position), userId, status, and eventId+status
2. **Lazy Loading**: Face verification only runs when explicitly triggered
3. **Batch Processing**: Admin can process multiple waitlist slots at once
4. **Automatic Cleanup**: Expired offers cleaned up on-demand or scheduled

## Security Features

1. Face verification requires authenticated user
2. Admin endpoints require admin role
3. Each verification attempt tracked to prevent abuse
4. Ticket IDs include timestamp and randomization
5. Offer expiration prevents indefinite holds
6. Admin actions logged with reasons

## Future Enhancements

1. **Scheduled Tasks**: Automatic cleanup of expired offers
2. **Email Notifications**: Notify users of waitlist offers and status changes
3. **SMS Notifications**: Alert users when tickets become available
4. **Liveness Detection**: Add liveness check to prevent spoofing
5. **Multiple Faces**: Allow comparison with multiple stored photos
6. **Batch Operations**: Bulk user registration and verification
7. **Analytics**: Track verification success rates and common failure reasons
8. **Webhook Integration**: Send events to external systems

## Troubleshooting

### Face Verification Fails
- Check S3 image exists and is valid
- Verify AWS credentials are correct
- Check image quality (brightness, sharpness)
- Ensure only one face in image

### Ticket Not Issued
- Check event has available tickets
- Verify event exists in database
- Check registration status
- Review admin logs for errors

### Waitlist Not Showing
- Confirm user is added to waitlist
- Check waitlist collection exists
- Verify event ID is correct
- Review waitlist status filters

## Documentation

Full API documentation is available in: `src/docs/event-ticket-face-verification-api.md`
