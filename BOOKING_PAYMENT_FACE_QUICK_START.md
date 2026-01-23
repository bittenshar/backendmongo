# ⚡ QUICK START - BOOKING + FACE VERIFICATION + RAZORPAY

## 🎯 What Is This?

A **complete booking system** that:
1. ✅ Checks if user is face verified
2. ✅ Creates temporary booking with Razorpay order
3. ✅ Verifies payment signature
4. ✅ Confirms booking after payment

## 📦 What's Included

```
✓ booking-with-payment.controller.js      (Main logic)
✓ booking-with-payment.routes.js          (API endpoints)
✓ razorpay.service.js                     (Payment service)
✓ complete-booking-payment-test.js        (Test script)
✓ Booking_Payment_Face_Verification.postman_collection.json  (Postman)
✓ BOOKING_WITH_FACE_VERIFICATION_PAYMENT.md                  (Full docs)
```

## 🚀 Setup (2 minutes)

### 1. Make sure .env has Razorpay keys:
```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. Server routes are already added to src/server.js
```javascript
const bookingPaymentRoutes = require('./features/booking/booking-with-payment.routes');
app.use('/api/booking-payment', bookingPaymentRoutes);
```

### 3. Start server:
```bash
npm run dev
```

## 🧪 Test in 30 seconds

### Option 1: Node Script (Easiest)
```bash
node complete-booking-payment-test.js
```

Output:
```
✅ User logged in
✅ Face verification checked
✅ Booking initiated
✅ Payment simulated
✅ Booking confirmed
✅ Booking status retrieved
```

### Option 2: Postman

1. Import: `Booking_Payment_Face_Verification.postman_collection.json`
2. Set variables:
   - `token`: Your JWT
   - `userId`: User ID
   - `eventId`: Event ID
   - `seatingId`: Seating ID
3. Run requests in order

## 🔄 API Endpoints

| Step | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 1 | POST | `/api/booking-payment/verify-face-status` | Check if user verified |
| 2 | POST | `/api/booking-payment/initiate-with-verification` | Create booking + Razorpay order |
| 3 | POST | `/api/booking-payment/confirm-booking` | Verify payment & confirm |
| 4 | GET | `/api/booking-payment/status/:bookingId` | Get booking status |
| 5 | DELETE | `/api/booking-payment/cancel/:bookingId` | Cancel booking |

## 💡 How It Works

### Flow Diagram
```
User clicks "Book Now"
    ↓
Step 1: Check Face Verification
    ├─ Verified? → Continue
    └─ Not verified? → STOP (Show error)
    ↓
Step 2: Initiate Booking
    ├─ Create temporary booking (15 min timeout)
    ├─ Create Razorpay order
    └─ Return order ID to client
    ↓
Step 3: User Pays (Client-side)
    ├─ Razorpay payment gateway
    ├─ Generate signature
    └─ Send to backend
    ↓
Step 4: Confirm Booking
    ├─ Verify signature ✓
    ├─ Re-check face verification ✓
    ├─ Update booking to "confirmed"
    └─ Save payment record
    ↓
Done! Booking confirmed 🎉
```

## 📋 Request Examples

### 1. Check Face Verification
```bash
curl -X POST http://localhost:5000/api/booking-payment/verify-face-status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID"}'
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "isVerified": true,
    "verificationStatus": "verified"
  }
}
```

### 2. Initiate Booking
```bash
curl -X POST http://localhost:5000/api/booking-payment/initiate-with-verification \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "eventId": "EVENT_ID",
    "seatingId": "SEATING_ID",
    "seatType": "Premium",
    "quantity": 2,
    "pricePerSeat": 500
  }'
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "booking": {
      "bookingId": "630abc...",
      "totalPrice": 1000,
      "status": "temporary"
    },
    "payment": {
      "razorpayOrderId": "order_abc123"
    }
  }
}
```

### 3. Confirm Booking (After Payment)
```bash
curl -X POST http://localhost:5000/api/booking-payment/confirm-booking \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "BOOKING_ID",
    "razorpayPaymentId": "pay_abc123",
    "razorpayOrderId": "order_abc123",
    "razorpaySignature": "signature_hash"
  }'
```

**Response:**
```json
{
  "status": "success",
  "message": "Booking confirmed successfully! Payment received.",
  "data": {
    "booking": {
      "status": "confirmed"
    },
    "payment": {
      "status": "completed"
    }
  }
}
```

### 4. Get Booking Status
```bash
curl -X GET http://localhost:5000/api/booking-payment/status/BOOKING_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "booking": {
      "status": "confirmed",
      "totalPrice": 1000
    },
    "verification": {
      "userVerified": true
    }
  }
}
```

## 🔐 Security

### Face Verification is Checked:
1. **At booking initiation** - User must be verified to start booking
2. **At payment confirmation** - Double-check user is still verified

### Payment Signature:
```javascript
// Generated client-side after Razorpay payment
const data = `${orderId}|${paymentId}`;
const signature = HMAC-SHA256(data, RAZORPAY_KEY_SECRET);
```

**Verified on backend** - Must match to confirm booking

## ❌ Error Handling

### User Not Verified
```json
{
  "status": "failed",
  "message": "User is not face verified",
  "code": 403
}
```

### Invalid Signature
```json
{
  "status": "failed",
  "message": "Payment verification failed. Invalid signature.",
  "code": 400
}
```

### Booking Expired
```json
{
  "status": "failed",
  "message": "Booking has expired",
  "code": 400
}
```

## 📊 Booking Statuses

| Status | Meaning |
|--------|---------|
| `temporary` | Awaiting payment (15 min timeout) |
| `confirmed` | Payment verified ✓ |
| `cancelled` | User cancelled |
| `used` | Event attended |
| `refunded` | Refund processed |

## 💳 Payment Statuses

| Status | Meaning |
|--------|---------|
| `pending` | Awaiting payment |
| `completed` | Payment verified ✓ |
| `failed` | Payment failed |

## 🎁 Features

✅ **Face Verification Required** - Only verified users can book  
✅ **Secure Payment** - HMAC-SHA256 signature verification  
✅ **Auto-Cleanup** - Temporary bookings expire after 15 minutes  
✅ **Double-Check Security** - Verification checked at initiation & confirmation  
✅ **Complete Audit Trail** - All booking & payment details saved  
✅ **Easy Testing** - Postman collection + Node script included  

## 📖 Full Documentation

See `BOOKING_WITH_FACE_VERIFICATION_PAYMENT.md` for:
- ✓ Detailed API documentation
- ✓ Database schema
- ✓ Complete examples
- ✓ Error scenarios
- ✓ Implementation details

## 🚨 Troubleshooting

### Issue: "User is not face verified"
- **Solution:** Complete face verification first
- **Status:** `verificationStatus` should be "verified"
- **Check:** User must have `faceId` set

### Issue: "Payment verification failed"
- **Solution:** Signature must match exactly
- **Check:** Use correct `RAZORPAY_KEY_SECRET`
- **Formula:** `HMAC-SHA256(orderId|paymentId, KEY_SECRET)`

### Issue: "Booking has expired"
- **Solution:** Complete payment within 15 minutes
- **Fix:** Initiate booking again

## 🔗 Related Files

- Booking model: `src/features/booking/booking_model.js`
- Auth model: `src/features/auth/auth.model.js`
- Payment service: `src/features/payment/payment.service.js`
- Server config: `src/server.js`

## ✅ Checklist

- [x] Face verification required
- [x] Razorpay integration
- [x] Signature verification
- [x] Secure payment flow
- [x] Auto-cleanup (15 min)
- [x] Complete audit trail
- [x] Error handling
- [x] Postman collection
- [x] Test script
- [x] Documentation

---

**Ready to use!** 🚀

Run: `node complete-booking-payment-test.js`
