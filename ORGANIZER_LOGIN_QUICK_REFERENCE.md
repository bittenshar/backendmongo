## 🎉 Organizer Login - Quick Reference (Consolidated API)

## ✅ Implementation Complete - Optimized

Your organizer login system is now fully implemented with **consolidated endpoints**:
- ✅ Organizer authentication (email/password)
- ✅ Single profile endpoint with flexible query params
- ✅ Event retrieval via query parameters
- ✅ Password change functionality
- ✅ JWT token-based authentication

---

## 🚀 Quick Start (3 Steps)

### Step 1: Test Login
```bash
curl -X POST http://localhost:3000/api/organizers/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "contact@techevents.com",
    "password": "password123"
  }'
```

### Step 2: Copy JWT Token from Response
```
"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Step 3: Get Profile with Events
```bash
curl -X GET "http://localhost:3000/api/organizers/auth/profile?include=events" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 📊 Available Endpoints (5 Total)

| Method | Endpoint | Query Parameters | Description |
|--------|----------|---|---|
| POST | `/api/organizers/auth/login` | - | Login with email/password |
| GET | `/api/organizers/auth/profile` | `include=events` or `include=summary` | Get profile [+ events] |
| PATCH | `/api/organizers/auth/profile` | - | Update profile |
| PATCH | `/api/organizers/auth/change-password` | - | Change password |
| GET | `/api/organizers/auth/logout` | - | Logout |

---

## 📊 Flexible Profile Endpoint

**Single endpoint with 3 modes:**

```
GET /api/organizers/auth/profile                           # Profile only
GET /api/organizers/auth/profile?include=summary           # Profile + events summary
GET /api/organizers/auth/profile?include=events            # Profile + full events list
```

---

## 🔑 Login Response

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "organizer": {
      "_id": "607f1f77bcf86cd799439012",
      "name": "TechEvents Pro",
      "email": "contact@techevents.com",
      "phone": "+1234567890",
      "status": "active",
      "totalEvents": 12,
      "activeEvents": 3,
      "lastLogin": "2024-01-20T16:00:00.000Z"
    }
  }
}
```

---

## 📅 Profile + Events Response

```json
{
  "status": "success",
  "data": {
    "organizer": { ... },
    "events": {
      "summary": {
        "total": 5,
        "active": 3,
        "upcoming": 2,
        "past": 2
      },
      "list": [
        {
          "_id": "607f1f77bcf86cd799439013",
          "name": "Tech Conference 2024",
          "location": "Convention Center",
          "date": "2024-03-15T00:00:00.000Z",
          ...
        }
      ]
    }
  }
}
```

---

## 🧪 Testing Options

### Option 1: Postman Collection
```
Import: Organizer_Login_API.postman_collection.json
```
- Updated for consolidated endpoints
- Query parameters examples
- Auto-saves JWT token

### Option 2: Node.js Test Script
```bash
node organizer-login-test.js
```
- Interactive CLI testing
- Shows all 3 profile modes

### Option 3: curl Commands
```bash
# Profile only
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/organizers/auth/profile

# Profile + summary
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/organizers/auth/profile?include=summary"

# Profile + events
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/organizers/auth/profile?include=events"
```

---

## 🎯 What Changed - API Consolidation

### Before (4 endpoints):
```
GET /api/organizers/auth/profile            (basic)
GET /api/organizers/auth/details-with-events (with events)
GET /api/organizers/auth/my-events          (events only)
PATCH /api/organizers/auth/profile          (update)
```

### After (2 endpoints → cleaner!):
```
GET /api/organizers/auth/profile?include=...  (flexible)
PATCH /api/organizers/auth/profile            (update)
```

**Benefits:**
- ✅ Fewer endpoints to maintain
- ✅ Query parameters = flexible responses
- ✅ Backward compatible (no params = old behavior)
- ✅ Cleaner API surface

---

## 🔐 Security Features

✅ Passwords hashed with bcrypt (12 salt rounds)
✅ JWT tokens expire in 7 days
✅ HTTP-only cookies prevent XSS
✅ Password field hidden by default
✅ Organizer status validated on each request
✅ Invalid tokens rejected

---

## 📝 Database Setup (If needed)

### Add password to existing organizer:
```javascript
db.organizers.updateOne(
  { _id: ObjectId("...") },
  { $set: { password: "securePassword123" } }
)
// Password auto-hashes via pre-save middleware
```

### Create new organizer with password:
```javascript
db.organizers.insertOne({
  name: "Event Pro",
  email: "admin@eventpro.com",
  password: "securePassword123", // Will be auto-hashed
  phone: "9876543210",
  contactPerson: "John Doe",
  status: "active"
})
```

---

## 🛠️ Related Files

- [API Guide (Consolidated)](./ORGANIZER_LOGIN_API_CONSOLIDATED.md) - Detailed documentation
- [Organizer Model](./src/features/organizers/organizer.model.js) - Database schema
- [Auth Controller](./src/features/organizers/organizer.auth.controller.js) - Business logic
- [Auth Routes](./src/features/organizers/organizer.auth.routes.js) - API endpoints
- [Test Script](./organizer-login-test.js) - Interactive tester
- [Postman Collection](./Organizer_Login_API.postman_collection.json) - API collection

---

## 🤔 Common Questions

**Q: How do I get profile + events summary only?**
A: Use `GET /api/organizers/auth/profile?include=summary`

**Q: How do I get profile + full event list?**
A: Use `GET /api/organizers/auth/profile?include=events`

**Q: How do I get just the profile?**
A: Use `GET /api/organizers/auth/profile` (no query params)

**Q: How long is the JWT token valid?**
A: 7 days - login again after expiry

**Q: Can I use cookies instead of Authorization header?**
A: Yes! JWT is stored in HTTP-only `organizerJwt` cookie

**Q: How many endpoints do I need to learn?**
A: 5 main endpoints (down from 7 originally!)

---

## ⚡ Next Steps

1. **Test the API** using Postman or curl
2. **Create frontend** to consume these endpoints
3. **Add event management** (create/edit/delete)
4. **Add analytics** (ticket sales, attendance, revenue)

---

**API is now optimized and consolidated!** 🚀

---

## 🔑 Login Response

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "organizer": {
      "_id": "607f1f77bcf86cd799439012",
      "name": "TechEvents Pro",
      "email": "contact@techevents.com",
      "phone": "+1234567890",
      "status": "active",
      "totalEvents": 12,
      "activeEvents": 3,
      "lastLogin": "2024-01-20T16:00:00.000Z"
    }
  }
}
```

---

## 📅 Get Details with Events Response

```json
{
  "status": "success",
  "data": {
    "organizer": { ... },
    "events": {
      "total": 5,
      "active": 3,
      "past": 2,
      "list": [
        {
          "_id": "607f1f77bcf86cd799439013",
          "name": "Tech Conference 2024",
          "location": "Convention Center",
          "date": "2024-03-15T00:00:00.000Z",
          "startTime": "2024-03-15T09:00:00.000Z",
          "endTime": "2024-03-15T17:00:00.000Z",
          "seatings": [
            {
              "seatType": "Premium",
              "price": 5000,
              "totalSeats": 100,
              "seatsSold": 45
            }
          ]
        }
      ]
    }
  }
}
```

---

## 🧪 Testing Options

### Option 1: Postman Collection
```
Import: Organizer_Login_API.postman_collection.json
```
- Pre-configured endpoints
- Auto-saves JWT token between requests
- Easy to test all endpoints

### Option 2: Node.js Test Script
```bash
node organizer-login-test.js
```
- Interactive command-line interface
- Tests login → details → events flow
- Shows formatted output

### Option 3: curl Commands
```bash
# Login
curl -X POST http://localhost:3000/api/organizers/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"...","password":"..."}'

# Get events (replace TOKEN)
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/organizers/auth/details-with-events
```

---

## 🔐 Security Features

✅ Passwords hashed with bcrypt (12 salt rounds)
✅ JWT tokens expire in 7 days
✅ HTTP-only cookies prevent XSS
✅ Password field hidden by default
✅ Organizer status validated on each request
✅ Invalid tokens rejected

---

## 📝 Database Setup (If needed)

### Add password to existing organizer:
```javascript
db.organizers.updateOne(
  { _id: ObjectId("...") },
  { $set: { password: "securePassword123" } }
)
// Password auto-hashes via pre-save middleware
```

### Create new organizer with password:
```javascript
db.organizers.insertOne({
  name: "Event Pro",
  email: "admin@eventpro.com",
  password: "securePassword123", // Will be auto-hashed
  phone: "9876543210",
  contactPerson: "John Doe",
  status: "active"
})
```

---

## 🛠️ Related Files

- [API Guide](./ORGANIZER_LOGIN_API_GUIDE.md) - Detailed documentation
- [Organizer Model](./src/features/organizers/organizer.model.js) - Database schema
- [Auth Controller](./src/features/organizers/organizer.auth.controller.js) - Business logic
- [Auth Routes](./src/features/organizers/organizer.auth.routes.js) - API endpoints
- [Test Script](./organizer-login-test.js) - Interactive tester
- [Postman Collection](./Organizer_Login_API.postman_collection.json) - API collection

---

## 🤔 Common Questions

**Q: How do I update organizer details?**
A: Use `PATCH /api/organizers/auth/profile` with JWT token

**Q: How do I get all events for an organizer?**
A: Use `GET /api/organizers/auth/my-events` 

**Q: How long is the JWT token valid?**
A: 7 days - after that, organizer needs to login again

**Q: Can I use cookies instead of Authorization header?**
A: Yes! JWT is also stored in HTTP-only `organizerJwt` cookie

**Q: How do I change the password?**
A: Use `PATCH /api/organizers/auth/change-password` with current password

**Q: What if I get "Invalid or expired token"?**
A: Login again to get a fresh JWT token

---

## ⚡ Next Steps

1. **Test the API** using Postman or the test script
2. **Create frontend** to consume these endpoints
3. **Add event management** (create/edit/delete events)
4. **Add booking management** for organizer dashboards
5. **Add analytics** (ticket sales, attendance stats, revenue)

---

## 📞 Support

For issues or questions:
1. Check [ORGANIZER_LOGIN_API_GUIDE.md](./ORGANIZER_LOGIN_API_GUIDE.md)
2. Run the test script: `node organizer-login-test.js`
3. Review error responses
4. Check console logs for detailed error messages

---

**Happy organizing! 🎊**
