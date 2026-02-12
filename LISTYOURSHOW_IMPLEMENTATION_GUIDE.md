# List Your Show - Partner Inquiry Implementation Summary

## 📋 Quick Overview

A complete **Partner Inquiry Management System** for the "List Your Show" feature has been implemented. This allows users to submit inquiries to become event organizers, promoters, or venue partners.

## 📦 What Was Created

### Backend Files (3 files)

#### 1. **listyourshow_inquiry.model.js**
- MongoDB model with complete schema
- Validation for all fields
- Indexes for optimal query performance
- Status tracking (submitted → under-review → approved/rejected)

#### 2. **listyourshow.controller.js**
- 7 controller functions for complete CRUD operations
- User endpoints: create, read, list, delete
- Admin endpoints: all inquiries, statistics, status update
- Full error handling and validation

#### 3. **listyourshow.routes.js**
- RESTful API routes
- Protected routes with JWT authentication
- Admin-only routes with role restriction
- 7 endpoints total (4 user + 3 admin)

### Frontend Files (1 file)

#### 4. **listyourshow-inquiry-form.html**
- Standalone, fully functional HTML form
- Beautiful gradient UI with responsive design
- Real-time validation and error display
- Character counter for message field
- Loading states during submission
- Success/error messaging

### Documentation Files (2 files)

#### 5. **LISTYOURSHOW_INQUIRY_API.md**
- Complete API documentation
- All endpoint descriptions with examples
- Request/response formats
- Validation rules
- Error handling guide
- cURL testing examples

#### 6. **ListYourShow_Inquiry_API.postman_collection.json**
- Ready-to-use Postman collection
- All 7 endpoints configured
- Pre-built request templates
- Variable templates for easy testing

## 🔗 Server Integration

The routes are already integrated into your server (`src/server.js`):

```javascript
// Import
const listyourshowRoutes = require('./features/listyourshow/listyourshow.routes');

// Use
app.use('/api/listyourshow', listyourshowRoutes);
```

## 🚀 API Endpoints (7 Total)

### User Endpoints (4)
```
POST   /api/listyourshow/inquiry              - Create inquiry
GET    /api/listyourshow/my-inquiries         - Get user's inquiries
GET    /api/listyourshow/inquiry/:inquiryId   - Get inquiry details
DELETE /api/listyourshow/inquiry/:inquiryId   - Delete inquiry
```

### Admin Endpoints (3)
```
GET    /api/listyourshow/inquiries            - Get all inquiries (with filters)
GET    /api/listyourshow/stats                - Get statistics
PATCH  /api/listyourshow/inquiry/:id/status   - Update status
```

## 🎯 Key Features

✅ **Complete CRUD Operations**
- Create new inquiries
- Read own or all inquiries
- Update status (admin)
- Delete inquiries

✅ **Data Validation**
- Email format validation
- Phone number validation (10 digits)
- Message length validation (20-2000 chars)
- Enum validation for types and levels

✅ **Role-Based Access Control**
- Users can only access their own inquiries
- Admins can access and manage all inquiries
- Status update restricted to admins

✅ **Advanced Admin Features**
- Filter inquiries by status, partnership type, city
- Pagination support
- Sorting (newest, oldest, by name)
- Statistics aggregation
- Admin notes tracking
- Review tracking with reviewer info

✅ **User-Friendly Form**
- Responsive design (mobile-compatible)
- Real-time validation feedback
- Character counter for long text
- Loading indicator during submission
- Success/error messages
- Auto-scroll to errors

## 📊 Database Schema

```
ListYourShowInquiry
├── Personal Info
│   ├── fullName (string)
│   ├── email (string, validated)
│   ├── phone (string, 10-digit)
│   └── userId (reference to User)
│
├── Organization Details
│   ├── organizationName (string)
│   ├── city (string)
│   └── state (string)
│
├── Partnership Details
│   ├── partnershipType (enum)
│   ├── eventType (enum)
│   ├── experienceLevel (enum)
│   └── message (string, 20-2000 chars)
│
└── Status Management
    ├── status (enum: submitted|under-review|approved|rejected|contacted)
    ├── adminNotes (string)
    ├── reviewedBy (reference to User)
    ├── reviewedAt (date)
    ├── contactAttempts (number)
    ├── lastContactedAt (date)
    └── timestamps (createdAt, updatedAt)
```

## 🧪 Testing Guide

### 1. Test the HTML Form
```
Open in browser: http://localhost:3000/listyourshow-inquiry-form.html
Fill out form and submit
Check success message
```

### 2. Test with Postman
```
1. Import: ListYourShow_Inquiry_API.postman_collection.json
2. Set base_url: http://localhost:3000
3. Set token: Your JWT user token
4. Set admin_token: Your JWT admin token
5. Run requests
```

### 3. Test with cURL
```bash
# Create inquiry
curl -X POST http://localhost:3000/api/listyourshow/inquiry \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"John","email":"john@test.com",...}'

# Get my inquiries
curl -X GET "http://localhost:3000/api/listyourshow/my-inquiries" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get all (admin)
curl -X GET "http://localhost:3000/api/listyourshow/inquiries" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## 📋 Validation Rules

| Field | Rules |
|-------|-------|
| fullName | Min 2 chars |
| email | Valid email format |
| phone | Exactly 10 digits |
| organizationName | Min 2 chars |
| city | Min 2 chars |
| state | Min 2 chars |
| message | 20-2000 chars |
| partnershipType | organizer\|promoter\|venue_partner\|other |
| eventType | concerts\|theater\|comedy\|sports\|workshops\|conferences\|other |
| experienceLevel | beginner\|intermediate\|experienced\|expert |

## 🔐 Authentication Requirements

All endpoints require JWT token in `Authorization: Bearer <token>` header

- **User endpoints**: Any authenticated user
- **Admin endpoints**: Only users with `role: 'admin'`

## 📝 Status Workflow

```
submitted 
    ↓
under-review
    ↓
    ├→ approved
    │
    └→ rejected
    
Can also mark as "contacted" when following up
```

## 🔍 Admin Features

### Filter Inquiries By:
- Status (submitted, under-review, approved, rejected, contacted)
- Partnership Type (organizer, promoter, venue_partner, other)
- City (case-insensitive search)
- Pagination (page, limit)
- Sorting (newest, oldest, name)

### View Statistics For:
- Count by status
- Count by partnership type
- Count by event type
- Total inquiries

### Manage Inquiries:
- Add admin notes
- Update status
- Track who reviewed (reviewedBy)
- Track when reviewed (reviewedAt)
- Monitor contact attempts
- Track last contact date

## 🎨 Customization Guide

### Change Form API Endpoint
Edit in `listyourshow-inquiry-form.html`, line ~260:
```javascript
const response = await fetch('/api/listyourshow/inquiry', {
```

### Change Form Styling
Edit CSS in `listyourshow-inquiry-form.html`, starting at line ~10

### Add More Partnership Types
Edit in model and form:
```javascript
partnershipType: {
  type: String,
  enum: ['organizer', 'promoter', 'venue_partner', 'other', 'NEW_TYPE'],
  required: true
}
```

### Add File Upload
Modify the model to accept file URLs and add upload handler before saving

## 📈 Scalability Considerations

✅ **Indexed fields** for faster queries:
- `{ status: 1, submittedAt: -1 }`
- `{ email: 1 }`
- `{ userId: 1, submittedAt: -1 }`

✅ **Pagination support** prevents loading all records

✅ **Separate admin routes** don't burden user endpoints

✅ **Aggregation pipelines** for statistics without loading all documents

## 🔧 Troubleshooting

### Form submits but no data appears:
1. Check JWT token is valid
2. Check Authorization header is set
3. Check API endpoint URL is correct
4. Check server is running
5. Check MongoDB connection is active

### Admin can't filter inquiries:
1. Verify admin role in JWT token
2. Check field names in query parameters
3. Verify MongoDB indexes are created

### Form validation errors don't show:
1. Check browser console for JavaScript errors
2. Verify form HTML is not modified
3. Check CSS is not hiding error messages

## 📚 Additional Resources

- Full API Docs: `LISTYOURSHOW_INQUIRY_API.md`
- Postman Collection: `ListYourShow_Inquiry_API.postman_collection.json`
- HTML Form: `listyourshow-inquiry-form.html`
- Model: `src/features/listyourshow/listyourshow_inquiry.model.js`
- Controller: `src/features/listyourshow/listyourshow.controller.js`
- Routes: `src/features/listyourshow/listyourshow.routes.js`

## 🚀 Next Steps

1. **Test the API** using provided Postman collection
2. **Integrate form** into your frontend app
3. **Customize** partnership/event types as needed
4. **Set up email notifications** when status changes (optional enhancement)
5. **Configure file uploads** for attachments (optional enhancement)
6. **Add SMS notifications** for key updates (optional enhancement)

## 📞 Support

Refer to `LISTYOURSHOW_INQUIRY_API.md` for:
- Detailed endpoint documentation
- Request/response examples
- Error handling guide
- Complete validation rules
- cURL testing commands

---

**Created:** February 12, 2024
**Version:** 1.0.0
**Status:** Production Ready ✅
