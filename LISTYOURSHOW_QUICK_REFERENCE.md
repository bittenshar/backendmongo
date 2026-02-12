# List Your Show - Quick Reference

## 📁 File Locations

```
Backend:
├── src/features/listyourshow/listyourshow_inquiry.model.js
├── src/features/listyourshow/listyourshow.controller.js
└── src/features/listyourshow/listyourshow.routes.js

Frontend:
└── listyourshow-inquiry-form.html

Documentation:
├── LISTYOURSHOW_INQUIRY_API.md (Full docs)
├── LISTYOURSHOW_IMPLEMENTATION_GUIDE.md (Setup guide)
└── ListYourShow_Inquiry_API.postman_collection.json (Postman)
```

## 🔌 API Endpoints Summary

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/api/listyourshow/inquiry` | ✅ | User | Create inquiry |
| GET | `/api/listyourshow/my-inquiries` | ✅ | User | Get user's inquiries |
| GET | `/api/listyourshow/inquiry/:id` | ✅ | User | Get inquiry details |
| DELETE | `/api/listyourshow/inquiry/:id` | ✅ | User | Delete inquiry |
| GET | `/api/listyourshow/inquiries` | ✅ | Admin | Get all (with filters) |
| GET | `/api/listyourshow/stats` | ✅ | Admin | Get statistics |
| PATCH | `/api/listyourshow/inquiry/:id/status` | ✅ | Admin | Update status |

## 📝 Create Inquiry - Request Body

```json
{
  "fullName": "string (required, min 2)",
  "email": "string (required, valid email)",
  "phone": "string (required, 10 digits)",
  "organizationName": "string (required, min 2)",
  "city": "string (required, min 2)",
  "state": "string (required, min 2)",
  "partnershipType": "organizer|promoter|venue_partner|other",
  "eventType": "concerts|theater|comedy|sports|workshops|conferences|other",
  "experienceLevel": "beginner|intermediate|experienced|expert",
  "message": "string (required, 20-2000 chars)"
}
```

## 🔑 Query Parameters

### Get All Inquiries (Admin)
```
?status=submitted
&partnershipType=organizer
&city=Mumbai
&page=1
&limit=10
&sort=newest|oldest|name
```

### Get My Inquiries (User)
```
?page=1
&limit=10
```

## 🧪 Quick Test

### Using cURL:
```bash
# Create
curl -X POST http://localhost:3000/api/listyourshow/inquiry \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"John","email":"john@test.com","phone":"9876543210","organizationName":"Events Co","city":"Mumbai","state":"Maharashtra","partnershipType":"organizer","eventType":"concerts","experienceLevel":"experienced","message":"We organize amazing concert events with 5+ years experience"}'

# List mine
curl http://localhost:3000/api/listyourshow/my-inquiries \
  -H "Authorization: Bearer TOKEN"

# List all (admin)
curl "http://localhost:3000/api/listyourshow/inquiries?page=1&limit=20" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Update status (admin)
curl -X PATCH http://localhost:3000/api/listyourshow/inquiry/ID/status \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"approved","adminNotes":"Verified"}'
```

### Using HTML Form:
```
http://localhost:3000/listyourshow-inquiry-form.html
```

### Using Postman:
```
Import: ListYourShow_Inquiry_API.postman_collection.json
```

## 🚀 Deploy Checklist

- [x] Model created with validation
- [x] Controller with CRUD operations
- [x] Routes with authentication
- [x] Server integration
- [x] HTML form created
- [x] Documentation complete
- [x] Postman collection ready

## 💾 Database Collection

**Name:** `listyourhowquiries`

**Indexes:**
- `{ status: 1, submittedAt: -1 }`
- `{ email: 1 }`
- `{ userId: 1, submittedAt: -1 }`

## ⚙️ Status Values

- `submitted` - Initial submission
- `under-review` - Being reviewed by admin
- `approved` - Approved for partnership
- `rejected` - Not approved
- `contacted` - Admin has contacted user

## 🎓 Partnership Types

- `organizer` - Event Organizer
- `promoter` - Event Promoter
- `venue_partner` - Venue Partner
- `other` - Other

## 🎪 Event Types

- `concerts` - Concerts & Music Shows
- `theater` - Theater Performances
- `comedy` - Comedy Shows
- `sports` - Sports Events
- `workshops` - Workshops & Seminars
- `conferences` - Conferences
- `other` - Other

## 🎯 Experience Levels

- `beginner` - 0-2 years
- `intermediate` - 2-5 years
- `experienced` - 5-10 years
- `expert` - 10+ years

## 🔐 Authentication

```
Header: Authorization: Bearer {JWT_TOKEN}
```

Admin endpoint requires: `user.role === 'admin'`

## 📊 Response Format

**Success (2xx):**
```json
{
  "status": "success",
  "message": "Description",
  "data": { ... }
}
```

**Error (4xx/5xx):**
```json
{
  "status": "error",
  "message": "Error description"
}
```

## 🎨 Form Features

- ✅ Real-time validation
- ✅ Error highlighting
- ✅ Character counter
- ✅ Responsive design
- ✅ Loading states
- ✅ Success messaging
- ✅ Form reset
- ✅ Auto-error scroll

## 📚 Full Documentation

📖 **LISTYOURSHOW_INQUIRY_API.md** - Complete API reference
🚀 **LISTYOURSHOW_IMPLEMENTATION_GUIDE.md** - Implementation guide

---

**Last Updated:** Feb 12, 2024 | **v1.0.0** | **Ready to Use** ✅
