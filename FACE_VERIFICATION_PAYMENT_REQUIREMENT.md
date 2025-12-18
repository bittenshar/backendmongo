# Face Verification Payment Requirement

## Overview
Users can **ONLY** proceed with seat booking and payment if they have a **verified face record in DynamoDB**.

## Business Logic Flow

```
User Attempts to Book/Pay
         ↓
Check if User Has Face Record in DynamoDB
         ↓
   ✅ Face Found?        ❌ No Face Found?
         ↓                      ↓
  Allow Booking        Block Booking (403)
  & Payment           "Face verification required"
         ↓
Complete Transaction
```

## API Changes

### 1. **Book Seat Endpoint** (`POST /api/bookings/book-seat`)
**New Requirement:** Face verification check added before locking seats

**Request:**
```json
{
  "eventId": "EVENT_ID",
  "seatingId": "SEATING_ID",
  "userId": "USER_ID",
  "specialRequirements": "optional"
}
```

**Response if NO face record (403):**
```json
{
  "status": "error",
  "message": "Face verification required. Please complete face verification before booking seats.",
  "code": 403
}
```

**Response if face verified (201):**
```json
{
  "status": "success",
  "message": "Seats locked successfully. Proceeding to payment",
  "data": {
    "booking": {
      "bookingId": "...",
      "eventId": "...",
      "seatingId": "...",
      "seatType": "...",
      "quantity": 1,
      "pricePerSeat": 500,
      "totalPrice": 500,
      "expiresAt": "2025-12-19T15:30:00Z",
      "expiresIn": 15
    }
  }
}
```

### 2. **Confirm Seat After Payment** (`POST /api/bookings/confirm-seat`)
**New Requirement:** Face verification check added before confirming payment

**Request:**
```json
{
  "bookingId": "BOOKING_ID",
  "paymentId": "PAYMENT_ID",
  "paymentMethod": "card"
}
```

**Response if NO face record (403):**
```json
{
  "status": "error",
  "message": "Face verification required. Please complete face verification before proceeding with payment.",
  "code": 403
}
```

**Response if face verified (200):**
```json
{
  "status": "success",
  "message": "Booking confirmed successfully",
  "data": {
    "booking": {
      "bookingId": "...",
      "eventId": "...",
      "seatingId": "...",
      "seatType": "...",
      "quantity": 1,
      "totalPrice": 500,
      "status": "confirmed",
      "ticketNumbers": ["TKT001"],
      "confirmedAt": "2025-12-19T15:25:00Z"
    }
  }
}
```

## DynamoDB Face Record Structure

### Example Face Record
```json
{
  "success": true,
  "image": {
    "hasUploadedImage": true,
    "message": "User has an uploaded image",
    "imageUrl": "https://nfacialimagescollections.s3.ap-south-1.amazonaws.com/public/6915c1ce111e057ff7b315bc_daksh",
    "uploadInfo": {
      "filename": "6915c1ce111e057ff7b315bc_daksh",
      "userId": "6915c1ce111e057ff7b315bc",
      "uploadedAt": "2025-11-13T11:35:25.332Z",
      "fileUrl": "https://nfacialimagescollections.s3.ap-south-1.amazonaws.com/public/6915c1ce111e057ff7b315bc_daksh",
      "storage": "aws_s3",
      "s3Key": "public/6915c1ce111e057ff7b315bc_daksh"
    }
  },
  "face": {
    "hasFaceRecord": true,
    "message": "User has a face record",
    "faceRecord": {
      "rekognitionId": "130401df-6537-4918-802f-67f0af747497",
      "fullName": "daksh",
      "status": "verified",
      "userId": "6915c1ce111e057ff7b315bc",
      "uploadedAt": "2025-12-18T21:07:09.236Z",
      "source": "dynamodb_faceimage"
    }
  }
}
```

## Implementation Details

### Controllers Modified
1. **`bookSeat.controller.js`** - Added face verification check before locking seats
2. **`confirmSeat.controller.js`** - Added face verification check before confirming payment

### Service Used
- **`dynamodbService.checkIfUserFaceExists(userId)`** - Checks if user has face record
- **`dynamodbService.getUserFaceRecord(userId)`** - Retrieves face record details

### Error Handling
- **403 Forbidden:** User doesn't have face verification
- **500 Internal Server Error:** Face verification check failed (with fallback allow)
- **404 Not Found:** Booking not found
- **400 Bad Request:** Invalid input or booking expired

## User Journey

### Step 1: User Uploads Face Image
- User navigates to face verification page
- Uploads facial image
- System stores in AWS S3 and creates DynamoDB record
- Face is verified via AWS Rekognition

### Step 2: User Browses Events
- Views available events and seats
- Selects desired seats

### Step 3: User Attempts to Book Seat
```
POST /api/bookings/book-seat
{
  "eventId": "...",
  "seatingId": "...",
  "userId": "..."
}
```
- **Check:** Does user have face record? ✅ YES → Continue
- **Check:** Does user have face record? ❌ NO → Return 403, prompt face verification
- Locks seats for 15 minutes
- Returns temporary booking

### Step 4: User Proceeds to Payment
- Sees booking details and total price
- Only visible if face verification passed

### Step 5: User Confirms Payment
```
POST /api/bookings/confirm-seat
{
  "bookingId": "...",
  "paymentId": "..."
}
```
- **Check:** Does user have face record? ✅ YES → Continue
- **Check:** Does user have face record? ❌ NO → Return 403, prompt face verification
- Converts locked seats to sold
- Generates ticket numbers
- Booking confirmed ✅

## Testing

### Test Case 1: User WITHOUT Face Verification
```bash
curl -X POST http://localhost:3000/api/bookings/book-seat \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "EVENT_ID",
    "seatingId": "SEATING_ID",
    "userId": "USER_WITHOUT_FACE"
  }'
```
**Expected:** 403 Forbidden - "Face verification required"

### Test Case 2: User WITH Face Verification
```bash
curl -X POST http://localhost:3000/api/bookings/book-seat \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "EVENT_ID",
    "seatingId": "SEATING_ID",
    "userId": "USER_WITH_FACE_VERIFIED"
  }'
```
**Expected:** 201 Created - Booking locked successfully

## Database Queries

### Check Face Existence
```javascript
const exists = await dynamodbService.checkIfUserFaceExists(userId);
// Returns: true/false
```

### Get Face Record Details
```javascript
const record = await dynamodbService.getUserFaceRecord(userId);
// Returns: { success: true, data: { RekognitionId, Status, ... } }
```

## Error Handling & Fallback

### DynamoDB Unavailable
- Logs warning: "Face verification check failed"
- **Allows continuation** to prevent system-wide failure
- Production recommendation: Implement retry logic and circuit breaker

### Suggested Improvements
1. Add retry logic for transient DynamoDB failures
2. Implement circuit breaker pattern
3. Add metrics/monitoring for face verification checks
4. Consider caching face verification status (short TTL)

## Related Endpoints

- **Check Face Status:** `GET /api/auth/get-image-status/:userId`
- **Upload Face:** `POST /api/registrations/upload-face`
- **Face Records:** Various endpoints in `userEventRegistration.routes.js`

## Compliance & Security

✅ **Ensures:**
- Only verified users can book paid events
- Face verification is mandatory for payment
- Prevents fraudulent bookings
- Maintains audit trail in DynamoDB

## Configuration

Ensure these environment variables are set:
```env
DYNAMODB_FACE_IMAGE_TABLE=faceimage
DYNAMODB_FACE_VALIDATION_TABLE=faceimage
AWS_ACCESS_KEY_ID=YOUR_KEY
AWS_SECRET_ACCESS_KEY=YOUR_SECRET
AWS_REGION=ap-south-1
```

## Timeline

- **v1.0:** Face verification check implemented for seat booking
- **Future:** Integration with advanced verification (liveness detection)
