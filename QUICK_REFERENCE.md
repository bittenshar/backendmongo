# Quick Reference Card - FaceId Auto-Extraction

## 🎯 Mission: Automatically Extract FaceId from API

### ✅ COMPLETED

You can now:
1. **Check if user has face record** ✅
2. **Automatically extract faceId** ✅
3. **Use faceId in next API call** ✅

---

## 📍 Three Endpoints

| # | Endpoint | Method | Purpose | Returns |
|---|----------|--------|---------|---------|
| 1 | `/check-face-exists/:userId` | GET | Check existence + get ID | `hasFaceRecord`, `faceId` |
| 2 | `/face-id/:userId` | GET | Get faceId only (simple) | `faceId`, `hasFaceRecord` |
| 3 | `/:userId/face` | GET | Get full record | Complete face data |

---

## 🚀 Quick Start - Postman

### Step 1: Send Request
```
GET http://localhost:3000/api/registrations/face-id/{{userId}}
Header: Authorization: Bearer {{token}}
```

### Step 2: Add Test Script (Copy-Paste)
```javascript
var responseJson = pm.response.json();
var faceId = responseJson.data.faceId;
pm.environment.set("faceId", faceId);
console.log("✅ FaceId:", faceId);
```

### Step 3: Use in Next Request
```
Body: { "faceId": "{{faceId}}" }
```

---

## 📦 Response Examples

### User HAS Face Record
```json
{
  "status": "success",
  "data": {
    "userId": "user-123",
    "faceId": "123-abc-xyz",      ← THIS!
    "hasFaceRecord": true
  }
}
```

### User DOES NOT Have Face Record
```json
{
  "status": "success",
  "data": {
    "userId": "user-456",
    "faceId": null,               ← NULL
    "hasFaceRecord": false
  }
}
```

---

## 🎛️ Postman Environment Variables

Add to Postman Environment:
```json
{
  "base_url": "http://localhost:3000",
  "userId": "user-123",
  "token": "your_jwt_token",
  "faceId": null
}
```

---

## 💡 Usage Flow

```
Step 1: GET /face-id/{{userId}}
        ↓
Step 2: Extract faceId → pm.environment.set("faceId", faceId)
        ↓
Step 3: Use {{faceId}} in next request
        ↓
Step 4: Done! ✅
```

---

## 🔍 Field Meanings

| Field | Meaning | Example |
|-------|---------|---------|
| `userId` | User identifier | `user-btiflyc5h` |
| `faceId` | AWS Rekognition ID | `face-recognition-id-12345` |
| `hasFaceRecord` | Does user have face? | `true` or `false` |
| `createdAt` | When face was created | `2024-01-15T10:30:00Z` |

---

## ⚡ Terminal Examples

### Get FaceId
```bash
curl -X GET http://localhost:3000/api/registrations/face-id/user-123 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json"
```

### Extract Just FaceId (jq)
```bash
curl ... | jq '.data.faceId'
```

### Check If Face Exists
```bash
curl ... | jq '.data.hasFaceRecord'
```

---

## ✔️ Validation Checklist

- [ ] Server is running on port 3000
- [ ] User exists in database
- [ ] User has a face record in DynamoDB
- [ ] JWT token is valid
- [ ] Response status is 200

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| `faceId` is `null` | User doesn't have face record - need to register |
| `404 Not Found` | User ID doesn't exist or endpoint path is wrong |
| `401 Unauthorized` | JWT token is invalid or missing |
| `500 Server Error` | Check server logs for errors |

---

## 📚 Full Documentation

For complete details, see:
- **FACEID_AUTO_EXTRACTION_SUMMARY.md** - Overview
- **FACEID_EXTRACTION_GUIDE.md** - Detailed guide
- **POSTMAN_TEST_SCRIPTS.md** - Copy-paste test scripts

---

## 🎁 Code Changes Summary

### Files Modified: 2
1. `userEventRegistration.controller.js` - Added/enhanced 2 endpoints
2. `userEventRegistration.routes.js` - Added 1 new route

### New Endpoints: 1
- `GET /api/registrations/face-id/:userId`

### Enhanced Endpoints: 1
- `GET /api/registrations/check-face-exists/:userId` (now returns faceId)

### Status: ✅ READY FOR PRODUCTION

---

## 🏁 You're All Set!

Your API now automatically:
- ✅ Checks if user has face record
- ✅ Extracts the faceId
- ✅ Returns it in JSON response
- ✅ Works with Postman environment variables

**No manual ID copying needed anymore!** 🎉

---

*Last Updated: 2024-01-XX*
