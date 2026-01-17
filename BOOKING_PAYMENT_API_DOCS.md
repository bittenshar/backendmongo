# 🎟️ BOOKING + PAYMENT INTEGRATION - COMPLETE API DOCUMENTATION

## Quick Start

### 1️⃣ Create Booking with Payment
```bash
POST /api/booking/create-with-payment
```

**Response:**
- Booking created with `status: "temporary"`
- Razorpay payment order created
- Both stored in database
- Ready for Razorpay checkout

### 2️⃣ Verify Payment & Confirm Booking
```bash
POST /api/booking/:bookingId/verify-payment
```

**Response:**
- Payment signature validated
- Booking updated to `status: "confirmed"`
- All payment data stored

---

## Detailed API Endpoints

### 1. Create Booking with Payment

**Endpoint:**
```
POST /api/booking/create-with-payment
```

**Authentication:** ✅ Required (JWT Bearer Token)

**Request Body:**
```json
{
  "eventId": "607f1f77bcf86cd799439011",
  "seatingId": "507f1f77bcf86cd799439012",
  "seatType": "Premium",
  "quantity": 2,
  "pricePerSeat": 500,
  "specialRequirements": "Accessible seating needed" (optional)
}
```

**Success Response (201):**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "booking": {
      "_id": "607f1f77bcf86cd799439013",
      "userId": "607f1f77bcf86cd799439014",
      "eventId": "607f1f77bcf86cd799439011",
      "seatingId": "507f1f77bcf86cd799439012",
      "seatType": "Premium",
      "quantity": 2,
      "pricePerSeat": 500,
      "totalPrice": 1000,
      "status": "temporary",
      "paymentStatus": "processing",
      "razorpayOrderId": "order_S3uC4VvlqYkRS8",
      "paymentOrder": {
        "orderId": "ORD_6968090a_739479",
        "razorpayOrderId": "order_S3uC4VvlqYkRS8",
        "amount": 100000,
        "currency": "INR",
        "receipt": "BOOKING_607f1f77bcf86cd799439013_1768425739779",
        "key": "rzp_test_ROzpR9FCBfPSds",
        "description": "Event Booking - Seat Type: Premium, Qty: 2",
        "status": "created",
        "createdAt": "2026-01-15T10:35:39.779Z"
      },
      "expiresAt": "2026-01-15T10:50:39.779Z",
      "bookedAt": "2026-01-15T10:35:39.779Z",
      "createdAt": "2026-01-15T10:35:39.779Z",
      "updatedAt": "2026-01-15T10:35:39.779Z"
    },
    "payment": {
      "orderId": "ORD_6968090a_739479",
      "razorpayOrderId": "order_S3uC4VvlqYkRS8",
      "amount": 100000,
      "currency": "INR",
      "receipt": "BOOKING_607f1f77bcf86cd799439013_1768425739779",
      "key": "rzp_test_ROzpR9FCBfPSds",
      "description": "Event Booking - Seat Type: Premium, Qty: 2",
      "userId": "607f1f77bcf86cd799439014",
      "status": "created",
      "createdAt": "2026-01-15T10:35:39.779Z"
    }
  },
  "message": "Booking created successfully. Ready for payment."
}
```

**Error Response (400):**
```json
{
  "status": "error",
  "message": "Missing required fields",
  "statusCode": 400
}
```

**What Gets Stored in Database:**

```javascript
Booking {
  _id: "607f1f77bcf86cd799439013",
  userId: "607f1f77bcf86cd799439014",
  eventId: "607f1f77bcf86cd799439011",
  seatingId: "507f1f77bcf86cd799439012",
  seatType: "Premium",
  quantity: 2,
  pricePerSeat: 500,
  totalPrice: 1000,
  status: "temporary",                           // ← Not yet confirmed
  paymentStatus: "processing",                    // ← Payment initiated
  
  // Razorpay Order Data
  razorpayOrderId: "order_S3uC4VvlqYkRS8",       // ← Razorpay order ID
  paymentOrder: {
    orderId: "ORD_6968090a_739479",
    razorpayOrderId: "order_S3uC4VvlqYkRS8",
    amount: 100000,
    currency: "INR",
    receipt: "BOOKING_...",
    key: "rzp_test_ROzpR9FCBfPSds",
    description: "Event Booking - Seat Type: Premium, Qty: 2",
    status: "created",
    createdAt: Date
  },
  
  // Payment Details (empty until verified)
  razorpayPaymentId: null,
  razorpaySignature: null,
  paymentVerified: false,
  paymentVerificationDetails: null,
  
  expiresAt: "2026-01-15T10:50:39.779Z",        // ← Expires in 15 mins
  bookedAt: "2026-01-15T10:35:39.779Z",
  confirmedAt: null,
  createdAt: "2026-01-15T10:35:39.779Z",
  updatedAt: "2026-01-15T10:35:39.779Z"
}
```

---

### 2. Verify Payment & Confirm Booking

**Endpoint:**
```
POST /api/booking/:bookingId/verify-payment
```

**Parameters:**
- `bookingId`: Booking ID from step 1

**Authentication:** ✅ Required (JWT Bearer Token)

**Request Body:**
```json
{
  "orderId": "order_S3uC4VvlqYkRS8",
  "paymentId": "pay_1768425808670_test",
  "signature": "af5f4afc335301923409fc06f3d9fba1c07e42a0a81d373b0576030361a15581"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "verified": true,
    "booking": {
      "_id": "607f1f77bcf86cd799439013",
      "userId": "607f1f77bcf86cd799439014",
      "eventId": "607f1f77bcf86cd799439011",
      "seatType": "Premium",
      "quantity": 2,
      "totalPrice": 1000,
      "status": "confirmed",                      // ← Updated!
      "paymentStatus": "completed",               // ← Updated!
      "paymentVerified": true,                    // ← Updated!
      "razorpayOrderId": "order_S3uC4VvlqYkRS8",
      "razorpayPaymentId": "pay_1768425808670_test",    // ← Updated!
      "razorpaySignature": "af5f4afc...",         // ← Updated!
      "paymentVerificationDetails": {
        "success": true,
        "verified": true,
        "payment": {...}
      },
      "confirmedAt": "2026-01-15T10:35:45.123Z", // ← Updated!
      "expiresAt": null                           // ← Cleared!
    },
    "payment": {
      "orderId": "order_S3uC4VvlqYkRS8",
      "paymentId": "pay_1768425808670_test",
      "verified": true,
      "verificationDetails": {...}
    }
  },
  "message": "Booking confirmed successfully"
}
```

**Error Response (400):**
```json
{
  "status": "error",
  "message": "Payment verification failed: Invalid payment signature",
  "statusCode": 400
}
```

**What Gets Updated in Database:**

```javascript
Booking {
  // Status Changes
  status: "confirmed",                           // ← "temporary" → "confirmed"
  paymentStatus: "completed",                    // ← "processing" → "completed"
  
  // Payment Details Stored
  razorpayPaymentId: "pay_1768425808670_test",   // ← NEW
  razorpaySignature: "af5f4afc...",              // ← NEW
  paymentVerified: true,                         // ← NEW
  paymentVerificationDetails: {                  // ← NEW
    success: true,
    verified: true,
    payment: {...}
  },
  
  // Timestamps Updated
  confirmedAt: "2026-01-15T10:35:45.123Z",      // ← NEW
  expiresAt: null,                               // ← Cleared!
  updatedAt: "2026-01-15T10:35:45.123Z"         // ← Updated
}
```

---

### 3. Get Booking with Payment Details

**Endpoint:**
```
GET /api/booking/:bookingId/with-payment
```

**Authentication:** ✅ Required (JWT Bearer Token)

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "booking": {
      "_id": "607f1f77bcf86cd799439013",
      "userId": {...},
      "eventId": {...},
      "status": "confirmed",
      "paymentStatus": "completed",
      "seatType": "Premium",
      "quantity": 2,
      "totalPrice": 1000,
      ...
    },
    "payment": {
      "status": "completed",
      "verified": true,
      "razorpayOrderId": "order_S3uC4VvlqYkRS8",
      "razorpayPaymentId": "pay_1768425808670_test",
      "orderDetails": {...},
      "verificationDetails": {...}
    }
  }
}
```

---

### 4. Cancel Booking with Refund

**Endpoint:**
```
POST /api/booking/:bookingId/cancel-with-refund
```

**Authentication:** ✅ Required (JWT Bearer Token)

**Request Body:**
```json
{
  "reason": "Change of plans" (optional)
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "booking": {
      "_id": "607f1f77bcf86cd799439013",
      "status": "cancelled",                      // ← Updated!
      "paymentStatus": "completed",
      "refundAmount": 1000,                       // ← Refund processed
      "cancelledAt": "2026-01-15T10:40:00.000Z",
      "cancellationReason": "Change of plans"
    },
    "message": "Booking cancelled successfully",
    "refundProcessed": true
  }
}
```

---

### 5. Get Payment Receipt

**Endpoint:**
```
GET /api/booking/:bookingId/receipt
```

**Authentication:** ✅ Required (JWT Bearer Token)

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "receipt": {
      "bookingId": "607f1f77bcf86cd799439013",
      "orderId": "ORD_6968090a_739479",
      "razorpayOrderId": "order_S3uC4VvlqYkRS8",
      "razorpayPaymentId": "pay_1768425808670_test",
      "user": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "9876543210"
      },
      "event": {
        "name": "Concert 2026",
        "date": "2026-02-15T19:00:00.000Z",
        "location": "Madison Square Garden"
      },
      "booking": {
        "seatType": "Premium",
        "quantity": 2,
        "pricePerSeat": 500,
        "totalPrice": 1000
      },
      "payment": {
        "method": "razorpay",
        "status": "completed",
        "verified": true,
        "paidAt": "2026-01-15T10:35:45.123Z"
      },
      "ticketNumbers": [
        "TKT-607f1f77bcf86cd799439011-607f1f77bcf86cd799439014-1-1768425745000",
        "TKT-607f1f77bcf86cd799439011-607f1f77bcf86cd799439014-2-1768425745000"
      ],
      "bookedAt": "2026-01-15T10:35:39.779Z"
    }
  },
  "message": "Payment receipt generated successfully"
}
```

---

## Client Implementation Example

### Step 1: Create Booking
```javascript
const createBooking = async () => {
  const response = await fetch('/api/booking/create-with-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      eventId: '607f1f77bcf86cd799439011',
      seatingId: '507f1f77bcf86cd799439012',
      seatType: 'Premium',
      quantity: 2,
      pricePerSeat: 500
    })
  });

  const data = await response.json();
  return data.data; // Returns { booking, payment }
};
```

### Step 2: Open Razorpay Checkout
```javascript
const openRazorpayCheckout = (bookingData) => {
  const { booking, payment } = bookingData;

  const options = {
    key: payment.key,
    amount: payment.amount,
    currency: payment.currency,
    order_id: payment.razorpayOrderId,
    description: payment.description,
    handler: (paymentResponse) => {
      verifyBookingPayment(booking._id, paymentResponse);
    }
  };

  const razorpay = new Razorpay(options);
  razorpay.open();
};
```

### Step 3: Verify Payment
```javascript
const verifyBookingPayment = async (bookingId, paymentResponse) => {
  const response = await fetch(`/api/booking/${bookingId}/verify-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      orderId: paymentResponse.razorpay_order_id,
      paymentId: paymentResponse.razorpay_payment_id,
      signature: paymentResponse.razorpay_signature
    })
  });

  const data = await response.json();
  
  if (data.data.verified) {
    alert('Booking confirmed!');
    // Redirect to booking details
  }
};
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│              BOOKING + PAYMENT FLOW                      │
└─────────────────────────────────────────────────────────┘

1. Client POST /api/booking/create-with-payment
   ↓
   Backend:
   ├─ Create Booking (temporary)
   ├─ Call Payment API: POST /api/payments/create-order
   ├─ Store Razorpay OrderID in Booking
   └─ Return: booking + payment details
   ↓
2. Client receives Razorpay Order ID + Key
   ├─ Show Razorpay Checkout Modal
   └─ User completes payment
   ↓
3. Razorpay returns paymentId + signature
   ↓
4. Client POST /api/booking/:bookingId/verify-payment
   ↓
   Backend:
   ├─ Validate orderId matches
   ├─ Call Payment API: POST /api/payments/verify
   ├─ Verify HMAC-SHA256 signature
   ├─ Update Booking status to "confirmed"
   ├─ Store Payment ID + Signature
   └─ Return: confirmed booking
   ↓
5. Database State:
   ├─ Booking: status = "confirmed"
   ├─ Booking: paymentStatus = "completed"
   ├─ Booking: razorpayPaymentId = "pay_..."
   └─ Booking: razorpaySignature = "..."
```

---

## Database Schema

### Booking Collection (with payment fields)

```javascript
{
  // Original fields
  _id: ObjectId,
  userId: ObjectId,
  eventId: ObjectId,
  seatingId: ObjectId,
  seatType: String,
  quantity: Number,
  pricePerSeat: Number,
  totalPrice: Number,
  status: String,                    // "temporary", "confirmed", "cancelled"
  specialRequirements: String,
  expiresAt: Date,
  bookedAt: Date,
  confirmedAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  refundAmount: Number,
  ticketNumbers: [String],
  qrCodes: [String],
  
  // PAYMENT FIELDS (NEW)
  razorpayOrderId: String,           // From Payment API
  razorpayPaymentId: String,         // From Razorpay after payment
  razorpaySignature: String,         // HMAC-SHA256 signature
  paymentStatus: String,             // "pending", "processing", "completed", "failed"
  paymentMethod: String,             // "razorpay", "card", "upi", etc.
  paymentOrder: Object,              // Entire response from create-order
  paymentVerified: Boolean,          // true after verification
  paymentVerificationDetails: Object,// Verification response
  
  createdAt: Date,
  updatedAt: Date
}
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Missing required fields` | Missing eventId, seatingId, etc. | Check all fields in request |
| `Booking not found` | Invalid bookingId | Verify bookingId from response |
| `Payment order ID does not match` | OrderId doesn't match booking | Use correct orderId from step 1 |
| `Invalid payment signature` | Signature verification failed | Re-verify Razorpay response |
| `Payment verification failed` | Generic verification error | Check error message details |

---

## Security Features

✅ **JWT Authentication** - All endpoints require valid token  
✅ **HMAC-SHA256 Verification** - Payment signature validated  
✅ **Order Matching** - orderId verified against booking  
✅ **User Isolation** - Users can only access their bookings  
✅ **Idempotency** - Payment can only be verified once  
✅ **Booking Expiry** - Temporary bookings auto-expire in 15 mins  

---

## Testing with cURL

### 1. Create Booking
```bash
curl -X POST http://localhost:3000/api/booking/create-with-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "eventId":"607f1f77bcf86cd799439011",
    "seatingId":"507f1f77bcf86cd799439012",
    "seatType":"Premium",
    "quantity":2,
    "pricePerSeat":500
  }' | jq '.'
```

### 2. Verify Payment
```bash
curl -X POST http://localhost:3000/api/booking/607f1f77bcf86cd799439013/verify-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "orderId":"order_S3uC4VvlqYkRS8",
    "paymentId":"pay_1768425808670_test",
    "signature":"af5f4afc335301923409fc06f3d9fba1c07e42a0a81d373b0576030361a15581"
  }' | jq '.'
```

### 3. Get Booking with Payment
```bash
curl -X GET http://localhost:3000/api/booking/607f1f77bcf86cd799439013/with-payment \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### 4. Get Payment Receipt
```bash
curl -X GET http://localhost:3000/api/booking/607f1f77bcf86cd799439013/receipt \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

---

## Summary

✅ **Booking Created** → Stored with temporary status  
✅ **Payment Initiated** → Razorpay order created and stored  
✅ **Payment Verified** → Booking confirmed and payment details stored  
✅ **Data Complete** → All payment info available in booking record  
✅ **Refunds Supported** → Cancel booking to process refund  
✅ **Receipts Generated** → Payment receipt available after verification  

Your booking system now has **full payment integration** with Razorpay! 🎉
