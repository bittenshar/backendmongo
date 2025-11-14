# 📢 Ads Management API Documentation

Complete API reference for managing ads in your Android app.

---

## 🚀 Overview

The Ads Management API allows:
- ✅ Organizers to upload and manage promotional ads
- ✅ Android app to fetch active ads for display
- ✅ Track ad impressions and clicks
- ✅ Admin approval/rejection workflow
- ✅ Analytics and performance metrics

---

## 📋 Base URL

```
http://localhost:3000/api/ads
```

---

## 🔑 Authentication

### Headers Required
```javascript
// For protected endpoints (organizer/admin)
{
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'application/json'
}

// For image upload
{
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'multipart/form-data'
}
```

---

## 📌 Endpoints

### 1️⃣ Get Active Ads (Public - For Android App)

**Retrieve all active ads ready to display**

```
GET /api/ads/active
```

**Query Parameters:**
```
?targetAudience=all        // all, premium, free, organizers, participants
```

**Response:**
```json
{
  "status": "success",
  "results": 2,
  "data": {
    "ads": [
      {
        "_id": "OBJECT_ID",
        "organizerId": "ORG_ID",
        "title": "Tech Conference 2025",
        "description": "Join us for the biggest tech event",
        "imageUrl": "https://s3.amazonaws.com/...",
        "adType": "promotional",
        "targetUrl": "https://example.com/event",
        "displayDuration": 5,
        "priority": 8,
        "impressions": 150,
        "clicks": 12,
        "targetAudience": "all",
        "status": "approved",
        "createdAt": "2025-11-13T10:00:00Z"
      }
    ]
  }
}
```

**Use Case:** Call this every time user opens the app to get fresh ads

---

### 2️⃣ Create New Ad (Protected - Organizer)

**Upload new ad with image**

```
POST /api/ads
Content-Type: multipart/form-data
Authorization: Bearer TOKEN
```

**Request (Form Data):**
```
organizerId          : "ORG_ID"
title                : "Tech Conference 2025"
description          : "Join us for the biggest tech event"
adType              : "promotional"  // banner, promotional, announcement, sponsored, event
targetUrl           : "https://example.com/event"
displayDuration     : 5
priority            : 8
startDate           : "2025-11-15T00:00:00Z"
endDate             : "2025-11-30T23:59:59Z"
image               : <FILE>
budget              : 5000
targetAudience      : "all"            // all, premium, free, organizers, participants
tags                : "tech,conference,2025"
```

**Response:**
```json
{
  "status": "success",
  "message": "Ad created successfully. Awaiting admin approval.",
  "data": {
    "ad": {
      "_id": "NEW_AD_ID",
      "organizerId": "ORG_ID",
      "title": "Tech Conference 2025",
      "imageUrl": "https://s3.amazonaws.com/ads/...",
      "status": "pending",
      "createdAt": "2025-11-13T10:00:00Z"
    }
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/ads \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "organizerId=ORG_ID" \
  -F "title=Tech Conference 2025" \
  -F "description=Join us for the biggest tech event" \
  -F "adType=promotional" \
  -F "targetUrl=https://example.com" \
  -F "displayDuration=5" \
  -F "priority=8" \
  -F "startDate=2025-11-15T00:00:00Z" \
  -F "endDate=2025-11-30T23:59:59Z" \
  -F "budget=5000" \
  -F "targetAudience=all" \
  -F "image=@/path/to/image.jpg"
```

---

### 3️⃣ Get Single Ad

**Retrieve ad details by ID**

```
GET /api/ads/:id
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "ad": {
      "_id": "AD_ID",
      "organizerId": "ORG_ID",
      "title": "Tech Conference",
      "description": "Join the event",
      "imageUrl": "https://...",
      "adType": "promotional",
      "targetUrl": "https://example.com",
      "displayDuration": 5,
      "priority": 8,
      "impressions": 1050,
      "clicks": 42,
      "startDate": "2025-11-15T00:00:00Z",
      "endDate": "2025-11-30T23:59:59Z",
      "status": "approved"
    }
  }
}
```

---

### 4️⃣ Record Ad Click (Public - Android App)

**Record when user clicks on ad**

```
POST /api/ads/:id/click
```

**Response:**
```json
{
  "status": "success",
  "message": "Click recorded",
  "data": {
    "clicks": 43,
    "redirectUrl": "https://example.com/event"
  }
}
```

**Android Integration:**
```kotlin
// When user clicks on ad banner
val adId = "AD_ID"
// Fire request to record click
// Then open redirectUrl in browser
```

---

### 5️⃣ Get Organizer Ads (Protected)

**Get all ads for specific organizer**

```
GET /api/ads/organizer/:organizerId
```

**Query Parameters:**
```
?status=pending      // pending, approved, rejected, archived
```

**Response:**
```json
{
  "status": "success",
  "results": 5,
  "data": {
    "ads": [
      { /* ad objects */ }
    ]
  }
}
```

---

### 6️⃣ Update Ad (Protected - Organizer)

**Update pending ad with optional new image**

```
PATCH /api/ads/:id
Content-Type: multipart/form-data
Authorization: Bearer TOKEN
```

**Request (only pending ads can be edited):**
```
organizerId          : "ORG_ID"
title                : "Updated Title"
description          : "Updated description"
adType              : "promotional"
targetUrl           : "https://new-url.com"
displayDuration     : 6
priority            : 9
startDate           : "2025-11-16T00:00:00Z"
endDate             : "2025-12-01T23:59:59Z"
image               : <NEW_FILE> (optional)
budget              : 6000
targetAudience      : "all"
```

**Response:**
```json
{
  "status": "success",
  "message": "Ad updated successfully",
  "data": {
    "ad": { /* updated ad */ }
  }
}
```

**Note:** Only ads with `status: "pending"` can be edited

---

### 7️⃣ Delete Ad (Protected - Organizer)

**Delete ad and remove image from S3**

```
DELETE /api/ads/:id
Content-Type: application/json
Authorization: Bearer TOKEN
```

**Request Body:**
```json
{
  "organizerId": "ORG_ID"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Ad deleted successfully"
}
```

---

### 8️⃣ Get Ad Analytics (Protected)

**View ad performance metrics**

```
GET /api/ads/:id/analytics
Authorization: Bearer TOKEN
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "analytics": {
      "title": "Tech Conference",
      "impressions": 1050,
      "clicks": 42,
      "ctr": "4.00%",
      "status": "approved",
      "startDate": "2025-11-15T00:00:00Z",
      "endDate": "2025-11-30T23:59:59Z",
      "budget": 5000,
      "displayDuration": 5
    }
  }
}
```

**Metrics Explained:**
- **Impressions:** Total times ad was shown to users
- **Clicks:** Total times ad was clicked
- **CTR:** Click-through rate (clicks/impressions × 100)

---

## 🛡️ Admin-Only Endpoints

### Get Pending Ads for Review

**View all ads awaiting approval**

```
GET /api/ads/admin/pending-ads
Authorization: Bearer ADMIN_TOKEN
```

**Response:**
```json
{
  "status": "success",
  "results": 3,
  "data": {
    "ads": [
      {
        "_id": "AD_ID",
        "title": "Pending Ad",
        "organizerId": {
          "_id": "ORG_ID",
          "name": "Event Organizers Inc",
          "email": "info@organizers.com"
        },
        "status": "pending",
        "createdAt": "2025-11-13T10:00:00Z"
      }
    ]
  }
}
```

---

### Approve Ad

**Approve pending ad for display**

```
PATCH /api/ads/:id/approve
Authorization: Bearer ADMIN_TOKEN
```

**Response:**
```json
{
  "status": "success",
  "message": "Ad approved successfully",
  "data": {
    "ad": { /* approved ad with status: approved */ }
  }
}
```

---

### Reject Ad

**Reject ad and provide reason**

```
PATCH /api/ads/:id/reject
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json
```

**Request:**
```json
{
  "rejectionReason": "Image quality too low or inappropriate content"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Ad rejected",
  "data": {
    "ad": {
      "_id": "AD_ID",
      "status": "rejected",
      "rejectionReason": "Image quality too low or inappropriate content"
    }
  }
}
```

---

## 📊 Ad Schema

### Complete Ad Object

```json
{
  "_id": "MongoDB ObjectId",
  "organizerId": "ObjectId (Organizer reference)",
  "title": "String (max 100 chars)",
  "description": "String (max 500 chars)",
  "imageUrl": "String (S3 URL)",
  "imageKey": "String (S3 key)",
  "adType": "String (banner|promotional|announcement|sponsored|event)",
  "targetUrl": "String (redirect URL on click)",
  "displayDuration": "Number (seconds, default: 5)",
  "priority": "Number (0-10, higher = more frequent)",
  "startDate": "Date (when ad starts showing)",
  "endDate": "Date (when ad stops showing)",
  "isActive": "Boolean (manual enable/disable)",
  "impressions": "Number (times shown)",
  "clicks": "Number (times clicked)",
  "ctr": "Number (click-through rate %)",
  "status": "String (pending|approved|rejected|archived)",
  "rejectionReason": "String (why rejected)",
  "tags": "Array of Strings",
  "budget": "Number (marketing budget)",
  "targetAudience": "String (all|premium|free|organizers|participants)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

## 🔄 Ad Lifecycle

```
1. Organizer Creates Ad (status: pending)
   ↓
2. Admin Reviews Pending Ad
   ├─ APPROVED → Ad starts displaying when conditions met
   └─ REJECTED → Organizer notified, can edit and resubmit
   
3. Active Display Period
   ├─ User sees ad → Impression counted
   ├─ User clicks ad → Click counted + redirected to targetUrl
   └─ CTR calculated automatically
   
4. End Date Reached or Manually Disabled
   └─ Ad stops displaying (status remains approved)
   
5. Organizer Can Delete Approved/Rejected Ads
```

---

## 🎯 Android App Integration

### Fetch Ads on App Start
```kotlin
// Kotlin/Android example
suspend fun fetchAds(): List<Ad> {
    return api.get("/api/ads/active").data.ads
}

// Display in RecyclerView
val ads = fetchAds()
adapter.submitList(ads)
```

### Handle Ad Click
```kotlin
fun onAdClicked(ad: Ad) {
    // 1. Record click
    api.post("/api/ads/${ad.id}/click")
    
    // 2. Open URL
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(ad.targetUrl))
    startActivity(intent)
}
```

### Display Ads with Timer
```kotlin
// Show each ad for displayDuration seconds
ads.forEach { ad ->
    showAdImage(ad.imageUrl)
    delay(ad.displayDuration * 1000L)
    nextAd()
}
```

---

## ⚠️ Error Responses

### 400 - Bad Request
```json
{
  "status": "fail",
  "message": "Start date must be before end date"
}
```

### 401 - Unauthorized
```json
{
  "status": "fail",
  "message": "You are not logged in. Please log in to get access."
}
```

### 403 - Forbidden (Not Owner)
```json
{
  "status": "fail",
  "message": "You do not have permission to update this ad"
}
```

### 404 - Not Found
```json
{
  "status": "fail",
  "message": "Ad not found"
}
```

### 500 - Server Error
```json
{
  "status": "error",
  "message": "Failed to upload image: AWS S3 error"
}
```

---

## 📋 Request Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Image Size | 5 MB | JPEG, PNG, GIF, WebP only |
| Ad Title | 100 chars | Max length |
| Description | 500 chars | Max length |
| Priority | 0-10 | Higher = more frequent rotation |
| Display Duration | 1-60 sec | How long ad shows |

---

## 🧪 Testing Examples

### Create Ad with cURL
```bash
curl -X POST http://localhost:3000/api/ads \
  -H "Authorization: Bearer eyJ..." \
  -F "organizerId=691337e4c4145e1999997a49" \
  -F "title=Amazing Tech Conference" \
  -F "description=Don't miss our annual tech summit" \
  -F "adType=promotional" \
  -F "targetUrl=https://techconf.com" \
  -F "displayDuration=5" \
  -F "priority=8" \
  -F "startDate=2025-11-15T00:00:00Z" \
  -F "endDate=2025-12-01T23:59:59Z" \
  -F "budget=5000" \
  -F "targetAudience=all" \
  -F "image=@ad-image.jpg"
```

### Get Active Ads with cURL
```bash
curl -X GET "http://localhost:3000/api/ads/active?targetAudience=all" \
  -H "Content-Type: application/json"
```

### Record Click with cURL
```bash
curl -X POST http://localhost:3000/api/ads/691337e4c4145e1999997a49/click \
  -H "Content-Type: application/json"
```

### Get Analytics with cURL
```bash
curl -X GET http://localhost:3000/api/ads/691337e4c4145e1999997a49/analytics \
  -H "Authorization: Bearer eyJ..."
```

---

## 💡 Best Practices

✅ **Do:**
- Rotate ads based on priority (higher priority shown more often)
- Cache ads locally on Android and refresh every 5 minutes
- Show ads only when displayDuration allows
- Track impressions before displaying
- Handle errors gracefully

❌ **Don't:**
- Show ads with status other than "approved"
- Ignore targetAudience filters
- Show expired ads (past endDate)
- Make impression count requests on every render
- Upload images larger than 5MB

---

## 📞 Support

For issues or questions:
- Check Postman collection: `user-verification-api.postman_collection.json`
- Review error messages for specific issues
- Contact admin for ad rejection reasons

**All endpoints ready for production!** ✅
