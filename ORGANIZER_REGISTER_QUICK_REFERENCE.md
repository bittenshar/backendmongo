# Organizer Register API - Quick Reference

## 🚀 Quick Start

### Register New Account
```bash
curl -X POST http://localhost:3000/api/organizers/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "organizer@example.com",
    "password": "SecurePass123",
    "confirmPassword": "SecurePass123",
    "name": "Event Company",
    "phone": "+1234567890",
    "contactPerson": "John Doe"
  }'
```

### Extract Token
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/organizers/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"org@example.com","password":"SecurePass123","confirmPassword":"SecurePass123","name":"Company","phone":"+1234567890","contactPerson":"John"}' \
  | jq -r '.token')
```

---

## 📋 Endpoint Summary

| # | Method | Endpoint | Authentication | Purpose |
|---|--------|----------|----------------|---------|
| 1 | `POST` | `/api/organizers/auth/register` | ❌ No | **Create account** |
| 2 | `POST` | `/api/organizers/auth/login` | ❌ No | Login with credentials |
| 3 | `GET` | `/api/organizers/auth/profile` | ✅ Yes | Get profile only |
| 4 | `GET` | `/api/organizers/auth/profile?include=summary` | ✅ Yes | Profile + events summary |
| 5 | `GET` | `/api/organizers/auth/profile?include=events` | ✅ Yes | Profile + full events |
| 6 | `PATCH` | `/api/organizers/auth/profile` | ✅ Yes | Update profile |
| 7 | `PATCH` | `/api/organizers/auth/change-password` | ✅ Yes | Change password |
| 8 | `GET` | `/api/organizers/auth/logout` | ✅ Yes | Logout |

---

## 📝 Registration Fields

### Required (6 fields)
| Field | Type | Example | Validation |
|-------|------|---------|-----------|
| `email` | string | user@example.com | Valid email, unique |
| `password` | string | SecurePass123 | Min 8 characters |
| `confirmPassword` | string | SecurePass123 | Must match password |
| `name` | string | Event Company Ltd | Non-empty |
| `phone` | string | +1234567890 | Non-empty |
| `contactPerson` | string | John Doe | Non-empty |

### Optional (4 fields)
| Field | Type | Example |
|-------|------|---------|
| `address` | string | 123 Main St, City |
| `website` | string | https://example.com |
| `description` | string | Professional organizer |
| `logo` | string | https://example.com/logo.png |

---

## ✅ Success Response (201)

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiI...",
  "data": {
    "organizer": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Event Company Ltd",
      "email": "user@example.com",
      "phone": "+1234567890",
      "contactPerson": "John Doe",
      "status": "active",
      "joinDate": "2026-04-01T10:30:45.123Z"
    }
  }
}
```

---

## ❌ Error Responses

| Status | Message | Solution |
|--------|---------|----------|
| 400 | Missing required fields | Provide all 6 required fields |
| 400 | Invalid email address | Use format: user@domain.com |
| 400 | Password must be at least 8 chars | Use password ≥ 8 characters |
| 400 | Passwords do not match | Ensure both passwords are identical |
| 400 | Email already registered | Use different email or login |

---

## 🔄 Request/Response Flow

```
1. POST /register (public)
   ├─ Validate inputs
   ├─ Check email uniqueness
   ├─ Hash password (bcrypt)
   ├─ Create organizer record
   └─ Return JWT token + organizer data

2. User automatically logged in
   └─ Token valid for 7 days

3. Use token for protected endpoints
   └─ Add header: Authorization: Bearer {{token}}
```

---

## 🛠️ Testing Tools

### VS Code REST Client
Save as `.http` file:
```
POST http://localhost:3000/api/organizers/auth/register
Content-Type: application/json

{
  "email": "organizer@example.com",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123",
  "name": "Event Company",
  "phone": "+1234567890",
  "contactPerson": "John Doe"
}
```

### Postman
1. Import: `Organizer_Register_Auth_API.postman_collection.json`
2. Set `{{baseUrl}}` to `http://localhost:3000`
3. Run requests in order (token auto-saved)

### Insomnia
1. Import: `Organizer_Register_Auth_API.insomnia.json`
2. Set `BASE_URL` environment variable
3. Run Register request, then use other endpoints

### CLI Script
```bash
bash organizer-api-commands.sh
```

### JavaScript/Fetch
```javascript
const response = await fetch('http://localhost:3000/api/organizers/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'organizer@example.com',
    password: 'SecurePass123',
    confirmPassword: 'SecurePass123',
    name: 'Event Company',
    phone: '+1234567890',
    contactPerson: 'John Doe'
  })
});
const data = await response.json();
const token = data.token; // Save for later use
```

---

## 🔐 Security

✅ **Password Hashing:** bcrypt (12 salt rounds)  
✅ **Email Uniqueness:** Database unique index  
✅ **Token Expiry:** 7 days  
✅ **HTTP-Only Cookie:** CSRF protection  
✅ **Input Validation:** All fields validated  
✅ **Status Check:** Only active accounts allowed  

---

## 🚨 Common Issues

**Q: "Email already registered"**  
A: That email exists. Use a different email or login if you already have an account.

**Q: "Passwords do not match"**  
A: Your password and confirmPassword fields don't match. Make sure they're identical.

**Q: "Password must be at least 8 characters"**  
A: Use a password with minimum 8 characters.

**Q: Token not working on protected endpoints**  
A: Check the Authorization header format: `Bearer YOUR_TOKEN_HERE`

---

## 📚 Related Resources

- [Full Registration Documentation](./ORGANIZER_REGISTER_API.md)
- [Auth Controller Code](./src/features/organizers/organizer.auth.controller.js)
- [Auth Routes](./src/features/organizers/organizer.auth.routes.js)
- [Organizer Model](./src/features/organizers/organizer.model.js)

---

## 🔗 API Endpoints Reference

**Base URL:** `http://localhost:3000`

**Public Endpoints:**
- `POST /api/organizers/auth/register` - Register
- `POST /api/organizers/auth/login` - Login

**Protected Endpoints (require token):**
- `GET /api/organizers/auth/profile` - Get profile
- `PATCH /api/organizers/auth/profile` - Update profile
- `PATCH /api/organizers/auth/change-password` - Change password
- `GET /api/organizers/auth/logout` - Logout

---

## 💡 Tips

1. **First Request:** Always register or login first to get a token
2. **Save Token:** Store token in localStorage or environment variable
3. **Use Token:** Add `Authorization: Bearer {token}` to protected requests
4. **Password Strength:** Use mix of uppercase, lowercase, numbers, special chars
5. **Email Format:** Standard email validation (user@domain.com)
6. **Phone Format:** Any format accepted (no validation)

---

## 📞 Response Headers

All responses include:
```
Content-Type: application/json
Set-Cookie: organizerJwt={token}; HttpOnly; SameSite=Strict
```

---

**Version:** 1.0  
**Last Updated:** April 2026  
**Status:** Production Ready ✅
