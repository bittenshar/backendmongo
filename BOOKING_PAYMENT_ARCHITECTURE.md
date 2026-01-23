# 🏗️ BOOKING + FACE VERIFICATION + RAZORPAY - ARCHITECTURE

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT APP                              │
│  (Mobile/Web)                                                   │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ HTTPS/REST
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│                    API SERVER (Node.js)                         │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │        API Routes                                       │   │
│  │  POST /api/booking-payment/verify-face-status          │   │
│  │  POST /api/booking-payment/initiate-with-verification  │   │
│  │  POST /api/booking-payment/confirm-booking             │   │
│  │  GET  /api/booking-payment/status/:bookingId           │   │
│  │  DELETE /api/booking-payment/cancel/:bookingId         │   │
│  └────────────────┬──────────────────────────────────────┘   │
│                   │                                             │
│  ┌────────────────▼──────────────────────────────────────┐    │
│  │   Booking-Payment Controller                         │    │
│  │  (booking-with-payment.controller.js)                │    │
│  │                                                        │    │
│  │  1. checkFaceVerification()                           │    │
│  │  2. initiateBookingWithVerification()                 │    │
│  │  3. verifyPaymentAndConfirmBooking()                  │    │
│  │  4. getBookingStatus()                                │    │
│  │  5. cancelBooking()                                   │    │
│  └────────────┬───────────────────┬────────────────────┘    │
│               │                   │                           │
│  ┌────────────▼──┐    ┌──────────▼──────┐                     │
│  │ User Service  │    │ Razorpay Service │                    │
│  │               │    │                  │                    │
│  │ • Check       │    │ • Create Order   │                    │
│  │   verification│    │ • Verify Sig     │                    │
│  │ • Get user    │    │ • Fetch Payment  │                    │
│  │               │    │ • Refund         │                    │
│  └────────────┬──┘    └────────┬─────────┘                    │
│               │                │                              │
│               │                │                              │
│  ┌────────────▼────────────────▼──────────────────────┐       │
│  │              MongoDB Database                      │       │
│  │                                                    │       │
│  │  ┌──────────────┐  ┌──────────────┐               │       │
│  │  │ Users        │  │ Bookings     │               │       │
│  │  │              │  │              │               │       │
│  │  │ • userId     │  │ • bookingId  │               │       │
│  │  │ • email      │  │ • userId     │               │       │
│  │  │ • phone      │  │ • eventId    │               │       │
│  │  │ • face       │  │ • status     │               │       │
│  │  │   Verified   │  │ • razorpay*  │               │       │
│  │  │ • faceId     │  │ • payment*   │               │       │
│  │  │ • verification  │ • confirmed  │               │       │
│  │  │   Status     │  │   At         │               │       │
│  │  └──────────────┘  └──────────────┘               │       │
│  │                                                    │       │
│  │  ┌──────────────┐  ┌──────────────┐               │       │
│  │  │ Payments     │  │ Events       │               │       │
│  │  │              │  │              │               │       │
│  │  │ • paymentId  │  │ • eventId    │               │       │
│  │  │ • orderId    │  │ • name       │               │       │
│  │  │ • amount     │  │ • date       │               │       │
│  │  │ • status     │  │ • location   │               │       │
│  │  │ • razorpay*  │  │ • seatings   │               │       │
│  │  │ • signature  │  │              │               │       │
│  │  └──────────────┘  └──────────────┘               │       │
│  │                                                    │       │
│  └────────────────────────────────────────────────────┘       │
│                                                                │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ API Calls
                     │
        ┌────────────▼───────────────┐
        │   Razorpay API             │
        │                            │
        │  • Create Order            │
        │  • Process Payment         │
        │  • Fetch Payment Details   │
        │  • Refund Payments         │
        │                            │
        └────────────────────────────┘
```

## Data Flow Diagram

### 1. Check Face Verification
```
Client Request
    ↓
Controller: checkFaceVerification()
    ↓
User Service: Get user by ID
    ↓
Check: verificationStatus === 'verified' && faceId exists?
    ↓
Return: { isVerified: true/false }
```

### 2. Initiate Booking
```
Client Request
    │
    ├─ userId
    ├─ eventId
    ├─ seatingId
    ├─ seatType
    ├─ quantity
    └─ pricePerSeat
    ↓
Controller: initiateBookingWithVerification()
    ↓
    ├─ Check: User exists & face verified
    ├─ Check: Event exists
    ├─ Check: Seating available
    ├─ Calculate: totalPrice = quantity × pricePerSeat
    │
    ├─ Booking Service:
    │   ├─ Create temporary booking
    │   ├─ Set status = "temporary"
    │   ├─ Set expiresAt = now + 15 minutes
    │   └─ Save to DB
    │
    ├─ Razorpay Service:
    │   ├─ Create order
    │   │   ├─ amount = totalPrice × 100 (paise)
    │   │   ├─ currency = "INR"
    │   │   └─ notes = { bookingId, type: 'booking_payment' }
    │   └─ Return { orderId, amount, currency }
    │
    └─ Update booking:
        ├─ razorpayOrderId = orderId
        ├─ paymentId = orderId
        └─ Save to DB
        ↓
    Return: { booking, payment, verification }
```

### 3. Payment & Signature Generation (Client-side)
```
Razorpay Payment Gateway
    ↓
User completes payment
    ↓
Razorpay returns:
    ├─ paymentId
    ├─ orderId
    └─ signature
    ↓
Client generates verification signature:
    ↓
    orderId|paymentId → HMAC-SHA256 with KEY_SECRET
    ↓
Send to backend:
    ├─ bookingId
    ├─ paymentId
    ├─ orderId
    └─ signature
```

### 4. Verify Payment & Confirm Booking
```
Client Request (with payment details)
    ↓
Controller: verifyPaymentAndConfirmBooking()
    ↓
Step 1: Find booking by bookingId
    ├─ Check: booking exists
    ├─ Check: status !== 'confirmed'
    └─ Check: orderId matches
    ↓
Step 2: Verify Razorpay Signature
    ├─ Generate expected signature
    │   └─ HMAC-SHA256(orderId|paymentId, KEY_SECRET)
    ├─ Compare: expected === provided
    └─ If NOT valid → Return 400 + Cancel booking
    ↓
Step 3: Re-check Face Verification
    ├─ Get user
    ├─ Check: verificationStatus === 'verified'
    └─ Check: faceId exists
    ├─ If NOT verified → Return 403 + Cancel booking
    ↓
Step 4: Update Booking
    ├─ razorpayPaymentId = paymentId
    ├─ razorpaySignature = signature
    ├─ paymentVerified = true
    ├─ paymentStatus = 'completed'
    ├─ status = 'confirmed'
    ├─ confirmedAt = now
    └─ Save to DB
    ↓
Step 5: Save Payment Record
    ├─ Create Payment document
    ├─ bookingId, userId, eventId
    ├─ orderId, paymentId, amount
    ├─ status = 'completed'
    └─ Save to DB
    ↓
Return: { booking, payment, verification }
```

### 5. Get Booking Status
```
Client Request (bookingId)
    ↓
Controller: getBookingStatus()
    ↓
Find booking by ID with populate:
    ├─ userId → Get user details
    └─ eventId → Get event details
    ↓
Collect data:
    ├─ Booking: status, paymentStatus, price, dates
    ├─ Payment: razorpayIds, verified, amount
    ├─ Verification: userVerified, status, userId
    └─ Event: name, date, location
    ↓
Return: Complete booking summary
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│            SECURITY LAYERS                              │
└─────────────────────────────────────────────────────────┘

Layer 1: Authentication
    ├─ JWT Token verification
    ├─ User must be logged in
    └─ All endpoints protected

Layer 2: Face Verification Check
    ├─ Check at booking initiation
    ├─ Re-check at payment confirmation
    └─ Verified status verified against faceId

Layer 3: Payment Signature Verification
    ├─ HMAC-SHA256 signature
    ├─ orderId|paymentId → signature
    ├─ Verify using RAZORPAY_KEY_SECRET
    └─ Reject if mismatch

Layer 4: Data Validation
    ├─ Required fields check
    ├─ Amount validation
    ├─ Status validation
    └─ Expiry check (15 min for temporary)

Layer 5: Error Handling
    ├─ Invalid signature → 400 + Cancel
    ├─ Verification changed → 403 + Cancel
    ├─ Expired booking → 400
    └─ Duplicate booking → 400
```

## Database Schema

### User Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  phone: String,
  
  // Face Verification
  verificationStatus: ['pending', 'verified', 'rejected'],
  faceId: String,
  uploadedPhoto: String,
  
  // Auth
  password: String,
  token: String,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

### Booking Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  eventId: ObjectId (ref: Event),
  seatingId: ObjectId,
  
  // Booking Details
  seatType: String,
  quantity: Number,
  pricePerSeat: Number,
  totalPrice: Number,
  
  // Status
  status: ['temporary', 'confirmed', 'cancelled', 'used', 'refunded'],
  paymentStatus: ['pending', 'processing', 'completed', 'failed'],
  
  // Razorpay Details
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  paymentVerified: Boolean,
  
  // Timestamps
  bookedAt: Date,
  confirmedAt: Date,
  expiresAt: Date,
  cancelledAt: Date,
  cancellationReason: String
}
```

### Payment Collection
```javascript
{
  _id: ObjectId,
  bookingId: ObjectId (ref: Booking),
  userId: ObjectId (ref: User),
  eventId: ObjectId (ref: Event),
  
  // Payment Details
  orderId: String,
  paymentId: String,
  amount: Number,
  currency: String,
  status: ['pending', 'completed', 'failed'],
  method: 'razorpay',
  
  // Razorpay Response
  razorpayResponse: {
    orderId: String,
    paymentId: String,
    signature: String
  },
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

## File Structure

```
src/
├── features/
│   ├── booking/
│   │   ├── booking-with-payment.controller.js    ← NEW
│   │   ├── booking-with-payment.routes.js        ← NEW
│   │   ├── booking_model.js                      ✓
│   │   └── booking_route.js                      ✓
│   │
│   ├── payment/
│   │   ├── payment.model.js                      ✓
│   │   ├── payment.controller.js                 ✓
│   │   ├── payment.service.js                    ✓
│   │   └── payment.routes.js                     ✓
│   │
│   ├── auth/
│   │   ├── auth.model.js                         ✓
│   │   ├── auth.middleware.js                    ✓
│   │   └── auth.routes.js                        ✓
│   │
│   └── events/
│       └── event.model.js                        ✓
│
├── services/
│   └── razorpay.service.js                       ← NEW
│
└── server.js                                      ✓ UPDATED
```

## Transaction Flow Sequence Diagram

```
Client              Server              MongoDB          Razorpay API
  │                   │                    │                  │
  │ 1. Check Face     │                    │                  │
  ├──────────────────▶│                    │                  │
  │                   │ Query User         │                  │
  │                   ├───────────────────▶│                  │
  │                   │◀───────────────────┤                  │
  │ Verified ✓        │                    │                  │
  │◀──────────────────┤                    │                  │
  │                   │                    │                  │
  │ 2. Initiate       │                    │                  │
  │    Booking        │                    │                  │
  ├──────────────────▶│                    │                  │
  │                   │ Save Booking       │                  │
  │                   ├───────────────────▶│                  │
  │                   │◀───────────────────┤                  │
  │                   │ Create Order       │                  │
  │                   ├─────────────────────────────────────▶│
  │                   │◀─────────────────────────────────────┤
  │ Order ID          │ Update Booking    │                  │
  │◀──────────────────┤ ├───────────────────▶│               │
  │                   │ │◀───────────────────┤               │
  │                   │                    │                  │
  │ 3. Complete       │                    │                  │
  │    Payment        │                    │                  │
  ├─────────────────────────────────────────────────────────▶│
  │                   │                    │ Process Payment  │
  │ Payment ID        │                    │◀─────────────────┤
  │◀─────────────────────────────────────────────────────────┤
  │                   │                    │                  │
  │ 4. Verify & Conf  │                    │                  │
  │    (with sig)     │                    │                  │
  ├──────────────────▶│ Verify Sig         │                  │
  │                   │ Re-check Face      │                  │
  │                   │ ├───────────────────▶│               │
  │                   │ │◀───────────────────┤               │
  │                   │ Update Booking      │                  │
  │                   │ ├───────────────────▶│               │
  │                   │ │◀───────────────────┤               │
  │                   │ Save Payment        │                  │
  │                   │ ├───────────────────▶│               │
  │                   │ │◀───────────────────┤               │
  │ Confirmed ✓       │                    │                  │
  │◀──────────────────┤                    │                  │
  │                   │                    │                  │
  │ 5. Get Status     │                    │                  │
  ├──────────────────▶│ Get Booking        │                  │
  │                   ├───────────────────▶│                  │
  │                   │ With Relations     │                  │
  │                   │◀───────────────────┤                  │
  │ Complete Data ✓   │                    │                  │
  │◀──────────────────┤                    │                  │

```

## API Response Structure

### Success Response
```javascript
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": {
    "booking": { /* booking details */ },
    "payment": { /* payment details */ },
    "verification": { /* verification status */ },
    "event": { /* event details */ }
  }
}
```

### Error Response
```javascript
{
  "status": "failed",
  "message": "Error description",
  "code": 400/403/404/500,
  "data": { /* optional error details */ }
}
```

---

**Architecture Version:** 1.0  
**Last Updated:** January 22, 2026
