# 🖼️ Image Retrieval Guide - Get Images by Link

Your API provides **3 secure ways** to retrieve event images. Choose based on your security needs.

---

## 📋 Quick Reference

### **Option 1: Public Access (Fastest)** ⚡
**Best for:** Public events, UI display

```
GET /api/images/public/:s3Key
```

**Example:**
```
GET /api/images/public/events/694291bb1e613c43e1b18a76/cover.jpeg
```

**Response:** Direct image stream (JPEG/PNG)

**From Event Response:**
```json
{
  "coverImageUrl": "/api/images/public/events/694291bb1e613c43e1b18a76/cover.jpeg"
}
```

---

### **Option 2: Encrypted Token (Recommended)** 🔐
**Best for:** Secure backend-to-backend communication, API chains

**Step 1: Encrypt S3 URL**
```bash
POST /api/images/encrypt-aes
Content-Type: application/json

{
  "url": "https://event-images-collection.s3.ap-south-1.amazonaws.com/events/694291bb1e613c43e1b18a76/cover.jpeg"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "encryptedToken": "q0R7n1lK9n8v4Xc2K5p9M2n8V7l3X9k...",
    "secureUrl": "/api/images/secure/q0R7n1lK9n8v4Xc2K5p9M2n8V7l3X9k...",
    "originalUrl": "https://event-images-collection.s3.ap-south-1.amazonaws.com/events/694291bb1e613c43e1b18a76/cover.jpeg",
    "message": "🔐 URL encrypted using AES-256-CBC"
  }
}
```

**Step 2: Use Encrypted URL to Serve Image**
```bash
GET /api/images/secure/q0R7n1lK9n8v4Xc2K5p9M2n8V7l3X9k...
```

**Benefits:**
- ✅ S3 URL never exposed
- ✅ Encrypted in transit
- ✅ Decryption only on backend
- ✅ Perfect for secure APIs

---

### **Option 3: Direct S3 Key** 🔓
**Best for:** Quick testing, internal use

```bash
GET /api/images/proxy?key=events/694291bb1e613c43e1b18a76/cover.jpeg
```

---

## 🔄 Complete Workflow Example

### **1. Get Events with Images**
```bash
GET http://localhost:3000/api/events
```

**Response includes:**
```json
{
  "events": [
    {
      "_id": "694291bb1e613c43e1b18a76",
      "name": "Music Festival 2024",
      "coverImageUrl": "/api/images/public/events/694291bb1e613c43e1b18a76/cover.jpeg",
      "imageLocation": {
        "bucket": "event-images-collection",
        "region": "ap-south-1",
        "s3Key": "events/694291bb1e613c43e1b18a76/cover.jpeg",
        "apiUrl": "/api/images/public/events/694291bb1e613c43e1b18a76/cover.jpeg",
        "encryptedS3Url": "q0R7n1lK9n8v4Xc..."  // Already encrypted if enabled
      }
    }
  ]
}
```

### **2. Display Image (Frontend)**
```html
<!-- Option 1: Using public endpoint -->
<img src="/api/images/public/events/694291bb1e613c43e1b18a76/cover.jpeg" alt="Event" />

<!-- Option 2: Using encrypted endpoint -->
<img src="/api/images/secure/q0R7n1lK9n8v4Xc2K5p9M2n8V7l3X9k..." alt="Event" />
```

### **3. Backend-to-Backend Communication**
```javascript
// Service A needs to proxy image to Service B
const eventResponse = await fetch('/api/events/694291bb1e613c43e1b18a76');
const event = await eventResponse.json();

// Already has encrypted URL from backend
const secureImageUrl = `https://yourapi.com${event.data.event.imageLocation.apiUrl}`;

// or use encrypted S3 URL for extra security
const secureImageUrl = `https://yourapi.com/api/images/secure/${event.data.event.imageLocation.encryptedS3Url}`;

// Forward to another service
await forwardToOtherService({
  eventId: event.data.event._id,
  imageUrl: secureImageUrl  // Never expose raw S3 URL
});
```

---

## 🛠️ Implementation Examples

### **Node.js/Express - Get and Transform Image**
```javascript
const axios = require('axios');

async function getEventImageWithEncryption(eventId) {
  try {
    // 1. Get event with imageLocation
    const eventRes = await axios.get(`http://localhost:3000/api/events/${eventId}`);
    const event = eventRes.data.data.event;
    
    // 2. Use encrypted URL (already provided in response)
    const imageUrl = `/api/images/secure/${event.imageLocation.encryptedS3Url}`;
    
    // 3. Fetch image
    const imageRes = await axios.get(`http://localhost:3000${imageUrl}`, {
      responseType: 'stream'
    });
    
    return imageRes.data; // Stream image
  } catch (error) {
    console.error('❌ Error fetching image:', error.message);
  }
}

// Usage
app.get('/event/:id/image', async (req, res) => {
  const imageStream = await getEventImageWithEncryption(req.params.id);
  imageStream.pipe(res);
});
```

### **React - Display Event Image**
```jsx
import React, { useState, useEffect } from 'react';

function EventCard({ eventId }) {
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvent() {
      try {
        const response = await fetch(`/api/events/${eventId}`);
        const data = await response.json();
        const event = data.data.event;
        
        // Use the public endpoint for UI (simplest approach)
        setImageUrl(event.coverImageUrl);
        
        // Or use encrypted endpoint for extra security
        // setImageUrl(`/api/images/secure/${event.imageLocation.encryptedS3Url}`);
      } catch (error) {
        console.error('Error loading event:', error);
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [eventId]);

  return (
    <div className="event-card">
      {loading ? (
        <div>Loading...</div>
      ) : (
        <img src={imageUrl} alt="Event Cover" />
      )}
    </div>
  );
}

export default EventCard;
```

### **Flutter/Mobile - Get Image**
```dart
Future<Uint8List> getEventImage(String eventId) async {
  try {
    // 1. Fetch event
    final eventResponse = await http.get(
      Uri.parse('http://api.example.com/api/events/$eventId'),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (eventResponse.statusCode == 200) {
      final eventData = jsonDecode(eventResponse.body);
      final imageUrl = eventData['data']['event']['coverImageUrl'];

      // 2. Fetch image using public endpoint
      final imageResponse = await http.get(
        Uri.parse('http://api.example.com${imageUrl}'),
      );

      if (imageResponse.statusCode == 200) {
        return imageResponse.bodyBytes;
      }
    }
  } catch (e) {
    print('Error: $e');
  }
  return null;
}

// Usage
Image.memory(
  await getEventImage('694291bb1e613c43e1b18a76'),
  fit: BoxFit.cover,
)
```

---

## 🔐 Security Comparison

| Feature | Public | Encrypted Token | Direct S3 Key |
|---------|--------|-----------------|---------------|
| **Speed** | ⚡ Fastest | ⚡ Fast | ⚡⚡ Fastest |
| **Security** | 🔓 None | 🔐 High | 🔓 None |
| **S3 URL Visible** | ❌ No | ❌ No | ✅ Yes |
| **Best For** | UI/Frontend | Backend APIs | Internal/Testing |
| **Rate Limiting** | ✅ Easy | ✅ Easy | ❌ Hard |
| **Caching** | ✅ Public Cache | ✅ Private Cache | ✅ Public Cache |

---

## 📊 Configuration in .env

```env
# S3 Configuration
AWS_S3_BUCKET=event-images-collection
AWS_EVENT_IMAGES_BUCKET=event-images-collection
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# Encryption Configuration
URL_SECRET=your_secret_key_for_encryption
```

---

## ✅ Testing Image Endpoints

### **Using cURL**

1. **Encrypt an S3 URL:**
```bash
curl -X POST http://localhost:3000/api/images/encrypt-aes \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://event-images-collection.s3.ap-south-1.amazonaws.com/events/694291bb1e613c43e1b18a76/cover.jpeg"
  }'
```

2. **Fetch image using encrypted token:**
```bash
curl http://localhost:3000/api/images/secure/q0R7n1lK9n8v4Xc... \
  --output image.jpg
```

3. **Fetch image using public endpoint:**
```bash
curl http://localhost:3000/api/images/public/events/694291bb1e613c43e1b18a76/cover.jpeg \
  --output image.jpg
```

4. **Health check:**
```bash
curl http://localhost:3000/api/images/health
```

---

## 🚀 Best Practices

✅ **DO:**
- Use `/api/images/public/*` for frontend UI (cached by CDN)
- Use `/api/images/secure/:encryptedToken` for backend APIs
- Store encrypted URLs in database, not raw S3 URLs
- Enable CORS only for trusted domains
- Use Redis caching for encrypted URLs

❌ **DON'T:**
- Expose raw S3 URLs to frontend
- Store S3 credentials in frontend
- Skip HTTPS in production
- Disable encryption for sensitive content
- Cache encrypted URLs forever

---

## 🐛 Troubleshooting

### **Image returns 404**
```javascript
// Check S3 key format
console.log('S3 Key:', event.s3ImageKey);  // Should be: events/694291bb1e613c43e1b18a76/cover.jpeg
console.log('Bucket:', process.env.AWS_EVENT_IMAGES_BUCKET);
```

### **Encryption fails**
```javascript
// Ensure URL_SECRET is set
if (!process.env.URL_SECRET) {
  console.warn('⚠️ URL_SECRET not set, using default (INSECURE)');
}
```

### **CORS errors**
```javascript
// Add to your Express app
app.use(cors({
  origin: ['http://localhost:3000', 'https://yourdomain.com'],
  credentials: true
}));
```

---

## 📞 Summary

**Your API provides ready-to-use image retrieval methods:**

1. **For UI:** Use `/api/images/public/:s3Key` (already in event response as `coverImageUrl`)
2. **For APIs:** Use `/api/images/secure/:encryptedToken` (encrypted in response)
3. **For Direct S3:** Use `/api/images/proxy?key=:s3Key` (for testing)

**All configured and ready to use!** 🎉
