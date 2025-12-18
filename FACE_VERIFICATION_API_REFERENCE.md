# Face Verification Payment Integration

## API Endpoints

### 1. Check if User Has Face Verification
**Endpoint:** `GET /api/registrations/check-face-exists/:userId`

**Purpose:** Verify user has face record before attempting booking

**Example:**
```bash
curl -X GET http://localhost:3000/api/registrations/check-face-exists/6915c1ce111e057ff7b315bc \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (User HAS face):**
```json
{
  "status": "success",
  "message": "User has valid face record",
  "data": {
    "userId": "6915c1ce111e057ff7b315bc",
    "hasValidRecord": true,
    "record": {
      "RekognitionId": "130401df-6537-4918-802f-67f0af747497",
      "FullName": "daksh",
      "Status": "verified",
      "Timestamp": "2025-12-18T21:07:09.236Z"
    }
  }
}
```

**Response (User DOES NOT have face):**
```json
{
  "status": "success",
  "message": "User has no face record",
  "data": {
    "userId": "USER_ID",
    "hasValidRecord": false,
    "record": null
  }
}
```

---

### 2. Get Image Status (Complete Verification Info)
**Endpoint:** `GET /api/get-image-status/:userId`

**Purpose:** Get complete image and face verification status

**Example:**
```bash
curl -X GET http://localhost:3000/api/get-image-status/6915c1ce111e057ff7b315bc \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
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

---

### 3. Book Seat (NOW WITH FACE VERIFICATION)
**Endpoint:** `POST /api/bookings/book-seat`

**Changes:** ✅ Now checks for face verification before locking seats

**Request:**
```json
{
  "eventId": "EVENT_ID",
  "seatingId": "SEATING_ID",
  "userId": "6915c1ce111e057ff7b315bc",
  "specialRequirements": "Optional wheelchair access"
}
```

**Response - Success (Face Verified):**
```json
{
  "status": "success",
  "message": "Seats locked successfully. Proceeding to payment",
  "data": {
    "booking": {
      "bookingId": "6750a1b2c3d4e5f6g7h8i9j0",
      "eventId": "EVENT_ID",
      "seatingId": "SEATING_ID",
      "seatType": "VIP",
      "quantity": 1,
      "pricePerSeat": 500,
      "totalPrice": 500,
      "expiresAt": "2025-12-19T15:30:00Z",
      "expiresIn": 15
    },
    "event": {
      "eventId": "EVENT_ID",
      "eventName": "Concert 2025",
      "seatingLocked": 3,
      "remainingSeats": 97
    }
  }
}
```

**Response - Error (NO Face Verified):**
```json
{
  "status": "error",
  "statusCode": 403,
  "message": "Face verification required. Please complete face verification before booking seats."
}
```

---

### 4. Confirm Seat After Payment (NOW WITH FACE VERIFICATION)
**Endpoint:** `POST /api/bookings/confirm-seat`

**Changes:** ✅ Now checks for face verification before confirming payment

**Request:**
```json
{
  "bookingId": "6750a1b2c3d4e5f6g7h8i9j0",
  "paymentId": "PAY_625a8f4c8d9e0f1a2b3c4d5e",
  "paymentMethod": "card"
}
```

**Response - Success (Face Verified):**
```json
{
  "status": "success",
  "message": "Booking confirmed successfully",
  "data": {
    "booking": {
      "bookingId": "6750a1b2c3d4e5f6g7h8i9j0",
      "eventId": "EVENT_ID",
      "seatingId": "SEATING_ID",
      "seatType": "VIP",
      "quantity": 1,
      "totalPrice": 500,
      "status": "confirmed",
      "ticketNumbers": ["TKT001625a8f"],
      "confirmedAt": "2025-12-19T15:25:00Z"
    },
    "event": {
      "eventId": "EVENT_ID",
      "seatingSold": 4,
      "seatingLocked": 2,
      "remainingSeats": 96
    }
  }
}
```

**Response - Error (NO Face Verified):**
```json
{
  "status": "error",
  "statusCode": 403,
  "message": "Face verification required. Please complete face verification before proceeding with payment."
}
```

---

### 5. Get Seat Availability
**Endpoint:** `GET /api/bookings/seat-availability/:eventId`

**Purpose:** Check available seats before booking

**Example:**
```bash
curl -X GET http://localhost:3000/api/bookings/seat-availability/EVENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "eventId": "EVENT_ID",
    "eventName": "Concert 2025",
    "seatings": [
      {
        "id": "SEATING_ID_1",
        "seatType": "VIP",
        "price": 500,
        "totalSeats": 100,
        "seatsSold": 3,
        "lockedSeats": 3,
        "remainingSeats": 94,
        "status": "available"
      },
      {
        "id": "SEATING_ID_2",
        "seatType": "General",
        "price": 300,
        "totalSeats": 200,
        "seatsSold": 45,
        "lockedSeats": 10,
        "remainingSeats": 145,
        "status": "available"
      }
    ]
  }
}
```

---

### 6. Release Seat Lock
**Endpoint:** `POST /api/bookings/release-seat-lock/:bookingId`

**Purpose:** Release locked seats when user cancels payment

**Example:**
```bash
curl -X POST http://localhost:3000/api/bookings/release-seat-lock/6750a1b2c3d4e5f6g7h8i9j0 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "status": "success",
  "message": "Seat lock released",
  "data": {
    "bookingId": "6750a1b2c3d4e5f6g7h8i9j0",
    "status": "cancelled"
  }
}
```

---

## Complete User Journey API Sequence

### 1️⃣ Pre-Booking: Check Face Verification
```bash
# Step 1: Check if user has face verification
GET /api/registrations/check-face-exists/USER_ID

# OR

GET /api/get-image-status/USER_ID
```

**If response shows `hasFaceRecord: false` → Direct user to face upload**

### 2️⃣ Browse Events
```bash
# Step 2: Get available seats
GET /api/bookings/seat-availability/EVENT_ID
```

### 3️⃣ Book Seat
```bash
# Step 3: Lock seats (requires face verification) ✅ NEW CHECK
POST /api/bookings/book-seat
{
  "eventId": "EVENT_ID",
  "seatingId": "SEATING_ID",
  "userId": "USER_ID"
}
```

**If `face` not verified → 403 Forbidden**

### 4️⃣ Process Payment
User completes payment with payment gateway

### 5️⃣ Confirm Booking
```bash
# Step 4: Confirm booking (requires face verification) ✅ NEW CHECK
POST /api/bookings/confirm-seat
{
  "bookingId": "BOOKING_ID",
  "paymentId": "PAYMENT_ID",
  "paymentMethod": "card"
}
```

**If `face` not verified → 403 Forbidden**

### 6️⃣ Success
- Booking confirmed
- Tickets generated
- Seats marked as sold
- User receives ticket numbers

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| 201 | Created | Seat locked successfully |
| 200 | OK | Booking confirmed successfully |
| 400 | Bad Request | Missing fields, expired booking, invalid input |
| 403 | Forbidden | **Face verification required** |
| 404 | Not Found | Booking/Event/Seating not found |
| 500 | Server Error | Internal error (but allows with warning if DynamoDB fails) |

---

## Key Implementation Details

### File Changes
```
✅ bookSeat.controller.js
   - Added: dynamodbService import
   - Added: checkIfUserFaceExists call
   - Returns: 403 if face not verified

✅ confirmSeat.controller.js
   - Added: dynamodbService import
   - Added: checkIfUserFaceExists call
   - Returns: 403 if face not verified
```

### Service Method Used
```javascript
const hasFaceRecord = await dynamodbService.checkIfUserFaceExists(userId);
// Returns: true/false
// Throws: Error if DynamoDB check fails (caught & logged)
```

### Error Handling
- **DynamoDB Available:** Face check performed, 403 returned if no face
- **DynamoDB Unavailable:** Warning logged, booking allowed to continue (graceful fallback)

---

## Testing Commands

### Test 1: Verify API is working
```bash
# Get seat availability
curl -X GET http://localhost:3000/api/bookings/seat-availability/EVENT_ID \
  -H "Authorization: Bearer TOKEN"
```

### Test 2: Book without face
```bash
curl -X POST http://localhost:3000/api/bookings/book-seat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"eventId":"EVENT_ID","seatingId":"SEATING_ID","userId":"NO_FACE_USER_ID"}'
```

**Expected:** 403 Forbidden

### Test 3: Book with face
```bash
curl -X POST http://localhost:3000/api/bookings/book-seat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"eventId":"EVENT_ID","seatingId":"SEATING_ID","userId":"6915c1ce111e057ff7b315bc"}'
```

**Expected:** 201 Created

### Test 4: Confirm payment with face
```bash
curl -X POST http://localhost:3000/api/bookings/confirm-seat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"bookingId":"BOOKING_ID","paymentId":"PAY_ID","paymentMethod":"card"}'
```

**Expected:** 200 OK

---

## Related Documentation

- [Face Verification Payment Requirement](./FACE_VERIFICATION_PAYMENT_REQUIREMENT.md)
- [Testing Guide](./FACE_VERIFICATION_TESTING_GUIDE.md)
- [bookSeat Controller](./src/features/booking/bookSeat.controller.js)
- [confirmSeat Controller](./src/features/booking/confirmSeat.controller.js)
- [DynamoDB Service](./src/services/aws/dynamodb.service.js)
