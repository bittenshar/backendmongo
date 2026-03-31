# Organizer Registration API Documentation

## Overview
Complete guide for the organizer registration system. This document covers account creation, validation, and integration details.

---

## 1. Registration Endpoint

### POST `/api/organizers/auth/register`
**Status:** PUBLIC (No authentication required)  
**Purpose:** Create a new organizer account

### Request Headers
```
Content-Type: application/json
```

### Required Body Parameters
```json
{
  "email": "neworganizer@example.com",
  "password": "SecurePassword123",
  "confirmPassword": "SecurePassword123",
  "name": "Event Company Name",
  "phone": "+1234567890",
  "contactPerson": "John Doe"
}
```

#### Field Specifications

| Field | Type | Required | Validation | Description |
|-------|------|----------|-----------|-------------|
| `email` | String | ✅ Yes | Valid email format, Unique | Email address for login |
| `password` | String | ✅ Yes | Minimum 8 characters | Account password (hashed with bcrypt) |
| `confirmPassword` | String | ✅ Yes | Must match `password` | Password confirmation |
| `name` | String | ✅ Yes | Non-empty string | Organization/Company name |
| `phone` | String | ✅ Yes | Non-empty string | Contact phone number |
| `contactPerson` | String | ✅ Yes | Non-empty string | Primary contact person name |
| `address` | String | ❌ Optional | Any string | Organization address |
| `website` | String | ❌ Optional | Any URL format | Organization website |
| `description` | String | ❌ Optional | Any string | Organization description |
| `logo` | String | ❌ Optional | URL format | Logo image URL |

### Optional Body Parameters
```json
{
  "address": "123 Main Street, City, Country",
  "website": "https://example.com",
  "description": "Professional event organization company",
  "logo": "https://example.com/logo.png"
}
```

---

## 2. Success Response (201)
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "organizer": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Event Company Name",
      "email": "neworganizer@example.com",
      "phone": "+1234567890",
      "contactPerson": "John Doe",
      "address": "123 Main Street, City, Country",
      "website": "https://example.com",
      "description": "Professional event organization company",
      "logo": "https://example.com/logo.png",
      "status": "active",
      "joinDate": "2026-04-01T10:30:45.123Z",
      "totalRevenue": 0,
      "totalEvents": 0,
      "activeEvents": 0
    }
  }
}
```

### Response Details
- **Status Code:** `201 Created`
- **Token:** JWT token valid for 7 days (in Authorization header or cookie)
- **Cookie:** Also stored as `organizerJwt` (HTTP-only)
- **Auto-Login:** User is automatically logged in after successful registration

---

## 3. Error Responses

### 400 - Missing Required Fields
```json
{
  "status": "error",
  "message": "Please provide email, password, name, phone, and contactPerson"
}
```

### 400 - Invalid Email Format
```json
{
  "status": "error",
  "message": "Please provide a valid email address"
}
```

### 400 - Weak Password
```json
{
  "status": "error",
  "message": "Password must be at least 8 characters long"
}
```

### 400 - Passwords Don't Match
```json
{
  "status": "error",
  "message": "Passwords do not match"
}
```

### 400 - Email Already Registered
```json
{
  "status": "error",
  "message": "Email already registered. Please login or use a different email"
}
```

---

## 4. Validation Rules

### Email Validation
- ✅ Must be valid email format (user@domain.com)
- ✅ Must be unique in the system
- ❌ If email exists → 400 error

### Password Validation
- ✅ Minimum 8 characters
- ✅ Must match confirmPassword field
- ✅ Automatically hashed with bcrypt (12 salt rounds)
- ❌ If < 8 chars → 400 error
- ❌ If mismatch → 400 error

### Required Fields Validation
- All 6 required fields must be provided
- Empty strings not accepted for required fields

---

## 5. curl Examples

### Basic Registration
```bash
curl -X POST http://localhost:3000/api/organizers/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "neworganizer@example.com",
    "password": "SecurePass123",
    "confirmPassword": "SecurePass123",
    "name": "Event Company Ltd",
    "phone": "+1234567890",
    "contactPerson": "John Doe"
  }'
```

### Registration with Optional Fields
```bash
curl -X POST http://localhost:3000/api/organizers/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "neworganizer@example.com",
    "password": "SecurePass123",
    "confirmPassword": "SecurePass123",
    "name": "Event Company Ltd",
    "phone": "+1234567890",
    "contactPerson": "John Doe",
    "address": "123 Main Street, City",
    "website": "https://example.com",
    "description": "Professional event organizer",
    "logo": "https://example.com/logo.png"
  }'
```

### Extract Token from Response
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/organizers/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "neworganizer@example.com",
    "password": "SecurePass123",
    "confirmPassword": "SecurePass123",
    "name": "Event Company Ltd",
    "phone": "+1234567890",
    "contactPerson": "John Doe"
  }' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Token: $TOKEN"
```

---

## 6. JavaScript/Node.js Examples

### Using Fetch API
```javascript
const response = await fetch('http://localhost:3000/api/organizers/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'neworganizer@example.com',
    password: 'SecurePass123',
    confirmPassword: 'SecurePass123',
    name: 'Event Company Ltd',
    phone: '+1234567890',
    contactPerson: 'John Doe',
    address: '123 Main Street, City',
    website: 'https://example.com',
    description: 'Professional event organizer',
    logo: 'https://example.com/logo.png'
  })
});

const data = await response.json();
if (response.ok) {
  const token = data.token;
  localStorage.setItem('organizerToken', token);
  console.log('Registration successful!');
} else {
  console.error('Registration failed:', data.message);
}
```

### Using Axios
```javascript
import axios from 'axios';

try {
  const response = await axios.post('http://localhost:3000/api/organizers/auth/register', {
    email: 'neworganizer@example.com',
    password: 'SecurePass123',
    confirmPassword: 'SecurePass123',
    name: 'Event Company Ltd',
    phone: '+1234567890',
    contactPerson: 'John Doe',
    address: '123 Main Street, City',
    website: 'https://example.com',
    description: 'Professional event organizer',
    logo: 'https://example.com/logo.png'
  });

  const token = response.data.token;
  localStorage.setItem('organizerToken', token);
  console.log('Registration successful!', response.data.data.organizer);
} catch (error) {
  console.error('Registration failed:', error.response.data.message);
}
```

---

## 7. Integration Workflow

### Step 1: User Registration
```
POST /api/organizers/auth/register
↓
Validate inputs
↓
Check if email exists
↓
Hash password with bcrypt
↓
Create organizer document
↓
Generate JWT token
↓
Return token + organizer data
```

### Step 2: Automatic Login After Registration
- User receives JWT token immediately after registration
- No need for separate login step
- Token can be used for authenticated requests

### Step 3: Store Token
```javascript
// Browser - LocalStorage
localStorage.setItem('organizerToken', token);

// Browser - Session Storage
sessionStorage.setItem('organizerToken', token);

// Node.js - Environment Variable
process.env.ORGANIZER_TOKEN = token;
```

### Step 4: Use Token for Requests
```javascript
const token = localStorage.getItem('organizerToken');
const response = await fetch('http://localhost:3000/api/organizers/auth/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

---

## 8. Security Notes

✅ **Password Security:**
- Passwords hashed with bcrypt (12 salt rounds)
- Never stored in plain text
- Password field marked `select: false` in model (excluded from queries)

✅ **Email Uniqueness:**
- Database index enforces unique emails
- Prevents duplicate accounts

✅ **Token Security:**
- JWT signed with secret key
- 7-day expiration
- HTTP-only cookie for CSRF protection

✅ **Status Validation:**
- New organizers created with `status: 'active'`
- Inactive accounts cannot login

---

## 9. Rate Limiting Recommendations

For production, implement rate limiting:

```javascript
const rateLimit = require('express-rate-limit');

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 registration attempts per windowMs
  message: 'Too many registration attempts from this IP, please try again later.'
});

router.post('/register', registerLimiter, organizerAuthController.register);
```

---

## 10. Testing Scenarios

### Happy Path
- [ ] Register with all required fields
- [ ] Register with all optional fields
- [ ] Token generation successful
- [ ] User auto-logged in

### Validation Tests
- [ ] Missing required field → 400 error
- [ ] Invalid email format → 400 error
- [ ] Password < 8 characters → 400 error
- [ ] Passwords don't match → 400 error
- [ ] Existing email → 400 error

### Edge Cases
- [ ] Special characters in name/description
- [ ] International phone numbers
- [ ] Very long strings (test max length)
- [ ] SQL injection attempts (sanitized)
- [ ] XSS attempts (sanitized)

---

## 11. Related Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/organizers/auth/register` | Create new account |
| POST | `/api/organizers/auth/login` | Login with credentials |
| GET | `/api/organizers/auth/profile` | Get profile (protected) |
| PATCH | `/api/organizers/auth/profile` | Update profile (protected) |
| PATCH | `/api/organizers/auth/change-password` | Change password (protected) |
| GET | `/api/organizers/auth/logout` | Logout (protected) |

---

## 12. Troubleshooting

### Issue: "Email already registered"
**Solution:** Use a different email address or login with existing account

### Issue: "Passwords do not match"
**Solution:** Ensure both password fields are identical

### Issue: "Password must be at least 8 characters"
**Solution:** Use a password with minimum 8 characters

### Issue: "Invalid email address"
**Solution:** Use format: user@domain.com

### Issue: CORS Error
**Solution:** Check server configuration for CORS headers in responses

### Issue: Token Not Working
**Solution:** Ensure token is in Authorization header with "Bearer " prefix

---

## 13. Quick Reference

**Endpoint:** `POST /api/organizers/auth/register`  
**Authentication:** ❌ Not required  
**Response Status:** `201 Created`  
**Response Time:** ~500ms (due to password hashing)  
**Rate Limit:** Recommended 5 attempts per 15 minutes per IP  

**Minimum Request:**
```json
{
  "email": "user@example.com",
  "password": "Min8Chars",
  "confirmPassword": "Min8Chars",
  "name": "Company Name",
  "phone": "1234567890",
  "contactPerson": "John Doe"
}
```

**Response:** JWT token + Organizer data + HTTP-only cookie
