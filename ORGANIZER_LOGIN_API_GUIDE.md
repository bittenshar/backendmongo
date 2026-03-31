# Organizer Login & Profile API Guide

## Overview
Complete organizer authentication system with login, profile management, and event retrieval.

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

## 👤 2. Get Organizer Profile (Multiple Options with Query Params)

### Endpoint
```
GET /api/organizers/auth/profile
```

### Query Parameters (Optional)
```
include=events    → Returns profile with full events list + summary
include=summary   → Returns profile with events summary only (no list)
(no params)       → Returns profile only
```

### Headers Required
```
Authorization: Bearer {JWT_TOKEN}
```

### Example 1: Profile Only
```
GET /api/organizers/auth/profile

Response:
{
  "status": "success",
  "data": {
    "organizer": { ... }
  }
}
```

### Example 2: Profile + Events Summary
```
GET /api/organizers/auth/profile?include=summary

Response:
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
      }
    }
  }
}
```

### Example 3: Profile + Full Events List
```
GET /api/organizers/auth/profile?include=events

Response:
{
  "status": "success",
  "data": {
    "organizer": { ... },
    "events": {
      "summary": { total: 5, active: 3, upcoming: 2, past: 2 },
      "list": [
        {
          "_id": "607f1f77bcf86cd799439012",
          "name": "Tech Conference 2024",
          "location": "Convention Center",
          "date": "2024-03-15T00:00:00.000Z",
          "startTime": "2024-03-15T09:00:00.000Z",
          "endTime": "2024-03-15T17:00:00.000Z",
          "description": "Annual tech conference",
          "seatings": [ ... ]
        }
      ]
    }
  }
}
```

---

## 📝 5. Update Organizer Profile

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

## � 3. Update Organizer Profile

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

## 🚪 7. Organizer Logout

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

### 2. Get Details with Events
```
GET http://localhost:3000/api/organizers/auth/details-with-events
Authorization: Bearer {{organizerToken}}
```

### 3. Get My Events
```
GET http://localhost:3000/api/organizers/auth/my-events
Authorization: Bearer {{organizerToken}}
```

### 4. Update Profile
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

### Step 1: Organizer Logs In
```bash
curl -X POST http://localhost:3000/api/organizers/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "organizer@example.com",
    "password": "securePassword123"
  }'
```

### Step 2: Save the JWT Token
```
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: Get Organizer Details with Events
```bash
curl -X GET http://localhost:3000/api/organizers/auth/details-with-events \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Response contains:
- Organizer profile information
- Summary of total, active, and past events
- Full details of each event

---

## ⚙️ Configuration & Setup

### Database Setup
Before login works, ensure organizers have passwords (hashed via bcrypt):

```javascript
// Create/update an organizer with password
db.organizers.updateOne({
  _id: ObjectId("507f1f77bcf86cd799439011")
}, {
  $set: {
    password: "hashedPassword" // Auto-hashed by pre-save middleware
  }
})
```

### Environment Variables Required
```
JWT_SECRET=your-secret-key
NODE_ENV=development
JWT_COOKIE_EXPIRES_IN=7
```

---

## 🚨 Error Handling

### Common Errors

| Status | Error | Solution |
|--------|-------|----------|
| 400 | Email or password missing | Provide both email and password |
| 401 | Invalid email or password | Check credentials |
| 401 | Invalid or expired token | Login again to get new token |
| 403 | Organizer account not active | Contact admin to activate |
| 404 | Organizer not found | User was deleted |

---

## 💡 Usage Tips

1. **Token Storage**: Save JWT in localStorage/sessionStorage on client
2. **Token Expiry**: Token expires in 7 days, prompts re-login
3. **Cookie Fallback**: Token also stored in HTTP-only cookie for CORS requests
4. **Pagination**: Future: Can add pagination for events list
5. **Filtering**: Future: Can filter events by date, status, etc.

---

## 🔐 Security Notes

- Passwords are hashed using bcrypt with 12 salt rounds
- JWT tokens are signed with secret key
- Passwords are never returned in responses
- Password field is hidden by default (select: false)
- HTTP-only cookies prevent XSS attacks
- Organizer status validated on each protected request

---

## Related Documentation

- See [Event Model](../events/event.model.js) for event structure
- See [Organizer Model](./organizer.model.js) for field definitions
- See [Auth Service](../auth/auth.service.js) for JWT implementation details
