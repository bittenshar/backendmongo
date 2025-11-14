# 📢 Ads API - Quick Reference

## Public Endpoints (No Auth)

### Get Active Ads
```
GET /api/ads/active?targetAudience=all
```
Response: Array of approved ads currently active

### Get Single Ad
```
GET /api/ads/:id
```
Response: Ad details

### Record Ad Click
```
POST /api/ads/:id/click
```
Body: `{}`
Response: Click count + redirect URL

---

## Organizer Endpoints (Auth Required)

### Create New Ad
```
POST /api/ads
Form: organizerId, title, description, adType, targetUrl, 
      displayDuration, priority, startDate, endDate, 
      budget, targetAudience, image (file)
```
Response: Created ad (status: pending)

### Get My Ads
```
GET /api/ads/organizer/:organizerId?status=pending
```
Response: All ads by organizer

### Update Ad
```
PATCH /api/ads/:id
Form: organizerId, title, description, ... (same as create)
      image (optional)
```
Note: Only pending ads can be edited

### Delete Ad
```
DELETE /api/ads/:id
Body: { "organizerId": "ORG_ID" }
```
Removes ad and S3 image

### Get Analytics
```
GET /api/ads/:id/analytics
```
Response: impressions, clicks, CTR, budget info

---

## Admin Endpoints (Admin Auth Required)

### Get Pending Ads
```
GET /api/ads/admin/pending-ads
```
Response: All ads awaiting review

### Approve Ad
```
PATCH /api/ads/:id/approve
```
Response: Ad with status: approved

### Reject Ad
```
PATCH /api/ads/:id/reject
Body: { "rejectionReason": "Text" }
```
Response: Ad with status: rejected

---

## Quick Test

### Fetch Active Ads
```bash
curl http://localhost:3000/api/ads/active
```

### Create Ad
```bash
curl -X POST http://localhost:3000/api/ads \
  -H "Authorization: Bearer TOKEN" \
  -F "organizerId=ORG_ID" \
  -F "title=My Ad" \
  -F "adType=promotional" \
  -F "targetUrl=https://example.com" \
  -F "displayDuration=5" \
  -F "priority=5" \
  -F "startDate=2025-11-15T00:00:00Z" \
  -F "endDate=2025-11-30T23:59:59Z" \
  -F "image=@image.jpg"
```

### Record Click
```bash
curl -X POST http://localhost:3000/api/ads/AD_ID/click
```

---

## Key Fields

| Field | Type | Notes |
|-------|------|-------|
| organizerId | ObjectId | Required - Organizer creating ad |
| title | String | Max 100 chars |
| description | String | Max 500 chars |
| imageUrl | String | Auto-generated from S3 upload |
| adType | String | banner, promotional, announcement, sponsored, event |
| targetUrl | String | Where users go when clicking |
| displayDuration | Number | Seconds to show (1-60) |
| priority | Number | 0-10, higher = more frequent |
| startDate | Date | When ad becomes active |
| endDate | Date | When ad stops showing |
| status | String | pending → approved/rejected |
| impressions | Number | Auto-incremented on view |
| clicks | Number | Auto-incremented on click |
| ctr | Number | Click-through rate % |

---

## Response Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success (GET, PATCH) |
| 201 | Created (POST) |
| 204 | Deleted |
| 400 | Bad request |
| 401 | Not authenticated |
| 403 | Not authorized |
| 404 | Not found |
| 500 | Server error |

---

## Android App Usage

```kotlin
// 1. Fetch ads on app load
val ads = api.get("/api/ads/active").data.ads

// 2. Show ads in rotation
for (ad in ads) {
    showImage(ad.imageUrl, duration = ad.displayDuration)
    recordClick(ad.id) // when user taps
    openUrl(ad.targetUrl)
}

// 3. Analytics
// Impressions auto-tracked on fetch
// Clicks auto-tracked on POST /api/ads/:id/click
```

---

## File Limits

- Image size: 5 MB max
- Formats: JPEG, PNG, GIF, WebP
- Upload via `multipart/form-data`

---

## Error Handling

```javascript
// Check status in response
if (response.status !== 'success') {
  console.error(response.message);
}

// Common errors:
// - "Start date must be before end date"
// - "Only pending ads can be edited"
// - "You do not have permission to update this ad"
// - "Ad not found"
```

---

✅ **Ready to use!**
