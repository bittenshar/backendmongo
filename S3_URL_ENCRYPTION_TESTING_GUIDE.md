# S3 URL Encryption - Testing & Verification Guide

## Pre-Implementation Checklist

- [ ] Node.js version >= 10
- [ ] Express.js server running
- [ ] MongoDB connected
- [ ] AWS S3 credentials configured
- [ ] `axios` package installed

---

## Setup Verification

### 1. Verify Files Created

```bash
# Check all new files exist
ls -la src/shared/services/urlEncryption.service.js
ls -la src/features/images/image.routes.js
ls -la S3_URL_ENCRYPTION*.md

# Output should show all files exist
```

### 2. Check .env Configuration

```bash
# Verify encryption key is set
grep URL_ENCRYPTION_KEY src/config/config.env

# If not set, generate and add:
node -e "console.log('URL_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Verify Server Updates

```bash
# Check server.js has image routes
grep -n "imageRoutes\|image.routes" src/server.js

# Should show the import and route registration
```

---

## Manual Testing

### Test 1: Start Server with New Configuration

```bash
# Terminal 1: Start server
npm start

# Expected output:
# Environment check:
# ...
# Server running on port 3000
```

### Test 2: Health Check Endpoint

```bash
# Terminal 2: Test health endpoint
curl http://localhost:3000/api/images/health

# Expected response:
# {
#   "status": "success",
#   "message": "Image service is running"
# }
```

### Test 3: Encrypt URL Endpoint

```bash
# Test encryption
curl -X POST http://localhost:3000/api/images/encrypt \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://event-images-collection.s3.ap-south-1.amazonaws.com/events/temp/test-123.jpg",
    "expiryHours": 24
  }'

# Expected response:
# {
#   "status": "success",
#   "data": {
#     "token": "a1b2c3d4e5f6g7h8:encrypted_data_here",
#     "expiryHours": 24,
#     "proxyUrl": "/api/images/proxy/a1b2c3d4e5f6g7h8:encrypted_data_here"
#   }
# }
```

### Test 4: Decrypt Token Endpoint

```bash
# Test decryption (use token from Test 3)
curl -X POST http://localhost:3000/api/images/decrypt \
  -H "Content-Type: application/json" \
  -d '{
    "token": "a1b2c3d4e5f6g7h8:encrypted_data_here"
  }'

# Expected response:
# {
#   "status": "success",
#   "data": {
#     "url": "https://event-images-collection.s3.ap-south-1.amazonaws.com/events/temp/test-123.jpg",
#     "valid": true
#   }
# }
```

### Test 5: Create Event with Image

```bash
# Get authentication token first
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'

# Copy the token from response

# Create event with image
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=Test Event" \
  -F "description=A test event" \
  -F "date=2025-12-01" \
  -F "startTime=09:00" \
  -F "endTime=18:00" \
  -F "location=Test Location" \
  -F "organizer=ORG_ID" \
  -F "totalTickets=100" \
  -F "ticketPrice=50" \
  -F "coverImage=@/path/to/image.jpg"

# Expected response should NOT contain raw S3 URL
# Should have coverImageUrl instead
```

### Test 6: Retrieve Event and Check URL Format

```bash
# Get the event ID from Test 5 response
EVENT_ID="event_id_from_response"

# Get event
curl http://localhost:3000/api/events/$EVENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN" | jq

# Verify response format
# ✓ Should have "coverImageUrl" field
# ✓ Should NOT have "coverImage" field
# ✓ coverImageUrl should start with "/api/images/proxy/"
# ✓ coverImageUrl should contain ":" separator (IV:encrypted)
```

---

## Automated Testing

### Using Node.js Test Script

```javascript
// test/encryption.test.js
const assert = require('assert');
const axios = require('axios');
const urlEncryption = require('../src/shared/services/urlEncryption.service');

const BASE_URL = 'http://localhost:3000/api';

describe('URL Encryption', () => {
  
  it('should encrypt and decrypt URLs', () => {
    const url = 'https://bucket.s3.ap-south-1.amazonaws.com/test.jpg';
    const token = urlEncryption.generateImageToken(url, 24);
    
    assert(token, 'Token should be generated');
    assert(token.includes(':'), 'Token should contain IV:encrypted format');
    
    const result = urlEncryption.verifyImageToken(token);
    assert(result.valid, 'Token should be valid');
    assert.strictEqual(result.url, url, 'Decrypted URL should match original');
  });

  it('should generate unique tokens for same URL', () => {
    const url = 'https://bucket.s3.ap-south-1.amazonaws.com/test.jpg';
    const token1 = urlEncryption.generateImageToken(url, 24);
    const token2 = urlEncryption.generateImageToken(url, 24);
    
    assert.notStrictEqual(token1, token2, 'Tokens should be unique due to random IV');
  });

  it('should reject expired tokens', () => {
    const url = 'https://bucket.s3.ap-south-1.amazonaws.com/test.jpg';
    
    // Create token that expires immediately
    const token = urlEncryption.generateImageToken(url, 0);
    
    // Wait a bit
    setTimeout(() => {
      const result = urlEncryption.verifyImageToken(token);
      assert(!result.valid, 'Expired token should be invalid');
    }, 100);
  });

  it('should have health endpoint', async () => {
    const response = await axios.get(`${BASE_URL}/images/health`);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.data.status, 'success');
  });

  it('should encrypt URL via API', async () => {
    const url = 'https://bucket.s3.ap-south-1.amazonaws.com/test.jpg';
    
    const response = await axios.post(`${BASE_URL}/images/encrypt`, {
      url,
      expiryHours: 24
    });
    
    assert.strictEqual(response.status, 200);
    assert(response.data.data.token, 'Should return token');
    assert(response.data.data.proxyUrl, 'Should return proxy URL');
  });

  it('should decrypt URL via API', async () => {
    const url = 'https://bucket.s3.ap-south-1.amazonaws.com/test.jpg';
    const token = urlEncryption.generateImageToken(url, 24);
    
    const response = await axios.post(`${BASE_URL}/images/decrypt`, {
      token
    });
    
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.data.data.url, url);
    assert(response.data.data.valid, 'Token should be valid');
  });

  it('should reject invalid tokens', async () => {
    try {
      await axios.post(`${BASE_URL}/images/decrypt`, {
        token: 'invalid_token'
      });
      assert.fail('Should have thrown error');
    } catch (error) {
      assert.strictEqual(error.response.status, 401);
    }
  });
});
```

Run tests:
```bash
npm test -- test/encryption.test.js
```

---

## Integration Testing

### Full Event Lifecycle Test

```bash
#!/bin/bash
# test/full-flow.sh

BASE_URL="http://localhost:3000/api"
AUTH_TOKEN="your_token_here"

echo "🔍 Testing Full Encryption Flow..."

# 1. Get initial event count
echo "1️⃣ Getting initial events..."
INITIAL_COUNT=$(curl -s $BASE_URL/events \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.results')
echo "Initial count: $INITIAL_COUNT"

# 2. Create event with image
echo "2️⃣ Creating event with image..."
EVENT_RESPONSE=$(curl -s -X POST $BASE_URL/events \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "name=Test Event" \
  -F "description=Test" \
  -F "date=2025-12-01" \
  -F "startTime=09:00" \
  -F "endTime=18:00" \
  -F "location=Test" \
  -F "organizer=123" \
  -F "totalTickets=100" \
  -F "ticketPrice=50" \
  -F "coverImage=@test-image.jpg")

EVENT_ID=$(echo $EVENT_RESPONSE | jq -r '.data.event._id')
echo "Created event: $EVENT_ID"

# 3. Verify event has encrypted URL
echo "3️⃣ Checking event has encrypted URL..."
EVENT=$(curl -s $BASE_URL/events/$EVENT_ID \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.data.event')

COVER_IMAGE=$(echo $EVENT | jq -r '.coverImage')
COVER_IMAGE_URL=$(echo $EVENT | jq -r '.coverImageUrl')

if [ "$COVER_IMAGE" == "null" ]; then
  echo "✅ Raw S3 URL removed from response"
else
  echo "❌ Raw S3 URL still present!"
  exit 1
fi

if [[ $COVER_IMAGE_URL == /api/images/proxy/* ]]; then
  echo "✅ Encrypted proxy URL present: $COVER_IMAGE_URL"
else
  echo "❌ Proxy URL not in correct format!"
  exit 1
fi

# 4. Test image proxy endpoint
echo "4️⃣ Testing image proxy..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:3000$COVER_IMAGE_URL")

if [ "$HTTP_CODE" -eq "200" ]; then
  echo "✅ Image proxy returns 200"
else
  echo "❌ Image proxy returned $HTTP_CODE"
  exit 1
fi

# 5. Get event list and verify all have encrypted URLs
echo "5️⃣ Checking all events in list have encrypted URLs..."
EVENTS=$(curl -s $BASE_URL/events \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.data.events')

ENCRYPTED_COUNT=$(echo $EVENTS | jq '[.[] | select(.coverImageUrl | startswith("/api/images/proxy/"))] | length')
echo "Events with encrypted URLs: $ENCRYPTED_COUNT"

echo ""
echo "✅ All tests passed! Encryption is working correctly."
```

Run:
```bash
chmod +x test/full-flow.sh
./test/full-flow.sh
```

---

## Performance Testing

### Load Testing Encryption

```javascript
// test/performance.js
const urlEncryption = require('../src/shared/services/urlEncryption.service');

console.time('1000 Encryptions');
for (let i = 0; i < 1000; i++) {
  const url = `https://bucket.s3.ap-south-1.amazonaws.com/image-${i}.jpg`;
  urlEncryption.generateImageToken(url, 24);
}
console.timeEnd('1000 Encryptions');

console.time('1000 Decryptions');
const tokens = [];
for (let i = 0; i < 1000; i++) {
  const url = `https://bucket.s3.ap-south-1.amazonaws.com/image-${i}.jpg`;
  tokens.push(urlEncryption.generateImageToken(url, 24));
}

for (let token of tokens) {
  urlEncryption.verifyImageToken(token);
}
console.timeEnd('1000 Decryptions');
```

Run:
```bash
node test/performance.js
```

Expected output:
```
1000 Encryptions: ~500ms
1000 Decryptions: ~450ms
```

---

## Frontend Testing

### React Component Test

```jsx
// test/EventCard.test.jsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import EventCard from '../src/components/EventCard';

jest.mock('axios');

describe('EventCard', () => {
  it('should display event with encrypted image URL', async () => {
    const mockEvent = {
      _id: '123',
      name: 'Test Event',
      coverImageUrl: '/api/images/proxy/encrypted_token_here'
    };

    render(<EventCard eventId="123" />);

    await waitFor(() => {
      const img = screen.getByAltText('Test Event');
      expect(img.src).toContain('/api/images/proxy/');
      expect(img.src).not.toContain('s3.amazonaws.com');
    });
  });
});
```

---

## Debugging Checklist

### Issue: Images Not Showing

```javascript
// Debug: Check what URLs are returned
fetch('/api/events/123')
  .then(r => r.json())
  .then(data => {
    console.log('Event:', data);
    console.log('Image URL:', data.data.event.coverImageUrl);
    console.log('Image URL format correct?', 
      data.data.event.coverImageUrl.startsWith('/api/images/proxy/'));
  });
```

### Issue: Proxy Returns 404

```bash
# Check if route is registered
curl http://localhost:3000/api/images/health

# Check if token format is correct
# Token should be: IV:EncryptedData
# Example: a1b2c3d4:encrypted...

# Verify server logs for decryption errors
```

### Issue: Encryption Key Issues

```bash
# Verify key is set
echo $URL_ENCRYPTION_KEY

# Verify key length (must be 32 bytes)
node -e "console.log(process.env.URL_ENCRYPTION_KEY.length)"
# Should output: 64 (hex encoding is 2 chars per byte)

# Regenerate if needed
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Monitoring & Logging

### Add Logging to Track Usage

```javascript
// Add to image.routes.js
router.get('/proxy/:token', (req, res, next) => {
  const start = Date.now();
  
  console.log({
    timestamp: new Date().toISOString(),
    endpoint: '/api/images/proxy',
    token: req.params.token.substring(0, 20) + '...',
    userAgent: req.get('user-agent')
  });

  // ... rest of handler
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`Proxy request completed in ${duration}ms`);
  });
});
```

### Set Up Alerts

```javascript
// Alert if image proxy is slow
router.get('/proxy/:token', (req, res, next) => {
  const start = Date.now();
  
  // ... handler code
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`⚠️ Slow image proxy: ${duration}ms`);
      // Send alert to monitoring service
    }
  });
});
```

---

## Verification Checklist

- [ ] Server starts without errors
- [ ] `/api/images/health` returns 200
- [ ] Encryption endpoint works
- [ ] Decryption endpoint works
- [ ] Events return encrypted URLs
- [ ] Events don't return raw S3 URLs
- [ ] Image proxy endpoint works
- [ ] Images display correctly in browser
- [ ] Token format is correct (IV:encrypted)
- [ ] Expired tokens are rejected
- [ ] Encryption is unique each time
- [ ] No AWS details in API responses
- [ ] Browser network tab shows no S3 URLs
- [ ] Performance is acceptable (~1ms per encryption)

---

## Rollback Procedure

If issues occur, rollback is simple:

```bash
# 1. Revert code changes
git checkout src/features/events/event.controller.js
git checkout src/server.js

# 2. Remove .env encryption key (optional)
# vim src/config/config.env

# 3. Restart server
npm start

# 4. Verify original behavior works
curl http://localhost:3000/api/events/123 \
  -H "Authorization: Bearer token"
```

Server will automatically return raw S3 URLs as before.

---

**Testing Complete!** ✅
