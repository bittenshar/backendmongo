# Aadhaar Upload Feature - Implementation Summary

## 📋 What's Been Created

### 4 Core Files in `src/features/documents/`

1. **aadhaar.model.js** - MongoDB Schema
   - Stores Aadhaar document details with encryption support
   - Validation methods for verification
   - Soft delete/archive support

2. **aadhaar.controller.js** - API Handlers
   - Upload documents
   - Retrieve user documents
   - Admin verification/rejection
   - Bulk operations
   - Statistics dashboard

3. **aadhaar.routes.js** - API Endpoints
   - 12 RESTful endpoints
   - Proxy image serving (encrypted URLs)
   - Admin and user routes
   - Health check endpoint

4. **aadhaar.service.js** - Business Logic
   - Aadhaar validation
   - Masking functions
   - Analytics generation
   - Duplicate detection
   - Data export

### 2 Documentation Files

1. **AADHAAR_UPLOAD_GUIDE.md** - Complete API Documentation
   - All endpoints with examples
   - Request/response samples
   - Integration guide
   - Security features

2. **Aadhaar_Upload_API.postman_collection.json** - Postman Collection
   - 12 ready-to-use API requests
   - Pre-configured variables
   - Example data

---

## 🚀 Quick Start

### Step 1: Add Routes to Server

```javascript
// In src/server.js or api/index.js
const aadhaarRoutes = require('./features/documents/aadhaar.routes');
app.use('/api/aadhaar', aadhaarRoutes);
```

### Step 2: Import in Package.json (Already included)
- Uses existing: mongoose, express, axios

### Step 3: Test with Postman
- Import `Aadhaar_Upload_API.postman_collection.json`
- Update variables: `base_url`, `token`, `userId`
- Start testing!

---

## 📦 File Structure

```
src/features/documents/
├── aadhaar.model.js
├── aadhaar.controller.js
├── aadhaar.routes.js
└── aadhaar.service.js

Root:
├── AADHAAR_UPLOAD_GUIDE.md
└── Aadhaar_Upload_API.postman_collection.json
```

---

## 🎯 Key Features

### User Features
✅ Upload Aadhaar (front + back images)  
✅ View own document status  
✅ Encrypted image viewing  
✅ Delete document  
✅ Masking of sensitive data  

### Admin Features
✅ View pending documents  
✅ Verify documents  
✅ Reject with notes  
✅ View statistics  
✅ Export data  

### Security
✅ URL encryption via proxy tokens  
✅ Automatic token expiry (7 days)  
✅ Aadhaar number masking (XXXX XXXX 1234)  
✅ Access control (users/admins only)  
✅ Audit trail (who verified, when)  

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/upload/:userId` | Upload Aadhaar | User |
| GET | `/:userId` | Get document | User |
| DELETE | `/:userId` | Delete document | User |
| GET | `/proxy/:token` | View image | Public |
| PATCH | `/verify/:id` | Verify doc | Admin |
| PATCH | `/reject/:id` | Reject doc | Admin |
| GET | `/admin/pending` | List pending | Admin |
| GET | `/admin/statistics` | View stats | Admin |
| POST | `/encrypt` | Encrypt URL | Admin |
| POST | `/decrypt` | Decrypt token | Admin |
| GET | `/health` | Health check | Public |

---

## 📊 Database Schema

```javascript
Aadhaar {
  _id: ObjectId
  userId: ObjectId (User)
  aadhaarNumber: "123456789012" (unique)
  fullName: String
  dateOfBirth: Date
  gender: "M" | "F" | "Other"
  address: String
  
  // Images
  frontImageS3Key: String
  backImageS3Key: String (optional)
  
  // Verification
  verificationStatus: "pending" | "verified" | "rejected" | "expired"
  verificationDate: Date
  verificationNotes: String
  verifiedBy: ObjectId (Admin)
  
  // OCR (for future)
  ocrData: { detected, confidence, extractedDetails }
  
  // Encryption
  frontImageToken: String
  backImageToken: String
  tokenExpiryDate: Date
  
  // Metadata
  uploadDate: Date
  lastModified: Date
  isActive: Boolean
}
```

---

## 🔐 Security Features

### 1. URL Encryption
- S3 URLs encrypted and sent as tokens
- Images accessed via `/proxy/:token` endpoint
- Raw S3 URLs never exposed to frontend

### 2. Token Expiry
- Tokens expire after 7 days by default
- Auto-regenerated when requested
- Expired tokens cannot be used

### 3. Data Masking
- Aadhaar numbers: XXXX XXXX 1234
- Only last 4 digits shown
- Full number only in admin backend

### 4. Access Control
- Users see only their own documents
- Admins need special role for verification
- Encrypted URLs prevent direct access

---

## 📝 Usage Examples

### Upload Aadhaar
```bash
curl -X POST http://localhost:3000/api/aadhaar/upload/userId123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{
    "aadhaarNumber": "123456789012",
    "fullName": "John Doe",
    "dateOfBirth": "1990-05-15",
    "gender": "M",
    "address": "123 Main St",
    "frontImageS3Key": "uploads/aadhaar/user123/front.jpg",
    "backImageS3Key": "uploads/aadhaar/user123/back.jpg"
  }'
```

### Check Verification Status
```bash
curl http://localhost:3000/api/aadhaar/userId123 \
  -H "Authorization: Bearer token"
```

### Verify Document (Admin)
```bash
curl -X PATCH http://localhost:3000/api/aadhaar/verify/docId \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer adminToken" \
  -d '{
    "notes": "Document verified"
  }'
```

### View Pending (Admin)
```bash
curl http://localhost:3000/api/aadhaar/admin/pending?page=1&limit=10 \
  -H "Authorization: Bearer adminToken"
```

---

## 🔄 Integration with Existing Systems

### With User Registration
```javascript
// Check if user has verified Aadhaar before registration
const aadhaarService = require('./features/documents/aadhaar.service');

const hasVerified = await aadhaarService.userHasVerifiedAadhaar(userId);
if (!hasVerified) {
  return res.status(400).json({ 
    message: 'Please verify Aadhaar first' 
  });
}
```

### With Registration Flow
```javascript
// In registration-flow.service.js
const requirements = await registrationFlowService.checkRegistrationRequirements(userId);
// Returns: { aadhaar: true/false, face: true/false, allRequirementsMet }
```

---

## 📈 Future Enhancements

- [ ] OCR integration for auto-extraction
- [ ] Email notifications for verification
- [ ] Batch import from government APIs
- [ ] Document expiry reminders
- [ ] Analytics dashboard
- [ ] Compliance reports
- [ ] Document versioning

---

## 🆘 Troubleshooting

### Issue: Invalid Aadhaar format
**Solution:** Aadhaar must be exactly 12 digits. Format: `123456789012`

### Issue: Image not loading
**Solution:** Check S3 URL is valid and token isn't expired

### Issue: Permission denied
**Solution:** Check user is logged in and has required role

### Issue: Duplicate Aadhaar error
**Solution:** Each Aadhaar number can only be registered once

---

## ✅ Testing Checklist

- [ ] Upload works with front image only
- [ ] Upload works with front + back images
- [ ] Image encryption and proxy working
- [ ] Token expiry working
- [ ] Admin verification flow working
- [ ] Aadhaar number masking working
- [ ] Duplicate detection working
- [ ] Statistics endpoint working
- [ ] Export data working
- [ ] Health check endpoint working

---

## 📞 Support

For issues or questions:
1. Check AADHAAR_UPLOAD_GUIDE.md for detailed docs
2. Review Postman collection for example requests
3. Check server logs for error details
4. Verify S3 credentials and permissions

---

## 📜 License & Credits

Created as part of the Event Management System (adminthrill)
Date: December 16, 2025
