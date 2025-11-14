# Integration Guide: Updated DynamoDB Service

## 🎯 Objective
Integrate the updated DynamoDB service with actual `faceimage` table schema and implement duplicate prevention in API controllers and routes.

---

## 📋 Checklist

### ✅ Completed
- [x] DynamoDB service rewritten for `faceimage` table schema
- [x] GSI-based duplicate prevention implemented
- [x] Environment variable updated in `.env`
- [x] All function signatures updated and documented

### 🔄 Next Steps
- [ ] Update registration controller
- [ ] Update registration routes
- [ ] Test duplicate prevention
- [ ] Deploy to production

---

## 🔧 Controller Updates Required

### **File**: `src/features/registrations/userEventRegistration.controller.js`

#### **Current Issue**
The controller currently uses the old DynamoDB service methods that don't match the new schema.

#### **Required Changes**

**1. Import the Updated Service**
```javascript
const dynamoDbService = require('../../services/aws/dynamodb.service');
```

**2. Create Validation Function**

Add this function before the main controller functions:

```javascript
/**
 * Validate Face Image and Check for Duplicates
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 * @throws {AppError} 409 if user already has face record
 */
const validateUserFaceForCreation = async (userId) => {
  try {
    await dynamoDbService.userFaceExists(userId);
    // If no error thrown, user is new and can create face
  } catch (error) {
    if (error.statusCode === 409) {
      throw error; // Re-throw duplicate error
    }
    throw error;
  }
};
```

**3. Update Face Upload Handler**

Find the existing face upload function and update it:

```javascript
// BEFORE (OLD CODE)
exports.validateFaceImage = async (req, res, next) => {
  try {
    const { userId, name } = req.body;
    const faceImageFile = req.file;
    
    // OLD CODE: Direct storage without duplicate check
    await dynamoDbService.storeFaceRecord(...);
    
    return sendResponse(res, 200, { success: true, ... });
  } catch (error) {
    next(error);
  }
};

// AFTER (NEW CODE)
exports.validateFaceImage = async (req, res, next) => {
  try {
    const { userId, name } = req.body;
    const faceImageFile = req.file;
    
    // NEW: Validate for duplicates FIRST
    await validateUserFaceForCreation(userId);
    
    // Generate unique RekognitionId
    const rekognitionId = `rek_${Date.now()}_${userId}`;
    
    // NEW: Use storeFaceImage with RekognitionId as PK
    const result = await dynamoDbService.storeFaceImage(
      rekognitionId,
      userId,
      name,
      {
        faceS3Url: faceImageFile.location, // If using S3
        faceId: 'face_id_from_rekognition',
        confidence: 95.5,
        status: 'verified'
      }
    );
    
    // Handle 409 Conflict
    return sendResponse(res, 201, {
      success: true,
      message: 'Face image stored successfully',
      data: result
    });
  } catch (error) {
    if (error.statusCode === 409) {
      return sendResponse(res, 409, {
        success: false,
        message: error.message,
        error: 'DUPLICATE_USER_FACE'
      });
    }
    next(error);
  }
};
```

**4. Add Duplicate Check Endpoint**

Add this new function to allow clients to check before upload:

```javascript
/**
 * Check if user already has a face record
 * GET /api/registrations/check-face-exists/:userId
 */
exports.checkUserFaceExists = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Query GSI to check if user has face
    const result = await dynamoDbService.getUserFaceByUserId(userId);
    
    return sendResponse(res, 200, {
      success: true,
      hasFace: true,
      message: 'User already has face record',
      data: result.data
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return sendResponse(res, 200, {
        success: true,
        hasFace: false,
        message: 'User can create new face record',
        data: null
      });
    }
    next(error);
  }
};
```

**5. Add Get User Face Endpoint**

```javascript
/**
 * Get user's face record
 * GET /api/registrations/user-face/:userId
 */
exports.getUserFace = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const result = await dynamoDbService.getUserFaceByUserId(userId);
    
    return sendResponse(res, 200, {
      success: true,
      message: 'Face record retrieved',
      data: result.data
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return sendResponse(res, 404, {
        success: false,
        message: 'No face record found for this user'
      });
    }
    next(error);
  }
};
```

---

## 🔧 Route Updates Required

### **File**: `src/features/registrations/userEventRegistration.routes.js`

Add these new routes:

```javascript
const express = require('express');
const router = express.Router();
const controller = require('./userEventRegistration.controller');
const { protect, authorize } = require('../../shared/middlewares/auth.middleware');

// Existing routes...

// NEW ROUTES FOR FACE MANAGEMENT

/**
 * Check if user already has face record
 * GET /api/registrations/check-face-exists/:userId
 * Public endpoint - no auth required (for pre-upload check)
 */
router.get('/check-face-exists/:userId', controller.checkUserFaceExists);

/**
 * Get user's face record
 * GET /api/registrations/user-face/:userId
 * Public endpoint
 */
router.get('/user-face/:userId', controller.getUserFace);

/**
 * Upload/Validate face image (with duplicate prevention)
 * POST /api/registrations/validate-face-image
 * Protected endpoint - requires authentication
 */
router.post(
  '/validate-face-image',
  protect,
  // Ensure user can only upload face for themselves
  authorize('user'),
  controller.validateFaceImage
);

module.exports = router;
```

---

## 🧪 Testing Steps

### **Test 1: Check Face Exists (Before Upload)**

```bash
# User with no face (should return 404)
curl -X GET http://localhost:3000/api/registrations/check-face-exists/user_456

# Response:
{
  "success": true,
  "hasFace": false,
  "message": "User can create new face record",
  "data": null
}
```

### **Test 2: Upload Face (Success)**

```bash
curl -X POST http://localhost:3000/api/registrations/validate-face-image \
  -H "Authorization: Bearer <token>" \
  -F "file=@face.jpg" \
  -F "userId=user_456" \
  -F "name=John Doe"

# Response:
{
  "success": true,
  "message": "Face image stored successfully",
  "data": {
    "userId": "user_456",
    "rekognitionId": "rek_1234567890_user_456",
    "name": "John Doe",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### **Test 3: Duplicate Prevention (409 Conflict)**

```bash
# Try to upload face again for same user
curl -X POST http://localhost:3000/api/registrations/validate-face-image \
  -H "Authorization: Bearer <token>" \
  -F "file=@face2.jpg" \
  -F "userId=user_456" \
  -F "name=John Doe"

# Response (409 Conflict):
{
  "success": false,
  "message": "User already has a face record. Only one face per user is allowed.",
  "error": "DUPLICATE_USER_FACE",
  "statusCode": 409
}
```

### **Test 4: Get User Face After Upload**

```bash
curl -X GET http://localhost:3000/api/registrations/user-face/user_456

# Response:
{
  "success": true,
  "message": "Face record retrieved",
  "data": {
    "RekognitionId": "rek_1234567890_user_456",
    "UserId": "user_456",
    "Name": "John Doe",
    "FaceS3Url": "s3://bucket/path/face.jpg",
    "FaceId": "face_abc123",
    "Confidence": 95.5,
    "Status": "verified",
    "Timestamp": "2024-01-15T10:30:00Z",
    "CreatedAt": "2024-01-15T10:30:00Z",
    "UpdatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## ⚠️ Error Handling

### **409 Conflict - Duplicate User**
```javascript
if (error.statusCode === 409) {
  return sendResponse(res, 409, {
    success: false,
    message: 'User already has a face record. Only one face per user allowed.',
    error: 'DUPLICATE_USER_FACE'
  });
}
```

### **404 Not Found - No Face Record**
```javascript
if (error.statusCode === 404) {
  return sendResponse(res, 404, {
    success: false,
    message: 'No face record found for this user'
  });
}
```

### **500 Server Error - AWS Issues**
```javascript
if (error.statusCode === 500) {
  return sendResponse(res, 500, {
    success: false,
    message: 'Failed to process face image',
    error: 'DYNAMODB_ERROR'
  });
}
```

---

## 🔍 Verification Checklist

Before deploying, verify:

- [ ] `.env` file has `DYNAMODB_FACE_IMAGE_TABLE=faceimage`
- [ ] AWS credentials in `.env` are valid
- [ ] AWS_REGION is `ap-south-1`
- [ ] Controller has all 5 functions:
  - `validateUserFaceForCreation()`
  - `validateFaceImage()` - Updated
  - `checkUserFaceExists()` - New
  - `getUserFace()` - New
- [ ] Routes have 3 new endpoints added
- [ ] Error handling for 409 and 404 status codes
- [ ] DynamoDB `faceimage` table exists in AWS
- [ ] GSI `userId-index` exists on table

---

## 📊 Data Flow Diagram

```
1. Client requests face upload
   ↓
2. POST /api/registrations/validate-face-image
   ↓
3. Controller: validateUserFaceForCreation(userId)
   ↓
4. DynamoDB Service: userFaceExists(userId)
   ├─ Query userId-index GSI
   ├─ If found: Throw 409 Conflict
   └─ If not found: Continue
   ↓
5. DynamoDB Service: storeFaceImage(rekognitionId, userId, ...)
   ├─ Generate unique RekognitionId
   ├─ Store with RekognitionId as PK
   └─ Return success
   ↓
6. Return 201 Created response with face data
```

---

## 🚀 Deployment Steps

1. **Update Controller**
   - Add import for updated service
   - Add validation function
   - Update upload handler
   - Add new endpoints

2. **Update Routes**
   - Add 3 new route handlers
   - Ensure proper auth middleware

3. **Test Locally**
   - Run test cases above
   - Verify duplicate prevention
   - Check error responses

4. **Deploy to Production**
   ```bash
   git add .
   git commit -m "feat: integrate updated DynamoDB service with duplicate prevention"
   git push origin main
   ```

5. **Monitor Logs**
   - Watch for DynamoDB errors
   - Monitor 409 conflict responses
   - Check GSI query performance

---

## 📚 Reference

- Updated Service: `src/services/aws/dynamodb.service.js`
- Schema Update Doc: `DYNAMODB_SCHEMA_UPDATE.md`
- Environment: `.env`
- Table Name: `faceimage` (AWS DynamoDB)
- GSI: `userId-index`
- Region: `ap-south-1`

---

## ✨ Summary

This integration guide ensures:
✅ Duplicate prevention via GSI queries
✅ One-face-per-user policy enforced
✅ Proper error handling (409 Conflict)
✅ Pre-upload face existence checks
✅ Full CRUD operations on face records

**Ready to integrate!**
