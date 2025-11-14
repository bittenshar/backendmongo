# DynamoDB Redesign Summary - ONE RECORD PER USER

## Overview

The DynamoDB integration has been **completely redesigned** to implement a simpler, more efficient model with **STRICT DUPLICATE PREVENTION**.

**Key Change:** From multi-record query history model → Single record per user model

---

## Design Comparison

### OLD Design (❌ Removed)
```
Table: face-verifications
├── Partition Key: userId
├── Sort Key: registrationId ← REMOVED
├── Multiple records per user ← NOT ALLOWED
├── Query history tracking ← SIMPLIFIED
└── No duplicate prevention
```

**Problems with old design:**
- Allowed multiple face records per user (confusing)
- No built-in duplicate protection
- Required complex queries for "current" face
- Inefficient for O(1) lookups

---

### NEW Design (✅ Active)
```
Table: face-verifications
├── Partition Key: userId (UNIQUE)
├── No Sort Key
├── ONE record per user MAXIMUM
├── Strict duplicate prevention (409 Conflict on duplicate)
├── faceId field identifies the specific face
├── name field stores user metadata
└── Efficient O(1) lookups with Get operation
```

**Advantages of new design:**
- ✅ One face per user - simple and clear
- ✅ No duplicate confusion
- ✅ O(1) lookup time (direct Get by userId)
- ✅ Easy validation before creation
- ✅ Efficient DynamoDB usage
- ✅ Clear error handling (409 Conflict for duplicates)

---

## Data Structure

### New Record Format

```javascript
{
  userId: "user123" [Partition Key - UNIQUE],
  faceId: "face_1705409400000" [Identifies this face],
  name: "John Doe" [User name metadata],
  
  validationStatus: "success|failed|pending",
  confidence: 95.5,
  quality: "HIGH|MEDIUM|LOW",
  
  faceImageKey: "s3://bucket/path/image.jpg",
  storedFaceKey: "s3://bucket/path/stored.jpg",
  faceVector: [...face embeddings...],
  comparisonResult: { similarity: 0.95, isMatch: true },
  attributes: {
    age: 30,
    gender: "Male",
    emotions: { happy: 0.8 },
    ...
  },
  
  timestamp: "2024-01-15T10:30:00Z",
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-15T10:30:00Z",
  
  metadata: {
    source: "face-verification-api",
    ipAddress: "192.168.1.1",
    eventId: "event456"
  }
}
```

---

## New API Endpoints

### 1. Validate User Before Face Creation ✅
**Purpose:** Check if user can create a face record (duplicate prevention)

```http
GET /api/registrations/{userId}/face/validate-before-creation
```

**Response (User is New):**
```json
{
  "status": "success",
  "message": "User is eligible for face verification - no existing record found",
  "data": {
    "userId": "user123",
    "canCreateFace": true
  }
}
```

**Response (User Already Has Face) - 409 Conflict:**
```json
{
  "status": "error",
  "message": "User already has a face verification record. Duplicate userId not allowed. Please contact support to reset.",
  "statusCode": 409
}
```

---

### 2. Get User's Face Record ✅
**Purpose:** Retrieve THE one face record for a user

```http
GET /api/registrations/{userId}/face
```

**Response (Record Found):**
```json
{
  "status": "success",
  "message": "Face record retrieved successfully",
  "data": {
    "userId": "user123",
    "faceId": "face_1705409400000",
    "name": "John Doe",
    "validationStatus": "success",
    "confidence": 95.5,
    ...
  }
}
```

**Response (Not Found) - 404:**
```json
{
  "status": "error",
  "message": "No face record found for userId: user123",
  "statusCode": 404
}
```

---

### 3. Update User's Face Record ✅
**Purpose:** Update existing face record (e.g., confidence score)

```http
PUT /api/registrations/{userId}/face
Content-Type: application/json

{
  "validationStatus": "success",
  "confidence": 97.5,
  "quality": "HIGH"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Face record updated successfully",
  "data": { ...updated record... }
}
```

---

### 4. Delete User's Face Record (Admin/Reset) ✅
**Purpose:** Remove face record - allows user to re-register

```http
DELETE /api/registrations/{userId}/face
```

**Response:**
```json
{
  "status": "success",
  "message": "Face record deleted successfully - user can now re-register",
  "data": {
    "userId": "user123",
    "message": "Face record deleted successfully - user can now re-register"
  }
}
```

---

### 5. Check if User Face Exists ✅
**Purpose:** Simple existence check (no error on false)

```http
GET /api/registrations/{userId}/face/exists
```

**Response (Exists):**
```json
{
  "status": "success",
  "message": "User has face record",
  "data": {
    "userId": "user123",
    "hasFaceRecord": true
  }
}
```

**Response (Does Not Exist):**
```json
{
  "status": "success",
  "message": "User has no face record",
  "data": {
    "userId": "user123",
    "hasFaceRecord": false
  }
}
```

---

### 6. Get All Face Records (Admin) ✅
**Purpose:** Retrieve all users with face records (paginated)

```http
GET /api/registrations/face/admin/all?limit=100
```

**Response:**
```json
{
  "status": "success",
  "message": "Retrieved 42 face records",
  "data": {
    "count": 42,
    "data": [
      { ...face record 1... },
      { ...face record 2... },
      ...
    ],
    "lastEvaluatedKey": null
  }
}
```

---

## Implementation Flow

### Face Registration Process

```
1. User initiates face verification
   ↓
2. Validate User (GET /face/validate-before-creation)
   ├─ If 409 Conflict → User already has face record
   │                    → REJECT (no duplicates allowed)
   │
   └─ If success → User is new, proceed
   ↓
3. Upload face image and verify with AWS Rekognition
   ↓
4. Store Face Record (inside validateFaceImage method)
   ├─ Call: dynamodbService.storeFaceRecord(userId, faceId, name, faceData)
   ├─ This calls validateBeforeVerification() internally
   ├─ Duplicate check happens here
   └─ Returns 409 if userId already exists
   ↓
5. Face verification successful, ticket issued
   ↓
6. Record stored in both MongoDB (registration) and DynamoDB (face data)
```

---

## Code Changes Summary

### Files Modified

#### 1. `src/services/aws/dynamodb.service.js` (COMPLETE REWRITE)
**Changes:**
- ❌ Removed: `storeFaceValidation()` (required registrationId)
- ❌ Removed: `getFaceValidation()` (composite key query)
- ❌ Removed: `updateFaceValidation()` (multi-record)
- ❌ Removed: `getUserFaceValidations()` (history tracking)
- ❌ Removed: `getEventFaceValidations()` (event queries)
- ❌ Removed: `getUserValidationStats()` (stats aggregation)
- ❌ Removed: `storeFaceComparison()` (multi-record)
- ❌ Removed: `hasRecentValidation()(multi-record timestamp)
- ❌ Removed: `QueryCommand` import (no longer used)

**New Methods Added:**
- ✅ `validateBeforeVerification(userId)` - Check for duplicates, throw 409 if exists
- ✅ `userFaceExists(userId)` - Simple existence check
- ✅ `storeFaceRecord(userId, faceId, name, faceData)` - Create with duplicate prevention
- ✅ `getUserFaceRecord(userId)` - Get the one record for user
- ✅ `updateFaceRecord(userId, updateData)` - Update existing record
- ✅ `deleteFaceRecord(userId)` - Remove face record
- ✅ `getAllFaceRecords(limit)` - Get all records (admin)
- ✅ `checkDuplicateUser(userId)` - Explicit duplicate check
- ✅ `initializeTable()` - Setup instructions

**Duplicate Prevention:**
```javascript
// storeFaceRecord() calls validateBeforeVerification() BEFORE storing
// validateBeforeVerification() throws:
throw new AppError(
  'User already has a face verification record. Duplicate userId not allowed.',
  409 // Conflict status code
);
```

---

#### 2. `src/features/registrations/userEventRegistration.controller.js`
**Changes in validateFaceImage():**
- ✅ Updated to call `storeFaceRecord()` instead of `storeFaceValidation()`
- ✅ Passes faceId, name, and simpler faceData object
- ✅ Propagates 409 error if duplicate detected
- ✅ Gets user name from MongoDB for metadata

**New Endpoints Added:**
- ✅ `validateUserBeforeFaceCreation()` - Check before creation
- ✅ `getUserFaceRecord()` - Get user's face
- ✅ `updateUserFaceRecord()` - Update face record
- ✅ `deleteUserFaceRecord()` - Delete face (admin)
- ✅ `checkUserFaceExists()` - Check existence
- ✅ `getAllFaceRecords()` - Admin retrieval

**Deprecated Endpoints (Kept for Compatibility):**
- ⚠️ `getUserFaceValidationHistory()` - Redirects to getUserFaceRecord()
- ⚠️ `getFaceValidationRecord()` - Redirects to getUserFaceRecord()
- ⚠️ `getUserFaceValidationStats()` - Returns simplified stats
- ⚠️ `checkRecentValidation()` - Redirects to checkUserFaceExists()
- ⚠️ `getEventFaceValidations()` - Queries MongoDB instead

---

#### 3. `src/features/registrations/userEventRegistration.routes.js`
**Routes Added:**
```javascript
// NEW ENDPOINTS (One-record design)
GET  /registrations/:userId/face/validate-before-creation
GET  /registrations/:userId/face
PUT  /registrations/:userId/face
DELETE /registrations/:userId/face
GET  /registrations/:userId/face/exists
GET  /registrations/face/admin/all

// DEPRECATED (Maintained for backward compatibility)
GET /registrations/:userId/face-validation/history
GET /registrations/:userId/face-validation/:registrationId
GET /registrations/:userId/face-validation/stats
GET /registrations/:userId/face-validation/check-recent
GET /registrations/event/:eventId/face-validations
```

---

## Error Handling

### HTTP Status Codes

| Code | Scenario | Example |
|------|----------|---------|
| **200** | Successful operation | User record retrieved |
| **201** | Record created | Face stored successfully |
| **400** | Invalid request | Missing userId parameter |
| **404** | Record not found | User has no face record |
| **409** | Conflict - Duplicate | User already has face record - NO DUPLICATES ALLOWED |
| **503** | Service unavailable | DynamoDB table not configured |
| **500** | Server error | DynamoDB operation failed |

### Example Error Responses

**409 Conflict - Duplicate User:**
```json
{
  "status": "error",
  "message": "User already has a face verification record. Duplicate userId not allowed. Please contact support to reset.",
  "statusCode": 409
}
```

**404 Not Found - Record Missing:**
```json
{
  "status": "error",
  "message": "No face record found for userId: user123",
  "statusCode": 404
}
```

**400 Bad Request - Missing Parameter:**
```json
{
  "status": "error",
  "message": "User ID is required",
  "statusCode": 400
}
```

---

## DynamoDB Configuration

### Table Setup

**Required Configuration (Must be done manually in AWS Console or via IaC):**

```
Table Name:           face-verifications
Partition Key (PK):   userId (String) - UNIQUE
Sort Key:             NONE
Billing Mode:         PAY_PER_REQUEST (recommended)
Point-in-time Recovery: ENABLED (for backup)
```

### Important Notes

⚠️ **CRITICAL:** The userId partition key must be UNIQUE. DynamoDB automatically enforces this with GetItem/PutItem operations.

✅ **Verification:** If you try to PUT the same userId twice:
- If NOT using conditional expression → Overwrites existing record
- If using conditional `attribute_not_exists(userId)` → Throws error

The service uses `validateBeforeVerification()` to check before storing, which emulates the second behavior.

---

## Migration Notes

### If Upgrading from Old Design

1. **Backup Old Data:**
   ```bash
   # Export old face-verifications table
   # (multiple records per user)
   ```

2. **Create New Table:**
   - Follow DynamoDB Configuration section above
   - Ensure userId is partition key (no sort key)

3. **Migrate Data:**
   - For each user, keep ONLY the latest/best face record
   - Delete registrationId sort key from records
   - Update to include faceId and name fields

4. **Test New Endpoints:**
   - Verify 409 errors on duplicate attempts
   - Verify 404 errors when record doesn't exist
   - Verify successful CRUD operations

5. **Update API Clients:**
   - Endpoints changed from `/:userId/:registrationId` to `/:userId/face`
   - Error codes now include 409 for duplicates
   - Response format updated

---

## Performance Characteristics

### Time Complexity
- **Get face record:** O(1) - Direct partition key lookup
- **Check duplicate:** O(1) - Direct partition key lookup
- **Create record:** O(1) - Direct write
- **Update record:** O(1) - Direct update
- **Delete record:** O(1) - Direct delete
- **Scan all records:** O(n) - Full table scan (expensive, use pagination)

### Recommended Indexes
- No additional indexes needed - partition key only design
- Can add GSI for `faceId` if need to query by face identifier

### Capacity Planning
- **Write capacity:** ~10 WCU (initial)
- **Read capacity:** ~20 RCU (initial)
- **Recommended:** PAY_PER_REQUEST for variable load

---

## Testing Checklist

✅ **Create Face (New User):**
```bash
POST /api/registrations/:registrationId/validate-face-image
# Should succeed and create DynamoDB record
```

✅ **Create Face (Duplicate User - 409):**
```bash
POST /api/registrations/:registrationId/validate-face-image
# Should fail with 409 Conflict
```

✅ **Get Face Record:**
```bash
GET /api/registrations/:userId/face
# Should return existing face record
```

✅ **Get Face (Not Found - 404):**
```bash
GET /api/registrations/user_without_face/face
# Should return 404 Not Found
```

✅ **Validate Before Creation:**
```bash
GET /api/registrations/:userId/face/validate-before-creation
# New user: 200 success
# Existing user: 409 conflict
```

✅ **Update Face Record:**
```bash
PUT /api/registrations/:userId/face
# Should update and return modified record
```

✅ **Delete Face Record (Admin Reset):**
```bash
DELETE /api/registrations/:userId/face
# Should allow user to re-register
```

✅ **Check Face Exists:**
```bash
GET /api/registrations/:userId/face/exists
# Returns hasFaceRecord: true/false
```

---

## Documentation Files

| File | Purpose |
|------|---------|
| `DYNAMODB_REDESIGN_SUMMARY.md` | ← **YOU ARE HERE** |
| `DYNAMODB_QUICK_REFERENCE.md` | API reference (endpoints, examples) |
| `DYNAMODB_SETUP_GUIDE.md` | Setup and configuration |
| `DYNAMODB_INTEGRATION_GUIDE.md` | Technical implementation details |
| `DYNAMODB_VISUAL_GUIDE.md` | Architecture diagrams and flowcharts |
| `DYNAMODB_INDEX.md` | Navigation hub |
| `DYNAMODB_DELIVERY_CHECKLIST.md` | Deployment verification |

---

## Summary

### What Changed
- ✅ **One record per user** - No more confusing history tracking
- ✅ **Strict duplicate prevention** - 409 errors on duplicate userId attempts
- ✅ **Simpler API** - Fewer endpoints, clearer purpose
- ✅ **Better performance** - O(1) lookups instead of queries
- ✅ **Clear error handling** - Specific 409 status for duplicates

### What Stays the Same
- ✅ Face verification with AWS Rekognition
- ✅ MongoDB storage for registrations and tickets
- ✅ S3 storage for images
- ✅ All 30+ existing API endpoints
- ✅ JWT authentication
- ✅ Waitlist management

### Next Steps
1. Review this redesign document
2. Update your API client code if needed (endpoint URLs changed)
3. Test all endpoints with Postman collection (updated)
4. Create DynamoDB table in AWS Console
5. Deploy updated code
6. Monitor for any duplicate attempts (should get 409 errors now)

---

**Status:** ✅ COMPLETE - All files updated, DynamoDB service rewritten, endpoints simplified
