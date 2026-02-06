# Quick Postman Testing - 5 Simple Steps

## 🎯 Copy-Paste Ready Requests

### Step 1️⃣: Login
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "test123"
}
```
**Save:** `token`, `userId`

---

### Step 2️⃣: Verify Face
```
POST http://localhost:5000/api/booking-payment/verify-face-status
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "userId": "YOUR_USER_ID_HERE"
}
```
**Check:** `"verified": true` ✅

---

### Step 3️⃣: Initiate Booking
```
POST http://localhost:5000/api/booking-payment/initiate-with-verification
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "userId": "YOUR_USER_ID_HERE",
  "eventId": "YOUR_EVENT_ID",
  "seatingId": "YOUR_SEATING_ID",
  "seatType": "Premium",
  "quantity": 2,
  "pricePerSeat": 500
}
```
**Save:** `bookingId`, `razorpayOrderId`

---

### Step 4️⃣: Generate Signature ⭐ NEW!
```
POST http://localhost:5000/api/payments/test-generate-signature
Content-Type: application/json

{
  "razorpayOrderId": "YOUR_RAZORPAY_ORDER_ID_FROM_STEP_3",
  "razorpayPaymentId": "pay_1768425808670_test"
}
```
**Save:** `razorpaySignature`

---

### Step 5️⃣: Confirm Booking ✅ NOW WITH SIGNATURE!
```
POST http://localhost:5000/api/booking-payment/confirm-booking
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "bookingId": "YOUR_BOOKING_ID_FROM_STEP_3",
  "razorpayOrderId": "YOUR_RAZORPAY_ORDER_ID_FROM_STEP_3",
  "razorpayPaymentId": "pay_1768425808670_test",
  "razorpaySignature": "YOUR_SIGNATURE_FROM_STEP_4"
}
```
**Expected Response:**
```json
{
  "status": "success",
  "message": "Booking confirmed successfully! Payment received.",
  "data": {
    "booking": {
      "status": "confirmed",
      "ticketNumbers": ["TKT001", "TKT002"]
    }
  }
}
```

---

## ⚡ What Changed?

**BEFORE:** ❌
```json
{
  "bookingId": "...",
  "razorpayOrderId": "...",
  "razorpayPaymentId": "...",
  "razorpaySignature": "MISSING!" ← ERROR
}
```

**AFTER:** ✅
```json
{
  "bookingId": "...",
  "razorpayOrderId": "...",
  "razorpayPaymentId": "...",
  "razorpaySignature": "af5f4afc..." ← GENERATED IN STEP 4
}
```

---

## 🚀 One-Minute Setup

1. **Start Backend:**
   ```bash
   npm start
   ```

2. **Open Postman**

3. **Run Step 1-5** in order

4. **Check Response:** Should show `"status": "confirmed"` ✅

**Done!** 🎉

---

## 🔑 Environment Variables (Optional)

If using Postman environments, set these:

```
BASE_URL = http://localhost:5000
TOKEN = [from step 1 response]
USER_ID = [from step 1 response]
EVENT_ID = [your test event]
SEATING_ID = [your test seating]
bookingId = [from step 3 response]
razorpayOrderId = [from step 3 response]
razorpayPaymentId = pay_1768425808670_test
razorpaySignature = [from step 4 response]
```

Then replace all values with `{{VARIABLE_NAME}}`

---

## ✨ The Key Fix

**NEW ENDPOINT:** `POST /api/payments/test-generate-signature`

This generates a valid signature for testing without needing real Razorpay payment.

**In Production:** Frontend will get real signature from Razorpay, no test endpoint needed.

---

## ❓ FAQ

**Q: Do I need Step 4 in production?**
A: No! Razorpay will provide the signature. Step 4 is only for testing.

**Q: Can I use any payment ID?**
A: Yes, but use same order ID from Step 3.

**Q: What if signature doesn't work?**
A: Make sure you're using the SAME order ID from Step 3.

**Q: Why does Step 4 exist?**
A: To test the complete flow without opening real Razorpay checkout.

---

## 📚 More Details

- Full guide: `POSTMAN_TESTING_GUIDE.md`
- Issue explanation: `BOOKING_PAYMENT_FIX.md`
- Security details: `RAZORPAY_SIGNATURE_VERIFICATION_SECURITY.md`
- Summary: `BACKEND_CHANGES_SUMMARY.md`

---

## 🎯 Success Indicators

✅ Step 5 returns status: "success"
✅ Booking status: "confirmed"
✅ Payment status: "completed"
✅ ticketNumbers array has 2 items
✅ confirmedAt has a timestamp

All present = **Payment flow working perfectly!** 🚀
