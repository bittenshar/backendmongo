# FaceId Extraction Guide - Postman Integration

## Overview
You now have **three endpoints** to check and extract face IDs automatically:

1. **Check Face Exists** - Returns existence status + faceId
2. **Get Face ID Only** - Returns only the faceId (simple)
3. **Get User's Full Face Record** - Returns complete face data

---

## Endpoint 1: Check Face Exists (WITH faceId)

**Purpose**: Check if user has a face record AND extract the faceId in one call

```
GET {{base_url}}/api/registrations/check-face-exists/:userId
```

### Response When Face EXISTS

```json
{
  "status": "success",
  "message": "User has face record",
  "data": {
    "userId": "user-btiflyc5h-mhulcxxq",
    "hasFaceRecord": true,
    "faceId": "face-recognition-id-12345"
  }
}
```

### Response When Face DOES NOT Exist

```json
{
  "status": "success",
  "message": "User has no face record",
  "data": {
    "userId": "user-btiflyc5h-mhulcxxq",
    "hasFaceRecord": false,
    "faceId": null
  }
}
```

### Postman Usage

```bash
# In Postman, send GET request:
GET {{base_url}}/api/registrations/check-face-exists/{{userId}}

# Extract faceId using Postman Tests tab:
var responseJson = pm.response.json();
pm.environment.set("faceId", responseJson.data.faceId);
pm.environment.set("hasFaceRecord", responseJson.data.hasFaceRecord);
```

---

## Endpoint 2: Get Face ID Only (RECOMMENDED)

**Purpose**: Simple endpoint that returns ONLY the faceId - best for quick extraction

```
GET {{base_url}}/api/registrations/face-id/:userId
```

### Response When Face EXISTS

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

### Response When Face DOES NOT Exist

```json
{
  "status": "success",
  "message": "User has no face record",
  "data": {
    "userId": "user-btiflyc5h-mhulcxxq",
    "faceId": null,
    "hasFaceRecord": false
  }
}
```

### Postman Usage

```bash
# In Postman Tests tab, extract faceId:
var responseJson = pm.response.json();
pm.environment.set("faceId", responseJson.data.faceId);

# Use in subsequent requests:
# POST {{base_url}}/api/registrations/update-face
# Body: { "faceId": "{{faceId}}" }
```

---

## Endpoint 3: Get Full Face Record

**Purpose**: Get complete face data (RekognitionId, timestamps, metadata)

```
GET {{base_url}}/api/registrations/:userId/face
```

### Response

```json
{
  "status": "success",
  "message": "Face record retrieved successfully",
  "data": {
    "RekognitionId": "face-recognition-id-12345",
    "UserId": "user-btiflyc5h-mhulcxxq",
    "Name": "John Doe",
    "CreatedAt": "2024-01-15T10:30:00Z",
    "Attributes": {
      "confidence": 95.5,
      "quality": "HIGH"
    }
  }
}
```

---

## Postman Test Automation

### Complete Workflow with Automatic faceId Extraction

#### Step 1: Check Face Exists and Extract faceId

```javascript
// In Postman "Tests" tab for GET /check-face-exists/:userId

var responseJson = pm.response.json();

// Verify response is successful
pm.test("Face check response is successful", function() {
  pm.expect(responseJson.status).to.equal("success");
});

// Extract and save faceId to environment variable
var faceId = responseJson.data.faceId;
var hasFaceRecord = responseJson.data.hasFaceRecord;

pm.environment.set("faceId", faceId);
pm.environment.set("hasFaceRecord", hasFaceRecord);

// Log for debugging
console.log("✅ Face exists:", hasFaceRecord);
console.log("✅ Extracted faceId:", faceId);

// Test: faceId should exist if hasFaceRecord is true
if (hasFaceRecord) {
  pm.test("faceId is present when face record exists", function() {
    pm.expect(faceId).to.not.be.null;
    pm.expect(faceId).to.be.a('string');
  });
}
```

#### Step 2: Use Extracted faceId in Next Request

```javascript
// After extracting faceId, use it in subsequent API calls:

var faceId = pm.environment.get("faceId");

// Use in body or URL:
// PUT {{base_url}}/api/registrations/{{userId}}/face
// Body: { "verificationFaceId": "{{faceId}}" }
```

#### Step 3: Complete Test Script

```javascript
// Comprehensive workflow for face validation

// Get the userId from environment
var userId = pm.environment.get("userId");

// 1. Check if face exists
pm.sendRequest({
  url: pm.environment.get("base_url") + "/api/registrations/check-face-exists/" + userId,
  method: "GET",
  header: {
    "Authorization": "Bearer " + pm.environment.get("token")
  }
}, function(err, response) {
  if (err) {
    console.error("❌ Error checking face:", err);
  } else {
    var result = response.json();
    
    if (result.data.hasFaceRecord) {
      console.log("✅ Face record exists");
      console.log("✅ FaceId:", result.data.faceId);
      
      // Save faceId for later use
      pm.environment.set("faceId", result.data.faceId);
      
      // Now you can use {{faceId}} in subsequent requests
    } else {
      console.log("⚠️ No face record found for this user");
      pm.environment.set("faceId", null);
    }
  }
});
```

---

## Postman Collection Variables

### Environment Variables Setup

Add these to your Postman environment:

```json
{
  "base_url": "http://localhost:3000",
  "userId": "user-btiflyc5h-mhulcxxq",
  "token": "your_jwt_token_here",
  "faceId": null
}
```

### Pre-request Script to Auto-Extract faceId

```javascript
// In Postman Collection Pre-request Script

// Check if we need to fetch faceId
if (!pm.environment.get("faceId")) {
  pm.sendRequest({
    url: pm.environment.get("base_url") + "/api/registrations/face-id/" + pm.environment.get("userId"),
    method: "GET",
    header: {
      "Authorization": "Bearer " + pm.environment.get("token")
    }
  }, function(err, response) {
    if (!err && response.code === 200) {
      var faceId = response.json().data.faceId;
      pm.environment.set("faceId", faceId);
      console.log("✅ Auto-extracted faceId:", faceId);
    }
  });
}
```

---

## Real-World Usage Examples

### Example 1: Quick Face ID Extraction

```bash
# Terminal Command
curl -X GET http://localhost:3000/api/registrations/face-id/user-123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  | jq '.data.faceId'

# Output:
# "face-recognition-id-12345"
```

### Example 2: Conditional Logic Based on Face ID

```javascript
// JavaScript/Postman
var faceId = pm.environment.get("faceId");

if (faceId && faceId !== null) {
  // User has face record - proceed with verification
  console.log("User has existing face:", faceId);
  pm.environment.set("verificationStep", "verify");
} else {
  // User needs to create face record
  console.log("User needs face registration");
  pm.environment.set("verificationStep", "register");
}
```

### Example 3: Automatic Retry if faceId is Null

```javascript
// In Postman Tests tab

var responseJson = pm.response.json();
var faceId = responseJson.data.faceId;

if (!faceId) {
  console.log("⚠️ faceId is null - retrying...");
  
  // Set to retry
  pm.environment.set("retryCount", (pm.environment.get("retryCount") || 0) + 1);
  
  if (pm.environment.get("retryCount") < 3) {
    // Retry the request
    setTimeout(function() {
      pm.execution.skipRequest(false);
    }, 2000);
  }
} else {
  console.log("✅ faceId found:", faceId);
  pm.environment.set("retryCount", 0);
}
```

---

## Summary Table

| Endpoint | URL | Use Case | Returns |
|----------|-----|----------|---------|
| **Check Face Exists** | `/check-face-exists/:userId` | Check existence + get faceId | `hasFaceRecord`, `faceId` |
| **Get Face ID Only** | `/face-id/:userId` | Simple faceId extraction | `faceId`, `createdAt` |
| **Get Full Record** | `/:userId/face` | Complete face data | Full face object with metadata |

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│ Step 1: Check if User has Face Record              │
│ GET /api/registrations/face-id/{{userId}}          │
└────────────────────┬────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
    Face EXISTS            Face DOES NOT EXIST
    faceId: "xxx"          faceId: null
         │                       │
         ├──────────┬────────────┤
         │          │            │
         ▼          ▼            ▼
    Extract    Update        Create New
    faceId     Record        Face Record
         │          │            │
         └──────────┴────────────┘
                     │
                     ▼
         ┌──────────────────────┐
         │ Use faceId in Next   │
         │ API Call             │
         └──────────────────────┘
```

---

## Error Handling

```javascript
// Handle case where faceId is null or missing

if (!pm.response.json().data.faceId) {
  pm.test("Handle missing faceId", function() {
    // Option 1: Skip verification
    pm.environment.set("skipVerification", true);
    
    // Option 2: Create new face record
    pm.environment.set("needsRegistration", true);
    
    // Option 3: Trigger error
    throw new Error("faceId is required but not found");
  });
}
```

---

## Next Steps

1. ✅ Use `/face-id/:userId` endpoint for quick faceId extraction
2. ✅ Save faceId to Postman environment variable: `{{faceId}}`
3. ✅ Use `{{faceId}}` in subsequent API requests
4. ✅ Add test scripts to automate extraction
5. ✅ Handle null/missing faceId cases

---

**Status**: ✅ READY FOR USE
**Endpoints**: 3 (Check exists, Get faceId, Get full record)
**Last Updated**: 2024-01-XX
