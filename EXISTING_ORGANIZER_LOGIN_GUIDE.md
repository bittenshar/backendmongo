# Organizer Existing Login Guide

## Quick Test - Existing Organizer Login

### Organizer Available in Database:
- **Email:** `n@example.com`
- **Password:** `ssssssss`
- **Name:** Event Company Ltd
- **Status:** Active ✅

---

## 🔐 Login Steps

### Option 1: Using curl

```bash
# 1. Login and save token to variable
TOKEN=$(curl -s -X POST http://localhost:3000/api/organizers/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "n@example.com",
    "password": "ssssssss"
  }' | jq -r '.token')

echo "✅ Token: $TOKEN"

# 2. Use token for protected endpoints
curl -X GET "http://localhost:3000/api/organizers/auth/profile?include=events" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Option 2: Using the tester script

```bash
node test-organizer-login.js
# Then enter: n@example.com
# Then enter: ssssssss
```

### Option 3: Using Postman

1. Open `Organizer_Register_Auth_API.postman_collection.json`
2. Run "Login" request with credentials:
   ```json
   {
     "email": "n@example.com",
     "password": "ssssssss"
   }
   ```
3. Token auto-saves to `{{token}}` variable
4. Run protected endpoints

### Option 4: Using REST Client (.http)

```http
POST http://localhost:3000/api/organizers/auth/login
Content-Type: application/json

{
  "email": "n@example.com",
  "password": "ssssssss"
}
```

---

## 📋 Available Endpoints After Login

### Get Profile Only
```bash
curl -X GET http://localhost:3000/api/organizers/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

### Get Profile + Events Summary
```bash
curl -X GET "http://localhost:3000/api/organizers/auth/profile?include=summary" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Profile + Full Events
```bash
curl -X GET "http://localhost:3000/api/organizers/auth/profile?include=events" \
  -H "Authorization: Bearer $TOKEN"
```

### Update Profile
```bash
curl -X PATCH http://localhost:3000/api/organizers/auth/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Updated Name",
    "phone": "9876543210"
  }'
```

### Change Password
```bash
curl -X PATCH http://localhost:3000/api/organizers/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "currentPassword": "ssssssss",
    "newPassword": "newPassword123",
    "confirmPassword": "newPassword123"
  }'
```

### Logout
```bash
curl -X GET http://localhost:3000/api/organizers/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

---

## ✅ Successful Login Response

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "organizer": {
      "_id": "69cc2df2ca358ea89358117c",
      "name": "Event Company Ltd",
      "email": "n@example.com",
      "phone": "+1234567890",
      "status": "active",
      "contactPerson": "John Doe",
      "address": "123 Main Street, City",
      "website": "https://example.com",
      "description": "Professional event organizer",
      "logo": "https://example.com/logo.png",
      "joinDate": "2026-03-31T20:26:26.342Z",
      "lastLogin": "2026-03-31T21:53:55.654Z",
      "totalRevenue": 0,
      "totalEvents": 0,
      "activeEvents": 0
    }
  }
}
```

---

## 🔑 Token Details

- **Type:** JWT (JSON Web Token)
- **Expiry:** 7 days
- **Usage:** Add to Authorization header: `Bearer {token}`
- **Storage:** Automatically set as HTTP-only cookie

---

## 🚀 Full Workflow Example

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"
EMAIL="n@example.com"
PASSWORD="ssssssss"

# 1. Login
echo "🔐 Logging in..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/organizers/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

TOKEN=$(echo $RESPONSE | jq -r '.token')
echo "✅ Token: ${TOKEN:0:50}..."

# 2. Get profile with events
echo ""
echo "📋 Getting profile with events..."
curl -s -X GET "$BASE_URL/api/organizers/auth/profile?include=events" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.organizer | .name, .email, .status'

# 3. Logout
echo ""
echo "🚪 Logging out..."
curl -s -X GET "$BASE_URL/api/organizers/auth/logout" \
  -H "Authorization: Bearer $TOKEN" | jq '.message'
```

---

## ❌ Error Scenarios

### Invalid Credentials
```json
{
  "status": "error",
  "message": "Invalid email or password"
}
```

### Missing Fields
```json
{
  "status": "error",
  "message": "Please provide email and password"
}
```

### Inactive Account
```json
{
  "status": "error",
  "message": "Organizer account is not active"
}
```

### Invalid Token (Protected Endpoints)
```json
{
  "status": "error",
  "message": "Invalid or expired token. Please login again."
}
```

---

## 📊 Database Organizers

To view all available organizers:

```bash
node -e "
const mongoose = require('mongoose');
const Organizer = require('./src/features/organizers/organizer.model');
mongoose.connect('mongodb://localhost:27017/adminthrill')
  .then(async () => {
    const orgs = await Organizer.find().select('email name status');
    console.table(orgs);
    process.exit();
  });
"
```

---

## ✨ Quick Test Command

Copy & paste to test login:

```bash
curl -X POST http://localhost:3000/api/organizers/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"n@example.com","password":"ssssssss"}' | jq
```

Save output token for subsequent requests! 🚀
