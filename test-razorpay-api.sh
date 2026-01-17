#!/bin/bash

# Razorpay API Testing Script
# Make sure your server is running on http://localhost:3000

BASE_URL="http://localhost:3000"
TOKEN="your_jwt_token_here"  # Replace with your actual JWT token

echo "🚀 Starting Razorpay API Tests..."
echo "=================================="

# Test 1: Check if server is running
echo -e "\n1️⃣  Testing Server Health..."
curl -s http://localhost:3000/ > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Server is running"
else
    echo "❌ Server is not running. Start it with: npm start"
    exit 1
fi

# Test 2: Create Payment Order
echo -e "\n2️⃣  Creating Payment Order..."
echo "Request:"
echo '{
  "amount": 500,
  "description": "Test Product",
  "receipt": "test_receipt_001",
  "notes": {
    "productId": "test_prod_1",
    "orderId": "test_order_1"
  },
  "customer": {
    "email": "test@example.com",
    "phone": "9876543210",
    "name": "Test User"
  }
}'

RESPONSE=$(curl -s -X POST "$BASE_URL/api/payments/create-order" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "amount": 500,
    "description": "Test Product",
    "receipt": "test_receipt_001",
    "notes": {
      "productId": "test_prod_1"
    },
    "customer": {
      "email": "test@example.com",
      "phone": "9876543210",
      "name": "Test User"
    }
  }')

echo -e "\nResponse:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

# Extract IDs for next test
ORDER_ID=$(echo "$RESPONSE" | jq -r '.data.razorpayOrderId' 2>/dev/null)
PAYMENT_ID="test_payment_id"  # You'll get this after payment

# Test 3: Get Payment History
echo -e "\n\n3️⃣  Getting Payment History..."
HISTORY=$(curl -s -X GET "$BASE_URL/api/payments?limit=5&skip=0" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$HISTORY" | jq '.' 2>/dev/null || echo "$HISTORY"

# Test 4: Get Order Details (if order was created)
if [ ! -z "$ORDER_ID" ] && [ "$ORDER_ID" != "null" ]; then
    echo -e "\n\n4️⃣  Getting Order Details..."
    ORDER_DETAILS=$(curl -s -X GET "$BASE_URL/api/payments/order/$ORDER_ID" \
      -H "Authorization: Bearer $TOKEN")
    
    echo "Response:"
    echo "$ORDER_DETAILS" | jq '.' 2>/dev/null || echo "$ORDER_DETAILS"
fi

echo -e "\n\n✅ Basic tests completed!"
echo "=================================="
echo "📝 Notes:"
echo "- Replace TOKEN with your actual JWT token"
echo "- Use Razorpay test card: 4111 1111 1111 1111"
echo "- For payment verification, use the actual payment ID from Razorpay"
