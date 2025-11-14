# Handling Duplicate Registration Error

## Problem
When you try to create a registration for the same user and event combination twice, you get:
```
Error: User is already registered for this event
```

This is **expected and correct behavior** - the system prevents duplicate registrations.

---

## Solutions

### Option 1: Use Different Users ✅ (Recommended)
Create multiple test users and register each one for the event:

#### Step 1: Create Multiple Users
In Postman, send these requests separately (change email and name each time):

```bash
POST {{baseUrl}}/auth/signup
Content-Type: application/json

{
  "name": "User One",
  "email": "user1@test.com",
  "password": "User@123456",
  "phone": "9876543210",
  "role": "user"
}
```

```bash
POST {{baseUrl}}/auth/signup
Content-Type: application/json

{
  "name": "User Two",
  "email": "user2@test.com",
  "password": "User@123456",
  "phone": "9876543210",
  "role": "user"
}
```

```bash
POST {{baseUrl}}/auth/signup
Content-Type: application/json

{
  "name": "User Three",
  "email": "user3@test.com",
  "password": "User@123456",
  "phone": "9876543210",
  "role": "user"
}
```

#### Step 2: Create Registrations for Each User
For each user, create a separate registration:

**User 1 Registration:**
```bash
POST {{baseUrl}}/registrations
Content-Type: application/json

{
  "userId": "<userId_from_user1>",
  "eventId": "{{eventId}}",
  "adminBooked": false
}
```

**User 2 Registration:**
```bash
POST {{baseUrl}}/registrations
Content-Type: application/json

{
  "userId": "<userId_from_user2>",
  "eventId": "{{eventId}}",
  "adminBooked": false
}
```

**User 3 Registration:**
```bash
POST {{baseUrl}}/registrations
Content-Type: application/json

{
  "userId": "<userId_from_user3>",
  "eventId": "{{eventId}}",
  "adminBooked": false
}
```

#### Step 3: Now You Can Test Face Verification for Each
Each registration has its own `registrationId`, so you can test the full flow for each user independently.

---

### Option 2: Get Existing Registration
If you've already registered and need to continue testing:

#### Get All Registrations
```bash
GET {{baseUrl}}/registrations
```

This will return all registrations with their IDs. Find the one for your user and event, and use that `registrationId` for subsequent API calls.

---

### Option 3: Check Registration Status
If you know the `registrationId`, you can get its current status:

```bash
GET {{baseUrl}}/registrations/{{registrationId}}/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "registrationId",
    "userId": "userId",
    "eventId": "eventId",
    "status": "pending",
    "faceVerificationStatus": "pending",
    "ticketAvailabilityStatus": "pending",
    "verificationAttempts": 0,
    "ticketIssued": false,
    "registrationDate": "2025-11-12T10:00:00.000Z"
  }
}
```

Then you can proceed with face verification using this existing registration.

---

## Complete Multi-User Testing Flow

### Step 1: Create Admin (One Time)
```bash
POST {{baseUrl}}/admin-public/register
{
  "name": "Test Admin",
  "email": "admin@test.com",
  "password": "Admin@123456",
  "passwordConfirm": "Admin@123456",
  "phone": "9876543210",
  "role": "admin"
}
```
Save: `adminToken`, `organizerId`

---

### Step 2: Create Event (One Time)
```bash
POST {{baseUrl}}/events
Authorization: Bearer {{adminToken}}
{
  "name": "Tech Conference 2025",
  "description": "Annual technology conference",
  "date": "2025-12-15",
  "startTime": "09:00",
  "endTime": "17:00",
  "location": "San Francisco",
  "organizer": "{{organizerId}}",
  "totalTickets": 10,
  "ticketPrice": 99.99
}
```
Save: `eventId`

---

### Step 3: Create First User
```bash
POST {{baseUrl}}/auth/signup
{
  "name": "User One",
  "email": "user1@test.com",
  "password": "User@123456",
  "phone": "9876543210",
  "role": "user"
}
```
Save: `userId_1`, `userToken_1`

---

### Step 4: Create Registration for User 1
```bash
POST {{baseUrl}}/registrations
{
  "userId": "{{userId_1}}",
  "eventId": "{{eventId}}",
  "adminBooked": false
}
```
Save: `registrationId_1`

---

### Step 5: Test Face Verification for User 1
```bash
POST {{baseUrl}}/registrations/{{registrationId_1}}/verify-face
{
  "faceImageKey": "face-images/test-face.jpg",
  "similarityThreshold": 80
}
```

---

### Step 6: Create Second User (For Testing Waitlist)
```bash
POST {{baseUrl}}/auth/signup
{
  "name": "User Two",
  "email": "user2@test.com",
  "password": "User@123456",
  "phone": "9876543210",
  "role": "user"
}
```
Save: `userId_2`, `userToken_2`

---

### Step 7: Create Registration for User 2
```bash
POST {{baseUrl}}/registrations
{
  "userId": "{{userId_2}}",
  "eventId": "{{eventId}}",
  "adminBooked": false
}
```
Save: `registrationId_2`

---

### Step 8: Test Waitlist Flow
When ticket limit is reached (totalTickets: 10), subsequent users go to waitlist:

```bash
POST {{baseUrl}}/registrations/{{registrationId_2}}/verify-face
{
  "faceImageKey": "face-images/test-face.jpg",
  "similarityThreshold": 80
}
```

Response will indicate waitlist status if tickets are full.

---

## Key Points

| Issue | Cause | Solution |
|-------|-------|----------|
| "User is already registered" | Same user + event combination | Create new test user or use different event |
| "Registration not found" | Using wrong `registrationId` | Get ID from `/registrations` endpoint |
| "Invalid ObjectId format" | User/Event ID is not valid MongoDB ID | Use actual IDs from signup/event creation |
| Can't proceed with face verification | Registration needs valid status | Check registration status first |

---

## Quick Testing Variables to Maintain

Keep these in your Postman environment for easy testing:

```
adminToken = <from admin login>
adminId = <from admin response>
organizerId = <from admin response>
eventId = <from event creation>

userId_1 = <from user 1 signup>
userToken_1 = <from user 1 signup>
registrationId_1 = <from user 1 registration>

userId_2 = <from user 2 signup>
userToken_2 = <from user 2 signup>
registrationId_2 = <from user 2 registration>

userId_3 = <from user 3 signup>
userToken_3 = <from user 3 signup>
registrationId_3 = <from user 3 registration>
```

---

## Testing Waitlist Scenario

To test the full waitlist flow:

1. Create event with `totalTickets: 3`
2. Create and register 3 users → First 3 get tickets
3. Create and register user 4 → Goes to waitlist
4. Create and register user 5 → Goes to waitlist
5. Use admin endpoint to process waitlist when tickets become available
6. Waitlist users receive offers via their status

---

## Need Help?

- **Check current registrations**: `GET /registrations`
- **Check registration status**: `GET /registrations/{{registrationId}}/status`
- **Check waitlist for event**: `GET /waitlist/event/{{eventId}}`
- **Check user position on waitlist**: `GET /waitlist/user/{{userId}}/event/{{eventId}}`
