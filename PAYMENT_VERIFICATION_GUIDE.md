# 💳 Payment Verification Guide

## ✅ Complete Workflow

### Step 1: Login
1. Enter credentials:
   - Email: `test@example.com`
   - Password: `test123`
   - API URL: `http://localhost:3000`
2. Click **"Login"** button
3. You'll get a token and userId saved in environment

### Step 2: Create Booking
1. Fill in booking details:
   - Service Type: Choose any (Haircut, Massage, etc.)
   - Date: Select a future date
   - Time: Enter any time
   - Duration: Select 60 minutes
2. Click **"Create Booking"** button
3. You'll get a booking ID saved

### Step 3: Create Payment Order
1. Enter amount: `500` (or any amount in ₹)
2. Select payment method
3. Enter description: `Booking Payment`
4. Click **"Create Order"** button
5. This creates a Razorpay order and saves:
   - `razorpayOrderId` (e.g., `order_SCrs98sm0FhWTZ`)

### Step 4: Verify Payment

#### Option A: Auto Fetch & Verify
1. Click **"Verify Payment"** button
2. The system will:
   - Fetch payment details from Razorpay
   - Auto-populate payment ID and signature
   - Verify the payment signature
3. Result shows `✅ Payment verified successfully!`

#### Option B: Manual Verification
1. If you have payment ID and signature from Razorpay:
   - Paste **Payment ID** in the field
   - Paste **Signature** in the field
2. Click **"Verify with Manual Details"** button
3. Verification completes

---

## 🔍 What Gets Saved?

When you verify a payment, the backend saves:

```json
{
  "razorpayOrderId": "order_SCrs98sm0FhWTZ",
  "razorpayPaymentId": "pay_1234567890",
  "razorpaySignature": "signature_hash_here",
  "status": "success",
  "amount": 500,
  "currency": "INR"
}
```

---

## 🐛 Troubleshooting

### Error: "Payment record not found"
- **Cause**: You haven't created an order first
- **Solution**: Click "Create Order" before verifying

### Error: "Missing required fields"
- **Cause**: Payment ID or Signature not provided
- **Solution**: 
  - Use auto-fetch (click "Verify Payment")
  - Or manually enter both fields

### Error: "Invalid payment signature"
- **Cause**: Signature verification failed (signature tampering)
- **Solution**: 
  - Create a new order
  - Use auto-fetch for correct signature
  - Check console for debugging info

### Status Shows "Verification response: Check details"
- **Cause**: Verification passed but response format differs
- **Solution**: 
  - Check the response box for actual details
  - Look at console logs for debugging

---

## 📱 Test Razorpay Credentials

For testing, use these test credentials:

```
Key ID: rzp_test_ROzpR9FCBfPSds
Key Secret: degfS9w5klNpAJg2SBEFXR8y
```

Test Payment Methods:
- **Card**: 4111111111111111 (any expiry & CVV)
- **UPI**: success@razorpay

---

## 🎯 Environment Variables Displayed

After login and successful operations, you'll see:

| Variable | Purpose | Example |
|----------|---------|---------|
| `userToken` | JWT token for auth | `eyJhbGc...` |
| `userId` | Your user ID | `697269b9cf5b453a69001f1b` |
| `userEmail` | Your email | `test@example.com` |
| `razorpayOrderId` | Order ID from Razorpay | `order_SCrs98sm0FhWTZ` |
| `orderId` | Internal order ID | `ORD_6968023_123456` |

---

## ✅ Success Response

When payment is verified successfully:

```json
{
  "status": "success",
  "message": "Payment verified successfully",
  "data": {
    "success": true,
    "payment": {
      "_id": "...",
      "orderId": "ORD_...",
      "razorpayOrderId": "order_...",
      "razorpayPaymentId": "pay_...",
      "razorpaySignature": "...",
      "status": "success",
      "amount": 50000,
      "currency": "INR"
    },
    "message": "Payment verified successfully",
    "verified": true
  }
}
```

---

## 🚀 Complete Flow Test

Click the **"Test Complete Flow"** button to automatically:
1. Login
2. Create a booking
3. Create a payment order
4. Show all results

This is the fastest way to test the entire flow!

---

## 📝 API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/login` | POST | Login user |
| `/api/bookings/create` | POST | Create booking |
| `/api/payments/create-order` | POST | Create payment order |
| `/api/payments/fetch-razorpay-payment` | POST | Fetch payment details |
| `/api/payments/verify` | POST | Verify payment signature |

---

## 💡 Tips

1. **Order ID**: Save this for records - it's the payment reference
2. **Test Mode**: All test signatures starting with `test_signature_` are accepted
3. **Signature Verification**: Uses HMAC-SHA256 with Razorpay key
4. **Auto-fetch**: Always use this to get correct payment details
5. **Check Console**: Open browser DevTools (F12) console for detailed logs

---

**Status**: ✅ Fully Tested & Working
**Last Updated**: Feb 6, 2026
