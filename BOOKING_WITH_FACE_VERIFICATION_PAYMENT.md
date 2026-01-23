# 🎫 BOOKING WITH FACE VERIFICATION + RAZORPAY PAYMENT

Complete implementation of booking system with face verification and Razorpay payment integration.

## 📋 Flow Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  BOOKING PAYMENT FLOW                       │
└─────────────────────────────────────────────────────────────┘

1. CHECK FACE VERIFICATION
   └─> User is verified? → Continue
       └─> Not verified? → REJECT (403)

2. INITIATE BOOKING
   ├─ Verify user is face verified ✓
   ├─ Verify event exists ✓
   ├─ Calculate total price ✓
   ├─ Create temporary booking ✓
   ├─ Create Razorpay order ✓
   └─ Return booking + payment details

3. USER PAYS (Client-side)
   ├─ User completes Razorpay payment
   ├─ Generate signature: HMAC-SHA256(orderId|paymentId)
   └─ Send signature to backend

4. VERIFY & CONFIRM
   ├─ Verify signature ✓
   ├─ Double-check face verification ✓
   ├─ Update booking status to "confirmed" ✓
   ├─ Save payment record ✓
   └─ Return confirmation

5. GET STATUS
   └─ Retrieve booking + payment + verification details

6. CANCEL (Optional)
   └─ Cancel only temporary bookings
```

## 🔐 Security Flow

```
FACE VERIFICATION CHECK (Step 1)
↓
User verified → Continue
User NOT verified → Return 403 Forbidden

BOOKING INITIATION (Step 2)
↓
Face verification re-checked
↓
Temporary booking created (15-min expiry)
↓
Razorpay order generated

PAYMENT VERIFICATION (Step 4)
↓
Signature verified: HMAC-SHA256(orderId|paymentId, KEY_SECRET)
↓
Face verification re-checked (security double-check)
↓
Booking confirmed

STATUS CHECK (Step 5)
↓
Return complete booking + payment + verification details
```

## 📁 File Structure

```
src/features/booking/
├── booking-with-payment.controller.js    # Main logic
├── booking-with-payment.routes.js        # API routes
├── booking_model.js                      # Booking schema
└── booking_route.js                      # Existing routes

src/services/
└── razorpay.service.js                   # Razorpay integration

src/features/auth/
├── auth.model.js                         # User model with verificationStatus
└── auth.middleware.js                    # Auth middleware

src/server.js                             # Main server (routes added)
```

## 🚀 API Endpoints

### 1. Check Face Verification Status

```http
POST /api/booking-payment/verify-face-status
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "userId": "user_id"
}
```

**Response (Verified):**
```json
{
  "status": "success",
  "data": {
    "userId": "user_id",
    "isVerified": true,
    "verificationStatus": "verified",
    "faceId": "Yes",
    "message": "User is face verified"
  }
}
```

**Response (Not Verified):**
```json
{
  "status": "success",
  "data": {
    "userId": "user_id",
    "isVerified": false,
    "verificationStatus": "pending",
    "faceId": "No",
    "message": "User is not face verified. Please complete face verification first."
  }
}
```

### 2. Initiate Booking with Verification

```http
POST /api/booking-payment/initiate-with-verification
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "userId": "user_id",
  "eventId": "event_id",
  "seatingId": "seating_id",
  "seatType": "Premium",
  "quantity": 2,
  "pricePerSeat": 500
}
```

**Response (Success - Face Verified):**
```json
{
  "status": "success",
  "message": "Booking initiated successfully. User is face verified. Proceed to payment.",
  "data": {
    "booking": {
      "bookingId": "booking_id",
      "userId": "user_id",
      "eventId": "event_id",
      "quantity": 2,
      "pricePerSeat": 500,
      "totalPrice": 1000,
      "status": "temporary",
      "expiresAt": "2026-01-22T15:45:00Z",
      "createdAt": "2026-01-22T15:30:00Z"
    },
    "payment": {
      "razorpayOrderId": "order_abc123xyz",
      "amount": 100000,
      "currency": "INR",
      "userEmail": "user@example.com",
      "userName": "John Doe",
      "userPhone": "9876543210"
    },
    "verification": {
      "faceVerified": true,
      "verificationStatus": "verified"
    }
  }
}
```

**Response (Failure - Face Not Verified):**
```json
{
  "status": "failed",
  "message": "User is not face verified",
  "data": {
    "isVerified": false,
    "reason": "Complete face verification before booking",
    "verificationStatus": "pending"
  }
}
```

### 3. Verify Payment & Confirm Booking

```http
POST /api/booking-payment/confirm-booking
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "bookingId": "booking_id",
  "razorpayPaymentId": "pay_abc123xyz",
  "razorpayOrderId": "order_abc123xyz",
  "razorpaySignature": "sha256_signature_hash"
}
```

**Response (Success - Payment Verified):**
```json
{
  "status": "success",
  "message": "Booking confirmed successfully! Payment received.",
  "data": {
    "booking": {
      "bookingId": "booking_id",
      "status": "confirmed",
      "userId": "user_id",
      "eventId": "event_id",
      "quantity": 2,
      "totalPrice": 1000,
      "confirmedAt": "2026-01-22T15:35:00Z",
      "ticketNumbers": []
    },
    "payment": {
      "paymentId": "pay_abc123xyz",
      "orderId": "order_abc123xyz",
      "amount": 1000,
      "status": "completed",
      "method": "razorpay"
    },
    "event": {
      "eventId": "event_id",
      "eventName": "Concert 2026",
      "eventDate": "2026-02-14",
      "location": "City Hall"
    },
    "verification": {
      "faceVerified": true
    }
  }
}
```

**Response (Failure - Invalid Signature):**
```json
{
  "status": "failed",
  "message": "Payment verification failed. Invalid signature.",
  "data": {
    "bookingId": "booking_id",
    "status": "cancelled",
    "reason": "Payment verification failed"
  }
}
```

### 4. Get Booking Status

```http
GET /api/booking-payment/status/{{bookingId}}
Authorization: Bearer {{token}}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "booking": {
      "bookingId": "booking_id",
      "status": "confirmed",
      "paymentStatus": "completed",
      "quantity": 2,
      "totalPrice": 1000,
      "bookedAt": "2026-01-22T15:30:00Z",
      "confirmedAt": "2026-01-22T15:35:00Z",
      "expiresAt": "2026-01-22T15:45:00Z"
    },
    "payment": {
      "razorpayOrderId": "order_abc123xyz",
      "razorpayPaymentId": "pay_abc123xyz",
      "paymentVerified": true,
      "amount": 1000
    },
    "verification": {
      "userVerified": true,
      "verificationStatus": "verified",
      "userId": "user_id"
    },
    "event": {
      "eventId": "event_id",
      "eventName": "Concert 2026",
      "eventDate": "2026-02-14"
    }
  }
}
```

### 5. Cancel Booking

```http
DELETE /api/booking-payment/cancel/{{bookingId}}
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "reason": "User cancelled the booking"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Booking cancelled successfully",
  "data": {
    "bookingId": "booking_id",
    "status": "cancelled",
    "cancelledAt": "2026-01-22T15:40:00Z"
  }
}
```

## 💻 Implementation Details

### Booking Model Updates

The booking model includes:
```javascript
{
  userId: ObjectId,
  eventId: ObjectId,
  seatingId: ObjectId,
  seatType: String,
  quantity: Number,
  pricePerSeat: Number,
  totalPrice: Number,
  
  // Status tracking
  status: ['temporary', 'confirmed', 'cancelled', 'used', 'refunded'],
  paymentStatus: ['pending', 'processing', 'completed', 'failed'],
  
  // Razorpay details
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  paymentVerified: Boolean,
  
  // Timestamps
  bookedAt: Date,
  confirmedAt: Date,
  expiresAt: Date (15 minutes for temporary)
}
```

### Face Verification Check

User must have:
- `verificationStatus === 'verified'`
- `faceId` is set (not null/undefined)

If not verified:
- Return 403 Forbidden
- Message: "User is not face verified"

### Razorpay Order Creation

```javascript
// In booking-with-payment.controller.js
const razorpayOrder = await createRazorpayOrder(
  totalPrice,        // Amount in rupees
  bookingId,         // Booking ID as reference
  email,             // Customer email
  phone,             // Customer phone
  name               // Customer name
);

// Returns: { id, amount, currency, ... }
```

### Payment Signature Verification

```javascript
// Client generates signature after Razorpay payment:
const signatureData = `${orderId}|${paymentId}`;
const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
hmac.update(signatureData);
const signature = hmac.digest('hex');

// Send to backend for verification
// Backend verifies: expected_sig === provided_sig
```

## 🧪 Testing

### Using Node.js Script

```bash
# Run complete test flow
node complete-booking-payment-test.js
```

This script:
1. ✓ Gets user token
2. ✓ Checks face verification
3. ✓ Initiates booking
4. ✓ Simulates payment
5. ✓ Confirms booking
6. ✓ Gets booking status

### Using Postman

1. Import collection: `Booking_Payment_Face_Verification.postman_collection.json`
2. Set environment variables:
   - `base_url`: http://localhost:5000/api
   - `token`: Your JWT token
   - `userId`: User ID
   - `eventId`: Event ID
   - `seatingId`: Seating ID
3. Run requests in order:
   - Check Face Verification
   - Initiate Booking
   - Verify Payment & Confirm
   - Get Booking Status
   - Cancel (optional)

## 🔧 Configuration

### Environment Variables

```env
# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

### Database Indexes

The system creates indexes on:
- `userId` (for quick lookup)
- `eventId` (for event bookings)
- `razorpayOrderId` (for order lookup)
- `status` (for filtering)
- `expiresAt` (auto-delete temporary bookings)

## ✅ Success Criteria

### Complete Successful Flow

1. **Face Verification Check** ✓
   - User is verified
   - Returns verification status

2. **Booking Initiation** ✓
   - User verified
   - Event exists
   - Razorpay order created
   - Temporary booking created (expires in 15 min)

3. **Payment Verification** ✓
   - Signature matches
   - Face verification re-checked
   - Booking confirmed

4. **Confirmation** ✓
   - Booking status: "confirmed"
   - Payment status: "completed"
   - Payment record saved

## 🚨 Error Scenarios

### 1. User Not Face Verified

**Request:**
```json
{
  "userId": "unverified_user_id",
  "eventId": "event_id"
}
```

**Response:**
```json
{
  "status": "failed",
  "message": "User is not face verified",
  "data": {
    "isVerified": false,
    "reason": "Complete face verification before booking"
  }
}
```

### 2. Payment Signature Mismatch

**Issue:** Invalid signature provided

**Response:**
```json
{
  "status": "failed",
  "message": "Payment verification failed. Invalid signature.",
  "data": {
    "status": "cancelled"
  }
}
```

### 3. Face Verification Changed

**Issue:** User's verification revoked after booking initiation

**Response:**
```json
{
  "status": "failed",
  "message": "Face verification status changed. Booking cannot be confirmed."
}
```

### 4. Booking Expired

**Issue:** Temporary booking expired (15 min timeout)

**Response:**
```json
{
  "status": "failed",
  "message": "Booking has expired"
}
```

## 📊 Booking Statuses

```
temporary  → pending payment (15 min timeout)
confirmed  → payment received & verified
cancelled  → user or system cancelled
used       → customer attended event
refunded   → refund processed
```

## 💳 Payment Statuses

```
pending    → awaiting payment
processing → payment in progress
completed  → payment received & verified
failed     → payment failed or signature invalid
```

## 🔄 Complete Example Workflow

### Step 1: User Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","password":"test123"}'
```

### Step 2: Check Verification
```bash
curl -X POST http://localhost:5000/api/booking-payment/verify-face-status \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID"}'
```

### Step 3: Initiate Booking
```bash
curl -X POST http://localhost:5000/api/booking-payment/initiate-with-verification \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"USER_ID",
    "eventId":"EVENT_ID",
    "seatingId":"SEATING_ID",
    "seatType":"Premium",
    "quantity":2,
    "pricePerSeat":500
  }'
```

### Step 4: Complete Razorpay Payment
- User completes payment on client-side
- Client generates signature: HMAC-SHA256(orderId|paymentId)

### Step 5: Confirm Booking
```bash
curl -X POST http://localhost:5000/api/booking-payment/confirm-booking \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId":"BOOKING_ID",
    "razorpayPaymentId":"pay_xxx",
    "razorpayOrderId":"order_xxx",
    "razorpaySignature":"signature_hash"
  }'
```

### Step 6: Get Booking Status
```bash
curl -X GET http://localhost:5000/api/booking-payment/status/BOOKING_ID \
  -H "Authorization: Bearer TOKEN"
```

## 📝 Notes

- Temporary bookings auto-delete after 15 minutes (MongoDB TTL index)
- Face verification is checked at initiation AND confirmation
- Payment signature must match: HMAC-SHA256(orderId|paymentId, KEY_SECRET)
- All times are in UTC/ISO format
- Booking IDs and Payment IDs are MongoDB ObjectIds

---

**Version:** 1.0  
**Last Updated:** January 22, 2026  
**Status:** ✅ Ready for Production
