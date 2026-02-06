# Postman Testing Guide - Complete Payment Flow with Signature Verification

## 🎯 Overview

This guide shows how to test the complete **Booking + Face Verification + Payment** flow in Postman with proper signature verification.

---

## 🚀 Complete Testing Flow

### Phase 1: Setup & Face Verification

#### Step 1: Login User
**Request:** `POST /api/auth/login`

```json
{
  "email": "test@example.com",
  "password": "test123"
}
```

**Environment Variables to Save:**
- `TOKEN` = response.token
- `USER_ID` = response.data.user._id

---

#### Step 2: Check Face Verification Status
**Request:** `POST /api/booking-payment/verify-face-status`

```
POST {{BASE_URL}}/api/booking-payment/verify-face-status
Authorization: Bearer {{TOKEN}}
Content-Type: application/json

{
  "userId": "{{USER_ID}}"
}
```

**Response (If Verified):**
```json
{
  "status": "success",
  "data": {
    "verified": true,
    "verificationStatus": "verified",
    "faceId": "..."
  }
}
```

⚠️ If NOT verified, complete face verification first before booking.

---

### Phase 2: Create Booking + Order

#### Step 3: Initiate Booking with Verification
**Request:** `POST /api/booking-payment/initiate-with-verification`

```
POST {{BASE_URL}}/api/booking-payment/initiate-with-verification
Authorization: Bearer {{TOKEN}}
Content-Type: application/json

{
  "userId": "{{USER_ID}}",
  "eventId": "EVENT_ID_HERE",
  "seatingId": "SEATING_ID_HERE",
  "seatType": "Premium",
  "quantity": 2,
  "pricePerSeat": 500
}
```

**Save from Response:**
```javascript
bookingId = response.data.booking.bookingId
razorpayOrderId = response.data.payment.razorpayOrderId
totalPrice = response.data.booking.totalPrice
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "booking": {
      "bookingId": "607f1f77bcf86cd799439013",
      "quantity": 2,
      "totalPrice": 1000,
      "expiresAt": "2026-01-15T10:50:39",
      "expiresIn": 15
    },
    "payment": {
      "razorpayOrderId": "order_S3uC4VvlqYkRS8",
      "amount": 1000,
      "currency": "INR"
    }
  }
}
```

---

### Phase 3: Payment Signature Verification

#### Step 4: Generate Test Signature (Development Only)
**Request:** `POST /api/payments/test-generate-signature`

⚠️ This endpoint **ONLY WORKS IN DEVELOPMENT** for testing. In production, use real Razorpay signatures.

```
POST {{BASE_URL}}/api/payments/test-generate-signature
Content-Type: application/json

{
  "razorpayOrderId": "{{razorpayOrderId}}",
  "razorpayPaymentId": "pay_1768425808670_test"
}
```

**Save from Response:**
```javascript
razorpayPaymentId = "pay_1768425808670_test"
razorpaySignature = response.data.razorpaySignature
```

**Response:**
```json
{
  "status": "success",
  "message": "Test signature generated (development only)",
  "data": {
    "razorpayOrderId": "order_S3uC4VvlqYkRS8",
    "razorpayPaymentId": "pay_1768425808670_test",
    "razorpaySignature": "af5f4afc335301923409fc06f3d9fba1c07e42a0a81d373b0576030361a15581"
  }
}
```

---

#### Step 5: Confirm Booking (Verify Payment + Confirm)
**Request:** `POST /api/booking-payment/confirm-booking`

This is the **CRITICAL step** where you send ALL 4 required fields:

```
POST {{BASE_URL}}/api/booking-payment/confirm-booking
Authorization: Bearer {{TOKEN}}
Content-Type: application/json

{
  "bookingId": "{{bookingId}}",
  "razorpayOrderId": "{{razorpayOrderId}}",
  "razorpayPaymentId": "{{razorpayPaymentId}}",
  "razorpaySignature": "{{razorpaySignature}}"
}
```

**✅ Expected Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "Booking confirmed successfully! Payment received.",
  "data": {
    "booking": {
      "bookingId": "607f1f77bcf86cd799439013",
      "status": "confirmed",
      "quantity": 2,
      "totalPrice": 1000,
      "confirmedAt": "2026-01-22T15:35:00Z",
      "ticketNumbers": ["TKT001", "TKT002"]
    },
    "payment": {
      "paymentId": "pay_1768425808670_test",
      "orderId": "order_S3uC4VvlqYkRS8",
      "amount": 1000,
      "status": "completed",
      "method": "razorpay"
    },
    "event": {
      "eventId": "...",
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

**❌ Error Response (Missing Signature - 400):**
```json
{
  "success": false,
  "message": "Missing payment verification details"
}
```

---

## 📋 Postman Environment Setup

Create a Postman environment with these variables:

```json
{
  "BASE_URL": "http://localhost:5000",
  "TOKEN": "",
  "USER_ID": "",
  "EVENT_ID": "YOUR_EVENT_ID",
  "SEATING_ID": "YOUR_SEATING_ID",
  "bookingId": "",
  "razorpayOrderId": "",
  "razorpayPaymentId": "pay_1768425808670_test",
  "razorpaySignature": ""
}
```

---

## 🔄 Postman Tests Script (Auto-Save Values)

Add this to the "Tests" tab of **Step 3 (Initiate Booking)** request:

```javascript
pm.test("Status is success", () => {
  const jsonData = pm.response.json();
  pm.expect(jsonData.status).to.equal("success");
});

pm.test("Save booking and order IDs", () => {
  const jsonData = pm.response.json();
  pm.environment.set("bookingId", jsonData.data.booking.bookingId);
  pm.environment.set("razorpayOrderId", jsonData.data.payment.razorpayOrderId);
  
  console.log("✅ Saved:");
  console.log("  bookingId: " + jsonData.data.booking.bookingId);
  console.log("  razorpayOrderId: " + jsonData.data.payment.razorpayOrderId);
});
```

Add this to the "Tests" tab of **Step 4 (Generate Signature)** request:

```javascript
pm.test("Status is success", () => {
  const jsonData = pm.response.json();
  pm.expect(jsonData.status).to.equal("success");
});

pm.test("Save signature", () => {
  const jsonData = pm.response.json();
  pm.environment.set("razorpaySignature", jsonData.data.razorpaySignature);
  
  console.log("✅ Saved Signature:");
  console.log("  " + jsonData.data.razorpaySignature);
});
```

Add this to the "Tests" tab of **Step 5 (Confirm Booking)** request:

```javascript
pm.test("Booking confirmed successfully", () => {
  const jsonData = pm.response.json();
  pm.expect(jsonData.status).to.equal("success");
  pm.expect(jsonData.data.booking.status).to.equal("confirmed");
});

pm.test("Payment completed", () => {
  const jsonData = pm.response.json();
  pm.expect(jsonData.data.payment.status).to.equal("completed");
});

pm.test("Tickets generated", () => {
  const jsonData = pm.response.json();
  pm.expect(jsonData.data.booking.ticketNumbers).to.have.lengthOf(2);
  console.log("🎫 Tickets: " + jsonData.data.booking.ticketNumbers.join(", "));
});
```

---

## 🎯 Quick Testing Checklist

Follow these steps in order:

- [ ] **Step 1**: Login → Get TOKEN
- [ ] **Step 2**: Check face verification → Ensure "verified": true
- [ ] **Step 3**: Initiate booking → Save bookingId & razorpayOrderId
- [ ] **Step 4**: Generate signature → Save razorpaySignature
- [ ] **Step 5**: Confirm booking → Should return status "confirmed"
- [ ] **Verify**: Response shows ticketNumbers
- [ ] **Check**: Payment status is "completed"

---

## 🔍 Troubleshooting

### Error: "Missing payment verification details"
**Problem:** `razorpaySignature` is not being sent
**Solution:** 
1. Complete Step 4 (Generate Signature)
2. Check that `razorpaySignature` is saved in environment
3. Verify it's included in Step 5 request body

### Error: "Invalid signature"
**Problem:** Signature doesn't match the order/payment IDs
**Solution:**
1. Use SAME `razorpayOrderId` from Step 3
2. Generate fresh signature using that order ID
3. Don't modify signature value

### Error: "Booking not found"
**Problem:** Using wrong booking ID
**Solution:**
1. Use `bookingId` from Step 3 response
2. Copy exactly, don't modify
3. Ensure booking hasn't expired (15-min timeout)

### Error: "Order ID mismatch"
**Problem:** Order IDs don't match
**Solution:**
1. Use `razorpayOrderId` from Step 3 (not a random ID)
2. Match it exactly in Step 5
3. Check environment variables are set correctly

---

## 🔐 Important Security Notes

- ✅ **Test Signature Endpoint** only works in development/test environment
- ✅ In **PRODUCTION**, use real Razorpay payment responses
- ✅ Frontend captures signature from Razorpay, doesn't generate it
- ✅ Backend verifies signature using `RAZORPAY_KEY_SECRET`
- ✅ Never expose secret key in frontend code

---

## 📊 What Each Field Means

| Field | Source | Purpose | Required |
|-------|--------|---------|----------|
| `bookingId` | Step 3 Response | Identifies the booking | ✅ Yes |
| `razorpayOrderId` | Step 3 Response | Razorpay order ID | ✅ Yes |
| `razorpayPaymentId` | Step 4 / Razorpay | Payment reference | ✅ Yes |
| `razorpaySignature` | Step 4 Response | Proof of Razorpay validation | ✅ Yes |

---

## 🎓 Why Signature Verification?

The signature proves that:
1. **Razorpay processed the payment** - Only Razorpay can generate valid signature
2. **Payment wasn't tampered with** - Signature matches the order & payment IDs
3. **Backend trusts the result** - Uses secret key to verify authenticity
4. **Security is maintained** - Frontend can't fake payment

This is standard security practice in payment processing.

---

## 🚀 Production Testing Tips

For **real production testing** with actual Razorpay:

1. **Skip Step 4** - Don't call test-generate-signature
2. **Use Razorpay Payment Flow:**
   - Frontend opens Razorpay checkout with order ID
   - User completes payment
   - Razorpay returns response with `razorpay_signature`
   - Frontend captures signature from response
3. **Call Step 5** - Send captured signature to backend
4. **Backend verifies** - Uses secret key to validate

The signature from real Razorpay payment is much longer and complex than test signature.

---

## 📁 Complete Request JSON

For easy import, here's Postman collection:

```json
{
  "info": {
    "name": "Booking Payment with Verification",
    "description": "Complete flow with face verification and payment"
  },
  "variable": [
    { "key": "BASE_URL", "value": "http://localhost:5000" },
    { "key": "TOKEN", "value": "" },
    { "key": "USER_ID", "value": "" },
    { "key": "bookingId", "value": "" },
    { "key": "razorpayOrderId", "value": "" },
    { "key": "razorpaySignature", "value": "" }
  ],
  "item": [
    {
      "name": "Step 1: Login",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "url": {"raw": "{{BASE_URL}}/api/auth/login"},
        "body": {"mode": "raw", "raw": "{\"email\":\"test@example.com\",\"password\":\"test123\"}"}
      }
    },
    {
      "name": "Step 2: Check Face Verification",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Authorization", "value": "Bearer {{TOKEN}}"},
          {"key": "Content-Type", "value": "application/json"}
        ],
        "url": {"raw": "{{BASE_URL}}/api/booking-payment/verify-face-status"},
        "body": {"mode": "raw", "raw": "{\"userId\":\"{{USER_ID}}\"}"}
      }
    },
    {
      "name": "Step 3: Initiate Booking",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Authorization", "value": "Bearer {{TOKEN}}"},
          {"key": "Content-Type", "value": "application/json"}
        ],
        "url": {"raw": "{{BASE_URL}}/api/booking-payment/initiate-with-verification"},
        "body": {"mode": "raw", "raw": "{\"userId\":\"{{USER_ID}}\",\"eventId\":\"EVENT_ID\",\"seatingId\":\"SEATING_ID\",\"seatType\":\"Premium\",\"quantity\":2,\"pricePerSeat\":500}"}
      }
    },
    {
      "name": "Step 4: Generate Test Signature",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "url": {"raw": "{{BASE_URL}}/api/payments/test-generate-signature"},
        "body": {"mode": "raw", "raw": "{\"razorpayOrderId\":\"{{razorpayOrderId}}\",\"razorpayPaymentId\":\"pay_TEST_12345\"}"}
      }
    },
    {
      "name": "Step 5: Confirm Booking",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Authorization", "value": "Bearer {{TOKEN}}"},
          {"key": "Content-Type", "value": "application/json"}
        ],
        "url": {"raw": "{{BASE_URL}}/api/booking-payment/confirm-booking"},
        "body": {"mode": "raw", "raw": "{\"bookingId\":\"{{bookingId}}\",\"razorpayOrderId\":\"{{razorpayOrderId}}\",\"razorpayPaymentId\":\"pay_TEST_12345\",\"razorpaySignature\":\"{{razorpaySignature}}\"}"}
      }
    }
  ]
}
```

---

Done! You're ready to test the complete payment flow in Postman. 🎉


---

### Step 2: Create Payment Order
**Request:** `POST /api/payments/create-order`

**Headers:**
```
Authorization: Bearer {{userToken}}
Content-Type: application/json
```

**Body:**
```json
{
  "userId": "{{userId}}",
  "amount": 500,
  "description": "Test Payment - Bank",
  "receipt": "test_1234567890",
  "notes": {
    "testId": "android_integration",
    "purpose": "Bank Payment Testing"
  },
  "customer": {
    "email": "{{userEmail}}",
    "phone": "9876543210",
    "name": "Test User"
  }
}
```

**Response Example:**
```json
{
  "success": true,
  "orderId": "ORD_507f1f77_123456",
  "razorpayOrderId": "order_S75pW1dAg2QbBz",
  "amount": 50000,
  "amountInRupees": 500,
  "currency": "INR",
  "key": "rzp_test_S70BEK0R4wzs2b",
  "payment": {
    "_id": "507f1f77bcf86cd799439012",
    "status": "pending"
  }
}
```

✅ This automatically saves `razorpayOrderId` for next step

---

### Step 3: Complete Payment on Razorpay

**On Android/Web:**
1. Use the order ID from Step 2
2. Open Razorpay checkout with order ID
3. Complete payment using:
   - **Card:** 4111111111111111
   - **Expiry:** Any future date (12/25)
   - **CVV:** 123
   - **UPI:** success@razorpay
   - **Net Banking:** Select any bank

4. You'll get payment response:
```json
{
  "razorpay_payment_id": "pay_S5lnxH5mInz355",
  "razorpay_order_id": "order_S75pW1dAg2QbBz",
  "razorpay_signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
}
```

---

### Step 4: Verify Payment Signature
**Request:** `POST /api/payments/verify`

**Headers:**
```
Authorization: Bearer {{userToken}}
Content-Type: application/json
```

**Body:**
```json
{
  "orderId": "order_S75pW1dAg2QbBz",
  "paymentId": "pay_S5lnxH5mInz355",
  "signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
}
```

**Success Response:**
```json
{
  "status": "success",
  "message": "Payment verified successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "razorpayPaymentId": "pay_S5lnxH5mInz355",
    "status": "verified",
    "amount": 500
  }
}
```

---

## 📊 Optional: Get Payment Details

### Get Payment by ID
**Request:** `GET /api/payments/{{paymentId}}`

**Headers:**
```
Authorization: Bearer {{userToken}}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "razorpayPaymentId": "pay_S5lnxH5mInz355",
    "status": "captured",
    "amount": 500,
    "currency": "INR",
    "method": "card",
    "email": "test@example.com",
    "vpa": null,
    "description": "Test Payment - Bank"
  }
}
```

### Get Order Details
**Request:** `GET /api/payments/order/{{razorpayOrderId}}`

### Get Payment History
**Request:** `GET /api/payments`

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "razorpayPaymentId": "pay_S5lnxH5mInz355",
      "amount": 500,
      "status": "verified",
      "createdAt": "2026-01-23T10:30:00.000Z"
    }
  ]
}
```

---

## 💰 Refund Payment

**Request:** `POST /api/payments/{{paymentId}}/refund`

**Headers:**
```
Authorization: Bearer {{userToken}}
Content-Type: application/json
```

**Body:**
```json
{
  "amount": 50000,
  "notes": {
    "reason": "Customer Request"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "refundId": "rfnd_XXXXXXXX",
    "amount": 500,
    "status": "processed",
    "createdAt": "2026-01-23T10:35:00.000Z"
  }
}
```

---

## 🧪 Test Different Amounts

### ₹500 Payment
```json
{
  "amount": 500
}
```

### ₹1,000 Payment
```json
{
  "amount": 1000
}
```

### ₹2,500 Payment
```json
{
  "amount": 2500
}
```

---

## 📝 Android Integration Code Example

```java
// 1. Create Order
POST http://localhost:3000/api/payments/create-order
Headers: {"Authorization": "Bearer " + token}
Body: {
  "userId": userId,
  "amount": 500,
  "description": "Payment"
}

// 2. Get razorpayOrderId from response
String orderId = response.get("razorpayOrderId");
String amount = response.get("amount");

// 3. Open Razorpay checkout
RazorpayCheckout.openCheckout(
  orderId: orderId,
  amount: amount,
  key: "rzp_test_S70BEK0R4wzs2b"
);

// 4. Verify payment
POST http://localhost:3000/api/payments/verify
Headers: {"Authorization": "Bearer " + token}
Body: {
  "orderId": orderId,
  "paymentId": paymentResponse.paymentId,
  "signature": paymentResponse.signature
}
```

---

## ✅ Error Handling

### Error: "Invalid token"
- Run **Login User** request again
- Copy new token

### Error: "Order not found"
- Create new order first
- Copy order ID from response

### Error: "Signature verification failed"
- Ensure exact values from payment response
- Check: paymentId, orderId, signature match exactly

### Error: "Payment already verified"
- Payment was already processed
- Create new order and retry

---

## 🔗 API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/payments/create-order` | Create payment order |
| POST | `/api/payments/verify` | Verify payment signature |
| GET | `/api/payments/:paymentId` | Get payment details |
| GET | `/api/payments/order/:orderId` | Get order details |
| GET | `/api/payments` | Get payment history |
| POST | `/api/payments/:paymentId/refund` | Refund payment |

---

## 🚀 Ready for Android?

All endpoints are production-ready for Android integration:
- ✅ No CORS issues (API handles it)
- ✅ Works with Android HttpURLConnection, Retrofit, OkHttp
- ✅ Supports all payment methods
- ✅ Proper error handling
- ✅ Signature verification

**Start with Postman testing, then integrate into your Android app!**
