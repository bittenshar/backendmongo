# Organizer Login & Profile API Guide (Consolidated)

## Overview
Simplified organizer authentication system with consolidated endpoints using query parameters.

---

## 🔐 1. Organizer Login

### Endpoint
```
POST /api/organizers/auth/login
```

### Request
```json
{
  "email": "organizer@example.com",
  "password": "securePassword123"
}
```

### Response (200 OK)
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "organizer": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "TechEvents Pro",
      "email": "organizer@example.com",
      "phone": "+1234567890",
      "address": "123 Tech Street, Silicon Valley, CA",
      "website": "https://techevents.com",
      "description": "Professional event organizer",
      "contactPerson": "John Doe",
      "status": "active",
      "joinDate": "2024-01-15T10:30:00.000Z",
      "lastActivity": "2024-01-20T15:45:00.000Z",
      "lastLogin": "2024-01-20T16:00:00.000Z",
      "logo": "https://example.com/logo.png",
      "totalRevenue": 50000,
      "totalEvents": 12,
      "activeEvents": 3
    }
  }
}
```

### Error Response (401)
```json
{
  "status": "error",
  "message": "Invalid email or password"
}
```

---

## 👤 2. Get Organizer Profile (Consolidated with Query Params)

### Endpoint
```
GET /api/organizers/auth/profile
```

### Query Parameters (Optional)
```
include=events    → Profile with full events list + summary
include=summary   → Profile with events summary only
(no params)       → Profile only
```

### Headers Required
```
Authorization: Bearer {JWT_TOKEN}
```

---

### Example 1: Profile Only
```
GET /api/organizers/auth/profile
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "organizer": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "TechEvents Pro",
      "email": "organizer@example.com",
      "phone": "+1234567890",
      "status": "active",
      "totalEvents": 12,
      "activeEvents": 3
    }
  }
}
```

---

### Example 2: Profile + Events Summary
```
GET /api/organizers/auth/profile?include=summary
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "organizer": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "TechEvents Pro",
      "email": "organizer@example.com",
      ...
    },
    "events": {
      "summary": {
        "total": 5,
        "active": 3,
        "upcoming": 2,
        "past": 2
      }
    }
  }
}
```

---

### Example 3: Profile + Full Events List
```
GET /api/organizers/auth/profile?include=events
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "organizer": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "TechEvents Pro",
      ...
    },
    "events": {
      "summary": {
        "total": 5,
        "active": 3,
        "upcoming": 2,
        "past": 2
      },
      "list": [
        {
          "_id": "607f1f77bcf86cd799439012",
          "name": "Tech Conference 2024",
          "location": "Convention Center, City",
          "date": "2024-03-15T00:00:00.000Z",
          "startTime": "2024-03-15T09:00:00.000Z",
          "endTime": "2024-03-15T17:00:00.000Z",
          "description": "Annual tech conference",
          "seatings": [
            {
              "_id": "707f1f77bcf86cd799439013",
              "seatType": "Premium",
              "price": 5000,
              "totalSeats": 100,
              "seatsSold": 45,
              "lockedSeats": 5,
              "isActive": true
            }
          ],
          "coverImage": "https://example.com/event.jpg"
        }
      ]
    }
  }
}
```

---

## 📝 3. Update Organizer Profile

### Endpoint
```
PATCH /api/organizers/auth/profile
```

### Headers Required
```
Authorization: Bearer {JWT_TOKEN}
```

### Request Body (All fields optional)
```json
{
  "name": "Updated Organization Name",
  "phone": "9876543210",
  "address": "New Address",
  "website": "https://newwebsite.com",
  "description": "Updated description",
  "contactPerson": "Jane Doe",
  "logo": "https://example.com/new-logo.png"
}
```

### Response (200 OK)
```json
{
  "status": "success",
  "data": {
    "organizer": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Updated Organization Name",
      "phone": "9876543210",
      ...
    }
  }
}
```

### Notes
- Password cannot be updated through this endpoint (use change-password instead)
- Only allowed fields will be updated

---

## 🔑 4. Change Organizer Password

### Endpoint
```
PATCH /api/organizers/auth/change-password
```

### Headers Required
```
Authorization: Bearer {JWT_TOKEN}
```

### Request Body
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword123",
  "confirmPassword": "newPassword123"
}
```

### Response (200 OK)
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "organizer": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "TechEvents Pro",
      ...
    }
  }
}
```

### Error Response (401)
```json
{
  "status": "error",
  "message": "Current password is incorrect"
}
```

---

## 🚪 5. Organizer Logout

### Endpoint
```
GET /api/organizers/auth/logout
```

### Headers Required
```
Authorization: Bearer {JWT_TOKEN}
```

### Response (200 OK)
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

---

## 📋 Postman Examples

### 1. Login and Save Token
```
POST http://localhost:3000/api/organizers/auth/login
Content-Type: application/json

{
  "email": "organizer@example.com",
  "password": "securePassword123"
}

// In Postman Tests tab:
if (pm.response.code === 200) {
  pm.environment.set("organizerToken", pm.response.json().token);
  pm.environment.set("organizerId", pm.response.json().data.organizer._id);
}
```

### 2. Get Profile Only
```
GET http://localhost:3000/api/organizers/auth/profile
Authorization: Bearer {{organizerToken}}
```

### 3. Get Profile + Events Summary
```
GET http://localhost:3000/api/organizers/auth/profile?include=summary
Authorization: Bearer {{organizerToken}}
```

### 4. Get Profile + Full Events List
```
GET http://localhost:3000/api/organizers/auth/profile?include=events
Authorization: Bearer {{organizerToken}}
```

### 5. Update Profile
```
PATCH http://localhost:3000/api/organizers/auth/profile
Authorization: Bearer {{organizerToken}}
Content-Type: application/json

{
  "name": "Updated Name",
  "phone": "9876543210"
}
```

---

## 🔄 Complete Flow Example

### Step 1: Login
```bash
curl -X POST http://localhost:3000/api/organizers/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "organizer@example.com",
    "password": "securePassword123"
  }'
```

### Step 2: Save Token
```
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: Get Profile with Events
```bash
curl -X GET "http://localhost:3000/api/organizers/auth/profile?include=events" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Response contains:
- Organizer profile
- Events summary (total, active, upcoming, past)
- Full event details with seating information

---

## ⚙️ Configuration & Setup

### Database Setup
Add password to organizer:
```javascript
db.organizers.updateOne({
  _id: ObjectId("507f1f77bcf86cd799439011")
}, {
  $set: { password: "securePassword123" }  // Auto-hashed
})
```

### Environment Variables
```
JWT_SECRET=your-secret-key
NODE_ENV=development
JWT_COOKIE_EXPIRES_IN=7
```

---

## 📊 Endpoint Summary

| Method | Endpoint | Query Params | Description |
|--------|----------|---|---|
| POST | `/api/organizers/auth/login` | - | Login |
| GET | `/api/organizers/auth/profile` | `include=events` or `include=summary` | Get profile [+events] |
| PATCH | `/api/organizers/auth/profile` | - | Update profile |
| PATCH | `/api/organizers/auth/change-password` | - | Change password |
| GET | `/api/organizers/auth/logout` | - | Logout |

---

## 🚨 Consolidated Benefits

✅ **Reduced from 4 to 2 GET endpoints**
- Old: `/profile`, `/details-with-events`, `/my-events` (3 GET endpoints)
- New: `/profile?include=events/summary` (1 flexible GET endpoint)

✅ **Query-based flexibility**
- Single endpoint returns different data based on `include` parameter
- Reduces API confusion and versioning issues

✅ **Backward compatible**
- Existing `/profile` calls still work (returns basic data)
- New `?include` parameter is optional

---

## 💡 Usage Tips

1. **Use `include=events`** for full dashboard with all event details
2. **Use `include=summary`** for quick stats without event list
3. **Use no params** for basic profile data only
4. Token expires in 7 days
5. Token stored in both Authorization header and HTTP-only cookie

---

## 🔐 Security

✅ Passwords hashed with bcrypt (12 rounds)
✅ JWT tokens expire in 7 days
✅ HTTP-only cookies prevent XSS
✅ Organizer status validated per request
✅ Invalid tokens rejected immediately

---

**API is now more streamlined and efficient!** 🚀
