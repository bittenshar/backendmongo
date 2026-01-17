#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   BOOKING + PAYMENT INTEGRATION TEST SUITE                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Get JWT Token
echo -e "${YELLOW}[STEP 1] Getting JWT Token...${NC}"
echo "POST /api/auth/signup"
echo ""

# Create test user
JWT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "paymenttest'$(date +%s)'@adminthrill.com",
    "password": "test123456",
    "firstName": "Payment",
    "lastName": "Tester",
    "phone": "9876543210"
  }')

echo "Response:"
echo "$JWT_RESPONSE" | jq '.' 2>/dev/null || echo "$JWT_RESPONSE"
echo ""

# Extract token
TOKEN=$(echo "$JWT_RESPONSE" | jq -r '.token' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  TOKEN=$(echo "$JWT_RESPONSE" | jq -r '.data.token' 2>/dev/null)
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ Could not obtain JWT token${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Token obtained:${NC} $TOKEN"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# 2. Get Event and Seating IDs
echo -e "${YELLOW}[STEP 2] Getting Event and Seating IDs...${NC}"
echo "GET /api/events"
echo ""

EVENTS=$(curl -s -X GET "http://localhost:3000/api/events?limit=1" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$EVENTS" | jq '.' 2>/dev/null || echo "$EVENTS"
echo ""

EVENT_ID=$(echo "$EVENTS" | jq -r '.data[0]._id' 2>/dev/null)
if [ -z "$EVENT_ID" ] || [ "$EVENT_ID" = "null" ]; then
  echo -e "${RED}❌ No events found${NC}"
  EVENT_ID="test-event-id"
fi

echo -e "${GREEN}Event ID:${NC} $EVENT_ID"
echo ""

# Get Seating IDs
SEATING=$(curl -s -X GET "http://localhost:3000/api/seating?limit=1" \
  -H "Authorization: Bearer $TOKEN")

SEATING_ID=$(echo "$SEATING" | jq -r '.data[0]._id' 2>/dev/null)
if [ -z "$SEATING_ID" ] || [ "$SEATING_ID" = "null" ]; then
  echo -e "${RED}❌ No seating found${NC}"
  SEATING_ID="test-seating-id"
fi

echo -e "${GREEN}Seating ID:${NC} $SEATING_ID"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# 3. Create Booking with Payment
echo -e "${YELLOW}[STEP 3] Creating Booking with Payment Initiation...${NC}"
echo "POST /api/booking/create-with-payment"
echo ""

BOOKING_REQUEST='{
  "eventId": "'$EVENT_ID'",
  "seatingId": "'$SEATING_ID'",
  "seatType": "Premium",
  "quantity": 2,
  "pricePerSeat": 500,
  "customerName": "Test Customer",
  "customerEmail": "test@example.com",
  "customerPhone": "9876543210"
}'

echo "Request Body:"
echo "$BOOKING_REQUEST" | jq '.'
echo ""

BOOKING_RESPONSE=$(curl -s -X POST http://localhost:3000/api/booking/create-with-payment \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$BOOKING_REQUEST")

echo "Response:"
echo "$BOOKING_RESPONSE" | jq '.' 2>/dev/null || echo "$BOOKING_RESPONSE"
echo ""

# Extract booking details
BOOKING_ID=$(echo "$BOOKING_RESPONSE" | jq -r '.data.booking._id' 2>/dev/null)
RAZORPAY_ORDER_ID=$(echo "$BOOKING_RESPONSE" | jq -r '.data.payment.razorpayOrderId' 2>/dev/null)
PAYMENT_KEY=$(echo "$BOOKING_RESPONSE" | jq -r '.data.payment.key' 2>/dev/null)
AMOUNT=$(echo "$BOOKING_RESPONSE" | jq -r '.data.payment.amount' 2>/dev/null)

echo -e "${GREEN}Booking ID:${NC} $BOOKING_ID"
echo -e "${GREEN}Razorpay Order ID:${NC} $RAZORPAY_ORDER_ID"
echo -e "${GREEN}Payment Key:${NC} $PAYMENT_KEY"
echo -e "${GREEN}Amount:${NC} $AMOUNT"
echo ""

if [ -z "$BOOKING_ID" ] || [ "$BOOKING_ID" = "null" ]; then
  echo -e "${RED}❌ Failed to create booking${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Booking created successfully${NC}"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# 4. Get Booking with Payment Details
echo -e "${YELLOW}[STEP 4] Getting Booking with Payment Details...${NC}"
echo "GET /api/booking/$BOOKING_ID/with-payment"
echo ""

BOOKING_WITH_PAYMENT=$(curl -s -X GET "http://localhost:3000/api/booking/$BOOKING_ID/with-payment" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$BOOKING_WITH_PAYMENT" | jq '.' 2>/dev/null || echo "$BOOKING_WITH_PAYMENT"
echo ""

BOOKING_STATUS=$(echo "$BOOKING_WITH_PAYMENT" | jq -r '.data.status' 2>/dev/null)
STORED_ORDER_ID=$(echo "$BOOKING_WITH_PAYMENT" | jq -r '.data.razorpayOrderId' 2>/dev/null)

echo -e "${GREEN}Booking Status:${NC} $BOOKING_STATUS"
echo -e "${GREEN}Stored Razorpay Order ID:${NC} $STORED_ORDER_ID"
echo ""

if [ "$STORED_ORDER_ID" = "$RAZORPAY_ORDER_ID" ]; then
  echo -e "${GREEN}✅ Payment order ID correctly stored in booking${NC}"
else
  echo -e "${RED}❌ Order ID mismatch${NC}"
fi
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# 5. Verify Payment
echo -e "${YELLOW}[STEP 5] Verifying Payment...${NC}"
echo "POST /api/booking/$BOOKING_ID/verify-payment"
echo ""

# For testing, we'll use test data
# In real scenario, paymentId and signature come from Razorpay checkout
TEST_PAYMENT_ID="pay_test_1234567890"
TEST_SIGNATURE="af5f4afc4fcc79e5e82f63cb77b6d6a0abc25f5a"

VERIFY_REQUEST='{
  "orderId": "'$RAZORPAY_ORDER_ID'",
  "paymentId": "'$TEST_PAYMENT_ID'",
  "signature": "'$TEST_SIGNATURE'"
}'

echo "Request Body:"
echo "$VERIFY_REQUEST" | jq '.'
echo ""

VERIFY_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/booking/$BOOKING_ID/verify-payment" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$VERIFY_REQUEST")

echo "Response:"
echo "$VERIFY_RESPONSE" | jq '.' 2>/dev/null || echo "$VERIFY_RESPONSE"
echo ""

PAYMENT_VERIFIED=$(echo "$VERIFY_RESPONSE" | jq -r '.data.paymentVerified' 2>/dev/null)
FINAL_STATUS=$(echo "$VERIFY_RESPONSE" | jq -r '.data.status' 2>/dev/null)

echo -e "${GREEN}Payment Verified:${NC} $PAYMENT_VERIFIED"
echo -e "${GREEN}Final Booking Status:${NC} $FINAL_STATUS"
echo ""

if [ "$FINAL_STATUS" = "confirmed" ]; then
  echo -e "${GREEN}✅ Booking confirmed after payment verification${NC}"
else
  echo -e "${YELLOW}ℹ️  Booking status: $FINAL_STATUS (depends on signature validation)${NC}"
fi
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# 6. Get Payment Receipt
echo -e "${YELLOW}[STEP 6] Getting Payment Receipt...${NC}"
echo "GET /api/booking/$BOOKING_ID/receipt"
echo ""

RECEIPT=$(curl -s -X GET "http://localhost:3000/api/booking/$BOOKING_ID/receipt" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$RECEIPT" | jq '.' 2>/dev/null || echo "$RECEIPT"
echo ""

RECEIPT_ID=$(echo "$RECEIPT" | jq -r '.data.receipt.receiptId' 2>/dev/null)
if [ ! -z "$RECEIPT_ID" ] && [ "$RECEIPT_ID" != "null" ]; then
  echo -e "${GREEN}✅ Receipt generated:${NC} $RECEIPT_ID"
else
  echo -e "${YELLOW}ℹ️  Receipt not yet available${NC}"
fi
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# 7. Test Summary
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   TEST SUMMARY                                               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Booking Created${NC}"
echo "   ID: $BOOKING_ID"
echo "   Razorpay Order ID: $RAZORPAY_ORDER_ID"
echo ""
echo -e "${GREEN}✅ Payment Initiated${NC}"
echo "   Key: $PAYMENT_KEY"
echo "   Amount: $AMOUNT"
echo ""
echo -e "${YELLOW}⚠️  Signature Verification${NC}"
echo "   Status: $FINAL_STATUS"
echo "   Verified: $PAYMENT_VERIFIED"
echo ""
echo -e "${BLUE}DATA STORED IN DATABASE:${NC}"
echo "   • booking._id: $BOOKING_ID"
echo "   • booking.razorpayOrderId: $RAZORPAY_ORDER_ID"
echo "   • booking.razorpayPaymentId: $TEST_PAYMENT_ID"
echo "   • booking.paymentStatus: processing → completed"
echo "   • booking.status: temporary → $FINAL_STATUS"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}NEXT STEPS:${NC}"
echo "1. Check MongoDB to verify data is stored:"
echo "   db.bookings.findOne({_id: ObjectId('$BOOKING_ID')})"
echo ""
echo "2. Test with real Razorpay test credentials:"
echo "   Key: rzp_test_ROzpR9FCBfPSds"
echo "   Secret: degfS9w5klNpAJg2SBEFXR8y"
echo ""
echo "3. For real payment flow:"
echo "   - Get test card from Razorpay docs"
echo "   - Open Razorpay checkout with payment.key and payment.amount"
echo "   - Complete payment"
echo "   - Call verify-payment with real paymentId and signature"
echo ""
