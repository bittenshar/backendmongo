#!/bin/bash

# Razorpay Payment Gateway - Complete Testing Script
# Usage: bash razorpay-complete-test.sh

echo "🚀 Razorpay Payment Gateway - Complete Test Suite"
echo "=================================================="
echo ""

# Configuration
BASE_URL="http://localhost:3000"
TEST_EMAIL="test8824223395@example.com"
TEST_PASSWORD="TestPass123!"
TEST_PHONE="8824223395"
TEST_NAME="Test User"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

# Helper function for colored output
print_test() {
  echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
  ((PASSED++))
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
  ((FAILED++))
}

print_info() {
  echo -e "${YELLOW}ℹ $1${NC}"
}

# Test 1: Server Health Check
print_test "Test 1: Server Health Check"
HEALTH=$(curl -s -X GET "$BASE_URL/api/health" | jq '.status' 2>/dev/null)
if [ "$HEALTH" == '"success"' ]; then
  print_success "Server is healthy"
else
  print_error "Server health check failed"
  exit 1
fi
echo ""

# Test 2: User Signup/Authentication
print_test "Test 2: User Signup/Authentication"
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"'$TEST_EMAIL'",
    "password":"'$TEST_PASSWORD'",
    "name":"'$TEST_NAME'",
    "phone":"'$TEST_PHONE'"
  }')

JWT_TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.data.token' 2>/dev/null)
USER_ID=$(echo "$SIGNUP_RESPONSE" | jq -r '.data.user._id' 2>/dev/null)

if [ ! -z "$JWT_TOKEN" ] && [ "$JWT_TOKEN" != "null" ]; then
  print_success "User signup successful"
  print_info "JWT Token: ${JWT_TOKEN:0:30}..."
  print_info "User ID: $USER_ID"
else
  print_error "User signup failed"
  echo "$SIGNUP_RESPONSE" | jq .
  exit 1
fi
echo ""

# Test 3: Create Payment Order
print_test "Test 3: Create Payment Order"
ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/payments/create-order" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "amount": 500,
    "description": "Test Payment",
    "receipt": "test-receipt-'$(date +%s)'"
  }')

ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.data.orderId' 2>/dev/null)
RAZORPAY_ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.data.razorpayOrderId' 2>/dev/null)
RAZORPAY_KEY=$(echo "$ORDER_RESPONSE" | jq -r '.data.key' 2>/dev/null)

if [ ! -z "$ORDER_ID" ] && [ "$ORDER_ID" != "null" ]; then
  print_success "Payment order created successfully"
  print_info "Order ID: $ORDER_ID"
  print_info "Razorpay Order ID: $RAZORPAY_ORDER_ID"
  print_info "Razorpay Key: $RAZORPAY_KEY"
else
  print_error "Payment order creation failed"
  echo "$ORDER_RESPONSE" | jq .
fi
echo ""

# Test 4: Get Payment History
print_test "Test 4: Get Payment History"
HISTORY=$(curl -s -X GET "$BASE_URL/api/payments/" \
  -H "Authorization: Bearer $JWT_TOKEN")

TOTAL_PAYMENTS=$(echo "$HISTORY" | jq '.data.total' 2>/dev/null)

if [ ! -z "$TOTAL_PAYMENTS" ] && [ "$TOTAL_PAYMENTS" -ge 1 ]; then
  print_success "Payment history retrieved"
  print_info "Total payments: $TOTAL_PAYMENTS"
else
  print_error "Failed to retrieve payment history"
  echo "$HISTORY" | jq .
fi
echo ""

# Test 5: Get Order Details
print_test "Test 5: Get Order Details"
ORDER_DETAILS=$(curl -s -X GET "$BASE_URL/api/payments/order/$RAZORPAY_ORDER_ID" \
  -H "Authorization: Bearer $JWT_TOKEN")

ORDER_STATUS=$(echo "$ORDER_DETAILS" | jq -r '.data.status' 2>/dev/null)

if [ "$ORDER_STATUS" == "created" ]; then
  print_success "Order details retrieved successfully"
  print_info "Order Status: $ORDER_STATUS"
else
  print_error "Failed to retrieve order details"
  echo "$ORDER_DETAILS" | jq .
fi
echo ""

# Test 6: Payment Lookup by Order ID
print_test "Test 6: Payment Lookup by Order ID"
LOOKUP=$(curl -s -X GET "$BASE_URL/api/payments/lookup/$RAZORPAY_ORDER_ID" \
  -H "Authorization: Bearer $JWT_TOKEN")

LOOKUP_STATUS=$(echo "$LOOKUP" | jq -r '.data.status' 2>/dev/null)

if [ ! -z "$LOOKUP_STATUS" ] && [ "$LOOKUP_STATUS" != "null" ]; then
  print_success "Payment lookup successful"
  print_info "Lookup Status: $LOOKUP_STATUS"
else
  print_error "Payment lookup failed"
  echo "$LOOKUP" | jq .
fi
echo ""

# Test 7: Authentication Test (without token)
print_test "Test 7: Authentication Test (Invalid Token)"
NO_AUTH=$(curl -s -X GET "$BASE_URL/api/payments/" \
  -H "Authorization: Bearer invalid-token")

ERROR_MESSAGE=$(echo "$NO_AUTH" | jq -r '.message' 2>/dev/null)

if [ ! -z "$ERROR_MESSAGE" ]; then
  print_success "Authentication correctly rejected"
  print_info "Error: $ERROR_MESSAGE"
else
  print_error "Authentication test failed"
  echo "$NO_AUTH" | jq .
fi
echo ""

# Test 8: Payment Status Filter
print_test "Test 8: Payment Status Filter (Pending)"
PENDING=$(curl -s -X GET "$BASE_URL/api/payments/?status=pending" \
  -H "Authorization: Bearer $JWT_TOKEN")

PENDING_COUNT=$(echo "$PENDING" | jq '.data.payments | length' 2>/dev/null)

if [ "$PENDING_COUNT" -ge 1 ]; then
  print_success "Payment status filter working"
  print_info "Pending payments: $PENDING_COUNT"
else
  print_error "Payment status filter failed"
  echo "$PENDING" | jq .
fi
echo ""

# Test 9: Invalid Amount Test
print_test "Test 9: Validation Test (Invalid Amount)"
INVALID_AMOUNT=$(curl -s -X POST "$BASE_URL/api/payments/create-order" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "amount": 0,
    "description": "Invalid Payment"
  }')

VALIDATION_ERROR=$(echo "$INVALID_AMOUNT" | jq -r '.message' 2>/dev/null)

if [[ "$VALIDATION_ERROR" == *"amount"* ]]; then
  print_success "Validation correctly rejected invalid amount"
  print_info "Error: $VALIDATION_ERROR"
else
  print_error "Validation test failed"
  echo "$INVALID_AMOUNT" | jq .
fi
echo ""

# Test 10: Create Multiple Orders
print_test "Test 10: Create Multiple Payment Orders"
MULTI_COUNT=0
for i in {1..3}; do
  MULTI=$(curl -s -X POST "$BASE_URL/api/payments/create-order" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -d '{
      "amount": '$((100 * i))',
      "description": "Payment '$i'",
      "receipt": "receipt-'$i'-'$(date +%s)'"
    }')
  
  MULTI_ORDER=$(echo "$MULTI" | jq -r '.data.razorpayOrderId' 2>/dev/null)
  if [ ! -z "$MULTI_ORDER" ] && [ "$MULTI_ORDER" != "null" ]; then
    ((MULTI_COUNT++))
  fi
done

if [ "$MULTI_COUNT" -eq 3 ]; then
  print_success "Multiple orders created successfully"
  print_info "Orders created: $MULTI_COUNT"
else
  print_error "Failed to create all orders (created: $MULTI_COUNT/3)"
fi
echo ""

# Summary
echo "=================================================="
echo -e "${BLUE}Test Summary${NC}"
echo "=================================================="
echo -e "${GREEN}✓ Passed: $PASSED${NC}"
echo -e "${RED}✗ Failed: $FAILED${NC}"
TOTAL=$((PASSED + FAILED))
SUCCESS_RATE=$(echo "scale=2; ($PASSED / $TOTAL) * 100" | bc)
echo -e "Success Rate: ${GREEN}${SUCCESS_RATE}%${NC}"
echo ""

# Environment Summary
echo "=================================================="
echo -e "${BLUE}Test Environment${NC}"
echo "=================================================="
echo "Base URL: $BASE_URL"
echo "Test Email: $TEST_EMAIL"
echo "Test Phone: $TEST_PHONE"
echo "User ID: $USER_ID"
echo "JWT Token: ${JWT_TOKEN:0:30}..."
echo ""

# Test Credentials for Reference
echo "=================================================="
echo -e "${BLUE}Test Credentials (Save for Reference)${NC}"
echo "=================================================="
echo "export JWT_TOKEN='$JWT_TOKEN'"
echo "export USER_ID='$USER_ID'"
echo "export ORDER_ID='$ORDER_ID'"
echo "export RAZORPAY_ORDER_ID='$RAZORPAY_ORDER_ID'"
echo ""

# API Endpoints Summary
echo "=================================================="
echo -e "${BLUE}Available API Endpoints${NC}"
echo "=================================================="
echo "POST   /api/payments/create-order       - Create payment order"
echo "POST   /api/payments/verify              - Verify payment"
echo "GET    /api/payments/                    - Get payment history"
echo "GET    /api/payments/:paymentId          - Get payment details"
echo "GET    /api/payments/order/:orderId      - Get order details"
echo "GET    /api/payments/lookup/:orderId     - Lookup payment by order"
echo "POST   /api/payments/:paymentId/refund   - Refund payment"
echo "POST   /api/payments/webhook             - Razorpay webhook (public)"
echo ""

if [ "$FAILED" -eq 0 ]; then
  print_success "All tests passed! 🎉"
  exit 0
else
  print_error "Some tests failed"
  exit 1
fi
