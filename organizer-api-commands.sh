#!/bin/bash

# Organizer Registration & Login API - curl Commands
# Usage: bash organizer-api-commands.sh

BASE_URL="http://localhost:3000"

echo "================================================"
echo "Organizer Registration & Login API"
echo "================================================"

# 1. Register
echo ""
echo "1. REGISTER NEW ORGANIZER"
echo "-------------------------"
echo "curl -X POST $BASE_URL/api/organizers/auth/register \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\": \"neworg@example.com\", \"password\": \"SecurePass123\", ...}'"
echo ""
read -p "Press Enter to run registration..."
TOKEN=$(curl -s -X POST $BASE_URL/api/organizers/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "neworg.'"$(date +%s)"'@example.com",
    "password": "SecurePass123",
    "confirmPassword": "SecurePass123",
    "name": "Event Company Ltd",
    "phone": "+1234567890",
    "contactPerson": "John Doe",
    "address": "123 Main Street, City",
    "website": "https://example.com",
    "description": "Professional event organizer"
  }' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Registration failed."
  exit 1
fi

echo "✅ Registration successful!"
echo "Token: $TOKEN"
echo ""

# 2. Login with existing organizer
echo "2. LOGIN WITH EXISTING ORGANIZER"
echo "-------------------------------"
echo "curl -X POST $BASE_URL/api/organizers/auth/login \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\": \"contact@techevents.com\", \"password\": \"password123\"}'"
echo ""
read -p "Press Enter to run login..."
TOKEN=$(curl -s -X POST $BASE_URL/api/organizers/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email": "contact@techevents.com", "password": "password123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Check your credentials."
  exit 1
fi

echo "✅ Login successful!"
echo "Token: $TOKEN"
echo ""

# 3. Get Profile Only
echo "3. GET PROFILE ONLY"
echo "-------------------"
echo "curl -X GET $BASE_URL/api/organizers/auth/profile \\"
echo "  -H 'Authorization: Bearer $TOKEN'"
echo ""
read -p "Press Enter to run..."
curl -X GET "$BASE_URL/api/organizers/auth/profile" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo ""

# 4. Get Profile + Summary
echo "4. GET PROFILE + EVENTS SUMMARY"
echo "-------------------------------"
echo "curl -X GET '$BASE_URL/api/organizers/auth/profile?include=summary' \\"
echo "  -H 'Authorization: Bearer $TOKEN'"
echo ""
read -p "Press Enter to run..."
curl -X GET "$BASE_URL/api/organizers/auth/profile?include=summary" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo ""

# 5. Get Profile + Events
echo "5. GET PROFILE + FULL EVENTS LIST"
echo "--------------------------------"
echo "curl -X GET '$BASE_URL/api/organizers/auth/profile?include=events' \\"
echo "  -H 'Authorization: Bearer $TOKEN'"
echo ""
read -p "Press Enter to run..."
curl -X GET "$BASE_URL/api/organizers/auth/profile?include=events" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo ""

# 6. Update Profile
echo "6. UPDATE PROFILE"
echo "----------------"
echo "curl -X PATCH $BASE_URL/api/organizers/auth/profile \\"
echo "  -H 'Authorization: Bearer $TOKEN' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"name\": \"Updated Name\", \"phone\": \"9876543210\"}'"
echo ""
read -p "Press Enter to run..."
curl -X PATCH "$BASE_URL/api/organizers/auth/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name": "Updated Name", "phone": "9876543210"}' | python3 -m json.tool
echo ""

# 7. Change Password
echo "7. CHANGE PASSWORD"
echo "----------------"
echo "curl -X PATCH $BASE_URL/api/organizers/auth/change-password \\"
echo "  -H 'Authorization: Bearer $TOKEN' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"currentPassword\": \"password123\", \"newPassword\": \"newPass123\", \"confirmPassword\": \"newPass123\"}'"
echo ""
read -p "Press Enter to run..."
curl -X PATCH "$BASE_URL/api/organizers/auth/change-password" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"currentPassword": "password123", "newPassword": "newPass123", "confirmPassword": "newPass123"}' | python3 -m json.tool
echo ""

# 8. Logout
echo "8. LOGOUT"
echo "---------"
echo "curl -X GET $BASE_URL/api/organizers/auth/logout \\"
echo "  -H 'Authorization: Bearer $TOKEN'"
echo ""
read -p "Press Enter to run..."
curl -X GET "$BASE_URL/api/organizers/auth/logout" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo ""

echo "================================================"
echo "All tests completed!"
echo "================================================"
