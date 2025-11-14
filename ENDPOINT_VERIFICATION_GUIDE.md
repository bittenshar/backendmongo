# Endpoint Verification Guide

## Status Summary
✅ **All routes are now properly configured and ordered to prevent Express routing conflicts**

## Route Configuration Verified

### Static Routes (Defined BEFORE parameterized routes)
```javascript
// Line 44: Check if User Face Exists
GET /api/registrations/check-face-exists/:userId

// Line 47: Get All Face Records (Admin)
GET /api/registrations/all-faces
```

### Why Order Matters
Express matches routes in order. Without proper ordering:
- `/check-face-exists/user-123` would match `/:userId` route instead
- `/all-faces` would match `/:id` route instead

**Solution Implemented:** Static routes placed BEFORE parameterized routes in `userEventRegistration.routes.js`

---

## Endpoints to Test

### 1. Check Face Exists (NEW - Recently Fixed)
```bash
curl -X GET http://localhost:3000/api/registrations/check-face-exists/user-btiflyc5h-mhulcxxq \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response (200):**
```json
{
  "status": "success",
  "message": "User has face record" OR "User has no face record",
  "data": {
    "userId": "user-btiflyc5h-mhulcxxq",
    "hasFaceRecord": true/false
  }
}
```

**Error Response (400):**
```json
{
  "status": "error",
  "message": "User ID is required"
}
```

---

### 2. Get All Face Records (Admin)
```bash
curl -X GET http://localhost:3000/api/registrations/all-faces \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Admin-Override: true"
```

**Expected Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "RekognitionId": "face-recognition-id",
      "UserId": "user-id",
      "Name": "User Name",
      "CreatedAt": "timestamp"
    }
  ]
}
```

---

### 3. Get User Face Record
```bash
curl -X GET http://localhost:3000/api/registrations/USER_ID/face \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "rekognitionId": "face-id",
    "userId": "user-id",
    "name": "User Name",
    "createdAt": "timestamp"
  }
}
```

---

### 4. Validate Before Face Creation
```bash
curl -X GET http://localhost:3000/api/registrations/USER_ID/face/validate-before-creation \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response (200):** Validation passed, can create face record
**Expected Response (409):** User already has a face record

---

### 5. Update User Face Record
```bash
curl -X PUT http://localhost:3000/api/registrations/USER_ID/face \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'
```

---

### 6. Delete User Face Record (Admin/Reset)
```bash
curl -X DELETE http://localhost:3000/api/registrations/USER_ID/face \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Admin-Override: true"
```

---

### 7. Test Invalid ObjectId (Should Return 400)
```bash
# This should NOT match check-face-exists route (correct behavior)
curl -X GET http://localhost:3000/api/registrations/invalid-id \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response (400):**
```json
{
  "status": "error",
  "message": "Invalid registration ID format"
}
```

---

## Route Priority Order (In routes file)

The following order is CRITICAL for Express routing:

1. ✅ `/check-face-exists/:userId` - Static prefix (Line 44)
2. ✅ `/all-faces` - Static, no parameters (Line 47)
3. `/:userId/face/validate-before-creation` - Specific nested path
4. `/:userId/face` - Specific nested path (GET, PUT, DELETE)
5. `/:userId/face/exists` - Specific nested path
6. `/:userId/face-validation/*` - Deprecated routes
7. `/:id` - Catch-all parameterized route (Line 91)
8. `/:id/checkin` - Parameterized with specific action
9. `/:id/face-verification/*` - Parameterized face endpoints
10. `/:id/issue-ticket` - Parameterized ticket endpoint

---

## Fix Applied

### Problem
```
GET /api/registrations/check-face-exists/user-btiflyc5h-mhulcxxq
Error: Cannot GET /api/registrations/check-face-exists/user-btiflyc5h-mhulcxxq
```

### Root Cause
The `/check-face-exists/:userId` route was not defined BEFORE the `/:userId` parameterized routes, causing Express to match `/check-face-exists/xxx` as the `/:userId` pattern instead.

### Solution Applied
Moved these routes to the TOP of the DynamoDB section:
```javascript
// Line 44: Static route BEFORE parameterized routes
router.get('/check-face-exists/:userId', registrationController.checkUserFaceExists);

// Line 47: Static route BEFORE parameterized routes  
router.get('/all-faces', registrationController.getAllFaceRecords);
```

### Verification
```bash
# This file shows proper route ordering:
grep -n "router\." userEventRegistration.routes.js | head -20
```

---

## ObjectId Validation (CastError Prevention)

All parameterized routes have validation added:

```javascript
// Helper function (line ~750)
const validateObjectIdParam = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Usage in controllers (example from line ~880)
if (!validateObjectIdParam(id)) {
  return res.status(400).json({
    status: 'error',
    message: 'Invalid registration ID format'
  });
}
```

This prevents Mongoose CastError and returns clean 400 responses.

---

## Files Modified This Session

### 1. userEventRegistration.routes.js (Line 44-47)
- ✅ Added `/check-face-exists/:userId` route BEFORE `/:userId` routes
- ✅ Confirmed `/all-faces` route BEFORE `/:userId` routes
- ✅ All static routes positioned before parameterized routes

### 2. userEventRegistration.controller.js (Line 780+)
- ✅ `checkUserFaceExists()` method implemented with proper error handling
- ✅ ObjectId validation on all parameterized routes
- ✅ DynamoDB service integration complete

### 3. dynamodb.service.js
- ✅ `userFaceExists(userId)` implemented with GSI query
- ✅ Duplicate prevention with 409 Conflict errors
- ✅ All error handling in place

---

## Testing Checklist

- [ ] Start server: `npm start` or `node src/server.js`
- [ ] Test `/check-face-exists/:userId` endpoint
- [ ] Test `/all-faces` endpoint
- [ ] Test valid ObjectId on `/:id` endpoints
- [ ] Test invalid ObjectId on `/:id` endpoints (should return 400)
- [ ] Verify no CastError in console
- [ ] Verify all 404 errors are resolved

---

## Postman Collection

Update `Face_Recognition_API.postman_collection.json` with these new endpoints:

**New Endpoints:**
1. GET `/api/registrations/check-face-exists/{{userId}}`
2. GET `/api/registrations/all-faces`

**Modified Endpoints:**
3. GET `/api/registrations/{{userId}}/face`
4. PUT `/api/registrations/{{userId}}/face`
5. DELETE `/api/registrations/{{userId}}/face`

---

## Next Steps

1. ✅ Routes configured and ordered correctly
2. ✅ Controller methods implemented
3. ✅ ObjectId validation in place
4. 🔄 **NEXT**: Run curl tests to verify endpoints
5. 🔄 Deploy and test in staging environment

---

## Contact Information

**For Questions About:**
- Route ordering: See Express documentation on route precedence
- ObjectId validation: Check Mongoose API documentation
- DynamoDB queries: Review AWS SDK v3 documentation
- GSI queries: Check DynamoDB design patterns

---

**Status:** ✅ All endpoints configured and ready for testing
**Last Updated:** 2024-01-XX
**Session:** DynamoDB Integration - Route Fix Phase
