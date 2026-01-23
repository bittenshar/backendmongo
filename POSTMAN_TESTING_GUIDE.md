# Bank Payment API - Postman Testing Guide for Android Integration

## 📱 Quick Start

### 1. Import Collection
1. Open Postman
2. Click **Import** (top left)
3. Select **Bank_Payment_Android_Integration.postman_collection.json**
4. Click **Import**

### 2. Set Environment Variables
The collection automatically saves these after each step:
- `userToken` - Authentication token
- `userId` - User ID
- `razorpayOrderId` - Order ID from Razorpay
- `userEmail` - User email

---

## 🔐 Step-by-Step Testing

### Step 1: Login User
**Request:** `POST /api/auth/login`

```json
{
  "email": "test@example.com",
  "password": "test123"
}
```

**Response Example:**
```json
{
  "status": "success",
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "test@example.com",
      "phone": "9876543210",
      "name": "Test User"
    }
  }
}
```

✅ This automatically saves `userToken` and `userId` to environment variables

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
