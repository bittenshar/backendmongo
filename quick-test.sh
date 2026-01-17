#!/bin/bash

# Get fresh token
echo "Creating test user..."
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test'$(date +%s)'@test.com","password":"test123456","firstName":"Test","lastName":"User","phone":"9876543210"}' | jq -r '.token')

echo "✅ Token: ${TOKEN:0:50}..."
echo ""

# Create booking with payment
echo "Creating booking with payment..."
BOOKING_RESP=$(curl -s -X POST http://localhost:3000/api/booking/create-with-payment \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"eventId":"6968c3957fd4329498081228","seatingId":"6968c3957fd4329498081229","seatType":"Premium","quantity":2,"pricePerSeat":500}')

BOOKING_ID=$(echo "$BOOKING_RESP" | jq -r '.data.booking._id')
RAZORPAY_ORDER=$(echo "$BOOKING_RESP" | jq -r '.data.payment.razorpayOrderId')

echo "✅ Booking ID: $BOOKING_ID"
echo "✅ Razorpay Order: $RAZORPAY_ORDER"
echo ""

# Get booking with payment
echo "Getting booking with payment details..."
GET_RESP=$(curl -s -X GET "http://localhost:3000/api/booking/$BOOKING_ID/with-payment" \
  -H "Authorization: Bearer $TOKEN")

echo "$GET_RESP" | jq '.data | {status, razorpayOrderId, paymentStatus}'
echo ""

# Verify payment
echo "Verifying payment..."
VERIFY_RESP=$(curl -s -X POST "http://localhost:3000/api/booking/$BOOKING_ID/verify-payment" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"orderId\":\"$RAZORPAY_ORDER\",\"paymentId\":\"pay_test_123\",\"signature\":\"test_sig_123\"}")

echo "$VERIFY_RESP" | jq '.data | {status, paymentVerified, razorpayPaymentId}'
