# Face Verification Payment - Quick Testing Guide

## What Was Changed?

✅ **Two booking controllers now require face verification:**

1. **`bookSeat.controller.js`** - Before locking seats
2. **`confirmSeat.controller.js`** - Before confirming payment

## Quick Reference

### Requirement Summary
- Users **MUST** have a verified face record in DynamoDB
- Without face record → **403 Forbidden** returned
- With face record → Booking/Payment proceeds normally

---

## 🧪 Testing

### Prerequisites
1. User must have uploaded face image
2. Face must be verified in DynamoDB (faceimage table)
3. Test user ID: `6915c1ce111e057ff7b315bc` (has face record)

### Test 1: Book Seat WITHOUT Face Verification
```bash
curl -X POST http://localhost:3000/api/bookings/book-seat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "eventId": "EVENT_ID",
    "seatingId": "SEATING_ID",
    "userId": "USER_ID_NO_FACE"
  }'
```

**Expected Response (403):**
```json
{
  "status": "error",
  "message": "Face verification required. Please complete face verification before booking seats."
}
```

---

### Test 2: Book Seat WITH Face Verification ✅
```bash
curl -X POST http://localhost:3000/api/bookings/book-seat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "eventId": "EVENT_ID",
    "seatingId": "SEATING_ID",
    "userId": "6915c1ce111e057ff7b315bc"
  }'
```

**Expected Response (201):**
```json
{
  "status": "success",
  "message": "Seats locked successfully. Proceeding to payment",
  "data": {
    "booking": {
      "bookingId": "BOOKING_ID",
      "eventId": "EVENT_ID",
      "expiresIn": 15
    }
  }
}
```

---

### Test 3: Confirm Payment WITHOUT Face Verification
```bash
curl -X POST http://localhost:3000/api/bookings/confirm-seat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "bookingId": "BOOKING_ID",
    "paymentId": "PAY_123456",
    "paymentMethod": "card"
  }'
```

**Expected Response (403):**
```json
{
  "status": "error",
  "message": "Face verification required. Please complete face verification before proceeding with payment."
}
```

---

### Test 4: Confirm Payment WITH Face Verification ✅
```bash
curl -X POST http://localhost:3000/api/bookings/confirm-seat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "bookingId": "BOOKING_ID",
    "paymentId": "PAY_123456",
    "paymentMethod": "card"
  }'
```

**Expected Response (200):**
```json
{
  "status": "success",
  "message": "Booking confirmed successfully",
  "data": {
    "booking": {
      "bookingId": "BOOKING_ID",
      "status": "confirmed",
      "ticketNumbers": ["TKT001"]
    }
  }
}
```

---

## 📋 Testing Checklist

### Setup
- [ ] MongoDB running with booking data
- [ ] DynamoDB running with faceimage table
- [ ] User with face record created
- [ ] Event and seats available
- [ ] Server running

### Test Cases
- [ ] Test without face record → 403 Forbidden
- [ ] Test with face record → Success (201/200)
- [ ] Test seat locking → Seats should lock for 15 mins
- [ ] Test payment confirmation → Should confirm booking
- [ ] Test expired booking → Should show expiry error
- [ ] Test seat availability → Should reflect locked/sold seats

### Edge Cases
- [ ] DynamoDB unavailable → Should log warning and allow (graceful fallback)
- [ ] Multiple bookings by same user → All require face verification
- [ ] Booking expiry + face check → Should handle both
- [ ] Invalid booking ID → Should return 404

---

## 🔍 Verify Implementation

### Check if changes are in place:

```bash
# Check bookSeat controller
grep -n "checkIfUserFaceExists" src/features/booking/bookSeat.controller.js

# Check confirmSeat controller  
grep -n "checkIfUserFaceExists" src/features/booking/confirmSeat.controller.js

# Should see face verification imports
grep -n "dynamodbService" src/features/booking/bookSeat.controller.js
grep -n "dynamodbService" src/features/booking/confirmSeat.controller.js
```

---

## 🔧 Key Functions Used

```javascript
// Check if user has face record (returns true/false)
const hasFaceRecord = await dynamodbService.checkIfUserFaceExists(userId);

// Get face record details
const faceRecord = await dynamodbService.getUserFaceRecord(userId);
```

---

## 📊 Expected Behavior

### User Flow
```
1. User attempts to book seat
   ↓
2. System checks: Does user have face record?
   ├─ YES → Continue with booking ✅
   └─ NO → Return 403, require face verification ❌
   ↓
3. If locked → User proceeds to payment
   ↓
4. User clicks confirm payment
   ↓
5. System checks: Does user have face record?
   ├─ YES → Confirm booking, generate tickets ✅
   └─ NO → Return 403, require face verification ❌
```

---

## 🚨 Error Messages

| Error | HTTP | Meaning |
|-------|------|---------|
| Face verification required | 403 | User has no face record |
| Booking not found | 404 | Invalid booking ID |
| Event not found | 404 | Invalid event ID |
| Booking already confirmed | 400 | Duplicate confirmation |
| Booking has expired | 400 | 15-min lock expired |

---

## 💾 Related Files

- [Full Documentation](./FACE_VERIFICATION_PAYMENT_REQUIREMENT.md)
- [bookSeat Controller](./src/features/booking/bookSeat.controller.js)
- [confirmSeat Controller](./src/features/booking/confirmSeat.controller.js)
- [DynamoDB Service](./src/services/aws/dynamodb.service.js)

---

## 📝 Postman Collection Example

### Create Request in Postman

#### 1. Book Seat (No Face Verification)
```
Method: POST
URL: {{base_url}}/api/bookings/book-seat
Headers:
  - Content-Type: application/json
  - Authorization: Bearer {{token}}
Body (JSON):
{
  "eventId": "{{event_id}}",
  "seatingId": "{{seating_id}}",
  "userId": "USER_WITHOUT_FACE"
}
```

#### 2. Book Seat (With Face Verification)
```
Method: POST
URL: {{base_url}}/api/bookings/book-seat
Headers:
  - Content-Type: application/json
  - Authorization: Bearer {{token}}
Body (JSON):
{
  "eventId": "{{event_id}}",
  "seatingId": "{{seating_id}}",
  "userId": "6915c1ce111e057ff7b315bc"
}
```

#### 3. Confirm Payment (With Face Verification)
```
Method: POST
URL: {{base_url}}/api/bookings/confirm-seat
Headers:
  - Content-Type: application/json
  - Authorization: Bearer {{token}}
Body (JSON):
{
  "bookingId": "{{booking_id}}",
  "paymentId": "PAY_TEST_123",
  "paymentMethod": "card"
}
```

---

## ✅ Success Indicators

- [ ] Code compiles without errors
- [ ] Book seat endpoint checks for face verification
- [ ] Confirm seat endpoint checks for face verification
- [ ] Returns 403 when face not found
- [ ] Allows booking when face verified
- [ ] Error messages are clear
- [ ] DynamoDB failures handled gracefully
- [ ] Logging shows face verification checks
