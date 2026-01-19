#!/bin/bash

# ============================================================================
# UNIFIED BOOKING + PAYMENT FLOW TEST SCRIPT
# ============================================================================
# This script demonstrates the complete flow for the new unified booking
# endpoint that combines payment verification and booking confirmation.
#
# Flow:
# 1. Create Razorpay payment order
# 2. Simulate Razorpay payment (get order, payment, signature)
# 3. Call unified booking endpoint
# 4. Verify booking confirmation
# ============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-https://backendmongo-tau.vercel.app}"
TOKEN="${TOKEN:-}"
EVENT_ID="${EVENT_ID:-}"
SEATING_ID="${SEATING_ID:-}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  UNIFIED BOOKING + PAYMENT FLOW TEST                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"

# Check required variables
if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ ERROR: TOKEN not set${NC}"
    echo "Usage: TOKEN=your_token EVENT_ID=xxx SEATING_ID=yyy ./test-unified-booking.sh"
    exit 1
fi

if [ -z "$EVENT_ID" ]; then
    echo -e "${RED}❌ ERROR: EVENT_ID not set${NC}"
    echo "Usage: TOKEN=your_token EVENT_ID=xxx SEATING_ID=yyy ./test-unified-booking.sh"
    exit 1
fi

if [ -z "$SEATING_ID" ]; then
    echo -e "${RED}❌ ERROR: SEATING_ID not set${NC}"
    echo "Usage: TOKEN=your_token EVENT_ID=xxx SEATING_ID=yyy ./test-unified-booking.sh"
    exit 1
fi

echo -e "${YELLOW}Configuration:${NC}"
echo "  API URL: $API_URL"
echo "  Event ID: $EVENT_ID"
echo "  Seating ID: $SEATING_ID"
echo ""

# ============================================================================
# STEP 1: CREATE RAZORPAY ORDER
# ============================================================================
echo -e "${BLUE}Step 1: Creating Razorpay Payment Order...${NC}"
echo -e "${YELLOW}Endpoint: POST /api/payments/create-order${NC}"

ORDER_RESPONSE=$(curl -s -X POST "$API_URL/api/payments/create-order" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "description": "Event Booking - VIP Ticket x2",
    "notes": {
      "eventId": "'$EVENT_ID'"
    }
  }')

echo -e "${YELLOW}Response:${NC}"
echo "$ORDER_RESPONSE" | jq '.' 2>/dev/null || echo "$ORDER_RESPONSE"

# Extract order ID from response
RAZORPAY_ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.data.razorpayOrderId' 2>/dev/null || echo "")

if [ -z "$RAZORPAY_ORDER_ID" ] || [ "$RAZORPAY_ORDER_ID" == "null" ]; then
    echo -e "${RED}❌ Failed to create Razorpay order${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Razorpay order created: $RAZORPAY_ORDER_ID${NC}"
echo ""

# ============================================================================
# STEP 2: SIMULATE RAZORPAY PAYMENT (In production, user completes this)
# ============================================================================
echo -e "${BLUE}Step 2: Simulating Razorpay Payment...${NC}"
echo -e "${YELLOW}In production: User completes payment in Razorpay checkout${NC}"

# Generate mock Razorpay response data
# In real scenario, these would come from Razorpay's payment handler
RAZORPAY_PAYMENT_ID="pay_$(date +%s | sha256sum | cut -c1-15)"
RAZORPAY_SIGNATURE=$(echo -n "${RAZORPAY_ORDER_ID}|${RAZORPAY_PAYMENT_ID}" | sha256sum | cut -c1-64)

echo "Generated mock payment data:"
echo "  Payment ID: $RAZORPAY_PAYMENT_ID"
echo "  Signature: $RAZORPAY_SIGNATURE"
echo -e "${GREEN}✅ Payment simulated${NC}"
echo ""

# ============================================================================
# STEP 3: CALL UNIFIED BOOKING ENDPOINT
# ============================================================================
echo -e "${BLUE}Step 3: Calling Unified Booking Endpoint...${NC}"
echo -e "${YELLOW}Endpoint: POST /api/booking/book${NC}"

BOOKING_PAYLOAD='{
  "eventId": "'$EVENT_ID'",
  "seatingId": "'$SEATING_ID'",
  "seatType": "VIP",
  "quantity": 2,
  "pricePerSeat": 500,
  "specialRequirements": "Wheelchair accessible seat",
  "paymentData": {
    "razorpayOrderId": "'$RAZORPAY_ORDER_ID'",
    "razorpayPaymentId": "'$RAZORPAY_PAYMENT_ID'",
    "razorpaySignature": "'$RAZORPAY_SIGNATURE'"
  }
}'

echo -e "${YELLOW}Payload:${NC}"
echo "$BOOKING_PAYLOAD" | jq '.'

BOOKING_RESPONSE=$(curl -s -X POST "$API_URL/api/booking/book" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$BOOKING_PAYLOAD")

echo -e "${YELLOW}Response:${NC}"
echo "$BOOKING_RESPONSE" | jq '.' 2>/dev/null || echo "$BOOKING_RESPONSE"

# Check if booking was successful
STATUS=$(echo "$BOOKING_RESPONSE" | jq -r '.status' 2>/dev/null || echo "")
PAYMENT_STATUS=$(echo "$BOOKING_RESPONSE" | jq -r '.data.paymentStatus' 2>/dev/null || echo "")

if [ "$STATUS" == "success" ] && [ "$PAYMENT_STATUS" == "success" ]; then
    echo -e "${GREEN}✅ Booking confirmed successfully!${NC}"
    
    # Extract booking details
    BOOKING_ID=$(echo "$BOOKING_RESPONSE" | jq -r '.data.booking._id' 2>/dev/null)
    TICKET_NUMBERS=$(echo "$BOOKING_RESPONSE" | jq -r '.data.booking.ticketNumbers[]' 2>/dev/null)
    TOTAL_PRICE=$(echo "$BOOKING_RESPONSE" | jq -r '.data.booking.totalPrice' 2>/dev/null)
    
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║              BOOKING CONFIRMATION DETAILS              ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo "  Booking ID: $BOOKING_ID"
    echo "  Status: confirmed"
    echo "  Total Price: ₹$TOTAL_PRICE"
    echo "  Ticket Numbers:"
    while IFS= read -r ticket; do
        echo "    • $ticket"
    done <<< "$TICKET_NUMBERS"
    
    # ========================================================================
    # STEP 4: VERIFY BOOKING DETAILS
    # ========================================================================
    echo ""
    echo -e "${BLUE}Step 4: Fetching Booking Details...${NC}"
    echo -e "${YELLOW}Endpoint: GET /api/booking/$BOOKING_ID${NC}"
    
    BOOKING_DETAILS=$(curl -s -X GET "$API_URL/api/booking/$BOOKING_ID" \
      -H "Authorization: Bearer $TOKEN")
    
    echo -e "${YELLOW}Booking Details:${NC}"
    echo "$BOOKING_DETAILS" | jq '.data.booking | {_id, status, paymentStatus, quantity, totalPrice, ticketNumbers}' 2>/dev/null || echo "$BOOKING_DETAILS"
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    SUCCESS! 🎉                         ║${NC}"
    echo -e "${GREEN}║  Booking confirmed with verified payment              ║${NC}"
    echo -e "${GREEN}║  Tickets are ready to download                        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
else
    echo -e "${RED}❌ Booking failed${NC}"
    echo -e "${RED}Status: $STATUS${NC}"
    echo -e "${RED}Payment Status: $PAYMENT_STATUS${NC}"
    ERROR_MESSAGE=$(echo "$BOOKING_RESPONSE" | jq -r '.message' 2>/dev/null || echo "Unknown error")
    echo -e "${RED}Error: $ERROR_MESSAGE${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Test Summary:${NC}"
echo -e "${GREEN}  ✅ Razorpay order created${NC}"
echo -e "${GREEN}  ✅ Payment simulated${NC}"
echo -e "${GREEN}  ✅ Booking created${NC}"
echo -e "${GREEN}  ✅ Payment verified${NC}"
echo -e "${GREEN}  ✅ Booking confirmed${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

