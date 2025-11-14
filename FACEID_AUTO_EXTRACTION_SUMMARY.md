# FaceId Auto-Generation & Extraction Summary

## What Changed

You now have **three powerful endpoints** to automatically check and extract `faceId` (RekognitionId) from your DynamoDB table:

---

## The Problem You Had

You wanted to:
1. Check if a user has a face record
2. If they do, **automatically get the faceId**
3. Use that faceId in subsequent API calls

**Before**: You could only check existence, not get the ID
**After**: faceId is automatically returned and can be used in Postman tests

---

## The Solution - Three New/Enhanced Endpoints

### 1. ✅ Check Face Exists (Enhanced)

**URL**: `GET /api/registrations/check-face-exists/:userId`

**What It Returns**:
```json
{
  "status": "success",
  "message": "User has face record",
  "data": {
    "userId": "user-btiflyc5h-mhulcxxq",
    "hasFaceRecord": true,
    "faceId": "face-recognition-id-12345"   ← NEW!
  }
}
```

**Use Case**: Quick check with ID extraction

---

### 2. ✅ Get Face ID (NEW - Recommended)

**URL**: `GET /api/registrations/face-id/:userId`

**What It Returns**:
```json
{
  "status": "success",
  "message": "Face ID retrieved successfully",
  "data": {
    "userId": "user-btiflyc5h-mhulcxxq",
    "faceId": "face-recognition-id-12345",
    "hasFaceRecord": true,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Use Case**: Simple, direct faceId extraction (best for Postman)

---

### 3. ✅ Get Full Face Record (Existing)

**URL**: `GET /api/registrations/:userId/face`

**What It Returns**:
```json
{
  "status": "success",
  "message": "Face record retrieved successfully",
  "data": {
    "RekognitionId": "face-recognition-id-12345",
    "UserId": "user-btiflyc5h-mhulcxxq",
    "Name": "John Doe",
    "CreatedAt": "2024-01-15T10:30:00Z",
    "Attributes": {...}
  }
}
```

**Use Case**: Get complete face metadata

---

## How to Use in Postman

### Step 1: Call Face ID Endpoint

```
GET http://localhost:3000/api/registrations/face-id/user-btiflyc5h-mhulcxxq
```

### Step 2: Extract faceId in Tests Tab

```javascript
var responseJson = pm.response.json();
var faceId = responseJson.data.faceId;

// Save to environment for reuse
pm.environment.set("faceId", faceId);

console.log("✅ Extracted faceId:", faceId);
```

### Step 3: Use in Next Request

```
PUT http://localhost:3000/api/registrations/{{userId}}/face
Body:
{
  "verificationFaceId": "{{faceId}}"
}
```

---

## Complete Postman Workflow

```
┌─────────────────────────────────────┐
│ Request 1: Check Face ID            │
│ GET /face-id/:userId                │
└────────────┬────────────────────────┘
             │
             ├─→ Tests Tab Script:
             │   pm.environment.set("faceId", ...)
             │
             ▼
┌─────────────────────────────────────┐
│ Environment Variable Set             │
│ faceId = "face-recognition-id-xxx"  │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ Request 2: Use faceId               │
│ PUT /{{userId}}/face                │
│ Body: { faceId: "{{faceId}}" }      │
└─────────────────────────────────────┘
```

---

## Files Modified

### 1. `src/features/registrations/userEventRegistration.controller.js`

**Changes**:
- Enhanced `checkUserFaceExists()` to include `faceId` in response
- Added new `getUserFaceId()` endpoint (simple extraction)

```javascript
// OLD Response
{
  "hasFaceRecord": true,
  "userId": "user-xxx"
}

// NEW Response
{
  "hasFaceRecord": true,
  "userId": "user-xxx",
  "faceId": "face-xxx"  ← Added!
}
```

### 2. `src/features/registrations/userEventRegistration.routes.js`

**Changes**:
- Added new route: `GET /face-id/:userId`

```javascript
// New route (line 47)
router.get('/face-id/:userId', registrationController.getUserFaceId);
```

---

## Code Implementation Details

### Enhanced checkUserFaceExists()

```javascript
exports.checkUserFaceExists = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  
  try {
    const exists = await dynamodbService.checkIfUserFaceExists(userId);
    
    // NEW: If face exists, get the faceId
    let faceId = null;
    if (exists) {
      try {
        const faceRecord = await dynamodbService.getUserFaceRecord(userId);
        faceId = faceRecord?.data?.RekognitionId || faceRecord?.data?.rekognitionId;
      } catch (err) {
        console.warn(`Could not retrieve face ID for userId: ${userId}`);
      }
    }
    
    res.status(200).json({
      status: 'success',
      message: exists ? 'User has face record' : 'User has no face record',
      data: {
        userId,
        hasFaceRecord: exists,
        faceId: faceId  // NEW!
      }
    });
  } catch (error) {
    return next(new AppError(`Check failed: ${error.message}`, 500));
  }
});
```

### New getUserFaceId()

```javascript
exports.getUserFaceId = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  
  try {
    const exists = await dynamodbService.checkIfUserFaceExists(userId);
    
    if (!exists) {
      return res.status(200).json({
        status: 'success',
        message: 'User has no face record',
        data: {
          userId,
          faceId: null,
          hasFaceRecord: false
        }
      });
    }

    // Get the face record
    const faceRecord = await dynamodbService.getUserFaceRecord(userId);
    const faceId = faceRecord?.data?.RekognitionId || faceRecord?.data?.rekognitionId;

    res.status(200).json({
      status: 'success',
      message: 'Face ID retrieved successfully',
      data: {
        userId,
        faceId: faceId,
        hasFaceRecord: true,
        createdAt: faceRecord?.data?.CreatedAt || faceRecord?.data?.createdAt
      }
    });
  } catch (error) {
    return next(new AppError(`Failed to retrieve face ID: ${error.message}`, 500));
  }
});
```

---

## Test Scenarios

### Scenario 1: User Has Face Record

```bash
GET /api/registrations/face-id/user-123

Response:
{
  "status": "success",
  "data": {
    "userId": "user-123",
    "faceId": "123-abc-xyz",  ← Can use this!
    "hasFaceRecord": true
  }
}
```

**Action**: Extract faceId and use in next request ✅

### Scenario 2: User Does NOT Have Face Record

```bash
GET /api/registrations/face-id/user-456

Response:
{
  "status": "success",
  "data": {
    "userId": "user-456",
    "faceId": null,  ← Null, user needs to register
    "hasFaceRecord": false
  }
}
```

**Action**: Route user to face registration ✅

---

## Postman Test Script (Copy-Paste Ready)

```javascript
// In Postman Tests tab for GET /face-id/:userId

var responseJson = pm.response.json();

// Test 1: Response successful
pm.test("Response is successful", function() {
  pm.expect(responseJson.status).to.equal("success");
});

// Test 2: Extract faceId
var faceId = responseJson.data.faceId;
var hasFaceRecord = responseJson.data.hasFaceRecord;

pm.environment.set("faceId", faceId);
pm.environment.set("hasFaceRecord", hasFaceRecord);

// Test 3: Validate if exists
if (hasFaceRecord) {
  pm.test("FaceId exists when record present", function() {
    pm.expect(faceId).to.not.be.null;
    pm.expect(faceId.length).to.be.greaterThan(0);
  });
  console.log("✅ FaceId:", faceId);
} else {
  console.log("⚠️ No face record - faceId is null");
}
```

---

## Error Handling

### If faceId is Null

```javascript
// Postman Test Script
if (!pm.environment.get("faceId")) {
  pm.test("Handle missing faceId", function() {
    // Option 1: Proceed to registration flow
    pm.environment.set("flowStep", "register");
    
    // Option 2: Retry
    pm.environment.set("needsRetry", true);
  });
}
```

---

## Benefits

✅ **Automatic ID Extraction** - No manual copying
✅ **Postman Integration** - Works seamlessly with environment variables
✅ **Conditional Logic** - Route users based on faceId existence
✅ **Error Prevention** - Validate faceId before use
✅ **Reusable** - Extract once, use multiple times

---

## Next Steps

1. ✅ Test endpoints with curl or Postman
2. ✅ Add Postman test script to extract faceId
3. ✅ Use `{{faceId}}` in subsequent requests
4. ✅ Set up conditional workflows based on faceId

---

## Quick Reference

```bash
# Quick faceId extraction
curl http://localhost:3000/api/registrations/face-id/user-123 \
  -H "Authorization: Bearer TOKEN" | jq '.data.faceId'

# Check face exists (with ID)
curl http://localhost:3000/api/registrations/check-face-exists/user-123 \
  -H "Authorization: Bearer TOKEN" | jq '.data'

# Get full face record
curl http://localhost:3000/api/registrations/user-123/face \
  -H "Authorization: Bearer TOKEN" | jq '.data'
```

---

**Status**: ✅ COMPLETE - Ready for Production
**Endpoints Enhanced**: 1 (checkUserFaceExists)
**Endpoints Added**: 1 (getUserFaceId)
**Routes Added**: 1 (/face-id/:userId)
**Documentation**: FACEID_EXTRACTION_GUIDE.md, POSTMAN_TEST_SCRIPTS.md
**Last Updated**: 2024-01-XX
