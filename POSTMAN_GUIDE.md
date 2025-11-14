# Face Verification API - Postman Collection Guide

## Overview

This Postman collection contains all the endpoints for testing the Event Ticket Purchase Flow with Face Verification system.

## File Location

```
Face_Verification_API.postman_collection.json
```

## How to Import

### Step 1: Open Postman
- Launch Postman application
- If you don't have Postman, download it from https://www.postman.com/downloads/

### Step 2: Import Collection
1. Click **Import** button (top left)
2. Select **File** tab
3. Choose `Face_Verification_API.postman_collection.json`
4. Click **Import**

### Step 3: Set Environment Variables

Before testing, configure the following variables in the collection:

Click on the collection name → **Variables** tab:

| Variable | Description | Example |
|----------|-------------|---------|
| `baseUrl` | API base URL | `http://localhost:3000/api` |
| `adminToken` | JWT token from admin login | (auto-fill after login) |
| `userToken` | JWT token from user login | (auto-fill after login) |
| `userId` | User ID from signup | (auto-fill after signup) |
| `eventId` | Event ID from create event | (auto-fill after event creation) |
| `registrationId` | Registration ID | (auto-fill after registration) |
| `waitlistId` | Waitlist ID | (auto-fill when added to waitlist) |
| `organizerId` | Organizer ID | (use admin ID or create organizer) |

## Testing Workflow

### Phase 1: Admin Setup

1. **Register Admin**
   - Method: `POST /admin-public/register`
   - Request body includes: name, email, password, phone
   - Response includes JWT token
   - **Action**: Copy token from response → Set `adminToken` variable

2. **Login Admin** (Optional, for verification)
   - Method: `POST /auth/admin-login`
   - Use admin email and password
   - Verify you get the same token

### Phase 2: User Setup

3. **Signup User**
   - Method: `POST /auth/signup`
   - Request body includes: name, email, password, phone
   - Response includes JWT token and userId
   - **Action**: Copy userId → Set `userId` variable
   - **Action**: Copy token → Set `userToken` variable

4. **Login User** (Optional, for verification)
   - Method: `POST /auth/login`
   - Use user email and password

### Phase 3: Event Management

5. **Create Event**
   - Method: `POST /events`
   - **Authentication**: Use admin token in header
   - Request includes: name, date, time, location, totalTickets, ticketPrice
   - Response includes eventId
   - **Action**: Copy eventId → Set `eventId` variable

6. **Get Events** (Optional, to verify)
   - Method: `GET /events`
   - Lists all events

### Phase 4: User Registration

7. **Create Registration**
   - Method: `POST /registrations`
   - Request body: userId, eventId
   - Response includes registrationId
   - **Action**: Copy registrationId → Set `registrationId` variable

8. **Get Registration Status**
   - Method: `GET /registrations/:registrationId/status`
   - Shows current status and next steps
   - Expected response: `status: "PENDING"`, `nextStep: "VERIFY_FACE"`

### Phase 5: Face Verification

9. **Validate Face Image** (Optional, pre-check)
   - Method: `POST /registrations/:registrationId/validate-face-image`
   - Request body: faceImageKey (path to S3 image)
   - Returns face quality metrics

10. **Verify Face & Issue Ticket**
    - Method: `POST /registrations/:registrationId/verify-face`
    - Request body: faceImageKey, similarityThreshold
    - **Scenario A**: If tickets available → Ticket issued
    - **Scenario B**: If no tickets → Added to waitlist
    - **Scenario C**: If face doesn't match → Face verification failed

11. **Retry Face Verification** (If verification failed)
    - Method: `POST /registrations/:registrationId/retry-verification`
    - Same request as verify-face
    - Maximum 3 attempts allowed

### Phase 6: Waitlist Management

12. **Get Event Waitlist**
    - Method: `GET /waitlist/event/:eventId`
    - Optional query parameter: `status` (waiting, offered, accepted, etc.)
    - Shows all waitlist entries for the event

13. **Get User Waitlist Position**
    - Method: `GET /waitlist/user/:userId/event/:eventId`
    - Shows user's position if on waitlist
    - Returns position, status, joined date

14. **Process Waitlist** (Admin)
    - Method: `POST /waitlist/process/:eventId`
    - Request body: `slotsAvailable: 3`
    - Offers tickets to top N users from waitlist
    - **Action**: Copy waitlistId from response → Set `waitlistId` variable

15. **Accept Waitlist Offer**
    - Method: `POST /waitlist/offer/:waitlistId/accept`
    - **Authentication**: Use user token
    - Issues ticket to user

16. **Reject Waitlist Offer**
    - Method: `POST /waitlist/offer/:waitlistId/reject`
    - **Authentication**: Use user token
    - User stays in waitlist, removed from offer

### Phase 7: Admin Review (For Failed Verifications)

17. **Get Failed Verifications**
    - Method: `GET /registrations/admin/failed-verifications`
    - **Authentication**: Use admin token
    - Optional query: `eventId` to filter by event
    - Shows all registrations with failed face verification

18. **Review Verification Failure**
    - Method: `POST /registrations/:registrationId/admin/review-failure`
    - **Authentication**: Use admin token
    - Request body with action:
      - `"action": "approve"` → Issue ticket
      - `"action": "reject"` → Keep rejected
      - `"action": "request_retry"` → Reset attempts

19. **Admin Override Issue Ticket**
    - Method: `POST /registrations/:registrationId/admin/override-ticket`
    - **Authentication**: Use admin token
    - Request body: `overrideReason: "reason"`
    - Forces ticket issuance without verification

## Example Test Scenarios

### Scenario 1: Successful Registration & Ticket Issuance (Happy Path)

```
1. Register Admin
2. Create Event (with limited tickets, e.g., 5)
3. Signup User 1
4. Create Registration for User 1
5. Verify Face & Issue Ticket → ✓ Ticket Issued
6. Get Registration Status → Shows "TICKET_ISSUED"
```

### Scenario 2: Sell Out & Waitlist

```
1. Create Event (5 tickets)
2. Register 5 Users and issue tickets
3. Register User 6
4. Verify Face → Added to Waitlist (tickets sold out)
5. Get User Waitlist Position → Shows position
6. Admin processes waitlist
7. User accepts offer → ✓ Ticket issued from waitlist
```

### Scenario 3: Face Verification Failed & Retry

```
1. Create Registration
2. Verify Face (poor quality/mismatch) → Face verification failed
3. Added to waitlist (reason: face_verification_failed)
4. Retry Face Verification (attempt 2) → Still fails
5. Retry Face Verification (attempt 3) → Success → ✓ Ticket issued
```

### Scenario 4: Admin Manual Override

```
1. Create Registration
2. Verify Face → Face verification failed (after 3 attempts)
3. Get Failed Verifications → See registration
4. Admin Review → action: "approve" → ✓ Ticket issued by admin
```

## Tips for Testing

### Auto-fill Variables from Responses

1. **After each login/signup**, copy the token and ID manually
2. **After creating event/registration**, copy IDs from response
3. Or use Postman's test scripts (advanced):
   ```javascript
   // In Tests tab of request
   var jsonData = pm.response.json();
   pm.collectionVariables.set("adminToken", jsonData.token);
   pm.collectionVariables.set("userId", jsonData.data.user._id);
   ```

### Common Issues

| Issue | Solution |
|-------|----------|
| 404 Not Found | Check baseUrl is correct (http://localhost:3000/api) |
| 401 Unauthorized | Verify JWT token is set in Authorization header |
| 400 Bad Request | Check request body matches expected schema |
| Face verification fails | Ensure faceImageKey points to valid S3 image |
| No tickets available | Create event with more totalTickets or lower ticketsSold |

### Testing Face Verification

Since face verification requires real S3 images, you have two options:

**Option 1: Mock Images**
- Upload test images to your S3 bucket
- Note the S3 key path
- Use in `faceImageKey` parameter

**Option 2: Skip Actual Verification**
- For API testing without AWS:
  - Use dummy faceImageKey values
  - System will attempt verification with AWS
  - Check error responses

### Test Data

Pre-configured test data in collection:

**Admin Account:**
- Email: `admin@test.com`
- Password: `Admin@123456`
- Role: admin

**User Account:**
- Email: `user@test.com`
- Password: `User@123456`
- Role: user

**Event:**
- Name: Tech Conference 2025
- Date: 2025-12-15
- Total Tickets: 10
- Price: $99.99

## Response Examples

### Successful Ticket Issuance
```json
{
  "status": "success",
  "data": {
    "success": true,
    "message": "Registration completed successfully. Ticket issued!",
    "action": "TICKET_ISSUED",
    "ticket": {
      "ticketId": "TKT-user-event-1731405000",
      "seatNumber": "SEAT-5432",
      "status": "active"
    }
  }
}
```

### Added to Waitlist
```json
{
  "status": "success",
  "data": {
    "success": true,
    "message": "Face verification successful, but tickets are sold out. Added to waitlist.",
    "action": "ADDED_TO_WAITLIST",
    "waitlist": {
      "position": 5,
      "status": "waiting",
      "reason": "tickets_sold_out"
    }
  }
}
```

### Face Verification Failed
```json
{
  "status": "fail",
  "data": {
    "success": false,
    "message": "Face verification failed. Please try again or contact support.",
    "action": "ADDED_TO_WAITLIST",
    "similarityScore": 65.3,
    "threshold": 80
  }
}
```

## Authentication

### How JWT Tokens Work

1. **Login/Register** endpoint returns a JWT token
2. Add token to **Authorization** header as: `Bearer {{token}}`
3. Token is required for protected endpoints
4. Token expires based on JWT_EXPIRES_IN setting

### Setting Token in Headers

In Postman:
- Go to request → **Headers** tab
- Add header: `Authorization` = `Bearer {{adminToken}}`
- Postman automatically replaces `{{adminToken}}` with actual value

## Monitoring & Debugging

### View Request/Response Details

In Postman:
- **Params** tab: Query parameters
- **Body** tab: Request body
- **Response** section: View actual response
- **Test Results**: Pass/fail status

### Console Output

Click **Console** (bottom left) to see:
- All requests sent
- Response bodies
- Errors and logs

### Server Logs

In terminal where Node.js is running:
```
Morgan logs show all HTTP requests
Check for 'face verification' or 'waitlist' entries
```

## Troubleshooting Checklist

- [ ] Server is running on port 3000
- [ ] MongoDB is connected
- [ ] Environment variables are set (.env file)
- [ ] AWS credentials are valid
- [ ] S3 bucket name is correct
- [ ] Face images are uploaded to S3
- [ ] Base URL is correct in Postman
- [ ] Tokens are valid and not expired
- [ ] Request body matches schema
- [ ] Event has available tickets or queue is open

## Next Steps

1. Import the collection into Postman
2. Update variables for your environment
3. Follow the testing workflow
4. Monitor responses and debug as needed
5. Verify all endpoints work as expected
6. Test edge cases and error scenarios

## Support

- API Documentation: `src/docs/event-ticket-face-verification-api.md`
- Implementation Guide: `src/docs/face-verification-implementation.md`
- Quick Reference: `src/docs/QUICK_REFERENCE.md`
