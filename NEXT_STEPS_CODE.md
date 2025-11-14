# Next Steps: Controller & Routes Integration Code

This file contains the exact code needed to integrate the updated DynamoDB service with your controllers and routes.

---

## 🔧 Step 1: Update Controller

**File**: `src/features/registrations/userEventRegistration.controller.js`

### Add These Imports at the Top

```javascript
const dynamoDbService = require('../../services/aws/dynamodb.service');
```

### Add This Validation Function (Before main exports)

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

### Update Existing Face Upload Handler (Find and Replace)

Find this existing function and replace it:

```javascript
/**
 * Validate Face Image with Duplicate Prevention
 * POST /api/registrations/validate-face-image
 * 
 * Updated to use new DynamoDB schema (faceimage table)
 * with proper duplicate prevention via GSI queries
 */
exports.validateFaceImage = async (req, res, next) => {
  try {
    const { userId, name } = req.body;
    const faceImageFile = req.file;

    // Validate required fields
    if (!userId || !name || !faceImageFile) {
      return sendResponse(res, 400, {
        success: false,
        message: 'userId, name, and file are required'
      });
    }

    // Step 1: Validate for duplicates FIRST
    try {
      await validateUserFaceForCreation(userId);
    } catch (error) {
      if (error.statusCode === 409) {
        return sendResponse(res, 409, {
          success: false,
          message: error.message,
          error: 'DUPLICATE_USER_FACE'
        });
      }
      throw error;
    }

    // Step 2: Generate unique RekognitionId
    const rekognitionId = `rek_${Date.now()}_${userId}`;

    // Step 3: Prepare face data
    const faceData = {
      faceS3Url: faceImageFile.location || faceImageFile.path, // Adjust based on your S3 setup
      faceId: `face_${rekognitionId}`, // Generate or get from Rekognition
      confidence: 95.5, // Replace with actual confidence from Rekognition
      status: 'verified' // Or 'pending' based on your verification flow
    };

    // Step 4: Store in DynamoDB
    const result = await dynamoDbService.storeFaceImage(
      rekognitionId,
      userId,
      name,
      faceData
    );

    // Step 5: Return success response
    return sendResponse(res, 201, {
      success: true,
      message: 'Face image stored successfully',
      data: {
        userId: result.userId,
        rekognitionId: result.rekognitionId,
        name: result.name,
        timestamp: result.timestamp
      }
    });
  } catch (error) {
    if (error.statusCode === 409) {
      return sendResponse(res, 409, {
        success: false,
        message: 'User already has a face record. Only one face per user allowed.',
        error: 'DUPLICATE_USER_FACE'
      });
    }
    if (error.statusCode === 404) {
      return sendResponse(res, 404, {
        success: false,
        message: 'Face record not found'
      });
    }
    next(error);
  }
};
```

### Add These Three New Functions at the End

```javascript
/**
 * Check if user already has a face record
 * GET /api/registrations/check-face-exists/:userId
 * 
 * Returns whether user can upload new face (hasn't reached limit)
 */
exports.checkUserFaceExists = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return sendResponse(res, 400, {
        success: false,
        message: 'userId is required'
      });
    }

    // Try to get user's face
    try {
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
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's face record
 * GET /api/registrations/user-face/:userId
 * 
 * Retrieves the user's stored face image data
 */
exports.getUserFace = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return sendResponse(res, 400, {
        success: false,
        message: 'userId is required'
      });
    }

    try {
      const result = await dynamoDbService.getUserFaceByUserId(userId);

      return sendResponse(res, 200, {
        success: true,
        message: 'Face record retrieved successfully',
        data: result.data
      });
    } catch (error) {
      if (error.statusCode === 404) {
        return sendResponse(res, 404, {
          success: false,
          message: 'No face record found for this user'
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get all face records (Admin only)
 * GET /api/registrations/all-faces?limit=100
 * 
 * Retrieves all face records for admin purposes
 */
exports.getAllUserFaces = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    const result = await dynamoDbService.getAllFaceImages(limit);

    return sendResponse(res, 200, {
      success: true,
      message: 'Face records retrieved successfully',
      count: result.count,
      data: result.data,
      lastEvaluatedKey: result.lastEvaluatedKey
    });
  } catch (error) {
    next(error);
  }
};
```

---

## 🔗 Step 2: Update Routes

**File**: `src/features/registrations/userEventRegistration.routes.js`

Add these routes to your existing router:

```javascript
const express = require('express');
const router = express.Router();
const controller = require('./userEventRegistration.controller');
const { protect, authorize } = require('../../shared/middlewares/auth.middleware');

// Existing routes...

// ============================================================
// NEW ROUTES FOR FACE MANAGEMENT (Updated Schema)
// ============================================================

/**
 * Check if user already has face record
 * GET /api/registrations/check-face-exists/:userId
 * Public endpoint - no authentication required
 * 
 * Use: Before upload, check if user can create new face
 * Returns: { hasFace: true/false }
 */
router.get('/check-face-exists/:userId', controller.checkUserFaceExists);

/**
 * Get user's face record
 * GET /api/registrations/user-face/:userId
 * Public endpoint
 * 
 * Use: Retrieve user's stored face data
 * Returns: { success, data: { RekognitionId, UserId, ... } }
 */
router.get('/user-face/:userId', controller.getUserFace);

/**
 * Get all face records (Admin only)
 * GET /api/registrations/all-faces?limit=100
 * Protected endpoint - admin only
 * 
 * Use: Admin view all face records
 * Returns: { success, count, data: [...], lastEvaluatedKey }
 */
router.get('/all-faces', protect, authorize('admin'), controller.getAllUserFaces);

/**
 * Upload/Validate face image (with duplicate prevention)
 * POST /api/registrations/validate-face-image
 * Protected endpoint - requires authentication
 * 
 * Use: Upload face image with automatic duplicate prevention
 * Body: { userId, name, file }
 * Returns: { success, rekognitionId, timestamp }
 * Error: 409 Conflict if user already has face
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

## 🧪 Step 3: Test Locally

### Test 1: Check Face Doesn't Exist
```bash
curl -X GET http://localhost:3000/api/registrations/check-face-exists/user_456

# Expected Response:
{
  "success": true,
  "hasFace": false,
  "message": "User can create new face record",
  "data": null
}
```

### Test 2: Upload Face (With Auth)
```bash
curl -X POST http://localhost:3000/api/registrations/validate-face-image \
  -H "Authorization: Bearer <your_jwt_token>" \
  -F "file=@/path/to/face.jpg" \
  -F "userId=user_456" \
  -F "name=John Doe"

# Expected Response:
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

### Test 3: Try Duplicate Upload (Should Fail with 409)
```bash
curl -X POST http://localhost:3000/api/registrations/validate-face-image \
  -H "Authorization: Bearer <your_jwt_token>" \
  -F "file=@/path/to/face2.jpg" \
  -F "userId=user_456" \
  -F "name=John Doe"

# Expected Response (409 Conflict):
{
  "success": false,
  "message": "User already has a face record. Only one face per user allowed.",
  "error": "DUPLICATE_USER_FACE",
  "statusCode": 409
}
```

### Test 4: Check Face Now Exists
```bash
curl -X GET http://localhost:3000/api/registrations/check-face-exists/user_456

# Expected Response:
{
  "success": true,
  "hasFace": true,
  "message": "User already has face record",
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

### Test 5: Get User Face
```bash
curl -X GET http://localhost:3000/api/registrations/user-face/user_456

# Expected Response:
{
  "success": true,
  "message": "Face record retrieved successfully",
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

## ✅ Quick Checklist

Before committing, verify:

- [ ] Controller imports `dynamoDbService`
- [ ] Controller has `validateUserFaceForCreation()` function
- [ ] Controller `validateFaceImage()` is updated
- [ ] Controller has `checkUserFaceExists()` function
- [ ] Controller has `getUserFace()` function
- [ ] Controller has `getAllUserFaces()` function
- [ ] Routes file updated with 4 new routes
- [ ] Auth middleware applied to protected routes
- [ ] Admin middleware applied to all-faces route
- [ ] Error handling for 409 and 404 status codes
- [ ] Test all 5 scenarios locally pass

---

## 🚀 Deployment Steps

1. **Backup Current Code**
   ```bash
   git stash
   ```

2. **Apply Changes**
   - Update controller with code above
   - Update routes with code above

3. **Test Locally**
   ```bash
   npm start
   # Run test scenarios
   ```

4. **Commit & Push**
   ```bash
   git add src/features/registrations/
   git commit -m "feat: integrate updated DynamoDB service with duplicate prevention"
   git push origin main
   ```

5. **Deploy**
   ```bash
   # Deploy to your hosting (Heroku, AWS, etc.)
   ```

6. **Monitor**
   - Watch logs for DynamoDB errors
   - Monitor 409 conflict responses
   - Check GSI query performance

---

## 📞 Support

If you encounter issues:

1. Check `.env` has `DYNAMODB_FACE_IMAGE_TABLE=faceimage`
2. Verify AWS credentials have DynamoDB access
3. Ensure DynamoDB table `faceimage` exists in AWS
4. Check that GSI `userId-index` exists on the table
5. Review service logs for detailed error messages

---

**Ready to integrate!** ✅

Use this code to update your controller and routes, then test locally before deployment.
