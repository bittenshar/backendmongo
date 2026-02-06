# Curl Commands for Testing - Copy & Paste Ready

## Prerequisites
```bash
# Set these values (replace with your actual values)
BASE_URL="http://localhost:5000"
EMAIL="test@example.com"
PASSWORD="test123"
EVENT_ID="YOUR_EVENT_ID"
SEATING_ID="YOUR_SEATING_ID"
```

---

## Step 1️⃣: Login
```bash
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'"$EMAIL"'",
    "password": "'"$PASSWORD"'"
  }' | jq '.'
```

**Save these from response:**
```bash
TOKEN="your_token_from_response"
USER_ID="your_user_id_from_response"
```

---

## Step 2️⃣: Verify Face Status
```bash
curl -X POST "$BASE_URL/api/booking-payment/verify-face-status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'"$USER_ID"'"
  }' | jq '.'
```

**Check:** Should show `"verified": true`

---

## Step 3️⃣: Initiate Booking
```bash
curl -X POST "$BASE_URL/api/booking-payment/initiate-with-verification" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'"$USER_ID"'",
    "eventId": "'"$EVENT_ID"'",
    "seatingId": "'"$SEATING_ID"'",
    "seatType": "Premium",
    "quantity": 2,
    "pricePerSeat": 500
  }' | jq '.'
```

**Save these from response:**
```bash
BOOKING_ID=$(curl -X POST "$BASE_URL/api/booking-payment/initiate-with-verification" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'"$USER_ID"'",
    "eventId": "'"$EVENT_ID"'",
    "seatingId": "'"$SEATING_ID"'",
    "seatType": "Premium",
    "quantity": 2,
    "pricePerSeat": 500
  }' | jq -r '.data.booking.bookingId')

RAZORPAY_ORDER_ID=$(curl -X POST "$BASE_URL/api/booking-payment/initiate-with-verification" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'"$USER_ID"'",
    "eventId": "'"$EVENT_ID"'",
    "seatingId": "'"$SEATING_ID"'",
    "seatType": "Premium",
    "quantity": 2,
    "pricePerSeat": 500
  }' | jq -r '.data.payment.razorpayOrderId')

echo "Booking ID: $BOOKING_ID"
echo "Razorpay Order ID: $RAZORPAY_ORDER_ID"
```

---

## Step 4️⃣: Generate Test Signature ⭐ NEW!
```bash
RAZORPAY_PAYMENT_ID="pay_1768425808670_test"

SIGNATURE_RESPONSE=$(curl -X POST "$BASE_URL/api/payments/test-generate-signature" \
  -H "Content-Type: application/json" \
  -d '{
    "razorpayOrderId": "'"$RAZORPAY_ORDER_ID"'",
    "razorpayPaymentId": "'"$RAZORPAY_PAYMENT_ID"'"
  }' | jq '.')

RAZORPAY_SIGNATURE=$(echo "$SIGNATURE_RESPONSE" | jq -r '.data.razorpaySignature')

echo "Signature Response:"
echo "$SIGNATURE_RESPONSE" | jq '.'
echo ""
echo "Razorpay Signature: $RAZORPAY_SIGNATURE"
```

---

## Step 5️⃣: Confirm Booking ✅ NOW WITH SIGNATURE!
```bash
curl -X POST "$BASE_URL/api/booking-payment/confirm-booking" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "'"$BOOKING_ID"'",
    "razorpayOrderId": "'"$RAZORPAY_ORDER_ID"'",
    "razorpayPaymentId": "'"$RAZORPAY_PAYMENT_ID"'",
    "razorpaySignature": "'"$RAZORPAY_SIGNATURE"'"
  }' | jq '.'
```

---

## 🚀 Complete Script (All Steps)

Save this as `test-payment-flow.sh`:

```bash
#!/bin/bash

# ============================================
# Booking Payment Flow - Complete Test
# ============================================

set -e

# Configuration
BASE_URL="http://localhost:5000"
EMAIL="test@example.com"
PASSWORD="test123"
EVENT_ID="YOUR_EVENT_ID"
SEATING_ID="YOUR_SEATING_ID"

echo "🚀 Starting Payment Flow Test..."
echo ""

# Step 1: Login
echo "📌 Step 1: Login"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'"$EMAIL"'",
    "password": "'"$PASSWORD"'"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user._id')

echo "✅ Login successful"
echo "   Token: ${TOKEN:0:20}..."
echo "   User ID: $USER_ID"
echo ""

# Step 2: Verify Face
echo "📌 Step 2: Verify Face Status"
FACE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/booking-payment/verify-face-status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'"$USER_ID"'"
  }')

VERIFIED=$(echo "$FACE_RESPONSE" | jq -r '.data.verified')

if [ "$VERIFIED" = "true" ]; then
  echo "✅ Face verified"
else
  echo "❌ Face not verified - complete face verification first"
  exit 1
fi
echo ""

# Step 3: Initiate Booking
echo "📌 Step 3: Initiate Booking"
BOOKING_RESPONSE=$(curl -s -X POST "$BASE_URL/api/booking-payment/initiate-with-verification" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'"$USER_ID"'",
    "eventId": "'"$EVENT_ID"'",
    "seatingId": "'"$SEATING_ID"'",
    "seatType": "Premium",
    "quantity": 2,
    "pricePerSeat": 500
  }')

BOOKING_ID=$(echo "$BOOKING_RESPONSE" | jq -r '.data.booking.bookingId')
RAZORPAY_ORDER_ID=$(echo "$BOOKING_RESPONSE" | jq -r '.data.payment.razorpayOrderId')

echo "✅ Booking initiated"
echo "   Booking ID: $BOOKING_ID"
echo "   Razorpay Order ID: $RAZORPAY_ORDER_ID"
echo ""

# Step 4: Generate Signature
echo "📌 Step 4: Generate Test Signature ⭐"
RAZORPAY_PAYMENT_ID="pay_1768425808670_test"

SIGNATURE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/payments/test-generate-signature" \
  -H "Content-Type: application/json" \
  -d '{
    "razorpayOrderId": "'"$RAZORPAY_ORDER_ID"'",
    "razorpayPaymentId": "'"$RAZORPAY_PAYMENT_ID"'"
  }')

RAZORPAY_SIGNATURE=$(echo "$SIGNATURE_RESPONSE" | jq -r '.data.razorpaySignature')

echo "✅ Signature generated"
echo "   Signature: ${RAZORPAY_SIGNATURE:0:30}..."
echo ""

# Step 5: Confirm Booking
echo "📌 Step 5: Confirm Booking"
CONFIRM_RESPONSE=$(curl -s -X POST "$BASE_URL/api/booking-payment/confirm-booking" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "'"$BOOKING_ID"'",
    "razorpayOrderId": "'"$RAZORPAY_ORDER_ID"'",
    "razorpayPaymentId": "'"$RAZORPAY_PAYMENT_ID"'",
    "razorpaySignature": "'"$RAZORPAY_SIGNATURE"'"
  }')

STATUS=$(echo "$CONFIRM_RESPONSE" | jq -r '.data.booking.status')
TICKETS=$(echo "$CONFIRM_RESPONSE" | jq -r '.data.booking.ticketNumbers[]')

if [ "$STATUS" = "confirmed" ]; then
  echo "✅ Booking confirmed!"
  echo "   Status: $STATUS"
  echo "   Tickets: $TICKETS"
  echo ""
  echo "🎉 PAYMENT FLOW COMPLETE!"
else
  echo "❌ Booking confirmation failed"
  echo "Response:"
  echo "$CONFIRM_RESPONSE" | jq '.'
  exit 1
fi
```

**Run it:**
```bash
chmod +x test-payment-flow.sh
./test-payment-flow.sh
```

---

## 🔍 Debug Mode - Verbose Output

If you need to see all details:

```bash
# Add this before your curl commands
set -x

# Or use curl with verbose
curl -v -X POST ...
```

---

## 🎯 Expected Outputs

### Step 1 Response:
```json
{
  "status": "success",
  "token": "eyJhbGciOi...",
  "data": {
    "user": {
      "_id": "607f1f77bcf86cd799439014"
    }
  }
}
```

### Step 4 Response:
```json
{
  "status": "success",
  "data": {
    "razorpaySignature": "af5f4afc335301923409fc06f3d9fba1c07e42a0a81d373b0576030361a15581"
  }
}
```

### Step 5 Response:
```json
{
  "status": "success",
  "message": "Booking confirmed successfully!",
  "data": {
    "booking": {
      "status": "confirmed",
      "ticketNumbers": ["TKT001", "TKT002"]
    }
  }
}
```

---

## ✅ Verification

After running the script, you should see:
- ✅ Login successful
- ✅ Face verified
- ✅ Booking initiated
- ✅ Signature generated
- ✅ PAYMENT FLOW COMPLETE!

---

## 🐛 Troubleshooting

### Command not found: jq
```bash
# Install jq
brew install jq  # macOS
sudo apt-get install jq  # Linux
```

### Invalid JSON response
```bash
# Check if backend is running
curl http://localhost:5000/health
```

### Signature generation fails
```bash
# Make sure you're in development environment
echo "NODE_ENV=$NODE_ENV"
```

---

## 📚 More Information

- Full Postman guide: `POSTMAN_TESTING_GUIDE.md`
- Changes summary: `BACKEND_CHANGES_SUMMARY.md`

Done! 🚀
