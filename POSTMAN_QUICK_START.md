# Postman Testing - Quick Start Guide

## Files Provided

1. **Face_Verification_API.postman_collection.json** - Main API collection with all endpoints
2. **Face_Verification_Environment.postman_environment.json** - Environment variables template
3. **POSTMAN_GUIDE.md** - Detailed guide and troubleshooting

## Quick Setup (5 minutes)

### Step 1: Import Collection (2 min)

```
1. Open Postman
2. Click "Import" button (top left)
3. Select "Face_Verification_API.postman_collection.json"
4. Click "Import"
```

### Step 2: Import Environment (1 min)

```
1. Click "Environments" in left sidebar
2. Click "Import" button
3. Select "Face_Verification_Environment.postman_environment.json"
4. Click "Import"
5. Select the environment from top-right dropdown
```

### Step 3: Verify Server is Running (1 min)

```bash
# In terminal, check if server is running
cd "/Users/mrmad/adminthrill/nodejs Main2. mongo"
npm start

# Server should output something like:
# 🚀 Starting application...
# Connected to MongoDB
# Server listening on port 3000
```

### Step 4: Test First Endpoint (1 min)

```
1. In Postman, expand "Admin Setup" folder
2. Click "Register Admin"
3. Click "Send"
4. You should get 201 Created response with token
```

## Testing Workflow

### 1️⃣ Admin Registration & Login

**Request 1: Register Admin**
```
Folder: Admin Setup
Endpoint: Register Admin
Method: POST /admin-public/register

Expected Response: 201 Created with JWT token
Action: Copy token → set as adminToken variable
```

**Quick Action:**
1. Click "Register Admin"
2. Click "Send"
3. In response, find: `"token": "eyJhbGc..."`
4. Copy the token value
5. Click "Variables" at collection level
6. Paste into `adminToken` current value
7. Click "Save"

### 2️⃣ User Registration & Login

**Request 2: Signup User**
```
Folder: User Setup
Endpoint: Signup User
Method: POST /auth/signup

Expected Response: 201 Created with token and userId
Actions:
  - Copy token → set as userToken
  - Copy _id → set as userId
```

### 3️⃣ Create Event

**Request 3: Create Event**
```
Folder: Event Management
Endpoint: Create Event
Method: POST /events
Auth: Use adminToken

Expected Response: 201 Created with eventId
Action: Copy eventId → set as eventId variable
```

**Important:** Make sure you have an organizerId. If not:
1. Use any MongoDB ObjectId format
2. Or create an organizer first

### 4️⃣ Create Registration

**Request 4: Create Registration**
```
Folder: Registration & Face Verification
Endpoint: Create Registration
Method: POST /registrations

Expected Response: 201 Created with registrationId
Action: Copy registrationId → set as registrationId variable
```

### 5️⃣ Verify Face & Issue Ticket

**Request 5: Verify Face & Issue Ticket**
```
Folder: Registration & Face Verification
Endpoint: Verify Face & Issue Ticket
Method: POST /registrations/:id/verify-face

Request Body:
{
  "faceImageKey": "face-images/test-face.jpg",
  "similarityThreshold": 80
}

Possible Outcomes:
  ✓ Ticket Issued - If face verified + tickets available
  ⏳ Added to Waitlist - If no tickets available
  ❌ Face Failed - If face verification fails
```

**Important Notes:**
- `faceImageKey` must point to a valid S3 image
- The image file must exist in your AWS S3 bucket
- System will use AWS Rekognition for face detection
- If S3 image doesn't exist, you'll get an error

### 6️⃣ Check Waitlist (if needed)

**Request 6: Get User Waitlist Position**
```
Folder: Waitlist Management
Endpoint: Get User Waitlist Position
Method: GET /waitlist/user/:userId/event/:eventId

Expected Response: 200 OK with waitlist position
```

## Complete Test Sequence

Copy and paste this sequence to quickly test:

```
1. Admin Setup → Register Admin → Send → Copy token to adminToken
2. User Setup → Signup User → Send → Copy token to userToken, _id to userId
3. Event Management → Create Event → Send (use adminToken) → Copy _id to eventId
4. Registration → Create Registration → Send → Copy _id to registrationId
5. Registration → Get Registration Status → Send → Check nextStep
6. Registration → Verify Face & Issue Ticket → Send
7. Check response for ticket or waitlist status
8. If waitlist: Waitlist Management → Get Event Waitlist → Send
```

## Expected Responses

### Successful Flow

**Step 4 Response:**
```json
{
  "status": "success",
  "message": "Registration created successfully",
  "data": {
    "registration": {
      "_id": "abc123...",
      "status": "pending",
      "faceVerificationStatus": "pending"
    }
  }
}
```

**Step 6 Response (Ticket Issued):**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "message": "Registration completed successfully. Ticket issued!",
    "action": "TICKET_ISSUED",
    "ticket": {
      "_id": "ticket_id",
      "ticketId": "TKT-...",
      "status": "active"
    }
  }
}
```

**Step 6 Response (Added to Waitlist):**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "message": "Face verification successful, but tickets are sold out. Added to waitlist.",
    "action": "ADDED_TO_WAITLIST",
    "waitlist": {
      "_id": "waitlist_id",
      "position": 5,
      "status": "waiting"
    }
  }
}
```

## Troubleshooting

### Issue: 404 Not Found

**Solution:**
```
1. Check baseUrl: http://localhost:3000/api
2. Check if server is running
3. Verify endpoint path matches collection
```

### Issue: 401 Unauthorized

**Solution:**
```
1. Make sure you're using correct token
2. Token might be expired, re-login
3. Check Authorization header has "Bearer" prefix
4. Ensure token is set in {{adminToken}} or {{userToken}}
```

### Issue: 400 Bad Request

**Solution:**
```
1. Check request body format matches schema
2. Verify all required fields are present
3. Check variable values are not empty
4. Look at error message in response
```

### Issue: Face Verification Fails

**Solution:**
```
1. Ensure faceImageKey points to valid S3 image
2. Check S3 bucket is accessible
3. Verify AWS credentials in .env
4. Try with a different image
5. Check image has single clear face
```

### Issue: Tickets Not Available

**Solution:**
```
1. Create event with more totalTickets
2. Or use smaller ticketsSold value
3. Check event exists in database
4. Reset test by creating new event
```

## Environment Variables to Know

| Variable | Used For | Example |
|----------|----------|---------|
| baseUrl | API endpoint | http://localhost:3000/api |
| adminToken | Admin auth | eyJhbGc... |
| userToken | User auth | eyJhbGc... |
| userId | User identification | 507f1f77bcf86cd799439011 |
| eventId | Event identification | 507f1f77bcf86cd799439012 |
| registrationId | Registration identification | 507f1f77bcf86cd799439013 |
| faceImageKey | S3 face image path | face-images/user1.jpg |

## Postman Tips & Tricks

### 1. Automatically Update Variables from Response

Add this to the **Tests** tab of "Register Admin":
```javascript
var jsonData = pm.response.json();
pm.collectionVariables.set("adminToken", jsonData.token);
```

### 2. Use Pre-request Script to Set Headers

Click **Pre-request Script** tab:
```javascript
pm.request.headers.add({
  key: 'Authorization',
  value: 'Bearer ' + pm.collectionVariables.get('adminToken')
});
```

### 3. Validate Response with Tests

Add to **Tests** tab:
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Has token in response", function () {
    pm.expect(pm.response.json()).to.have.property('token');
});
```

### 4. Use Runner for Batch Testing

1. Click **Runner** in top menu
2. Select collection and environment
3. Select which requests to run
4. Click **Run**
5. View results in new window

## Common Test Cases

### Test Case 1: Happy Path
```
Admin Register → Create Event → User Register → Register → Verify Face → Ticket Issued
Expected: 7 successful requests, 1 ticket issued
```

### Test Case 2: Waitlist Flow
```
Admin Register → Create Event (1 ticket) → User1 Register → Verify Face → Ticket Issued
→ User2 Register → Verify Face → Waitlist
Expected: User2 added to waitlist
```

### Test Case 3: Face Verification Failure
```
Create Registration → Upload Bad Face Image → Verify Face → Face Verification Failed
Expected: Registration status = rejected, added to waitlist
```

### Test Case 4: Admin Override
```
Create Failed Registration → Get Failed Verifications → Admin Override Ticket
Expected: Ticket issued by admin override
```

## Next Steps

1. ✅ Import Postman collection and environment
2. ✅ Start Node.js server
3. ✅ Run "Register Admin" request
4. ✅ Run "Signup User" request
5. ✅ Run "Create Event" request
6. ✅ Run full test workflow
7. ✅ Check database for created records
8. ✅ Monitor server logs for debugging

## Useful Database Queries (MongoDB)

```javascript
// Check registrations
db.usereventregistrations.find({ faceVerificationStatus: 'success' })

// Check waitlist
db.waitlists.find({ status: 'waiting' })

// Check tickets
db.tickets.find({ status: 'active' })

// Check failed verifications
db.usereventregistrations.find({ faceVerificationStatus: 'failed' })
```

## Common Issues & Solutions

### "User is already registered for this event"
**Cause**: You tried to create a registration for the same user and event twice.
**Solution**: See `TESTING_DUPLICATE_REGISTRATION.md` for multi-user testing guide.

### "Invalid user ID format" or "Invalid event ID format"
**Cause**: Using wrong ID or ID not saved correctly.
**Solution**: Verify you copied the full ID from previous response and set it in variables.

### 401 Unauthorized
**Cause**: Token expired or not set correctly.
**Solution**: Re-run login request and update token variable.

### Registration doesn't proceed to face verification
**Cause**: Event capacity may be full or registration validation failed.
**Solution**: Check registration status with `GET /registrations/{{registrationId}}/status`

---

## Multiple User Testing

To test the full flow (including waitlist), you need multiple users:

See **`TESTING_DUPLICATE_REGISTRATION.md`** for complete guide on:
- Creating multiple test users
- Testing face verification for each
- Testing waitlist scenarios
- Maintaining environment variables

---

## Need Help?

1. Check `TESTING_DUPLICATE_REGISTRATION.md` for duplicate registration error
2. Check `POSTMAN_GUIDE.md` for detailed documentation
3. See `event-ticket-face-verification-api.md` for API specs
4. Review `face-verification-implementation.md` for architecture
5. Check server logs for error details
6. Ensure all environment variables are set in `.env`

````
