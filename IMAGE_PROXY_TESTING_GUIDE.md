# Image Proxy - Quick Testing Guide

## 🚀 Quick Start - Test the New Clean Image Proxy

### URLs Changed
```
OLD ❌ GET /api/images/public/events/123/cover.jpg
NEW ✅ GET /api/images/event-123-cover

OLD ❌ GET /api/images/proxy?key=events/123/cover.jpg
NEW ✅ GET /api/images/event-123-cover

NO LONGER SUPPORTED ❌
├─ /api/images/proxy/:token
├─ /api/images/encrypt
└─ /api/images/decrypt
```

---

## 1️⃣ Test Clean ImageID Endpoint

### Using cURL
```bash
# Basic test
curl -v http://localhost:3000/api/images/event-123-cover

# With auth if needed
curl -v -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/images/event-123-cover
```

### Expected Response (Image Exists)
```
HTTP/1.1 200 OK
Content-Type: image/jpeg
Cache-Control: public, max-age=31536000
Content-Length: 45123

[Binary image data]
```

### Expected Response (Image Missing)
```
HTTP/1.1 200 OK
Content-Type: image/svg+xml
Cache-Control: public, max-age=3600
Content-Length: 512

<?xml version="1.0"?>
<svg>...placeholder SVG...</svg>
```

### Using Postman
1. Create new GET request
2. Enter URL: `{{BASE_URL}}/api/images/event-123-cover`
3. Click "Send"
4. Check response headers (should NOT contain x-amz-* headers)

---

## 2️⃣ Test Base64-Encoded Key Endpoint

### Encode S3 Key First
```bash
# Using cURL
curl -X POST http://localhost:3000/api/images/encode \
  -H "Content-Type: application/json" \
  -d '{"s3Key":"events/123/cover.jpg"}'
```

### Response
```json
{
  "status": "success",
  "data": {
    "s3Key": "events/123/cover.jpg",
    "encodedKey": "ZXZlbnRzLzEyMy9jb3Zlci5qcGc=",
    "proxyUrl": "/api/images/url/ZXZlbnRzLzEyMy9jb3Zlci5qcGc="
  }
}
```

### Use Encoded Key
```bash
curl -v http://localhost:3000/api/images/url/ZXZlbnRzLzEyMy9jb3Zlci5qcGc=
```

---

## 3️⃣ Test Health Check Endpoint

```bash
curl http://localhost:3000/api/images/health
```

### Expected Response
```json
{
  "status": "success",
  "message": "Image service is operational",
  "endpoints": [
    {
      "path": "GET /api/images/:imageId",
      "description": "Fetch image using clean ID (type-id-name format)",
      "example": "GET /api/images/event-123-cover"
    },
    {
      "path": "GET /api/images/url/:encodedKey",
      "description": "Fetch image using base64-encoded storage key",
      "example": "GET /api/images/url/ZXZlbnRzLzEyMy9jb3Zlci5qcGc="
    },
    {
      "path": "POST /api/images/encode",
      "description": "Encode storage key to base64 for /url endpoint",
      "example": "{\"s3Key\":\"events/123/cover.jpg\"}"
    }
  ]
}
```

### ✅ Verification
- [ ] No AWS references in response
- [ ] No bucket name mentioned
- [ ] No region information exposed
- [ ] Only clean endpoint patterns shown

---

## 4️⃣ Test with Real Event

### Create Event with Image
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=Concert 2024" \
  -F "location=Central Arena" \
  -F "date=2024-12-01T19:00:00Z" \
  -F "startTime=2024-12-01T19:00:00Z" \
  -F "endTime=2024-12-01T23:00:00Z" \
  -F "organizer=ORGANIZER_ID" \
  -F "file=@/path/to/image.jpg"
```

### Response Should Include
```json
{
  "status": "success",
  "data": {
    "event": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Concert 2024",
      "coverImageUrl": "/api/images/event-507f1f77bcf86cd799439011-cover",
      "location": "Central Arena",
      "date": "2024-12-01T19:00:00Z"
    }
  }
}
```

### Test Image Access
```bash
curl -v http://localhost:3000/api/images/event-507f1f77bcf86cd799439011-cover
```

### ✅ Verification
- [ ] Response Status: 200 OK
- [ ] Content-Type: image/jpeg or image/png
- [ ] Cache-Control: public, max-age=31536000
- [ ] NO x-amz-* headers in response
- [ ] Image data returned correctly

---

## 5️⃣ Header Verification

### Check for Infrastructure Exposure

```bash
# Request with verbose headers
curl -v http://localhost:3000/api/images/event-123-cover
```

### ✅ Correct Headers (Should Have)
```
Content-Type: image/jpeg
Cache-Control: public, max-age=31536000
Content-Length: 45123
```

### ❌ Incorrect Headers (Should NOT Have)
```
x-amz-id-2: ← SHOULD NOT APPEAR
x-amz-request-id: ← SHOULD NOT APPEAR
x-amz-version-id: ← SHOULD NOT APPEAR
x-amzn-requestid: ← SHOULD NOT APPEAR
```

### Testing Command
```bash
# Extract AWS headers (should return nothing)
curl -s -D - http://localhost:3000/api/images/event-123-cover 2>/dev/null | grep -i "x-amz"
# Expected: (no output)
```

---

## 6️⃣ Error Handling Tests

### Test 1: Invalid ImageID Format
```bash
curl -v http://localhost:3000/api/images/invalid-no-hyphens
```

Expected:
```
HTTP/1.1 400 Bad Request
{
  "status": "error",
  "message": "Invalid image ID format. Expected: type-id-name"
}
```

### Test 2: Missing Image
```bash
curl -v http://localhost:3000/api/images/event-999999-nonexistent
```

Expected:
```
HTTP/1.1 200 OK
Content-Type: image/svg+xml
[SVG placeholder]
```

### Test 3: Invalid Base64
```bash
curl -v http://localhost:3000/api/images/url/not-valid-base64!!!
```

Expected:
```
HTTP/1.1 400 Bad Request
{
  "status": "error",
  "message": "Invalid base64-encoded key"
}
```

---

## 7️⃣ Performance Tests

### Test Caching
```bash
# First request (cache miss)
time curl -s http://localhost:3000/api/images/event-123-cover -o /dev/null

# Second request (cache hit - should be faster)
time curl -s http://localhost:3000/api/images/event-123-cover -o /dev/null
```

### Check Cache Headers
```bash
curl -D - -s http://localhost:3000/api/images/event-123-cover | grep -i cache
# Expected: Cache-Control: public, max-age=31536000
```

### Check ETag (for client-side caching)
```bash
curl -D - -s http://localhost:3000/api/images/event-123-cover | grep -i etag
# May or may not have ETag depending on S3 bucket config
```

---

## 8️⃣ Postman Collection

### Import Test Collection
[Create new collection with these requests]

#### Request 1: Get Image
```
GET /api/images/event-123-cover

Expected: 200, binary image or SVG
```

#### Request 2: Get Image (Base64)
```
POST /api/images/encode
Body: {"s3Key":"events/123/cover.jpg"}

Expected: 200, encodedKey returned

Then use encodedKey:
GET /api/images/url/{{encodedKey}}

Expected: 200, image returned
```

#### Request 3: Health Check
```
GET /api/images/health

Expected: 200, clean endpoints documentation
```

#### Request 4: Create Event with Image
```
POST /api/events
Headers: Authorization: Bearer {{token}}
Body: multipart/form-data
- name: "Test Event"
- location: "Test Location"
- date: "2024-12-01"
- file: [pick image file]

Expected: 201, event with clean imageUrl
```

#### Request 5: Get Event Image
```
GET /api/images/{{imageId}}

Where {{imageId}} comes from event response:
/api/images/event-507f1f77bcf86cd799439011-cover

Expected: 200, image data
```

---

## ✅ Complete Verification Checklist

After running all tests above, verify:

### Infrastructure Security ✅
- [ ] No AWS bucket names exposed
- [ ] No AWS region info exposed
- [ ] No AWS request IDs in headers
- [ ] No x-amz-* headers visible
- [ ] Only clean URLs in responses: /api/images/event-*

### Functionality ✅
- [ ] Image retrieval working for existing images
- [ ] Placeholder SVG returned for missing images
- [ ] Base64 encoding/decoding working
- [ ] Health endpoint accessible
- [ ] ImageID pattern resolved correctly

### Performance ✅
- [ ] Cache headers set correctly (1 year)
- [ ] Response times reasonable (< 500ms locally)
- [ ] Second request faster than first (caching)
- [ ] Large images stream efficiently

### Error Handling ✅
- [ ] Invalid imageID returns 400
- [ ] Invalid base64 returns 400
- [ ] Missing images return placeholder (not 404)
- [ ] Helpful error messages

### Backward Compatibility ✅
- [ ] Old S3 keys accessible via base64 endpoint
- [ ] Old images accessible via encoding utility
- [ ] Migration path clear for old uploads

---

## 🔍 Debugging

### Enable Verbose Logging (if supported)
```bash
export IMAGE_PROXY_DEBUG=true
npm start
```

### Check S3 Connection
```bash
curl http://localhost:3000/api/images/health
# Check if hasAccessKey and hasSecretKey are true
```

### Test S3 Directly (via presigned URL)
```bash
# Get presigned upload URL first
curl -X POST http://localhost:3000/api/s3/presigned-url \
  -d '{"eventId":"123456","fileName":"cover.jpg"}' \
  -H "Content-Type: application/json"

# Check S3 bucket directly (AWS CLI)
aws s3 ls s3://event-images-collection/events/123456/
```

### Monitor Logs
```bash
# Watch for any AWS references in responses
tail -f logs/app.log | grep -i "amazon\|aws\|bucket"

# Count S3 errors
grep "S3" logs/app.log | grep "error\|Error\|❌"
```

---

## 📊 Expected S3 Structure

```
s3://event-images-collection/
├─ events/
│  ├─ 507f1f77bcf86cd799439011/
│  │  ├─ cover.jpg
│  │  ├─ cover.png
│  │  └─ cover.gif
│  ├─ 607f1f77bcf86cd799439012/
│  │  └─ cover.jpg
│  └─ ...
└─ users/
   ├─ 707f1f77bcf86cd799439013/
   │  └─ avatar.png
   └─ ...
```

### Image Naming Pattern
- One per entity (eventId/userId)
- Format: `{type}s/{id}/cover.{ext}`
- No UUIDs
- No timestamps
- Overwrite on update

---

## 🚨 Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| 400 "Invalid imageId format" | ImageID format wrong | Use: type-id-name (e.g., event-123-cover) |
| Always returns placeholder | S3 key doesn't match | Check S3 bucket has: events/{id}/cover.{ext} |
| AWS headers still visible | Proxy not removing headers | Check image.routes.js removeHeader() calls |
| Slow performance | No caching | Verify Cache-Control header (1 year) |
| Old images not accessible | UUID pattern different | Use /urls/ endpoint with base64 encoding |
| Base64 errors | Invalid encoding | Ensure input is URL-safe base64 |

---

## 📞 Quick Commands Reference

```bash
# Test all endpoints at once
alias test-images() {
  echo "=== Health Check ===" && \
  curl -s http://localhost:3000/api/images/health | jq '.' && \
  echo -e "\n=== Test Image ===" && \
  curl -D - -s http://localhost:3000/api/images/event-123-cover | head -20 && \
  echo -e "\n=== Encode Utility ===" && \
  curl -s -X POST http://localhost:3000/api/images/encode \
    -H "Content-Type: application/json" \
    -d '{"s3Key":"events/123/cover.jpg"}' | jq '.'
}

# Run after adding to .bashrc or .zshrc
test-images
```

---

## ✅ Ready for Production

Once all tests pass:

1. ✅ Code changes deployed
2. ✅ S3 structure verified
3. ✅ No AWS references exposed
4. ✅ Cache headers working
5. ✅ Error handling correct
6. ✅ Client apps updated

You're ready for production! 🚀
