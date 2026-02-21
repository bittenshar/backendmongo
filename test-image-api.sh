#!/bin/bash

API_URL="http://localhost:3000"
TOKEN="3UaQLfVktEWWNGGtNx6SvnCgyf1doEwf5kzNvDXFzKI="

echo "════════════════════════════════════════════════════════════"
echo "Testing Encrypted Image Endpoints"
echo "════════════════════════════════════════════════════════════"
echo ""

# Test 1: Health check
echo "1️⃣ Testing health check endpoint..."
echo "GET $API_URL/api/images/health"
RESPONSE=$(curl -s "$API_URL/api/images/health")
echo "Response: $RESPONSE"
echo ""

# Test 2: Get test URL
echo "2️⃣ Getting test image URL..."
echo "GET $API_URL/api/images/test-url/694291bb1e613c43e1b18a76"
curl -s "$API_URL/api/images/test-url/694291bb1e613c43e1b18a76" | jq .
echo ""

# Test 3: Fetch image
echo "3️⃣ Fetching encrypted image..."
echo "GET $API_URL/api/images/encrypted/$TOKEN"
echo ""

# Try with -i to see headers
curl -i "$API_URL/api/images/encrypted/$TOKEN" 2>/dev/null | head -20

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ Tests complete"
