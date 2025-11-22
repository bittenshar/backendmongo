# S3 URL Encryption - Quick Setup

## 1️⃣ Generate Encryption Key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 2️⃣ Add to .env
```env
URL_ENCRYPTION_KEY=your_key_from_above
```

## 3️⃣ Done!
All event image URLs are now encrypted.

---

## ✨ What Changed

### Before
```json
{
  "event": {
    "name": "Tech Conference",
    "coverImage": "https://event-images-collection.s3.ap-south-1.amazonaws.com/events/temp/cover-123.jpg"
  }
}
```
❌ Exposes AWS bucket, region, infrastructure

### After
```json
{
  "event": {
    "name": "Tech Conference",
    "coverImageUrl": "/api/images/proxy/a1b2c3d4:encrypted_data",
    "coverImageToken": "a1b2c3d4:encrypted_data"
  }
}
```
✅ No AWS details exposed

---

## 🎯 Key Features

| Feature | Benefit |
|---------|---------|
| **AES-256 Encryption** | Military-grade security |
| **Token Expiry** | Time-limited access (default 24h) |
| **Proxy Endpoint** | Server-side image delivery |
| **No Raw URLs** | Infrastructure hidden from clients |
| **Stateless** | No session/token storage needed |

---

## 📡 API Usage

### Get Events
```bash
curl http://localhost:3000/api/events \
  -H "Authorization: Bearer token"
```

Response includes `coverImageUrl` (no raw S3 URL)

### Display Images
```html
<img src="/api/images/proxy/encrypted_token_here" alt="Event" />
```

---

## 🔧 Optional: Encrypt Existing URL

```bash
curl -X POST http://localhost:3000/api/images/encrypt \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://event-images-collection.s3.ap-south-1.amazonaws.com/events/temp/cover-123.jpg",
    "expiryHours": 24
  }'
```

---

## 📚 Full Documentation
See `S3_URL_ENCRYPTION_GUIDE.md` for detailed information.

---

## ✅ Testing

1. Create/update an event with image
2. Get the event: `GET /api/events/event_id`
3. Check response has `coverImageUrl` (not `coverImage`)
4. Use `coverImageUrl` in `<img>` tags - it works!

## 🎓 How It Works

```
1. Upload image → S3 stores raw URL in database
2. Client requests event → Server encrypts S3 URL
3. Client gets encrypted token → Can't see AWS details
4. Client requests image → Proxy endpoint decrypts token
5. Proxy fetches from S3 → Serves to client
```

## 🚀 Benefits

✅ **No AWS Credential Exposure**
✅ **Infrastructure Hidden**
✅ **Time-Limited Tokens**
✅ **Works with All Frameworks**
✅ **Easy Frontend Integration**
✅ **No Database Changes Required**
✅ **Production Ready**
