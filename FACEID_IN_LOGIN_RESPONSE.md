# FaceId Check in Login Response

## Overview

The login endpoint now automatically checks if the user has a face record in DynamoDB and includes this information in the response. **No extra API calls needed!**

---

## What Changed

### Login Response - BEFORE

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "userId": "user-btiflyc5h-mhulcxxq",
      "email": "d@example.com",
      "name": "John",
      "role": "user",
      ...
    }
  }
}
```

### Login Response - AFTER ✅

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "userId": "user-btiflyc5h-mhulcxxq",
      "email": "d@example.com",
      "name": "John",
      "role": "user",
      ...
      "hasFaceRecord": true,              ← NEW!
      "faceId": "face-recognition-id-xxx" ← NEW!
    }
  }
}
```

---

## New Response Fields

| Field | Type | Meaning | Example |
|-------|------|---------|---------|
| `hasFaceRecord` | boolean | Does user have face ID generated? | `true` or `false` |
| `faceId` | string or null | AWS Rekognition Face ID | `"face-recognition-id-xyz"` or `null` |

---

## Response Scenarios

### Scenario 1: User HAS Face Record

```json
{
  "status": "success",
  "token": "...",
  "data": {
    "user": {
      "userId": "user-123",
      "hasFaceRecord": true,
      "faceId": "123-abc-xyz",
      ...
    }
  }
}
```

**Meaning**: User has completed face verification ✅

---

### Scenario 2: User DOES NOT Have Face Record

```json
{
  "status": "success",
  "token": "...",
  "data": {
    "user": {
      "userId": "user-456",
      "hasFaceRecord": false,
      "faceId": null,
      ...
    }
  }
}
```

**Meaning**: User needs to upload face for verification ⚠️

---

## How It Works

1. **User logs in** → POST `/api/auth/login`
2. **Server checks DynamoDB** → Query `faceimage` table
3. **Response includes face status** → `hasFaceRecord` and `faceId`
4. **Client uses this info** → Route to face verification or proceed

```
┌─────────────────────────┐
│ User Login              │
│ POST /api/auth/login    │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Authenticate User       │
│ Check password          │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Check DynamoDB          │  ← NEW!
│ Query faceimage table   │
│ Get hasFaceRecord       │
│ Get faceId              │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Return Login Response   │
│ Include face status     │
│ Include faceId          │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Client Uses Data        │
│ hasFaceRecord: true?    │
│ → Route accordingly     │
└─────────────────────────┘
```

---

## Postman Usage

### Step 1: Send Login Request

```
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Step 2: Extract Face Status in Tests Tab

```javascript
var responseJson = pm.response.json();
var user = responseJson.data.user;

// Extract face information
var hasFaceRecord = user.hasFaceRecord;
var faceId = user.faceId;

// Save to environment for reuse
pm.environment.set("hasFaceRecord", hasFaceRecord);
pm.environment.set("faceId", faceId);
pm.environment.set("userId", user.userId);
pm.environment.set("token", responseJson.token);

// Log for debugging
console.log("✅ Login successful");
console.log("   hasFaceRecord:", hasFaceRecord);
console.log("   faceId:", faceId);
console.log("   userId:", user.userId);

// Conditional routing
if (hasFaceRecord) {
  console.log("   → User HAS face record - proceed with verification");
  pm.environment.set("flowStep", "verify");
} else {
  console.log("   → User NEEDS face registration - route to registration");
  pm.environment.set("flowStep", "register");
}
```

### Step 3: Use in Next Request

```
// Get token
Authorization: Bearer {{token}}

// Use face status
Body: {
  "userId": "{{userId}}",
  "faceId": "{{faceId}}",
  "hasFaceRecord": {{hasFaceRecord}}
}
```

---

## Use Cases

### Use Case 1: Conditional UI Rendering

```javascript
// After login, check if face record exists
if (user.hasFaceRecord) {
  // Show verification flow
  showFaceVerification(user.faceId);
} else {
  // Show face registration flow
  showFaceRegistration();
}
```

### Use Case 2: Auto-Extract faceId

```javascript
// No need to make separate API call anymore!
// faceId is already in login response
var faceId = user.faceId;

// Use it immediately
verifyUserFace(faceId);
```

### Use Case 3: Flow Control

```javascript
// Decide next step immediately after login
const user = loginResponse.data.user;

if (user.hasFaceRecord && user.faceId) {
  // User has face - proceed to event verification
  nextStep = "eventVerification";
} else {
  // User needs face first
  nextStep = "faceRegistration";
}
```

---

## Files Modified

### 1. `src/features/auth/auth.service.js`

**Changes**:
- Made `createSendToken()` async
- Added DynamoDB face check
- Added `hasFaceRecord` to response
- Added `faceId` to response

```javascript
// Before: synchronous
const createSendToken = (user, statusCode, res) => { ... }

// After: async with face check
const createSendToken = async (user, statusCode, res) => {
  // Check DynamoDB for face record
  let hasFaceRecord = false;
  let faceId = null;
  
  if (process.env.DYNAMODB_FACE_VALIDATION_TABLE && user.userId) {
    const dynamodbService = require('../../services/aws/dynamodb.service');
    hasFaceRecord = await dynamodbService.checkIfUserFaceExists(user.userId);
    // ... get faceId if exists
  }
  
  // Add to response
  userResponse.hasFaceRecord = hasFaceRecord;
  userResponse.faceId = faceId;
}
```

### 2. `src/features/auth/auth.controller.js`

**Changes**:
- Added `await` for async `createSendToken()`

```javascript
// Before
authService.createSendToken(user, 200, res);

// After
await authService.createSendToken(user, 200, res);
```

---

## Benefits

✅ **No Extra API Calls** - Get face status in login response
✅ **Immediate Routing** - Know next step right after login
✅ **Automatic faceId** - Extract without separate request
✅ **Better UX** - Faster, smoother user flow
✅ **Performance** - Single DynamoDB query instead of multiple

---

## Testing

### Test 1: Login User WITH Face Record

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user-with-face@example.com",
    "password": "password123"
  }' | jq '.data.user | {hasFaceRecord, faceId}'

# Expected output:
# {
#   "hasFaceRecord": true,
#   "faceId": "face-123-abc-xyz"
# }
```

### Test 2: Login User WITHOUT Face Record

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user-without-face@example.com",
    "password": "password123"
  }' | jq '.data.user | {hasFaceRecord, faceId}'

# Expected output:
# {
#   "hasFaceRecord": false,
#   "faceId": null
# }
```

---

## Error Handling

If DynamoDB check fails, the login still succeeds, but face status will be:

```json
{
  "hasFaceRecord": false,
  "faceId": null,
  "error": null  // No error - still returns false as default
}
```

**Reason**: Face verification is optional - login should not fail if DynamoDB is down.

---

## Next Steps

1. ✅ Login and get response with `hasFaceRecord` and `faceId`
2. ✅ Check `hasFaceRecord` to decide user flow
3. ✅ If `false` → Route to face registration
4. ✅ If `true` → Use `faceId` for verification

---

## Complete Example

### Login Request

```bash
POST /api/auth/login
{
  "email": "d@example.com",
  "password": "password"
}
```

### Login Response

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "userId": "user-btiflyc5h-mhulcxxq",
      "name": "d",
      "email": "d@example.com",
      "phone": "+1234567890",
      "role": "user",
      "permissions": [],
      "verificationStatus": "pending",
      "status": "active",
      "uploadedPhoto": null,
      "_id": "6913365209a2957b95f1125f",
      "createdAt": "2025-11-11T13:12:50.891Z",
      "updatedAt": "2025-11-11T13:12:50.891Z",
      "firstname": "d",
      "lastname": "",
      "__v": 0,
      "lastLoginFormatted": "Today",
      "hasFaceRecord": true,                    ← NEW!
      "faceId": "face-recognition-id-12345"    ← NEW!
    }
  }
}
```

### Use in Frontend

```javascript
if (response.data.user.hasFaceRecord) {
  // User has face - can proceed with verification
  startFaceVerification(response.data.user.faceId);
} else {
  // User needs to register face first
  redirectToFaceRegistration();
}
```

---

**Status**: ✅ COMPLETE - Login now includes face record status
**Files Modified**: 2 (auth.controller.js, auth.service.js)
**New Response Fields**: 2 (hasFaceRecord, faceId)
**Last Updated**: 2024-01-XX
