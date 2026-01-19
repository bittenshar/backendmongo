#!/bin/bash

# WhatsApp OTP Debug Test Script
# This script helps debug the WATI API integration

echo "================================"
echo "WhatsApp OTP Debug Test"
echo "================================"
echo ""

# Check environment variables
echo "📋 Checking Environment Variables:"
echo "WATI_API_KEY: ${WATI_API_KEY:0:20}..." 
echo "WATI_BASE_URL: $WATI_BASE_URL"
echo "WATI_TEMPLATE_NAME: $WATI_TEMPLATE_NAME"
echo ""

# Test with correct phone format
echo "📱 Testing Send OTP with phone: 919876543210"
echo ""
curl -X POST http://localhost:8000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "919876543210"}' \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo ""
echo "================================"
echo "✅ Check the response above for errors"
echo "Common issues:"
echo "1. 400 - Bad request (check phone format, template name)"
echo "2. 401 - Unauthorized (check API key)"
echo "3. 404 - Not found (check template/endpoint)"
echo "4. 405 - Method not allowed (check endpoint URL)"
echo "================================"
