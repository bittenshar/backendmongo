# Event Creation in Postman

## Request Details

**Method:** POST  
**URL:** `http://localhost:3000/api/events`

### Headers
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Body (form-data)

| Key | Value | Type |
|-----|-------|------|
| name | Tech Conference 2025 | text |
| description | A comprehensive tech conference | text |
| date | 2025-12-15 | text |
| startTime | 09:00 | text |
| endTime | 18:00 | text |
| location | San Francisco, CA | text |
| organizer | ORGANIZER_ID (from MongoDB) | text |
| totalTickets | 500 | text |
| ticketPrice | 99.99 | text |
| category | technology | text |
| coverImage | [SELECT IMAGE FILE] | file |

### Steps in Postman

1. **Set up the request:**
   - Create new request: `POST` method
   - URL: `http://localhost:3000/api/events`

2. **Add Authorization:**
   - Go to **Auth** tab
   - Type: Bearer Token
   - Token: (paste your JWT token)

3. **Add Body (form-data):**
   - Go to **Body** tab
   - Select **form-data**
   - Add the fields listed above
   - For **coverImage**, select **File** type and choose an image from your computer

4. **Send the request**
   - Click **Send**
   - You should get a 201 response with the created event

### Example Response (Success)
```json
{
  "status": "success",
  "data": {
    "event": {
      "_id": "6789abcdef012345678901234",
      "name": "Tech Conference 2025",
      "description": "A comprehensive tech conference",
      "date": "2025-12-15",
      "startTime": "09:00",
      "endTime": "18:00",
      "location": "San Francisco, CA",
      "organizer": "ORGANIZER_ID",
      "totalTickets": 500,
      "ticketPrice": 99.99,
      "coverImage": "https://event-images-collection.s3.ap-south-1.amazonaws.com/events/temp/cover-UUID.jpg",
      "s3ImageKey": "events/temp/cover-UUID.jpg",
      "s3BucketName": "event-images-collection",
      "createdAt": "2025-11-22T...",
      "updatedAt": "2025-11-22T..."
    }
  }
}
```

### Notes

- **Authentication:** You need a valid JWT token. Get one by logging in with `/api/auth/login`
- **Image:** Must be an image file (jpg, png, etc.)
- **Image Size:** Max 5MB
- **Organizer ID:** You can pass any valid MongoDB ObjectId if organizer doesn't exist yet, or leave empty

### Alternative: cURL Command

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name=Tech Conference 2025" \
  -F "description=A comprehensive tech conference" \
  -F "date=2025-12-15" \
  -F "startTime=09:00" \
  -F "endTime=18:00" \
  -F "location=San Francisco, CA" \
  -F "organizer=ORGANIZER_ID" \
  -F "totalTickets=500" \
  -F "ticketPrice=99.99" \
  -F "category=technology" \
  -F "coverImage=@/path/to/your/image.jpg"
```

### Retrieve Event with Image URL

After creating an event, get it back with the image URL:

**Method:** GET  
**URL:** `http://localhost:3000/api/events/{EVENT_ID}`

Response will include:
```json
{
  "coverImageUrl": "https://event-images-collection.s3.ap-south-1.amazonaws.com/events/temp/cover-UUID.jpg"
}
```

This URL is publicly accessible and can be used directly in your Android app!

### Get All Events with Images

**Method:** GET  
**URL:** `http://localhost:3000/api/events`

Returns all events with their image URLs ready to display.
