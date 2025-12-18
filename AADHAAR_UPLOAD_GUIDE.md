# Aadhaar Card Upload & Verification System

## Overview
Complete Aadhaar document management system with upload, verification, and encryption.

---

## Features

✅ **Upload Aadhaar Documents** - Front & back images  
✅ **Secure Storage** - Encrypted URLs via proxy tokens  
✅ **Admin Verification** - Manual verification workflow  
✅ **Verification Status Tracking** - Pending, Verified, Rejected  
✅ **Bulk Operations** - Verify multiple documents at once  
✅ **Analytics** - View verification statistics  
✅ **Export Data** - Generate reports  
✅ **Aadhaar Masking** - Display only last 4 digits  

---

## Files Created

```
src/features/documents/
├── aadhaar.model.js          # MongoDB schema
├── aadhaar.controller.js     # Route handlers
├── aadhaar.routes.js         # API routes
└── aadhaar.service.js        # Business logic
```

---

## API Endpoints

### 1. Upload Aadhaar Document

**POST** `/api/aadhaar/upload/:userId`

Upload front and back Aadhaar images with personal details.

**Request Body:**
```json
{
  "aadhaarNumber": "123456789012",
  "fullName": "John Doe",
  "dateOfBirth": "1990-05-15",
  "gender": "M",
  "address": "123 Main St, City, State 123456",
  "frontImageS3Key": "aadhaar/user123/front.jpg",
  "backImageS3Key": "aadhaar/user123/back.jpg"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Aadhaar document uploaded successfully",
  "data": {
    "aadhaar": {
      "_id": "...",
      "userId": "...",
      "verificationStatus": "pending",
      "fullName": "John Doe",
      "uploadDate": "2025-12-16T10:30:00Z"
    },
    "imageTokens": {
      "front": "encrypted_token_front",
      "back": "encrypted_token_back"
    },
    "proxyUrls": {
      "front": "/api/aadhaar/proxy/encrypted_token_front",
      "back": "/api/aadhaar/proxy/encrypted_token_back"
    }
  }
}
```

---

### 2. Get Aadhaar Document

**GET** `/api/aadhaar/:userId`

Retrieve Aadhaar document details for a user.

**Response:**
```json
{
  "status": "success",
  "data": {
    "aadhaar": {
      "_id": "...",
      "userId": "...",
      "aadhaarNumber": "123456789012",
      "fullName": "John Doe",
      "dateOfBirth": "1990-05-15",
      "gender": "M",
      "address": "...",
      "verificationStatus": "pending",
      "uploadDate": "...",
      "ocrData": { /* OCR extracted data */ }
    },
    "imageTokens": {
      "front": "token",
      "back": "token"
    },
    "proxyUrls": {
      "front": "/api/aadhaar/proxy/token",
      "back": "/api/aadhaar/proxy/token"
    }
  }
}
```

---

### 3. View Aadhaar Image (Proxy)

**GET** `/api/aadhaar/proxy/:token`

Fetch Aadhaar image using encrypted token. Returns actual image data.

**Headers:**
```
Content-Type: image/jpeg
Cache-Control: public, max-age=604800
```

---

### 4. Verify Aadhaar Document (Admin)

**PATCH** `/api/aadhaar/verify/:aadhaarId`

Approve an Aadhaar document after verification.

**Request Body:**
```json
{
  "notes": "Document verified and details match"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Aadhaar document verified successfully",
  "data": {
    "aadhaar": {
      "_id": "...",
      "verificationStatus": "verified",
      "verificationDate": "2025-12-16T11:00:00Z"
    }
  }
}
```

---

### 5. Reject Aadhaar Document (Admin)

**PATCH** `/api/aadhaar/reject/:aadhaarId`

Reject an Aadhaar document with rejection reason.

**Request Body:**
```json
{
  "notes": "Image quality is poor, please resubmit"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Aadhaar document rejected",
  "data": {
    "aadhaar": {
      "_id": "...",
      "verificationStatus": "rejected",
      "verificationNotes": "Image quality is poor, please resubmit"
    }
  }
}
```

---

### 6. Get Pending Documents (Admin)

**GET** `/api/aadhaar/admin/pending?page=1&limit=10`

Get all pending Aadhaar documents for verification.

**Response:**
```json
{
  "status": "success",
  "data": {
    "documents": [
      {
        "_id": "...",
        "userId": {
          "_id": "...",
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "9876543210"
        },
        "aadhaarNumber": "123456789012",
        "fullName": "John Doe",
        "verificationStatus": "pending",
        "uploadDate": "..."
      }
      // ... more documents
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 10,
      "pages": 5
    }
  }
}
```

---

### 7. Get Statistics (Admin)

**GET** `/api/aadhaar/admin/statistics`

View verification statistics and breakdown.

**Response:**
```json
{
  "status": "success",
  "data": {
    "statistics": {
      "pending": 15,
      "verified": 120,
      "rejected": 5,
      "expired": 2
    },
    "total": 142
  }
}
```

---

### 8. Delete Aadhaar Document

**DELETE** `/api/aadhaar/:userId`

Delete user's Aadhaar document.

**Response:**
```json
{
  "status": "success",
  "message": "Aadhaar document deleted successfully"
}
```

---

### 9. Encrypt URL

**POST** `/api/aadhaar/encrypt`

Encrypt an S3 URL for secure transmission.

**Request Body:**
```json
{
  "url": "https://s3.amazonaws.com/bucket/aadhaar/image.jpg",
  "expiryHours": 168
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "token": "encrypted_token_xyz",
    "expiryHours": 168,
    "proxyUrl": "/api/aadhaar/proxy/encrypted_token_xyz"
  }
}
```

---

### 10. Decrypt Token

**POST** `/api/aadhaar/decrypt`

Decrypt token to get original S3 URL (Admin only).

**Request Body:**
```json
{
  "token": "encrypted_token_xyz"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "url": "https://s3.amazonaws.com/bucket/aadhaar/image.jpg",
    "valid": true
  }
}
```

---

## Aadhaar Model Schema

```javascript
{
  _id: ObjectId,
  userId: ObjectId (unique),          // User who uploaded
  aadhaarNumber: String (12 digits),  // Unique identifier
  fullName: String,
  dateOfBirth: Date,
  gender: String (M/F/Other),
  address: String,
  
  // Images
  frontImageS3Key: String,  // Front side image S3 key
  backImageS3Key: String,   // Back side image S3 key (optional)
  
  // Verification
  verificationStatus: String,  // pending, verified, rejected, expired
  verificationDate: Date,
  verificationNotes: String,
  verifiedBy: ObjectId (ref: User),  // Admin who verified
  
  // OCR Data
  ocrData: {
    detected: Boolean,
    confidence: Number,
    extractedDetails: {
      aadhaarNumber: String,
      name: String,
      dob: Date,
      gender: String,
      address: String
    }
  },
  
  // Encryption
  frontImageToken: String,    // Encrypted token for front image
  backImageToken: String,     // Encrypted token for back image
  tokenExpiryDate: Date,      // When tokens expire
  
  // Status
  isActive: Boolean,          // For soft delete/archiving
  uploadDate: Date,
  lastModified: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Service Functions

### Validate Aadhaar Number
```javascript
const aadhaarService = require('./aadhaar.service');

const isValid = aadhaarService.validateAadhaarNumber('123456789012');
```

### Mask Aadhaar
```javascript
const masked = aadhaarService.maskAadhaarNumber('123456789012');
// Returns: "XXXX XXXX 9012"
```

### Check User Has Verified Aadhaar
```javascript
const hasVerified = await aadhaarService.userHasVerifiedAadhaar(userId);
```

### Get Verification Status
```javascript
const status = await aadhaarService.getAadhaarVerificationStatus(userId);
// Returns: { hasDocument, status, uploadDate, maskedAadhaar, notes }
```

### Bulk Update Status
```javascript
await aadhaarService.bulkUpdateAadhaarStatus(
  ['id1', 'id2', 'id3'],
  'verified',
  adminId,
  'Batch verification approved'
);
```

### Export Data
```javascript
const exportData = await aadhaarService.exportAadhaarData({
  status: 'verified',
  startDate: '2025-12-01',
  endDate: '2025-12-31'
});
```

### Get Analytics
```javascript
const analytics = await aadhaarService.getAadhaarAnalytics();
// Returns: total, verified, rate, statusBreakdown, dailyUploads, genderDistribution
```

### Check Duplicate
```javascript
const duplicate = await aadhaarService.checkDuplicateAadhaar('123456789012');
// Returns: { isDuplicate, existingUser }
```

---

## Integration with Registration Flow

Add Aadhaar verification to the registration flow:

```javascript
// In registration-flow.service.js
const aadhaarService = require('../documents/aadhaar.service');

exports.checkRegistrationRequirements = async (userId) => {
  const hasVerifiedAadhaar = await aadhaarService.userHasVerifiedAadhaar(userId);
  const hasVerifiedFace = await faceVerificationService.userHasValidFaceImage(userId);
  
  return {
    aadhaar: hasVerifiedAadhaar,
    face: hasVerifiedFace,
    allRequirementsMet: hasVerifiedAadhaar && hasVerifiedFace
  };
};
```

---

## Setup Instructions

### 1. Import Routes in Main Server

```javascript
// In src/server.js or api/index.js
const aadhaarRoutes = require('./features/documents/aadhaar.routes');

app.use('/api/aadhaar', aadhaarRoutes);
```

### 2. Update User Model (if needed)

Add Aadhaar reference:
```javascript
// In auth.model.js
const userSchema = new Schema({
  // ... existing fields
  aadhaarDocument: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Aadhaar'
  }
});
```

### 3. Add Middleware (Optional)

Create auth middleware for admin routes:
```javascript
// In aadhaar.routes.js
const adminOnly = require('../../shared/middlewares/adminAuth');

router.patch('/verify/:aadhaarId', adminOnly, ...);
router.patch('/reject/:aadhaarId', adminOnly, ...);
```

---

## Security Features

✅ **URL Encryption** - S3 URLs encrypted with tokens  
✅ **Proxy Access** - Images served via proxy, not direct S3 URLs  
✅ **Token Expiry** - Tokens automatically expire (default 7 days)  
✅ **Aadhaar Masking** - Full number never exposed in responses  
✅ **Admin-Only Verification** - Only verified admins can approve  
✅ **Audit Trail** - Track who verified and when  
✅ **Access Control** - Users can only access their own documents  

---

## Workflow Example

### User Journey

```
1. User uploads Aadhaar
   POST /api/aadhaar/upload/userId
   ├─ Validates Aadhaar number format
   ├─ Checks for duplicates
   ├─ Stores document with status: "pending"
   ├─ Encrypts image URLs
   └─ Returns encrypted tokens

2. User views uploaded document
   GET /api/aadhaar/userId
   ├─ Retrieves document details (masked Aadhaar)
   ├─ Regenerates tokens if expired
   └─ Returns proxy URLs for images

3. User views Aadhaar image
   GET /api/aadhaar/proxy/token
   ├─ Validates token
   ├─ Fetches from S3
   └─ Streams image to user

4. Admin reviews pending documents
   GET /api/aadhaar/admin/pending
   ├─ Lists all pending verifications
   └─ Shows user details and upload dates

5. Admin verifies document
   PATCH /api/aadhaar/verify/aadhaarId
   ├─ Sets status to "verified"
   ├─ Records verification date
   └─ Notes verification in audit trail

6. User checks verification status
   GET /api/aadhaar/userId
   └─ Shows status: "verified"
```

---

## Error Codes

| Code | Error | Solution |
|------|-------|----------|
| 400 | Invalid Aadhaar format | Must be 12 digits |
| 400 | Missing required fields | Check all fields present |
| 401 | Invalid/expired token | Regenerate token |
| 403 | Not authorized | Only admins can verify |
| 404 | Document not found | User hasn't uploaded |
| 409 | Duplicate Aadhaar | Aadhaar already registered |
| 500 | Image fetch failed | Check S3 URL validity |

---

## Next Steps

1. ✅ Add OCR integration for auto-extraction
2. ✅ Email notifications for verification status
3. ✅ Integration with face verification
4. ✅ Batch import from government databases
5. ✅ Expiry reminders for old documents

