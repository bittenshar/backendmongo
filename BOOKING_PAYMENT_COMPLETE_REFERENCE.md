# 🎯 BOOKING + FACE VERIFICATION + RAZORPAY - COMPLETE REFERENCE

## Table of Contents
1. [Quick Start](#quick-start)
2. [API Endpoints](#api-endpoints)
3. [Error Handling](#error-handling)
4. [Examples](#examples)
5. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Start Server
```bash
npm run dev
```

### 2. Run Test
```bash
node complete-booking-payment-test.js
```

### 3. Expected Output
```
✅ User logged in
✅ Face verification checked
✅ Booking initiated
✅ Payment simulated
✅ Booking confirmed
✅ Complete flow executed successfully!
```

---

## API Endpoints

### 1️⃣ Check Face Verification

Check if user is face verified before booking.

**Endpoint:**
```
POST /api/booking-payment/verify-face-status
```

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "630abc123def456ghi789jkl"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "userId": "630abc123def456ghi789jkl",
    "isVerified": true,
    "verificationStatus": "verified",
    "faceId": "Yes",
    "message": "User is face verified"
  }
}
```

**Not Verified Response (200):**
```json
{
  "status": "success",
  "data": {
    "userId": "630abc123def456ghi789jkl",
    "isVerified": false,
    "verificationStatus": "pending",
    "faceId": "No",
    "message": "User is not face verified. Please complete face verification first."
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/booking-payment/verify-face-status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"userId":"630abc123def456ghi789jkl"}'
```

---

### 2️⃣ Initiate Booking with Verification

Create temporary booking and get Razorpay order ID. **User must be face verified.**

**Endpoint:**
```
POST /api/booking-payment/initiate-with-verification
```

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "630abc123def456ghi789jkl",
  "eventId": "630def456ghi789jkl123abc",
  "seatingId": "630ghi789jkl123abc456def",
  "seatType": "Premium",
  "quantity": 2,
  "pricePerSeat": 500
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Booking initiated successfully. User is face verified. Proceed to payment.",
  "data": {
    "booking": {
      "bookingId": "630jkl123abc456def789ghi",
      "userId": "630abc123def456ghi789jkl",
      "eventId": "630def456ghi789jkl123abc",
      "quantity": 2,
      "pricePerSeat": 500,
      "totalPrice": 1000,
      "status": "temporary",
      "expiresAt": "2026-01-22T15:45:00.000Z",
      "createdAt": "2026-01-22T15:30:00.000Z"
    },
    "payment": {
      "razorpayOrderId": "order_Ihg7X2K9lK8mGQ",
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

**Not Verified Error (403):**
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

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/booking-payment/initiate-with-verification \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "630abc123def456ghi789jkl",
    "eventId": "630def456ghi789jkl123abc",
    "seatingId": "630ghi789jkl123abc456def",
    "seatType": "Premium",
    "quantity": 2,
    "pricePerSeat": 500
  }'
```

---

### 3️⃣ Verify Payment & Confirm Booking

Verify Razorpay payment signature and confirm booking. **Called after successful Razorpay payment.**

**Endpoint:**
```
POST /api/booking-payment/confirm-booking
```

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "bookingId": "630jkl123abc456def789ghi",
  "razorpayPaymentId": "pay_Ihg7X2K9lK8mGQ",
  "razorpayOrderId": "order_Ihg7X2K9lK8mGQ",
  "razorpaySignature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
}
```

**Note:** Signature is generated client-side using:
```javascript
const crypto = require('crypto');
const data = `${orderId}|${paymentId}`;
const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
hmac.update(data);
const signature = hmac.digest('hex');
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Booking confirmed successfully! Payment received.",
  "data": {
    "booking": {
      "bookingId": "630jkl123abc456def789ghi",
      "status": "confirmed",
      "userId": "630abc123def456ghi789jkl",
      "eventId": "630def456ghi789jkl123abc",
      "quantity": 2,
      "totalPrice": 1000,
      "confirmedAt": "2026-01-22T15:35:00.000Z",
      "ticketNumbers": []
    },
    "payment": {
      "paymentId": "pay_Ihg7X2K9lK8mGQ",
      "orderId": "order_Ihg7X2K9lK8mGQ",
      "amount": 1000,
      "status": "completed",
      "method": "razorpay"
    },
    "event": {
      "eventId": "630def456ghi789jkl123abc",
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

**Invalid Signature Error (400):**
```json
{
  "status": "failed",
  "message": "Payment verification failed. Invalid signature.",
  "data": {
    "bookingId": "630jkl123abc456def789ghi",
    "status": "cancelled",
    "reason": "Payment verification failed"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/booking-payment/confirm-booking \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "630jkl123abc456def789ghi",
    "razorpayPaymentId": "pay_Ihg7X2K9lK8mGQ",
    "razorpayOrderId": "order_Ihg7X2K9lK8mGQ",
    "razorpaySignature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
  }'
```

---

### 4️⃣ Get Booking Status

Get complete booking details including payment and verification status.

**Endpoint:**
```
GET /api/booking-payment/status/:bookingId
```

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "booking": {
      "bookingId": "630jkl123abc456def789ghi",
      "status": "confirmed",
      "paymentStatus": "completed",
      "quantity": 2,
      "totalPrice": 1000,
      "bookedAt": "2026-01-22T15:30:00.000Z",
      "confirmedAt": "2026-01-22T15:35:00.000Z",
      "expiresAt": "2026-01-22T15:45:00.000Z"
    },
    "payment": {
      "razorpayOrderId": "order_Ihg7X2K9lK8mGQ",
      "razorpayPaymentId": "pay_Ihg7X2K9lK8mGQ",
      "paymentVerified": true,
      "amount": 1000
    },
    "verification": {
      "userVerified": true,
      "verificationStatus": "verified",
      "userId": "630abc123def456ghi789jkl"
    },
    "event": {
      "eventId": "630def456ghi789jkl123abc",
      "eventName": "Concert 2026",
      "eventDate": "2026-02-14"
    }
  }
}
```

**Not Found Error (404):**
```json
{
  "status": "error",
  "message": "Booking not found"
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:5000/api/booking-payment/status/630jkl123abc456def789ghi \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 5️⃣ Cancel Booking

Cancel temporary booking (only works before confirmation).

**Endpoint:**
```
DELETE /api/booking-payment/cancel/:bookingId
```

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "User cancelled the booking"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Booking cancelled successfully",
  "data": {
    "bookingId": "630jkl123abc456def789ghi",
    "status": "cancelled",
    "cancelledAt": "2026-01-22T15:40:00.000Z"
  }
}
```

**Cannot Cancel Confirmed Error (400):**
```json
{
  "status": "error",
  "message": "Cannot cancel a confirmed booking"
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:5000/api/booking-payment/cancel/630jkl123abc456def789ghi \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"reason":"User cancelled the booking"}'
```

---

## Error Handling

### Common Error Codes

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| 401 | Unauthorized | Missing/invalid JWT | Login and get token |
| 403 | User is not face verified | User not verified | Complete face verification |
| 400 | Payment verification failed | Invalid signature | Check signature generation |
| 400 | Booking has expired | 15+ minutes passed | Initiate new booking |
| 400 | Cannot cancel a confirmed booking | Already confirmed | Only temporary can cancel |
| 404 | Booking not found | Invalid booking ID | Check booking ID |
| 500 | Internal server error | Server error | Check server logs |

### Error Response Format

```json
{
  "status": "error",
  "message": "Error description",
  "code": 400,
  "data": {
    "details": "Additional error details"
  }
}
```

---

## Examples

### Example 1: Complete Successful Flow

```bash
# 1. User Login
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","password":"test123"}' \
  | jq -r '.data.token')

USERID=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","password":"test123"}' \
  | jq -r '.data.user._id')

# 2. Check Face Verification
curl -X POST http://localhost:5000/api/booking-payment/verify-face-status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USERID\"}"

# 3. Initiate Booking
BOOKING=$(curl -s -X POST http://localhost:5000/api/booking-payment/initiate-with-verification \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\":\"$USERID\",
    \"eventId\":\"630def456ghi789jkl123abc\",
    \"seatingId\":\"630ghi789jkl123abc456def\",
    \"seatType\":\"Premium\",
    \"quantity\":2,
    \"pricePerSeat\":500
  }")

BOOKINGID=$(echo $BOOKING | jq -r '.data.booking.bookingId')
ORDERID=$(echo $BOOKING | jq -r '.data.payment.razorpayOrderId')

# 4. Simulate Payment & Generate Signature
# (In production, this is done client-side after Razorpay payment)

# 5. Confirm Booking
curl -X POST http://localhost:5000/api/booking-payment/confirm-booking \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"bookingId\":\"$BOOKINGID\",
    \"razorpayPaymentId\":\"pay_test123\",
    \"razorpayOrderId\":\"$ORDERID\",
    \"razorpaySignature\":\"test_signature\"
  }"

# 6. Get Status
curl -X GET http://localhost:5000/api/booking-payment/status/$BOOKINGID \
  -H "Authorization: Bearer $TOKEN"
```

### Example 2: JavaScript Implementation

```javascript
// Complete booking flow in JavaScript

class BookingService {
  constructor(token, baseUrl) {
    this.token = token;
    this.baseUrl = baseUrl;
  }

  async checkVerification(userId) {
    const response = await fetch(`${this.baseUrl}/booking-payment/verify-face-status`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    });
    return response.json();
  }

  async initiateBooking(userId, eventId, seatingId, seatType, quantity, pricePerSeat) {
    const response = await fetch(`${this.baseUrl}/booking-payment/initiate-with-verification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId, eventId, seatingId, seatType, quantity, pricePerSeat
      })
    });
    return response.json();
  }

  async confirmBooking(bookingId, paymentId, orderId, signature) {
    const response = await fetch(`${this.baseUrl}/booking-payment/confirm-booking`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bookingId,
        razorpayPaymentId: paymentId,
        razorpayOrderId: orderId,
        razorpaySignature: signature
      })
    });
    return response.json();
  }

  async getStatus(bookingId) {
    const response = await fetch(`${this.baseUrl}/booking-payment/status/${bookingId}`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return response.json();
  }
}

// Usage
const bookingService = new BookingService(token, 'http://localhost:5000/api');

// Check verification
const verifyResponse = await bookingService.checkVerification(userId);
if (!verifyResponse.data.isVerified) {
  console.log('User not verified');
  return;
}

// Initiate booking
const bookingResponse = await bookingService.initiateBooking(
  userId, eventId, seatingId, 'Premium', 2, 500
);
const { bookingId, razorpayOrderId } = bookingResponse.data;

// Open Razorpay payment
const razorpayOptions = {
  key: RAZORPAY_KEY_ID,
  order_id: razorpayOrderId,
  handler: async (response) => {
    // Confirm booking
    const confirmResponse = await bookingService.confirmBooking(
      bookingId,
      response.razorpay_payment_id,
      response.razorpay_order_id,
      response.razorpay_signature
    );
    console.log('Booking confirmed:', confirmResponse);
  }
};

new Razorpay(razorpayOptions).open();
```

---

## Troubleshooting

### Problem: "User is not face verified"

**Cause:** User's `verificationStatus` is not "verified" or `faceId` is not set.

**Solution:**
1. Check user's verification status in database:
   ```bash
   db.users.findOne({ _id: ObjectId("userId") })
   ```
2. If pending, complete face verification process first
3. Verify again and retry booking

### Problem: "Payment verification failed"

**Cause:** Invalid signature or wrong RAZORPAY_KEY_SECRET

**Solution:**
1. Check `RAZORPAY_KEY_SECRET` in .env
2. Verify signature generation:
   ```javascript
   const data = `${orderId}|${paymentId}`;
   const signature = crypto
     .createHmac('sha256', RAZORPAY_KEY_SECRET)
     .update(data)
     .digest('hex');
   ```
3. Ensure signature matches Razorpay response

### Problem: "Booking has expired"

**Cause:** More than 15 minutes passed since booking initiation

**Solution:**
1. Initiate a new booking
2. Complete payment within 15 minutes

### Problem: Booking stuck in "temporary" status

**Cause:** Payment confirmation not sent

**Solution:**
1. Get booking status to check current state
2. Resend confirmation with correct signature
3. If expired, create new booking

---

**Documentation Version:** 1.0  
**Last Updated:** January 22, 2026  
**Status:** ✅ Complete
