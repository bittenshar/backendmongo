# DynamoDB Service Schema Update

## 🎯 Overview
Updated DynamoDB service to match the **actual production table schema** (`faceimage`) with strict duplicate prevention using Global Secondary Index (GSI) queries.

---

## ✅ What Changed

### 1. **Table Schema Alignment**

#### **Before (Incorrect)**
- Table Name: `face-verifications`
- Primary Key (PK): `userId` (String) - UNIQUE
- No GSI
- Design: One record per user

#### **After (Correct)**
- Table Name: `faceimage` ✅
- Primary Key (HASH): `RekognitionId` (String) - Unique identifier
- Global Secondary Index: `userId-index`
  - HASH: `UserId` (String)
  - RANGE: `RekognitionId` (String)
- Design: One face per user (enforced via GSI query)

---

## 🔧 Updated Functions

### **New Duplicate Prevention Method**

```javascript
// Query GSI to check if userId already has a face record
exports.userFaceExists = async (userId) => {
  // Queries userId-index GSI
  // Returns 409 Conflict if userId exists
  // Allows storage only if userId is new
}
```

**Key Difference**: Uses **GSI query** instead of direct `GetCommand` on partition key.

### **Function Updates**

| Function | Purpose | Updated |
|----------|---------|---------|
| `userFaceExists()` | Check duplicate via GSI query | ✅ **NEW** |
| `storeFaceImage()` | Store with RekognitionId as PK | ✅ Updated |
| `getUserFaceByUserId()` | Query by UserId via GSI | ✅ **NEW** |
| `getFaceByRekognitionId()` | Direct lookup by PK | ✅ **NEW** |
| `updateFaceImage()` | Update by RekognitionId | ✅ Updated |
| `deleteFaceImage()` | Delete by RekognitionId | ✅ Updated |
| `deleteFaceImageByUserId()` | Delete by UserId (admin) | ✅ **NEW** |
| `getAllFaceImages()` | Admin scan all records | ✅ Updated |
| `validateUserCanCreateFace()` | Validate before creation | ✅ **NEW** |
| `initializeService()` | Service initialization | ✅ Updated |

---

## 📋 Function Signatures

### **Store Face Image (with Duplicate Prevention)**
```javascript
exports.storeFaceImage = async (rekognitionId, userId, name, faceData) => {
  // 1. Query GSI: userFaceExists(userId)
  //    - Throws 409 if userId found
  // 2. Store with RekognitionId as PK
  // Returns: { success, userId, rekognitionId, timestamp, message }
}
```

**Parameters:**
- `rekognitionId`: Unique Rekognition ID (becomes Primary Key)
- `userId`: User ID (stored for GSI query)
- `name`: User name
- `faceData`: { faceS3Url, faceId, confidence, status }

### **Get User's Face by UserId**
```javascript
exports.getUserFaceByUserId = async (userId) => {
  // Queries userId-index GSI
  // Returns: { success, data: [faceRecord] }
  // Throws 404 if not found
}
```

### **Get Face by RekognitionId (Direct Lookup)**
```javascript
exports.getFaceByRekognitionId = async (rekognitionId) => {
  // Direct GetCommand on PK
  // Returns: { success, data: faceRecord }
  // Throws 404 if not found
}
```

### **Validate User Can Create Face**
```javascript
exports.validateUserCanCreateFace = async (userId) => {
  // Check GSI: UserId exists?
  // Returns: { success, canCreate: true, message }
  // Throws 409 if duplicate found
}
```

---

## 🔑 Important Implementation Notes

### **Duplicate Prevention Logic**

1. **Before Creating New Face:**
   ```javascript
   // Call this FIRST
   await dynamoDbService.userFaceExists(userId);
   // Throws 409 if userId already in table
   ```

2. **Error Handling:**
   ```javascript
   if (error.statusCode === 409) {
     // User already has face record
     // Return HTTP 409 Conflict
   }
   ```

3. **One Face Per User:**
   - Query `userId-index` GSI before storage
   - Only allow if GSI returns 0 items for that UserId
   - Enforce at application level, not DB constraints

---

## 📝 Environment Variables

### **Updated `.env`**
```properties
# Before
DYNAMODB_FACE_VALIDATION_TABLE=face-verifications

# After ✅
DYNAMODB_FACE_IMAGE_TABLE=faceimage
```

---

## 🧪 Testing the Service

### **Test 1: Store New Face (Success Case)**
```javascript
const result = await storeFaceImage(
  'rek_12345',           // rekognitionId
  'user_456',            // userId
  'John Doe',            // name
  {
    faceS3Url: 's3://bucket/face.jpg',
    faceId: 'face_id_789',
    confidence: 95.5,
    status: 'verified'
  }
);
// Expected: { success: true, ... }
```

### **Test 2: Duplicate Prevention (Conflict Case)**
```javascript
// Try to store second face for same userId
const result = await storeFaceImage(
  'rek_99999',           // different rekognitionId
  'user_456',            // SAME userId
  'John Doe',
  { ... }
);
// Expected: AppError 409 "User already has a face record..."
```

### **Test 3: Get Face by UserId (GSI Query)**
```javascript
const result = await getUserFaceByUserId('user_456');
// Expected: { success: true, data: { RekognitionId, UserId, Name, ... } }
```

### **Test 4: Get Face by RekognitionId (Direct Lookup)**
```javascript
const result = await getFaceByRekognitionId('rek_12345');
// Expected: { success: true, data: { RekognitionId, UserId, Name, ... } }
```

---

## 🚀 Next Steps

1. **Update Controller** (`userEventRegistration.controller.js`)
   - Add duplicate check before upload
   - Use `storeFaceImage()` instead of old method
   - Handle 409 errors for duplicate users

2. **Update Routes** (`userEventRegistration.routes.js`)
   - Add GET endpoint to check if user has face
   - Update POST endpoint to reject duplicates

3. **Test with AWS**
   - Connect to actual `faceimage` table
   - Verify duplicate prevention works
   - Test GSI queries

4. **Verify Credentials**
   - Ensure AWS IAM user has DynamoDB access
   - Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in `.env`
   - Verify AWS_REGION is `ap-south-1`

---

## 📊 Table Structure Reference

```
Table: faceimage
├─ Primary Key (HASH): RekognitionId
│  └─ Example: "rek_id_12345"
│
├─ Attributes:
│  ├─ RekognitionId (String, PK)
│  ├─ UserId (String, GSI HASH)
│  ├─ Name (String)
│  ├─ FaceS3Url (String)
│  ├─ FaceId (String)
│  ├─ Confidence (Number)
│  ├─ Status (String)
│  ├─ Timestamp (String)
│  ├─ CreatedAt (String)
│  └─ UpdatedAt (String)
│
└─ Global Secondary Index: userId-index
   ├─ HASH: UserId (String)
   ├─ RANGE: RekognitionId (String)
   └─ Used for: Querying by UserId, duplicate prevention
```

---

## ⚠️ Critical Business Rules

✅ **ONE FACE PER USER** - Strictly enforced
- Query GSI before every insert
- Return 409 Conflict if UserId exists
- User must delete old face to register new one

✅ **RekognitionId as Primary Key**
- Each face gets unique RekognitionId
- Direct lookups use RekognitionId
- Cannot use UserId directly as PK (not unique)

✅ **UserId-Index for Queries**
- All UserId-based queries use GSI
- GSI queries check duplicate prevention
- GSI lookups retrieve user's single face record

---

## 📌 Files Modified

1. ✅ **`src/services/aws/dynamodb.service.js`** (422 lines → 340 lines)
   - Complete rewrite for actual table schema
   - Updated all functions
   - Added GSI query logic

2. ✅ **`.env`**
   - Changed table name to `faceimage`
   - Updated env var name: `DYNAMODB_FACE_IMAGE_TABLE`

---

## ✨ Summary

The DynamoDB service now **correctly integrates with the production `faceimage` table** with:
- ✅ Proper Primary Key usage (RekognitionId)
- ✅ Correct GSI queries (userId-index)
- ✅ Strict duplicate prevention (409 errors)
- ✅ One-face-per-user policy enforced
- ✅ All necessary CRUD operations updated

**Ready for controller and route updates!**
