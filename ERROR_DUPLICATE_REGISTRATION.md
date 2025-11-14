# Duplicate Registration Error - Explained

## What You're Seeing

```
Error: User is already registered for this event
  at BusinessRulesService.validateRegistrationIntegrity
```

## What This Means

✅ **This is CORRECT behavior!** The system is working as designed.

The error occurs because:
- You tried to create a registration for the same user + event combination twice
- The system enforces a "one registration per user per event" rule
- This prevents duplicate registrations and maintains data integrity

## Why This Matters

Think of it like a concert:
- ❌ One person can't register twice for the same concert
- ✅ But different people can each register once
- ✅ And the same person can register for different concerts

## How to Fix It

### Solution 1: Use a Different User (Recommended) ✅

Instead of registering the same user twice, create multiple test users:

**Create User 1:**
```bash
POST /api/auth/signup
{
  "name": "Alice Johnson",
  "email": "alice@test.com",
  "password": "Pass@123456",
  "phone": "9876543210"
}
```
Save the `userId` and `token`

**Create User 2:**
```bash
POST /api/auth/signup
{
  "name": "Bob Smith",
  "email": "bob@test.com",
  "password": "Pass@123456",
  "phone": "9876543210"
}
```
Save this `userId` and `token`

**Create User 3:**
```bash
POST /api/auth/signup
{
  "name": "Carol White",
  "email": "carol@test.com",
  "password": "Pass@123456",
  "phone": "9876543210"
}
```

Now you have 3 different users, each can register for the same event:

**Register User 1:**
```bash
POST /api/registrations
{
  "userId": "<userId_1>",
  "eventId": "{{eventId}}"
}
```

**Register User 2:**
```bash
POST /api/registrations
{
  "userId": "<userId_2>",
  "eventId": "{{eventId}}"
}
```

**Register User 3:**
```bash
POST /api/registrations
{
  "userId": "<userId_3>",
  "eventId": "{{eventId}}"
}
```

Now you have 3 different registrations for the same event!

---

### Solution 2: Continue With Existing Registration

If you've already created a registration, you can:

1. **Get all registrations:**
   ```bash
   GET /api/registrations
   ```

2. **Find your registration** in the response

3. **Use that registrationId** for subsequent API calls:
   ```bash
   POST /api/registrations/{{registrationId}}/verify-face
   {
     "faceImageKey": "face-images/test-face.jpg",
     "similarityThreshold": 80
   }
   ```

---

### Solution 3: Check Status of Existing Registration

If you want to verify the registration exists and check its status:

```bash
GET /api/registrations/{{registrationId}}/status
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
    "ticketIssued": false
  }
}
```

Then proceed with face verification using this existing registration.

---

## Testing Full Workflow

To test the complete system (tickets → waitlist → admin override), you need:

1. ✅ One event (create once)
2. ✅ Multiple users (at least 3-5 for testing)
3. ✅ Multiple registrations (one per user)
4. ✅ Then test each registration independently

### Example Complete Flow:

```
1. Create Admin → Save token & ID
2. Create Event (totalTickets: 3) → Save eventId
3. Create User 1 → Save userId_1
4. Register User 1 → Save registrationId_1
5. Verify face for User 1 → Gets ticket (1/3)
6. Create User 2 → Save userId_2
7. Register User 2 → Save registrationId_2
8. Verify face for User 2 → Gets ticket (2/3)
9. Create User 3 → Save userId_3
10. Register User 3 → Save registrationId_3
11. Verify face for User 3 → Gets ticket (3/3)
12. Create User 4 → Save userId_4
13. Register User 4 → Save registrationId_4
14. Verify face for User 4 → Goes to WAITLIST (tickets full!)
15. Test waitlist operations (offer, accept/reject)
16. Test admin override for failed verifications
```

---

## Key Variables to Track

When testing with multiple users, maintain these in Postman:

```
baseUrl = http://localhost:3000/api
adminToken = (from admin login)
organizerId = (from admin signup)

eventId = (from event creation)

// For User 1
userId_1 = 
userToken_1 =
registrationId_1 =

// For User 2
userId_2 = 
userToken_2 =
registrationId_2 =

// For User 3
userId_3 = 
userToken_3 =
registrationId_3 =

// For User 4 (waitlist test)
userId_4 = 
userToken_4 =
registrationId_4 =
```

---

## Why Multiple Users?

| Need | Requires |
|------|----------|
| Test face verification | 1 registration |
| Test ticket assignment | Multiple registrations up to capacity |
| Test waitlist | Registrations beyond capacity |
| Test admin override | Failed verification + admin action |
| Test offer acceptance | User on waitlist with valid token |

---

## Quick Reference

| Action | HTTP | Endpoint | Requires |
|--------|------|----------|----------|
| Create registration | POST | `/registrations` | userId, eventId |
| Get registration status | GET | `/registrations/{{registrationId}}/status` | registrationId |
| Verify face | POST | `/registrations/{{registrationId}}/verify-face` | registrationId, faceImageKey |
| Get all registrations | GET | `/registrations` | None |
| Check user waitlist | GET | `/waitlist/user/{{userId}}/event/{{eventId}}` | userId, eventId |
| Accept waitlist offer | POST | `/waitlist/offer/{{waitlistId}}/accept` | waitlistId, user token |

---

## Testing Checklist

- [ ] Created admin and have admin token
- [ ] Created event and have eventId
- [ ] Created User 1 and have userId_1
- [ ] Registered User 1 and have registrationId_1
- [ ] Can verify face for User 1
- [ ] Created User 2 and have userId_2
- [ ] Registered User 2 and have registrationId_2
- [ ] Can verify face for User 2
- [ ] Created User 3 and have userId_3
- [ ] Registered User 3 and have registrationId_3
- [ ] Can verify face for User 3
- [ ] Created User 4 and have userId_4
- [ ] Registered User 4 and have registrationId_4
- [ ] User 4 goes to waitlist (tickets full!)
- [ ] Can check waitlist status
- [ ] Can test waitlist offer flow

---

## Still Getting Error?

**Make sure you:**

1. ✅ Created a NEW user (different email)
2. ✅ Saved the `userId` from signup response
3. ✅ Used that `userId` in registration
4. ✅ Checked that `userId` and `eventId` are valid MongoDB ObjectIds
5. ✅ Not trying to register same user twice for same event

**Check with:**
```bash
GET /api/registrations
```

If your registration appears, it's created. Use that `registrationId` for next steps.

---

## See Also

- `TESTING_DUPLICATE_REGISTRATION.md` - Complete multi-user testing guide
- `POSTMAN_QUICK_START.md` - 5-minute setup guide
- `POSTMAN_GUIDE.md` - Detailed Postman guide
- `event-ticket-face-verification-api.md` - Complete API reference
