# Integration Steps for Aadhaar Upload Feature

## Step 1: Add Import in src/server.js

Find this section (around line 45-50):

```javascript
// Import routes
const presignedUrlRoutes = require('./features/users/presigned-url.routes');
const imageRoutes = require('./features/images/image.routes');
```

**ADD THIS LINE:**
```javascript
const aadhaarRoutes = require('./features/documents/aadhaar.routes');
```

**Updated Code:**
```javascript
// Import routes
const presignedUrlRoutes = require('./features/users/presigned-url.routes');
const imageRoutes = require('./features/images/image.routes');
const aadhaarRoutes = require('./features/documents/aadhaar.routes');  // ADD THIS
```

---

## Step 2: Register Route in src/server.js

Find this section (around line 120-125):

```javascript
app.use('/api', imageStatusRoutes);
app.use('/api/images', imageRoutes);
```

**ADD THIS LINE:**
```javascript
app.use('/api/aadhaar', aadhaarRoutes);
```

**Updated Code:**
```javascript
app.use('/api', imageStatusRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/aadhaar', aadhaarRoutes);  // ADD THIS
```

---

## Step 3: Verify MongoDB Connection

The Aadhaar model uses MongoDB. Ensure:
- MongoDB is running
- `.env` has correct `MONGO_URI`
- Connection is established in `src/config/db.js`

**Check your .env file has:**
```
MONGO_URI=mongodb://localhost:27017/your_database_name
```

---

## Step 4: Test the Integration

### 4.1 Start Server
```bash
npm start
# or
npm run dev
```

### 4.2 Health Check
```bash
curl http://localhost:3000/api/aadhaar/health
```

Expected response:
```json
{
  "status": "success",
  "message": "Aadhaar service is running"
}
```

### 4.3 Test Upload
Use Postman collection: `Aadhaar_Upload_API.postman_collection.json`

---

## Step 5: (Optional) Add Authentication Middleware

If you have authentication middleware, add it to protected routes:

In `src/features/documents/aadhaar.routes.js`, add:

```javascript
const authMiddleware = require('../../shared/middlewares/auth'); // Adjust path
const adminMiddleware = require('../../shared/middlewares/admin'); // Adjust path

// User routes - need authentication
router.post('/upload/:userId', authMiddleware, catchAsync(aadhaarController.uploadAadhaarDocument));
router.get('/:userId', authMiddleware, catchAsync(aadhaarController.getAadhaarDocument));
router.delete('/:userId', authMiddleware, catchAsync(aadhaarController.deleteAadhaarDocument));

// Admin routes - need admin role
router.patch('/verify/:aadhaarId', authMiddleware, adminMiddleware, catchAsync(aadhaarController.verifyAadhaarDocument));
router.patch('/reject/:aadhaarId', authMiddleware, adminMiddleware, catchAsync(aadhaarController.rejectAadhaarDocument));
router.get('/admin/pending', authMiddleware, adminMiddleware, catchAsync(aadhaarController.getPendingAadhaarDocuments));
router.get('/admin/statistics', authMiddleware, adminMiddleware, catchAsync(aadhaarController.getAadhaarStatistics));
```

---

## Step 6: Test All Endpoints

### User Endpoints
```bash
# Upload
POST http://localhost:3000/api/aadhaar/upload/userId

# Get document
GET http://localhost:3000/api/aadhaar/userId

# Delete
DELETE http://localhost:3000/api/aadhaar/userId
```

### Admin Endpoints
```bash
# Verify document
PATCH http://localhost:3000/api/aadhaar/verify/aadhaarId

# Reject document
PATCH http://localhost:3000/api/aadhaar/reject/aadhaarId

# Get pending
GET http://localhost:3000/api/aadhaar/admin/pending

# Get statistics
GET http://localhost:3000/api/aadhaar/admin/statistics
```

---

## Complete Integration Example

Here's the exact code to add to your `src/server.js`:

### At imports section (add this line):
```javascript
const aadhaarRoutes = require('./features/documents/aadhaar.routes');
```

### At routes registration section (add this line):
```javascript
app.use('/api/aadhaar', aadhaarRoutes);
```

---

## Verify Installation

After integration, check that these files exist:

```bash
# Check model
ls -la src/features/documents/aadhaar.model.js

# Check controller
ls -la src/features/documents/aadhaar.controller.js

# Check routes
ls -la src/features/documents/aadhaar.routes.js

# Check service
ls -la src/features/documents/aadhaar.service.js
```

All should return file paths without errors.

---

## Troubleshooting

### Error: Cannot find module 'aadhaar.routes'
- Check file path is correct: `./features/documents/aadhaar.routes`
- Ensure all 4 files are in `src/features/documents/`

### Error: Aadhaar connection refused
- Check MongoDB is running
- Check `.env` MONGO_URI is correct
- Check network connection

### Error: 404 Not Found on /api/aadhaar endpoints
- Verify routes are registered in server.js
- Check spelling: `'/api/aadhaar'`
- Restart server after changes

### Error: Image proxy not working
- Verify S3 credentials in .env
- Check S3 URL format is correct
- Verify token encryption service is working

---

## Next Steps

After integration:

1. ✅ Test with Postman collection
2. ✅ Add to frontend (React/Vue)
3. ✅ Integrate with registration flow
4. ✅ Setup admin dashboard
5. ✅ Configure email notifications
6. ✅ Add OCR verification

---

## Files Modified/Created

**Modified:**
- None

**Created:**
- `src/features/documents/aadhaar.model.js`
- `src/features/documents/aadhaar.controller.js`
- `src/features/documents/aadhaar.routes.js`
- `src/features/documents/aadhaar.service.js`
- `AADHAAR_UPLOAD_GUIDE.md`
- `AADHAAR_IMPLEMENTATION_SUMMARY.md`
- `Aadhaar_Upload_API.postman_collection.json`

---

## Support

For detailed API documentation, see: `AADHAAR_UPLOAD_GUIDE.md`
For Postman examples, import: `Aadhaar_Upload_API.postman_collection.json`
