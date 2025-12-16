#!/bin/bash

# Test the notification endpoint
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "token": "fcm_device_token_12345xyz",
    "title": "Test Notification",
    "body": "This is a test notification"
  }' | jq .

