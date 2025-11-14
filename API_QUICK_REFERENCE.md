# Quick Reference - API Endpoints & Response Formats

## 🔐 Authentication

### Sign Up
```
POST /api/auth/signup

Request:
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+919999999999"
}

Response:
{
  "status": "success",
  "token": "JWT_TOKEN",
  "data": {
    "user": {
      "_id": "USER_ID",
      "email": "john@example.com",
      "name": "John Doe"
    }
  }
}
```

### Login
```
POST /api/auth/login

Request:
{
  "email": "john@example.com",
  "password": "password123"
}

Response:
{
  "status": "success",
  "token": "JWT_TOKEN",
  "data": {
    "user": {
      "_id": "USER_ID",
      "email": "john@example.com",
      "name": "John Doe",
      "hasFaceRecord": true,        ✅ KEY
      "faceId": "FACE_ID",           ✅ KEY
      "verificationStatus": "verified"
    }
  }
}
```

---

## 📋 Events

### Get All Events
```
GET /api/events

Response:
{
  "status": "success",
  "results": 1,
  "data": {
    "events": [
      {
        "_id": "EVENT_ID",
        "name": "Tech Conference",
        "date": "2025-09-15T10:00:00.000Z",
        "location": "Silicon Valley",
        "price": 500,
        "totalTickets": 500,
        "ticketsSold": 0
      }
    ]
  }
}
```

### Get Event by ID
```
GET /api/events/:eventId

Response: Same as above (single event)
```

---

## 🎫 Registrations

### Create Registration (AUTO CALCULATION)
```
POST /api/registrations

Headers:
Authorization: Bearer TOKEN

Request:
{
  "userId": "USER_ID",
  "eventId": "EVENT_ID"
}

Response:
{
  "status": "success",
  "message": "Registration created successfully",
  "data": {
    "registration": {
      "_id": "REGISTRATION_ID",
      "userId": {
        "_id": "USER_ID",
        "email": "user@example.com"
      },
      "eventId": {
        "_id": "EVENT_ID",
        "name": "Tech Conference"
      },
      "faceVerificationStatus": true,          ✅ BOOLEAN
      "ticketAvailabilityStatus": "available", ✅ STRING
      "status": "pending",
      "ticketIssued": false,
      "registrationDate": "2025-11-13T14:11:35.087Z"
    }
  }
}
```

### Get User Registrations
```
GET /api/registrations/users/:userId

Headers:
Authorization: Bearer TOKEN

Response:
{
  "status": "success",
  "results": 1,
  "data": {
    "registrations": [
      {
        "_id": "REGISTRATION_ID",
        "eventId": {
          "_id": "EVENT_ID",
          "name": "Tech Conference",
          "totalTickets": 500,
          "ticketsSold": 1
        },
        "userId": { ... },
        "faceVerificationStatus": true,
        "ticketAvailabilityStatus": "available",
        "ticketIssued": false,
        "status": "pending"
      }
    ]
  }
}
```

---

## 🎟️ Tickets

### Issue Ticket After Payment ⭐
```
POST /api/tickets/issue-after-payment

Headers:
Authorization: Bearer TOKEN

Request:
{
  "registrationId": "REGISTRATION_ID",
  "paymentId": "PAY-12345-ABCDE",
  "amount": 500,
  "price": 500
}

Validations (Must Pass):
✅ faceVerificationStatus === true
✅ ticketAvailabilityStatus === "available"
✅ ticketIssued === false

Response:
{
  "status": "success",
  "message": "Ticket issued successfully after payment",
  "data": {
    "ticket": {
      "_id": "TICKET_ID",
      "ticketId": "EVENT_ID-USER_ID-TIMESTAMP",
      "eventId": "EVENT_ID",
      "eventName": "Tech Conference",
      "userId": "USER_ID",
      "userName": "John Doe",
      "userEmail": "john@example.com",
      "price": 500,
      "status": "active",
      "purchaseDate": "2025-11-13T14:24:20.180Z",
      "paymentId": "PAY-12345-ABCDE"
    }
  }
}
```

### Verify Ticket (Check-in)
```
POST /api/tickets/verify

Headers:
Authorization: Bearer TOKEN

Request:
{
  "ticketId": "TICKET_ID",
  "faceImage": "BASE64_IMAGE"
}

Response:
{
  "status": "success",
  "data": {
    "ticket": {
      "_id": "TICKET_ID",
      "status": "checked-in",
      "checkInTime": "2025-11-13T15:00:00.000Z",
      "faceVerified": true
    }
  }
}
```

---

## 👤 Users

### Get Current User Profile
```
GET /api/users/me

Headers:
Authorization: Bearer TOKEN

Response:
{
  "status": "success",
  "data": {
    "user": {
      "_id": "USER_ID",
      "email": "john@example.com",
      "name": "John Doe",
      "phone": "+919999999999",
      "hasFaceRecord": true,
      "faceId": "FACE_ID",
      "uploadedPhoto": "S3_URL"
    }
  }
}
```

### Get All Users (Admin)
```
GET /api/users

Headers:
Authorization: Bearer ADMIN_TOKEN

Response:
{
  "status": "success",
  "results": 10,
  "data": {
    "users": [...]
  }
}
```

### Update User
```
PUT /api/users/:userId

Headers:
Authorization: Bearer TOKEN
Content-Type: application/json

Request:
{
  "name": "Updated Name",
  "phone": "+919999999999"
}

Response: Updated user object
```

### Verify User Status (Admin)
```
PATCH /api/users/:userId/verify

Headers:
Authorization: Bearer ADMIN_TOKEN

Request:
{
  "verificationStatus": "verified"  // or "rejected" or "pending"
}

Response: Updated user object
```

---

## 📸 Presigned URLs

### Get User Presigned URLs
```
GET /api/users/:userId/presigned-urls

Headers:
Authorization: Bearer TOKEN

Response:
{
  "success": true,
  "images": [
    {
      "url": "S3_PRESIGNED_URL_WITH_SIGNATURE",
      "originalUrl": "S3_FULL_URL",
      "filename": "filename",
      "isPublic": true,
      "uploadedAt": "2025-11-13T11:35:25.332Z"
    }
  ]
}
```

### Get All Users Presigned URLs (Admin)
```
GET /api/signed-urls/admin/all-signed-urls

Headers:
Authorization: Bearer ADMIN_TOKEN

Response:
{
  "success": true,
  "message": "Total users: 10 (7 uploaded, 3 pending)",
  "totalUsers": 10,
  "uploadedCount": 7,
  "pendingCount": 3,
  "data": [
    {
      "_id": "USER_ID",
      "email": "john@example.com",
      "name": "John Doe",
      "hasUpload": true,
      "urls": {
        "uploadedPhoto": {
          "url": "PRESIGNED_URL",
          "originalUrl": "S3_URL",
          "filename": "filename",
          "isPublic": true
        }
      }
    }
  ]
}
```

---

## ⚠️ Error Responses

### 400 - Bad Request
```json
{
  "status": "fail",
  "message": "Invalid request data"
}
```

### 401 - Unauthorized
```json
{
  "status": "fail",
  "message": "You are not logged in. Please log in to get access."
}
```

### 403 - Forbidden
```json
{
  "status": "fail",
  "message": "You do not have permission to perform this action"
}
```

### 404 - Not Found
```json
{
  "status": "fail",
  "message": "No resource found with that ID"
}
```

### 500 - Server Error
```json
{
  "status": "error",
  "message": "Something went wrong on the server"
}
```

---

## 🔑 Request Headers Template

### Standard Headers
```javascript
headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer ' + userToken
}
```

### No Auth Required
```javascript
headers: {
  'Content-Type': 'application/json'
}
// POST /api/auth/signup
// POST /api/auth/login
```

---

## 💾 Response Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Successful GET/PATCH |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid data |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | No permission |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Internal error |

---

## 📝 Common Request Examples

### Using Fetch API
```javascript
const makeRequest = async (method, endpoint, data, token) => {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`http://localhost:3000/api${endpoint}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return response.json();
};

// Usage
const registration = await makeRequest(
  'POST',
  '/registrations',
  { userId: 'USER_ID', eventId: 'EVENT_ID' },
  token
);
```

### Using Axios
```javascript
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Usage
const registration = await api.post('/registrations', {
  userId: 'USER_ID',
  eventId: 'EVENT_ID'
});
```

---

## 🧪 Testing Credentials

```javascript
// Test User (with face verification)
{
  email: "d@example.com",
  password: "password",
  hasFaceRecord: true,
  faceId: "130401df-6537-4918..."
}

// Test Event
{
  _id: "691337e4c4145e1999997a49",
  name: "New Tech Conference",
  totalTickets: 500,
  ticketsSold: 0,
  price: 500
}

// Admin Token
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTEzMjFjMDI4ZjlhOWRmODkxZjZmZjQiLCJpYXQiOjE3NjMwMzM5NjMsImV4cCI6MTc3MDgwOTk2M30.CQ5_PLutAu5p-2Rq0hmQUZmENZWUWpvdtRg9hN0Y8b0"
```

---

## 📚 Related Documentation

- ✅ `FRONTEND_INTEGRATION_GUIDE.md` - Complete integration examples
- ✅ `AUTOMATIC_TICKET_GENERATION.md` - Ticket workflow explanation
- ✅ `REGISTRATION_AUTO_STATUS_API.md` - Registration details
- ✅ `user-verification-api.postman_collection.json` - Postman collection

All endpoints ready for production! ✅
