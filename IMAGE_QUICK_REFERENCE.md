# 🖼️ GET IMAGE BY LINK - QUICK START

## ⚡ 3-Second Answer: How to Get Images

Your event response has **coverImageUrl** - that's your link:

```json
{
  "event": {
    "_id": "694291bb1e613c43e1b18a76",
    "name": "Music Festival 2024",
    "coverImageUrl": "/api/images/public/events/694291bb1e613c43e1b18a76/cover.jpeg"
  }
}
```

**Use it directly in HTML:**
```html
<img src="/api/images/public/events/694291bb1e613c43e1b18a76/cover.jpeg" />
```

🎉 **Done!** Your image appears.

---

## 🚀 Available Image Endpoints

### **1. Public Endpoint (Fastest)** ⚡
```
GET /api/images/public/:s3Key
```
**Example:**
```bash
GET /api/images/public/events/694291bb1e613c43e1b18a76/cover.jpeg
```
**Response:** Image stream (JPEG/PNG)

### **2. Secure Endpoint (Encrypted)** 🔐
```
GET /api/images/secure/:encryptedToken
```
**Example:**
```bash
GET /api/images/secure/q0R7n1lK9n8v4Xc2K5p9M2n8V7l3X9k...
```
**Response:** Encrypted image (AES-256-CBC decrypted on backend)

### **3. Direct S3 Key** 🔓
```
GET /api/images/proxy?key=:s3Key
```
**Example:**
```bash
GET /api/images/proxy?key=events/694291bb1e613c43e1b18a76/cover.jpeg
```

---

## 🛠️ How to Encrypt S3 URL

**POST Request to:** `POST /api/images/encrypt-aes`

```bash
curl -X POST http://localhost:3000/api/images/encrypt-aes \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://event-images-collection.s3.ap-south-1.amazonaws.com/events/694291bb1e613c43e1b18a76/cover.jpeg"
  }'
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "encryptedToken": "q0R7n1lK9n8v4Xc2K5p9...",
    "secureUrl": "/api/images/secure/q0R7n1lK9n8v4Xc2K5p9...",
    "message": "🔐 URL encrypted using AES-256-CBC"
  }
}
```

---

## 💻 Quick Code Examples

### **JavaScript/Node.js**
```javascript
// Simple: Get event and use image URL
const response = await fetch('/api/events/694291bb1e613c43e1b18a76');
const event = await response.json();
const imageUrl = event.data.event.coverImageUrl;

// Use it
document.querySelector('img').src = imageUrl;
```

### **React**
```jsx
// Hook to fetch event with image
const [event, setEvent] = useState(null);

useEffect(() => {
  fetch('/api/events/694291bb1e613c43e1b18a76')
    .then(r => r.json())
    .then(data => setEvent(data.data.event));
}, []);

return event ? <img src={event.coverImageUrl} /> : <div>Loading...</div>;
```

### **HTML**
```html
<!-- Direct image display -->
<img src="/api/images/public/events/694291bb1e613c43e1b18a76/cover.jpeg" alt="Event" />

<!-- Or from event response -->
<img id="eventImage" />
<script>
  fetch('/api/events/694291bb1e613c43e1b18a76')
    .then(r => r.json())
    .then(data => {
      document.getElementById('eventImage').src = data.data.event.coverImageUrl;
    });
</script>
```

### **Python**
```python
import requests

# Get event
event = requests.get('http://localhost:3000/api/events/694291bb1e613c43e1b18a76').json()
image_url = event['data']['event']['coverImageUrl']

# Fetch image
image_data = requests.get(f'http://localhost:3000{image_url}').content

# Save
with open('image.jpg', 'wb') as f:
    f.write(image_data)
```

---

## 🔍 What's Happening Behind the Scenes

```
┌─────────────────────────────────────────────────────────┐
│  YOUR REQUEST                                           │
│  GET /api/images/public/events/.../cover.jpeg         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  API ENDPOINT                                           │
│  /api/images/public/*                                  │
│  ├─ Extracts S3 key from URL                           │
│  ├─ Constructs S3 URL                                  │
│  └─ Fetches from S3                                    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  AWS S3                                                 │
│  Bucket: event-images-collection                       │
│  Key: events/694291bb.../cover.jpeg                    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  IMAGE STREAM                                           │
│  Content-Type: image/jpeg                              │
│  Content-Length: 142,589 bytes                         │
│  Cache-Control: public, max-age=31536000               │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Testing Checklist

```bash
# 1. Check health
curl http://localhost:3000/api/images/health

# 2. Get events
curl http://localhost:3000/api/events?limit=1

# 3. Get image (using URL from event response)
curl http://localhost:3000/api/images/public/events/ID/cover.jpeg -o image.jpg

# 4. Encrypt URL
curl -X POST http://localhost:3000/api/images/encrypt-aes \
  -H "Content-Type: application/json" \
  -d '{"url":"https://..."}'

# 5. Get encrypted image
curl http://localhost:3000/api/images/secure/TOKEN -o image.jpg
```

---

## 🔐 Security Levels

| Level | Method | URL Visible? | Best For |
|-------|--------|-------------|----------|
| **Fast** | `/public/:key` | ❌ No (hidden in path) | Frontend UI |
| **Secure** | `/secure/:encrypted` | ❌ No (double encrypted) | APIs/Microservices |
| **Testing** | `/proxy?key=:key` | ✅ Yes | Development only |

---

## 🐛 Common Issues & Fixes

### ❌ Image returns 404
```javascript
// Check if s3ImageKey exists
console.log(event.s3ImageKey);  // Should not be empty

// Verify environment variables
console.log(process.env.AWS_EVENT_IMAGES_BUCKET);  // Should be 'event-images-collection'
```

### ❌ CORS Error when accessing from browser
```javascript
// Add to your Express app
app.use(cors({
  origin: ['http://localhost:3000', 'https://yourdomain.com'],
  credentials: true
}));
```

### ❌ Encryption fails
```javascript
// Ensure URL_SECRET is set in .env
URL_SECRET=your_secret_key  // At least 32 characters
```

---

## 📋 File Reference

| File | Purpose |
|------|---------|
| [IMAGE_RETRIEVAL_GUIDE.md](IMAGE_RETRIEVAL_GUIDE.md) | Comprehensive guide with examples |
| [src/shared/helpers/imageHelper.js](src/shared/helpers/imageHelper.js) | Ready-to-use functions |
| [src/shared/helpers/imageExamples.js](src/shared/helpers/imageExamples.js) | 12 implementation examples |
| [testImageRetrieval.js](testImageRetrieval.js) | Automated test script |
| [src/features/images/image.routes.js](src/features/images/image.routes.js) | API endpoints |
| [src/shared/services/urlEncryption2.service.js](src/shared/services/urlEncryption2.service.js) | Encryption logic |

---

## 🚀 One-Liner to Get Started

```bash
# Test everything in one command
node testImageRetrieval.js
```

---

## 📞 API Summary

```javascript
// 🎯 Quick API Reference

// Get event with image
GET /api/events/:eventId
// Returns: { coverImageUrl: "/api/images/public/..." }

// Display image
GET /api/images/public/:s3Key
// Returns: Image stream

// Encrypt S3 URL
POST /api/images/encrypt-aes
// Body: { url: "https://..." }
// Returns: { encryptedToken: "...", secureUrl: "..." }

// Access encrypted image
GET /api/images/secure/:encryptedToken
// Returns: Image stream (decrypted on backend)

// Health check
GET /api/images/health
// Returns: { status: "success", message: "..." }
```

---

## 🎓 What You Now Have

✅ **3 ways to get images:**
1. Public endpoint (fastest)
2. Encrypted endpoint (most secure)
3. Direct S3 key (for testing)

✅ **Ready-to-use helpers:**
- `imageHelper.getEventImage()`
- `imageHelper.getPublicImageUrl()`
- `imageHelper.getSecureImageUrl()`
- `imageHelper.encryptImageUrl()`
- 20+ more functions

✅ **12 implementation examples** for:
- React, Node.js, Flutter, HTML
- Express routes, middleware
- Batch operations, PDFs, downloads

✅ **Automated testing** to verify everything works

✅ **Complete documentation** with use cases

---

## 🎉 Next Steps

1. **Display an image:** Use the simple HTML/JS example above
2. **Encrypt a URL:** Run the encrypt-aes endpoint
3. **Build a route:** Copy from imageExamples.js
4. **Test everything:** Run `node testImageRetrieval.js`
5. **Read more:** Check IMAGE_RETRIEVAL_GUIDE.md for deep dive

---

**Your images are ready to go!** 🚀
