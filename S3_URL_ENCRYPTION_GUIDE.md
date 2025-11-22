# S3 URL Encryption & Hiding Guide

## Overview
This guide explains how to encrypt and hide AWS S3 URLs to protect your infrastructure details.

## Problem
Raw S3 URLs expose sensitive AWS infrastructure:
```
https://event-images-collection.s3.ap-south-1.amazonaws.com/events/temp/cover-f8cc724d-a19e-4674-9448-4b0e9c3ab36d.jpg
```

This reveals:
- AWS bucket name: `event-images-collection`
- AWS region: `ap-south-1`
- S3 infrastructure details

## Solution
We've implemented URL encryption that:
- ✅ Encrypts S3 URLs with AES-256 encryption
- ✅ Returns opaque tokens instead of raw URLs
- ✅ Provides proxy endpoint to serve images securely
- ✅ Generates time-limited tokens for temporary sharing
- ✅ Hides all AWS infrastructure details from clients

---

## Setup

### 1. Generate Encryption Key
Run this command to generate a secure encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Add to `.env` file
Add the generated key to your environment:
```env
URL_ENCRYPTION_KEY=your_generated_key_here
```

---

## How It Works

### Architecture
```
User Request
    ↓
API Endpoint (e.g., /api/events/123)
    ↓
Controller processes request
    ↓
transformEventResponse() encrypts S3 URL
    ↓
Client receives encrypted token instead of raw URL
    ↓
Client calls /api/images/proxy/{token}
    ↓
Proxy decrypts token → fetches from S3 → serves to client
```

### Response Example
**Before (with raw S3 URL):**
```json
{
  "status": "success",
  "data": {
    "event": {
      "id": "123",
      "name": "Tech Conference",
      "coverImage": "https://event-images-collection.s3.ap-south-1.amazonaws.com/events/temp/cover-f8cc724d-a19e-4674-9448-4b0e9c3ab36d.jpg"
    }
  }
}
```

**After (with encrypted token):**
```json
{
  "status": "success",
  "data": {
    "event": {
      "id": "123",
      "name": "Tech Conference",
      "coverImageUrl": "/api/images/proxy/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6:encrypted_data_here",
      "coverImageToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6:encrypted_data_here"
    }
  }
}
```

---

## API Endpoints

### 1. Get Events (with encrypted images)
```bash
GET /api/events
Authorization: Bearer {token}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "events": [
      {
        "id": "event123",
        "name": "Tech Conference",
        "coverImageUrl": "/api/images/proxy/encrypted_token_here",
        "coverImageToken": "encrypted_token_here"
      }
    ]
  }
}
```

### 2. Fetch Image via Proxy
```bash
GET /api/images/proxy/{encrypted_token}
```

Returns the actual image with proper headers (no AWS details exposed).

### 3. Encrypt a URL (Admin)
```bash
POST /api/images/encrypt
Content-Type: application/json

{
  "url": "https://event-images-collection.s3.ap-south-1.amazonaws.com/events/temp/cover-f8cc724d-a19e-4674-9448-4b0e9c3ab36d.jpg",
  "expiryHours": 24
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6:encrypted_data",
    "expiryHours": 24,
    "proxyUrl": "/api/images/proxy/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6:encrypted_data"
  }
}
```

### 4. Decrypt a Token (Admin/Internal)
```bash
POST /api/images/decrypt
Content-Type: application/json

{
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6:encrypted_data"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "url": "https://event-images-collection.s3.ap-south-1.amazonaws.com/events/temp/cover-f8cc724d-a19e-4674-9448-4b0e9c3ab36d.jpg",
    "valid": true
  }
}
```

### 5. Image Service Health
```bash
GET /api/images/health
```

---

## Frontend Integration

### Using Encrypted Image URLs
```javascript
// Fetch event
const response = await fetch('/api/events/123');
const { data } = await response.json();
const event = data.event;

// Use the encrypted URL directly
const imageUrl = event.coverImageUrl; // e.g., /api/images/proxy/token...

// In HTML
<img src={imageUrl} alt={event.name} />

// In fetch
const imageResponse = await fetch(imageUrl);
const imageBlob = await imageResponse.blob();
```

### Example with React
```jsx
import React, { useEffect, useState } from 'react';

function EventCard() {
  const [event, setEvent] = useState(null);

  useEffect(() => {
    fetch('/api/events/123')
      .then(res => res.json())
      .then(data => setEvent(data.data.event));
  }, []);

  if (!event) return <p>Loading...</p>;

  return (
    <div>
      <h2>{event.name}</h2>
      {/* Use encrypted URL - no AWS details exposed */}
      <img 
        src={event.coverImageUrl} 
        alt={event.name}
        style={{ maxWidth: '100%' }}
      />
    </div>
  );
}

export default EventCard;
```

---

## Security Features

### 1. AES-256 Encryption
- Military-grade encryption
- 32-byte encryption key
- Random IV (initialization vector) for each encryption

### 2. Token Expiry
- Tokens expire after specified duration (default: 24 hours)
- Expired tokens cannot be decrypted
- Configurable expiry per token

### 3. AWS Credential Isolation
- S3 credentials never exposed to client
- Image fetching happens server-side in proxy endpoint
- Clients only receive opaque tokens

### 4. No Raw URL Exposure
- Database stores encrypted URLs
- API responses never contain raw S3 URLs
- Even database breaches won't expose AWS infrastructure

---

## Database Changes

The event collection now stores:
```javascript
{
  _id: ObjectId,
  name: "Tech Conference",
  // Original S3 URL (internal use only)
  coverImage: "https://...",
  // S3 key for deletion
  s3ImageKey: "events/temp/cover-...",
  // Other fields...
}
```

When returned to client:
- `coverImage` is removed
- `coverImageUrl` contains proxy endpoint with token
- `coverImageToken` contains encrypted token

---

## Advanced Usage

### Generate Time-Limited Share Links
```javascript
const urlEncryption = require('./shared/services/urlEncryption.service');

// Generate 1-hour expiry token
const token = urlEncryption.generateImageToken(s3Url, 1);

// Create shareable link
const shareLink = `https://yourapp.com/api/images/proxy/${token}`;
```

### Validate Token
```javascript
const urlEncryption = require('./shared/services/urlEncryption.service');

const result = urlEncryption.verifyImageToken(token);

if (result.valid) {
  console.log('URL:', result.url);
} else {
  console.log('Error:', result.message);
}
```

### Hash URL (for comparison)
```javascript
const urlEncryption = require('./shared/services/urlEncryption.service');

const hash = urlEncryption.hashUrl(s3Url);
// Use hash to quickly compare/find URLs
```

---

## Performance Considerations

### Caching
The proxy endpoint includes cache headers:
```
Cache-Control: public, max-age=31536000
```
Images are cached for 1 year on client/CDN.

### Token Generation
- Tokens are generated on-the-fly in API responses
- No database storage of tokens required
- Stateless - can be validated without server state

### Proxy Performance
- Direct stream from S3 to client
- No buffering in memory
- AWS CloudFront CDN can cache proxy responses

---

## Troubleshooting

### Token Expired Error
```
"message": "Token has expired"
```
**Solution:** Generate new token with `generateImageToken()`

### Invalid Token Format
```
"message": "Invalid token format"
```
**Solution:** Ensure token includes both IV and encrypted data separated by `:`

### Encryption Key Not Set
**Solution:** Set `URL_ENCRYPTION_KEY` in `.env`:
```bash
URL_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### S3 Access Denied
**Solution:** Ensure S3 bucket policy allows the AWS credentials in `.env`

---

## Migration Guide

If you have existing raw S3 URLs in database:

### Step 1: Update Schema
Keep both fields temporarily:
```javascript
{
  coverImage: String,      // Raw S3 URL (internal)
  coverImageToken: String  // Encrypted token
}
```

### Step 2: Gradual Migration
```javascript
const Event = require('./event.model');
const urlEncryption = require('./shared/services/urlEncryption.service');

// Batch update events with encrypted tokens
const events = await Event.find({ coverImageToken: { $exists: false } });

for (let event of events) {
  if (event.coverImage) {
    const token = urlEncryption.generateImageToken(event.coverImage, 24);
    await Event.updateOne(
      { _id: event._id },
      { coverImageToken: token }
    );
  }
}
```

### Step 3: Update Controllers
Controllers already updated to use encryption automatically.

### Step 4: Remove Raw URLs (Optional)
After migration complete and verified:
```javascript
// Remove raw URLs from responses/database
await Event.updateMany({}, { $unset: { coverImage: 1 } });
```

---

## Best Practices

1. **Always use encrypted URLs in API responses**
   - Never return raw S3 URLs to client

2. **Rotate encryption key periodically**
   - Store in secure environment variable
   - Update .env and restart server

3. **Set appropriate token expiry**
   - 1-hour for temporary shares
   - 24-hour for regular API responses
   - 7-day for special situations

4. **Monitor proxy endpoint**
   - Track usage in logs
   - Alert on unusual patterns

5. **Use HTTPS in production**
   - Encrypted URLs are meaningless over HTTP

6. **Secure your encryption key**
   - Use AWS Secrets Manager / Vault
   - Never commit to git
   - Rotate regularly

---

## Testing

### Test Encryption/Decryption
```bash
# Test encrypt endpoint
curl -X POST http://localhost:3000/api/images/encrypt \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://event-images-collection.s3.ap-south-1.amazonaws.com/events/temp/test.jpg",
    "expiryHours": 24
  }'

# Response will contain token
# Use token in proxy URL
curl http://localhost:3000/api/images/proxy/{token}
```

### Test Event API
```bash
# Get event (should have encrypted image URL)
curl http://localhost:3000/api/events/123 \
  -H "Authorization: Bearer your_token"
```

---

## Files Modified

- `src/shared/services/urlEncryption.service.js` - Encryption service
- `src/features/images/image.routes.js` - Proxy endpoints
- `src/features/events/event.controller.js` - Updated to use encryption
- `src/server.js` - Registered image routes
- `src/config/config.env` - Added URL_ENCRYPTION_KEY

---

## Additional Resources

- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [AES-256 Encryption Guide](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard)
- [AWS S3 Security Best Practices](https://docs.aws.amazon.com/s3/latest/userguide/security.html)
