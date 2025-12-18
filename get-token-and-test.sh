#!/bin/bash

# Login and get token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"d@example.com","password":"Test@1234"}')

echo "📋 Login Response:"
echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
echo ""

# Extract token and userId
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token' 2>/dev/null)
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.userId' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Failed to get token"
  exit 1
fi

echo "✅ Got Token: ${TOKEN:0:50}..."
echo "✅ Got UserId: $USER_ID"
echo ""

# Test image status endpoint
echo "🔍 Testing GET /api/get-image-status/$USER_ID"
echo ""

IMAGE_RESPONSE=$(curl -s -X GET "http://localhost:3000/api/get-image-status/$USER_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "📋 Image Status Response:"
echo "$IMAGE_RESPONSE" | jq '.' 2>/dev/null || echo "$IMAGE_RESPONSE"
