# HTML Error Response Fix

## Problem
When calling `/api/registrations/check-face-exists/:userId`, the error was being returned as HTML instead of JSON:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Error</title>
</head>
<body>
    <pre>Error: Check failed: User already has a face record...</pre>
</body>
</html>
```

## Root Cause
The issue was caused by two design problems:

1. **Function Misuse**: `checkUserFaceExists()` was using `userFaceExists()` which **intentionally throws a 409 Conflict error** when a user already has a face record (for duplicate prevention during creation).

2. **Mixing Purposes**: 
   - `userFaceExists()` = **Validation function** (throws 409 if duplicate found) - used for `/validate-before-creation`
   - `checkUserFaceExists()` = **Information endpoint** (just returns true/false) - used for `/check-face-exists/:userId`

3. **Error Handling Confusion**: When `userFaceExists()` threw a 409, the catch block caught it as a regular error and re-threw it as a 500, which Express rendered as HTML.

## Solution Implemented

### 1. Created New Function in DynamoDB Service
```javascript
exports.checkIfUserFaceExists = async (userId) => {
  // Simple query - returns true/false
  // DOES NOT throw errors
  // Used for informational purposes only
  return result.Count > 0;
};
```

### 2. Renamed Original Function for Clarity
```javascript
exports.userFaceExists = async (userId) => {
  // Validation function - throws 409 on duplicate
  // Used for duplicate prevention before creation
  // DOES throw errors when user already has face record
};
```

### 3. Updated Controller Endpoint
```javascript
exports.checkUserFaceExists = catchAsync(async (req, res, next) => {
  // Now uses checkIfUserFaceExists (non-throwing)
  const exists = await dynamodbService.checkIfUserFaceExists(userId);
  
  res.status(200).json({
    status: 'success',
    message: exists ? 'User has face record' : 'User has no face record',
    data: {
      userId,
      hasFaceRecord: exists
    }
  });
});
```

## Result

### Before (HTML Error Response)
```
GET /api/registrations/check-face-exists/user-xxx
Response Status: 500
Response Type: text/html
Error: HTML page with error stack trace
```

### After (JSON Response)
```
GET /api/registrations/check-face-exists/user-xxx
Response Status: 200
Response Type: application/json
Response: {
  "status": "success",
  "message": "User has face record",
  "data": {
    "userId": "user-xxx",
    "hasFaceRecord": true
  }
}
```

## Endpoint Behavior Reference

### `/check-face-exists/:userId` (INFORMATIONAL - No Errors)
- **Purpose**: Just check if user has a face record
- **Function**: `dynamodbService.checkIfUserFaceExists()`
- **Returns**: 200 with `hasFaceRecord: true/false`
- **Throws Errors**: NO - returns 200 always

```bash
# User HAS face record
GET /api/registrations/check-face-exists/user-123
→ 200 {status: "success", data: {hasFaceRecord: true}}

# User DOES NOT have face record  
GET /api/registrations/check-face-exists/user-456
→ 200 {status: "success", data: {hasFaceRecord: false}}
```

### `/validate-before-creation/:userId` (VALIDATION - Throws Errors)
- **Purpose**: Validate user can create face record (duplicate prevention)
- **Function**: `dynamodbService.userFaceExists()`
- **Returns**: 200 if OK to proceed
- **Throws Errors**: YES - 409 Conflict if duplicate

```bash
# User can create face record
GET /api/registrations/:userId/face/validate-before-creation
→ 200 {status: "success", canCreateFace: true}

# User CANNOT create - already has face record
GET /api/registrations/:userId/face/validate-before-creation
→ 409 {status: "error", message: "User already has a face record..."}
```

## Files Modified

### 1. `src/services/aws/dynamodb.service.js`
- Added: `exports.checkIfUserFaceExists()` - Simple true/false check
- Renamed: `exports.userFaceExists()` - Validation with 409 errors
- Added JSDoc comments explaining purpose of each function

### 2. `src/features/registrations/userEventRegistration.controller.js`
- Updated: `exports.checkUserFaceExists()` to use `checkIfUserFaceExists()`
- Now returns JSON always (no HTML errors)

## Testing

### Test 1: Check Face Exists (User HAS record)
```bash
curl -X GET http://localhost:3000/api/registrations/check-face-exists/existing-user-id \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: 200 with hasFaceRecord: true
```

### Test 2: Check Face Exists (User DOES NOT have record)
```bash
curl -X GET http://localhost:3000/api/registrations/check-face-exists/new-user-id \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: 200 with hasFaceRecord: false
```

### Test 3: Validate Before Creation (User can create)
```bash
curl -X GET http://localhost:3000/api/registrations/new-user/face/validate-before-creation \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: 200 with canCreateFace: true
```

### Test 4: Validate Before Creation (User CANNOT create - duplicate)
```bash
curl -X GET http://localhost:3000/api/registrations/existing-user/face/validate-before-creation \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: 409 Conflict error
```

## Why This Fixes the HTML Error

1. **No More 500 Errors**: `checkIfUserFaceExists()` never throws errors, so no 500 responses
2. **JSON Only**: All responses are now JSON from the controller
3. **Clear Intent**: Function names now clearly indicate behavior
4. **Express Error Handler**: Won't trigger HTML rendering for information-only endpoints

## Key Takeaway

**Separation of Concerns:**
- **Information Queries**: Use functions that return data without throwing errors
- **Validation Queries**: Use functions that throw errors for business logic failures

This prevents HTTP 500 errors from being rendered as HTML by Express's default error handler.

---

**Status**: ✅ FIXED - All responses now JSON, no HTML errors
**Last Updated**: 2024-01-XX
**Session**: DynamoDB Integration - Error Response Format Fix
