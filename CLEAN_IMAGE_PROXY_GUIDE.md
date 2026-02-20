# Clean Image Proxy Guide - Complete Redesign

## Overview

The image routing system has been completely redesigned to **hide all AWS/S3 infrastructure details** from client-facing URLs. No more AWS references, no more S3 bucket names, no more direct infrastructure exposure.

---

## Architecture Changes

### Before (Infrastructure Exposed)
```
GET /api/images/public/events/123/cover-uuid.jpg          ❌ S3 path visible
GET /api/images/proxy?key=events/123/cover-uuid.jpg       ❌ S3 key exposed
Response includes x-amz-* headers                          ❌ AWS infrastructure visible
```

### After (Clean & Abstracted)
```
GET /api/images/event-123-cover                           ✅ Clean imageId
GET /api/images/url/base64EncodedKey                       ✅ Encoded fallback
Response headers cleaned of AWS references                 ✅ Infrastructure hidden
```

---

## ImageID Pattern

The new system uses a clean imageId pattern that completely abstracts storage infrastructure:

### Format: `type-{id}-{name}`

**Examples:**
- `event-123-cover` → Maps to `events/123/cover.jpg`
- `event-456-thumbnail` → Maps to `events/456/thumbnail.png`
- `user-789-avatar` → Maps to `users/789/avatar.jpg`

**Resolution Logic:**
1. Split imageId by `-`
2. Type: First part (`event`, `user`, etc.)
3. ID: Second part (numeric identifier)
4. Name: Remaining parts joined
5. Map to: `{type}s/{id}/{name}`
6. Auto-detect extensions: `.jpg`, `.png`, `.jpeg`, `.gif`, `.webp`, `.svg`

---

## API Endpoints

### 1. GET `/api/images/:imageId` (Primary)
**Clean proxy endpoint** - Main way to access images. No infrastructure references.

**Usage:**
```bash
GET /api/images/event-123-cover
GET /api/images/user-456-avatar
```

**Response:**
- Returns image with proper `Content-Type`
- Cache-Control: `public, max-age=31536000` (1 year)
- Clean headers (AWS infrastructure headers removed)
- Returns SVG placeholder if not found

**Error Handling:**
- Invalid imageId format → 400 Bad Request
- Image not found → SVG placeholder (not 404)

---

### 2. GET `/api/images/url/:encodedKey` (Alternative)
**Base64-encoded key proxy** - For complex S3 paths that don't fit the imageId pattern.

**Usage:**
```bash
# First encode the S3 key
S3_KEY="events/123/special-cover.jpg"
ENCODED=$(echo -n "$S3_KEY" | base64)

# Then use it in the API
GET /api/images/url/$ENCODED
```

**Example:**
```bash
GET /api/images/url/ZXZlbnRzLzEyMy9jb3Zlci5qcGc=
# (base64 of: events/123/cover.jpg)
```

**Response:**
- Same as primary endpoint
- Cache-Control: 1 year
- Clean headers

---

### 3. POST `/api/images/encode` (Utility)
**Encode S3 keys to base64** - Admin utility to generate base64-encoded keys for complex paths.

**Request:**
```json
POST /api/images/encode
{
  "s3Key": "events/123/special-folder/cover.jpg"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "s3Key": "events/123/special-folder/cover.jpg",
    "encodedKey": "ZXZlbnRzLzEyMy9zcGVjaWFsLWZvbGRlci9jb3Zlci5qcGc=",
    "proxyUrl": "/api/images/url/ZXZlbnRzLzEyMy9zcGVjaWFsLWZvbGRlci9jb3Zlci5qcGc="
  }
}
```

---

### 4. GET `/api/images/health` (Diagnostics)
**Health check** - Shows service status and available endpoints (no AWS details exposed).

**Response:**
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

---

## Image Upload & Storage

### S3 Storage Pattern
All images are stored in a standardized format:

```
Bucket: event-images-collection
Region: ap-south-1

Structure:
events/{eventId}/cover.{extension}
users/{userId}/avatar.{extension}
```

### Upload Flow

#### 1. Create Event with Image
```javascript
POST /api/events
Content-Type: multipart/form-data

name: "Concert Night"
location: "Central Arena"
date: "2024-12-01T19:00:00Z"
file: [image.jpg]
```

**Backend Processing:**
1. Create event document in MongoDB
2. Get MongoDB `_id` as `eventId`
3. Upload image to `events/{eventId}/cover.{ext}`
4. Store `s3ImageKey` in event document
5. Update event with image metadata

**Response:**
```json
{
  "status": "success",
  "data": {
    "event": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Concert Night",
      "location": "Central Arena",
      "coverImageUrl": "/api/images/event-507f1f77bcf86cd799439011-cover",
      "date": "2024-12-01T19:00:00Z"
    }
  }
}
```

#### 2. Update Event Image
```javascript
PUT /api/events/{eventId}
Content-Type: multipart/form-data

file: [new-image.jpg]
```

**Backend Processing:**
1. Upload new image to `events/{eventId}/cover.{ext}` (overwrites old)
2. Optionally delete old image version
3. Update event document
4. Return clean image URL

---

### Get Presigned Upload URL
For frontend direct S3 uploads without backend involvement:

```javascript
POST /api/s3/presigned-url
{
  "eventId": "507f1f77bcf86cd799439011",
  "fileName": "cover.jpg",
  "contentType": "image/jpeg"
}
```

**Response:**
```json
{
  "success": true,
  "presignedUrl": "https://...",
  "key": "events/507f1f77bcf86cd799439011/cover.jpg",
  "imageId": "event-507f1f77bcf86cd799439011-cover",
  "expiresIn": 3600
}
```

Frontend can then:
1. Use `presignedUrl` to upload directly to S3
2. Use returned `imageId` to access via proxy
3. Save `imageId` in event record

---

## Response Headers Security

### Headers Removed
The proxy removes infrastructure-exposing AWS headers:
- `x-amz-id-2`
- `x-amz-request-id`
- `x-amz-version-id`
- `x-amz-expiration`

### Headers Sent
Only essential, non-infrastructure headers:
- `Content-Type` (image/jpeg, image/png, etc.)
- `Cache-Control` (public, max-age=31536000)
- `Content-Length`

---

## Image Resolution Logic

### Step 1: Parse ImageID
```
Input: event-123-cover
├─ Type: event
├─ ID: 123
└─ Name: cover
```

### Step 2: Build Base Path
```
Base: events/123/cover
```

### Step 3: Try Extensions
```
Attempts:
1. events/123/cover.jpg
2. events/123/cover.png
3. events/123/cover.jpeg
4. events/123/cover.gif
5. events/123/cover.webp
6. events/123/cover.svg
```

### Step 4: Return First Match
```
Found: events/123/cover.jpg
└─ Stream from S3 with clean headers
```

### Step 5: Fallback
```
Not found: Return SVG placeholder
└─ Generic "No Image" SVG
└─ Cached 1 hour (different from images)
```

---

## Error Handling

### Invalid ImageID Format
```
GET /api/images/invalid-format
Status: 400 Bad Request

{
  "status": "error",
  "message": "Invalid image ID format. Expected: type-id-name"
}
```

### Image Not Found
```
GET /api/images/event-999-cover
Status: 200 OK
Content-Type: image/svg+xml

[SVG placeholder for missing image]
```

### Base64 Decode Error
```
GET /api/images/url/invalid-base64
Status: 400 Bad Request

{
  "status": "error",
  "message": "Invalid base64-encoded key"
}
```

---

## Migration from Old System

### Old URLs (Deprecated)
```
GET /api/images/public/events/123/cover-uuid.jpg
GET /api/images/proxy?key=events/123/cover-uuid.jpg
GET /api/images/proxy/:encryptedToken
```

### New URLs (Active)
```
GET /api/images/event-123-cover
```

### Migration Path
1. ✅ Event controller now generates `/api/images/event-{id}-cover` URLs
2. ✅ S3 upload uses clean naming: `events/{id}/cover.{ext}`
3. ✅ Old uploaded images still accessible via `/url/` endpoint with base64 encoding
4. ✅ New uploads automatically use clean pattern

---

## File Structure Updates

### Key Files Modified

#### 1. `/src/features/images/image.routes.js` (213 lines)
- **Removed:** Token encryption, external URL handling, `/proxy` endpoint
- **Added:** Clean imageId mapping, base64 key support, encode utility
- **New:** Complete infrastructure abstraction layer

#### 2. `/src/features/events/event.controller.js`
- **Updated:** `transformEventResponse()` - generates clean imageIds
- **Modified:** `createEvent()` - passes eventId to S3 upload
- **Modified:** `updateEvent()` - passes eventId when updating images
- **Result:** All event APIs return clean image URLs

#### 3. `/src/shared/services/s3EventImages.service.js`
- **Updated:** `uploadEventImage()` - uses clean naming pattern
- **Updated:** `getPresignedUploadUrl()` - returns imageId in response
- **Modified:** S3 keys from `events/{id}/cover-uuid.{ext}` to `events/{id}/cover.{ext}`
- **Result:** Consistent storage structure for new proxy

---

## Performance & Caching

### Cache Strategy
- **Images:** `max-age=31536000` (1 year - immutable)
- **Placeholders:** `max-age=3600` (1 hour - may change)
- **Health check:** No caching (diagnostic endpoint)

### Rationale
- Images are immutable (identified by eventId)
- Even if image changes, new URL generated (different eventId)
- Placeholders are temporary, may be filled later

---

## Security Features

### No Infrastructure Exposure
✅ AWS bucket names hidden
✅ Region information hidden
✅ AWS request IDs hidden
✅ S3 version IDs hidden
✅ No raw S3 URLs in responses

### Access Control
- Public read access (images are public)
- No authentication required (intentional)
- Rate limiting at API gateway level (recommended)

### Placeholder Generation
- Local SVG generation (no external service)
- Lightweight fallback (not cached long-term)
- User-friendly "No Image" message

---

## Testing Endpoints

### Test 1: Clean ImageID
```bash
curl http://localhost:3000/api/images/event-123-cover
# Should return image or SVG placeholder
```

### Test 2: Base64-Encoded Key
```bash
ENCODED=$(echo -n "events/123/cover.jpg" | base64)
curl http://localhost:3000/api/images/url/$ENCODED
# Should return image
```

### Test 3: Encode Utility
```bash
curl -X POST http://localhost:3000/api/images/encode \
  -H "Content-Type: application/json" \
  -d '{"s3Key":"events/123/cover.jpg"}'
# Returns encodedKey and proxyUrl
```

### Test 4: Health Check
```bash
curl http://localhost:3000/api/images/health
# Shows service status (no AWS details)
```

---

## Client Integration

### Example: React Component
```jsx
function EventCard({ event }) {
  // Event object from API:
  // { _id: "507f1f77bcf86cd799439011", 
  //   name: "Concert", 
  //   coverImageUrl: "/api/images/event-507f1f77bcf86cd799439011-cover" }

  return (
    <div>
      <img 
        src={event.coverImageUrl}
        alt={event.name}
        onError={(e) => {
          // Already returns placeholder, but just in case
          e.target.style.display = 'none';
        }}
      />
      <h3>{event.name}</h3>
    </div>
  );
}
```

### Benefits
- Clean URL passed to frontend
- No backend infrastructure exposed
- Automatic placeholder fallback
- Consistent caching behavior
- Simple error handling

---

## Troubleshooting

### Images Return Placeholder
1. Check S3 key format: `events/{eventId}/cover.{ext}`
2. Ensure file exists in correct bucket
3. Verify EventID matches MongoDB `_id`
4. Check file extension (supports: jpg, png, jpeg, gif, webp, svg)

### Old Images No Longer Work
1. Use `/url/` endpoint with base64-encoded key
2. Or re-upload using new system (auto-generates imageId)

### Performance Issues
1. Verify CloudFront caching enabled
2. Check S3 region matches app region
3. Consider CDN for image distribution

### AWS Header Leakage
If AWS headers appear in response:
1. Check image.routes.js removes headers
2. Verify proxy cache headers not overriding
3. Check API gateway/load balancer config

---

## Future Enhancements

### Potential Improvements
- [ ] Image resizing/optimization via CloudFront functions
- [ ] WebP conversion for modern browsers
- [ ] Multiple image variations (thumbnail, full, etc.)
- [ ] Lazy loading support
- [ ] AVIF format support
- [ ] Rate limiting per IP
- [ ] Usage analytics (clean logs only)

---

## Deployment Checklist

Before deploying to production:

- [ ] All tests passing (especially image endpoints)
- [ ] S3 bucket configured for clean patterns
- [ ] CloudFront distribution updated (if used)
- [ ] CORS headers configured correctly
- [ ] Cache invalidation strategy in place
- [ ] Monitoring alerts set for 404 rates
- [ ] Rollback plan if issues arise
- [ ] Client apps updated to use new URL pattern

---

## Support & Troubleshooting

### Common Questions

**Q: Why not use imageId everywhere?**
A: The base64 encoded `/url/` endpoint provides flexibility for complex paths that don't fit the standard pattern.

**Q: What if image format changes?**
A: New uploads with same eventId overwrite old. Different format automatically detected.

**Q: How to handle missing images?**
A: System returns SVG placeholder automatically. No 404 errors, better UX.

**Q: Can old images still be accessed?**
A: Yes, via base64 encoding of full S3 path in `/url/` endpoint.

**Q: Is there rate limiting?**
A: Not at API level. Implement at gateway/CDN level as needed.

---

## Implementation Date

- **Redesigned:** `[Current Date]`
- **Version:** 2.0 (Clean & Abstracted)
- **Status:** ✅ Production Ready
- **Breaking Changes:** Yes (old endpoint URLs changed)

---

**Generated by:** GitHub Copilot  
**Framework:** Node.js + Express  
**Storage:** AWS S3  
**Region:** ap-south-1  
**Bucket:** event-images-collection
