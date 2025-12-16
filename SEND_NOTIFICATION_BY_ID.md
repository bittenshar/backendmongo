# Send Notifications by User ID

## Quick Start

**POST** `/api/notifications/send`

```json
{
  "userId": "693ea01e54d3374df909ec22",
  "title": "Test Notification",
  "body": "This is a test notification"
}
```

## Response

```json
{
  "success": true,
  "message": "Notifications sent",
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0,
    "tokenSource": "userId",
    "userId": "693ea01e54d3374df909ec22"
  },
  "responses": [
    {
      "token": "eZUttMITQ1aqQGCR9fYgrT:APA91bGYnv9sbOrN_oYebwzJM4YAWCYWENf6ZowqLi5BRoFT9nTWr32fBaNL0zqujom8Nn8IW87XytDCzzTYH3y743PYZxMqY7KS-l9tkris6dTxHvLhFZ0",
      "response": {
        "messageId": "0:1765711908000%abc123xyz"
      },
      "success": true
    }
  ]
}
```

## Workflow

### Step 1: Login to get userId
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```
Response includes the user object with `_id` field.

### Step 2: Register FCM Token (Optional)
Register the device's FCM token so it persists:
```bash
POST /api/notifications/register-token
Headers: Authorization: Bearer {jwt_token}
{
  "token": "dxxxxxx:APA91b...",
  "deviceId": "device_123",
  "deviceType": "android"
}
```

### Step 3: Send Notification by userId
```bash
POST /api/notifications/send
{
  "userId": "693ea01e54d3374df909ec22",
  "title": "Hello User",
  "body": "You have a new message"
}
```

## Optional Parameters

### With Custom Data
```json
{
  "userId": "693ea01e54d3374df909ec22",
  "title": "Event Reminder",
  "body": "Your event starts in 1 hour",
  "data": {
    "eventId": "event_123",
    "eventName": "Tech Conference"
  }
}
```

### With Image
```json
{
  "userId": "693ea01e54d3374df909ec22",
  "title": "New Event Photo",
  "body": "Check out this new event",
  "imageUrl": "https://example.com/image.jpg"
}
```

## cURL Example

```bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "693ea01e54d3374df909ec22",
    "title": "Test Notification",
    "body": "This is a test notification"
  }'
```

## Response Format

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Operation status |
| message | string | Success message |
| summary.total | number | Total tokens for user |
| summary.successful | number | Successfully sent count |
| summary.failed | number | Failed count |
| summary.tokenSource | string | "userId" or "directToken" |
| summary.userId | string | User ID that was targeted |
| responses | array | Individual token responses |

## Error Responses

### No tokens found for user
```json
{
  "success": false,
  "message": "No FCM tokens found for userId: 693ea01e54d3374df909ec22",
  "tokenSource": "userId",
  "userId": "693ea01e54d3374df909ec22"
}
```
**Fix:** Register FCM token first for the user using `/api/notifications/register-token`

### Missing userId or token
```json
{
  "success": false,
  "message": "Either userId or token is required"
}
```
**Fix:** Provide either `userId` or `token` in request body

### Missing title or body
```json
{
  "success": false,
  "message": "Title and body are required"
}
```
**Fix:** Include both `title` and `body` fields

## Testing

### Test with Mock Token (No Firebase)
```bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "token": "mock_fcm_token",
    "title": "Test",
    "body": "Mock notification"
  }'
```

### Test Send to User by ID
```bash
# First get a user ID from login or user list
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "title": "Hello",
    "body": "Test message"
  }'
```

