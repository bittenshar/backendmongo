# List Your Show - Partner Inquiry API Documentation

## Overview
The List Your Show Partner Inquiry API enables users to submit inquiries to become event organizers or partners for the "List Your Show" platform. This feature includes complete CRUD operations, admin review capabilities, and a user-friendly form.

---

## 📁 File Structure

```
src/features/listyourshow/
├── listyourshow_inquiry.model.js    # MongoDB Model
├── listyourshow.controller.js       # API Controllers
└── listyourshow.routes.js          # Express Routes

Root directory:
└── listyourshow-inquiry-form.html   # Standalone HTML Form
```

---

## 🗄️ Database Model

### ListYourShowInquiry Schema

```javascript
{
  userId: ObjectId (required) - Reference to User model
  fullName: String (required) - Inquiry submitter's full name
  email: String (required) - Email address (validated)
  phone: String (required) - 10-digit phone number
  organizationName: String (required) - Organization/Company name
  city: String (required) - City location
  state: String (required) - State location
  
  // Partnership Details
  partnershipType: String (enum: 'organizer', 'promoter', 'venue_partner', 'other')
  eventType: String (enum: 'concerts', 'theater', 'comedy', 'sports', 'workshops', 'conferences', 'other')
  experienceLevel: String (enum: 'beginner', 'intermediate', 'experienced', 'expert')
  
  message: String (required, 20-2000 characters)
  attachmentUrl: String (optional)
  
  // Status & Review
  status: String (enum: 'submitted', 'under-review', 'approved', 'rejected', 'contacted')
  adminNotes: String
  reviewedBy: ObjectId - Reference to admin user
  reviewedAt: Date
  
  // Contact Tracking
  contactAttempts: Number (default: 0)
  lastContactedAt: Date
  
  timestamps: submittedAt, updatedAt
}
```

---

## 🔌 API Endpoints

All protected endpoints require authentication via JWT token in the `Authorization` header.

### 1. CREATE INQUIRY (User)
**Create a new partner inquiry for the platform**

```
POST /api/listyourshow/inquiry
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "organizationName": "Amazing Events Inc",
  "city": "Mumbai",
  "state": "Maharashtra",
  "partnershipType": "organizer",
  "eventType": "concerts",
  "experienceLevel": "experienced",
  "message": "We have been organizing concerts for the past 5 years with excellent track record."
}
```

**Response (201 - Created):**
```json
{
  "status": "success",
  "message": "Inquiry submitted successfully. We will review it and contact you soon.",
  "data": {
    "inquiry": {
      "_id": "65abc123xyz",
      "userId": "64xyz",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "organizationName": "Amazing Events Inc",
      "city": "Mumbai",
      "state": "Maharashtra",
      "partnershipType": "organizer",
      "eventType": "concerts",
      "experienceLevel": "experienced",
      "message": "We have been organizing concerts...",
      "status": "submitted",
      "submittedAt": "2024-02-12T10:30:00.000Z",
      "updatedAt": "2024-02-12T10:30:00.000Z"
    }
  }
}
```

---

### 2. GET MY INQUIRIES (User)
**Fetch all inquiries submitted by the current user**

```
GET /api/listyourshow/my-inquiries?page=1&limit=10
Authorization: Bearer <token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Records per page (default: 10)

**Response (200 - OK):**
```json
{
  "status": "success",
  "data": {
    "inquiries": [
      {
        "_id": "65abc123xyz",
        "userId": {
          "_id": "64xyz",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "fullName": "John Doe",
        "email": "john@example.com",
        "organizationName": "Amazing Events Inc",
        "status": "under-review",
        "submittedAt": "2024-02-12T10:30:00.000Z",
        "updatedAt": "2024-02-12T12:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 2,
      "pages": 1,
      "currentPage": 1,
      "limit": 10
    }
  }
}
```

---

### 3. GET INQUIRY DETAILS (User)
**Fetch details of a specific inquiry**

```
GET /api/listyourshow/inquiry/:inquiryId
Authorization: Bearer <token>
```

**Parameters:**
- `inquiryId`: MongoDB ObjectId of the inquiry

**Response (200 - OK):**
```json
{
  "status": "success",
  "data": {
    "inquiry": {
      "_id": "65abc123xyz",
      "userId": { ... },
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "organizationName": "Amazing Events Inc",
      "city": "Mumbai",
      "state": "Maharashtra",
      "partnershipType": "organizer",
      "eventType": "concerts",
      "experienceLevel": "experienced",
      "message": "We have been organizing concerts...",
      "status": "under-review",
      "adminNotes": "Looks promising, pending verification",
      "reviewedBy": { "_id": "..." },
      "reviewedAt": "2024-02-12T12:00:00.000Z",
      "contactAttempts": 0,
      "lastContactedAt": null,
      "submittedAt": "2024-02-12T10:30:00.000Z",
      "updatedAt": "2024-02-12T12:00:00.000Z"
    }
  }
}
```

---

### 4. DELETE INQUIRY (User)
**Delete an inquiry (only own inquiries or admin)**

```
DELETE /api/listyourshow/inquiry/:inquiryId
Authorization: Bearer <token>
```

**Response (204 - No Content):**
```json
{
  "status": "success",
  "message": "Inquiry deleted successfully"
}
```

---

## 👨‍💼 ADMIN ENDPOINTS

All admin endpoints require `role: 'admin'` in the JWT token.

### 5. GET ALL INQUIRIES (Admin)
**Retrieve all inquiries with filtering and pagination**

```
GET /api/listyourshow/inquiries?status=submitted&partnershipType=organizer&city=Mumbai&page=1&limit=10&sort=newest
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `status`: Filter by status (submitted, under-review, approved, rejected, contacted)
- `partnershipType`: Filter by partnership type
- `city`: Filter by city (case-insensitive partial match)
- `page`: Page number (default: 1)
- `limit`: Records per page (default: 10)
- `sort`: Sort order (newest, oldest, name) - default: newest

**Response (200 - OK):**
```json
{
  "status": "success",
  "data": {
    "inquiries": [ ... ],
    "pagination": {
      "total": 45,
      "pages": 5,
      "currentPage": 1,
      "limit": 10
    }
  }
}
```

---

### 6. GET INQUIRY STATISTICS (Admin)
**Get analytics about inquiries**

```
GET /api/listyourshow/stats
Authorization: Bearer <admin_token>
```

**Response (200 - OK):**
```json
{
  "status": "success",
  "data": {
    "byStatus": [
      { "_id": "submitted", "count": 15 },
      { "_id": "under-review", "count": 8 },
      { "_id": "approved", "count": 12 },
      { "_id": "rejected", "count": 3 },
      { "_id": "contacted", "count": 20 }
    ],
    "byPartnershipType": [
      { "_id": "organizer", "count": 30 },
      { "_id": "promoter", "count": 15 },
      { "_id": "venue_partner", "count": 10 },
      { "_id": "other", "count": 3 }
    ],
    "byEventType": [
      { "_id": "concerts", "count": 25 },
      { "_id": "theater", "count": 12 },
      { "_id": "comedy", "count": 8 },
      { "_id": "conferences", "count": 7 },
      { "_id": "other", "count": 6 }
    ],
    "total": 58
  }
}
```

---

### 7. UPDATE INQUIRY STATUS (Admin)
**Update inquiry status and add admin notes**

```
PATCH /api/listyourshow/inquiry/:inquiryId/status
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "approved",
  "adminNotes": "Organization verified. Contact details validated. Approved for partnership program."
}
```

**Valid Status Values:**
- `submitted` - Initial status when first created
- `under-review` - Currently being reviewed by admin
- `approved` - Approved to become a partner
- `rejected` - Rejected with a reason
- `contacted` - Admin has contacted the applicant

**Response (200 - OK):**
```json
{
  "status": "success",
  "message": "Inquiry status updated successfully",
  "data": {
    "inquiry": {
      "_id": "65abc123xyz",
      "status": "approved",
      "adminNotes": "Organization verified...",
      "reviewedBy": "64admin_id",
      "reviewedAt": "2024-02-12T15:45:00.000Z",
      "updatedAt": "2024-02-12T15:45:00.000Z"
    }
  }
}
```

---

## 📝 HTML Form Usage

The standalone HTML form can be used independently without any framework.

### Basic Usage:
```html
<!-- Open the form in a browser -->
file:///path/to/listyourshow-inquiry-form.html
```

### Integration in Existing App:
```html
<!-- Embed as an iframe -->
<iframe src="/listyourshow-inquiry-form.html" width="800" height="1000"></iframe>

<!-- Or include it in a page -->
<div id="form-container">
  <!-- Include the HTML content here -->
</div>
```

### Form Features:
- ✅ Real-time field validation
- ✅ Character counter for message field
- ✅ Responsive design (mobile-friendly)
- ✅ Loading states during submission
- ✅ Error message display with field highlighting
- ✅ Success message with form reset
- ✅ Auto-scroll to first error
- ✅ Dropdown selectors for partnership type, event type, and experience level

### Customization:
Edit the form to change:
- API endpoint URL (default: `/api/listyourshow/inquiry`)
- Authorization header (add token if needed)
- Success redirect behavior
- Styling colors and fonts

---

## 🔐 Authentication & Authorization

### User Permissions:
- ✅ Create own inquiries
- ✅ View own inquiries
- ✅ Delete own inquiries
- ❌ View other users' inquiries
- ❌ Update inquiry status
- ❌ View statistics

### Admin Permissions:
- ✅ All user permissions
- ✅ View all inquiries
- ✅ Filter and search inquiries
- ✅ Update inquiry status
- ✅ Add admin notes
- ✅ View statistics
- ✅ Delete any inquiry

---

## ✅ Validation Rules

| Field | Rules |
|-------|-------|
| fullName | Min 2 characters, max 100 |
| email | Valid email format |
| phone | Exactly 10 digits |
| organizationName | Min 2 characters, max 100 |
| city | Min 2 characters, max 50 |
| state | Min 2 characters, max 50 |
| partnershipType | Must be one of: organizer, promoter, venue_partner, other |
| eventType | Must be one of: concerts, theater, comedy, sports, workshops, conferences, other |
| experienceLevel | Must be one of: beginner, intermediate, experienced, expert |
| message | Min 20, max 2000 characters |

---

## 🚨 Error Handling

### Common Error Responses:

**400 - Bad Request (Missing Fields):**
```json
{
  "status": "error",
  "message": "Please provide all required fields"
}
```

**400 - Bad Request (Duplicate Pending Inquiry):**
```json
{
  "status": "error",
  "message": "You already have a pending inquiry for this organization. Please wait for our response."
}
```

**400 - Bad Request (Validation Error):**
```json
{
  "status": "error",
  "message": "Please provide a valid 10-digit phone number"
}
```

**403 - Forbidden (Insufficient Permissions):**
```json
{
  "status": "error",
  "message": "You do not have permission to view this inquiry"
}
```

**404 - Not Found:**
```json
{
  "status": "error",
  "message": "Inquiry not found"
}
```

**500 - Internal Server Error:**
```json
{
  "status": "error",
  "message": "Internal server error"
}
```

---

## 📡 Testing with cURL

### Create an Inquiry:
```bash
curl -X POST http://localhost:3000/api/listyourshow/inquiry \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Jane Smith",
    "email": "jane@example.com",
    "phone": "9876543210",
    "organizationName": "Event Masters",
    "city": "Delhi",
    "state": "Delhi",
    "partnershipType": "promoter",
    "eventType": "theater",
    "experienceLevel": "intermediate",
    "message": "We have been organizing theater shows for 3 years with successful track record."
  }'
```

### Get My Inquiries:
```bash
curl -X GET "http://localhost:3000/api/listyourshow/my-inquiries?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get All Inquiries (Admin):
```bash
curl -X GET "http://localhost:3000/api/listyourshow/inquiries?status=submitted&page=1&limit=20" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Update Status (Admin):
```bash
curl -X PATCH http://localhost:3000/api/listyourshow/inquiry/65abc123xyz/status \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "adminNotes": "Verified and approved for partnership"
  }'
```

---

## 📊 Database Indexes

The model includes the following indexes for optimal query performance:

```javascript
// Index by status and date (for admin filtering)
{ status: 1, submittedAt: -1 }

// Index by email (for duplicate checking)
{ email: 1 }

// Index by user and date (for user's own inquiries)
{ userId: 1, submittedAt: -1 }
```

---

## 🔄 Integration Steps

### 1. Add Routes to Server:
The routes are already added to `src/server.js`:
```javascript
app.use('/api/listyourshow', listyourshowRoutes);
```

### 2. Database Setup:
MongoDB will automatically create the collection on first insert (Mongoose handles this).

### 3. Frontend Integration:
- Use the standalone HTML form: `/listyourshow-inquiry-form.html`
- Or integrate API calls in your existing frontend app
- Import the form's validation and styling

### 4. Testing:
```bash
# Start the server
npm start

# Test form at
http://localhost:3000/listyourshow-inquiry-form.html

# Or use cURL commands above
```

---

## 📈 Usage Workflow

### For Users:
1. Navigate to the inquiry form
2. Fill in all required fields
3. Submit the form
4. Receive confirmation message
5. Check status via "My Inquiries" endpoint

### For Admins:
1. View all inquiries with filters
2. Review inquiry details
3. Update status to "under-review" -> "approved" or "rejected"
4. Add notes for tracking
5. View statistics for reporting

---

## 🎯 Future Enhancements

Possible future additions:
- File upload for attachments (business licenses, portfolio)
- Email notifications when status changes
- SMS notification integration
- Scheduled outreach for pending inquiries
- Integration with partnership management system
- Document upload and storage on AWS S3
- Bulk approval/rejection for admins
- Custom inquiry templates
- Review ratings/feedback system

---

## 📞 Support

For issues or questions:
1. Check validation error messages
2. Review request/response examples
3. Check authentication token is valid
4. Verify user role permissions
5. Check server logs for detailed error messages

---

**Last Updated:** February 12, 2024
**Version:** 1.0.0
