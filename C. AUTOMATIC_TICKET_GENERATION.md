# Automatic Ticket Generation After Payment

## Complete Flow

```
User Registration → Face Verified + Tickets Available → Payment Successful → Ticket Generated ✅
```

## Step-by-Step Process

### 1. User Creates Registration
```
POST /api/registrations
Body: {
  "userId": "6915c1ce111e057ff7b315bc",
  "eventId": "691337e4c4145e1999997a49"
}
```

**Response includes auto-calculated fields:**
```json
{
  "_id": "6915e717345ac3c6fa0ef8b1",
  "faceVerificationStatus": true,          ✅ TRUE (user has face record)
  "ticketAvailabilityStatus": "available", ✅ AVAILABLE (tickets not sold out)
  "ticketIssued": false,
  "status": "pending"
}
```

---

### 2. Payment Processing
User completes payment with payment gateway (Razorpay, Stripe, etc.)

**Payment Details:**
- Payment ID: `PAY-12345-ABCDE`
- Amount: `500`
- Registration ID: `6915e717345ac3c6fa0ef8b1`

---

### 3. Issue Ticket After Payment (NEW)
After payment success, call this endpoint to automatically issue ticket:

```
POST /api/tickets/issue-after-payment

Headers:
- Content-Type: application/json
- Authorization: Bearer <token>

Body:
{
  "registrationId": "6915e717345ac3c6fa0ef8b1",
  "paymentId": "PAY-12345-ABCDE",
  "amount": 500,
  "price": 500
}
```

### Automatic Validations:
✅ **Checks face verification:** `faceVerificationStatus === true`
✅ **Checks ticket availability:** `ticketAvailabilityStatus === "available"`
✅ **Checks ticket not already issued:** `ticketIssued === false`

---

### 4. Ticket Issued Response
```json
{
  "status": "success",
  "message": "Ticket issued successfully after payment",
  "data": {
    "ticket": {
      "_id": "6915ea14c570d7e464559907",
      "ticketId": "691337e4c4145e1999997a49-6915c1ce111e057ff7b315bc-1763043860180",
      "eventId": "691337e4c4145e1999997a49",
      "eventName": "New Tech Conference",
      "userId": "6915c1ce111e057ff7b315bc",
      "userName": "daksh updated via PUT",
      "userEmail": "d@example.com",
      "price": 500,
      "status": "active",              ✅ Ticket is active
      "purchaseDate": "2025-11-13T14:24:20.180Z",
      "paymentId": "PAY-12345-ABCDE",
      "registrationId": "6915e717345ac3c6fa0ef8b1"
    }
  }
}
```

---

## Automatic Updates After Ticket Issuance

### 1. Registration Updated
```json
{
  "status": "verified",          ✅ Changed from "pending"
  "ticketIssued": true,          ✅ Changed from false
  "ticketIssuedDate": "2025-11-13T14:24:20.262Z"  ✅ Set to now
}
```

### 2. Event Updated
```json
{
  "ticketsSold": 1               ✅ Incremented from 0
  // Next registration may have ticketAvailabilityStatus: "available" (499 left)
  // When ticketsSold reaches 500, status becomes "pending" (waiting list)
}
```

---

## Complete API Flow Example

### 1️⃣ Create Registration
```bash
curl -X POST 'http://localhost:3000/api/registrations' \
  -H 'Authorization: Bearer <token>' \
  -d '{"userId":"...", "eventId":"..."}'
```
Returns: `registrationId: "6915e717345ac3c6fa0ef8b1"`

### 2️⃣ Initiate Payment
Your payment gateway processes the payment with:
- Amount: 500
- User: userId
- Registration: registrationId

### 3️⃣ Issue Ticket (After Payment Success)
```bash
curl -X POST 'http://localhost:3000/api/tickets/issue-after-payment' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "registrationId": "6915e717345ac3c6fa0ef8b1",
    "paymentId": "PAY-12345-ABCDE",
    "amount": 500,
    "price": 500
  }'
```
Returns: Complete ticket details with `ticketId`

---

## Ticket Structure

```json
{
  "_id": "MongoDB ObjectId",
  "ticketId": "EventID-UserID-Timestamp",  // Unique identifier
  "event": "Event ObjectId",
  "user": "User ObjectId",
  "price": 500,
  "purchaseDate": "2025-11-13T14:24:20.180Z",
  "checkInTime": null,                     // Set on check-in
  "status": "active",                      // active, checked-in, cancelled, refunded
  "faceVerified": true                     // Verified during registration
}
```

---

## Error Handling

### Case 1: No Face Verification
```json
{
  "status": 400,
  "message": "User does not have face verification"
}
```
**Fix:** User needs to complete face verification first

### Case 2: No Tickets Available
```json
{
  "status": 400,
  "message": "No tickets available for this event"
}
```
**Fix:** User goes to waiting list, registration status remains "pending"

### Case 3: Ticket Already Issued
```json
{
  "status": 400,
  "message": "Ticket already issued for this registration"
}
```
**Fix:** Cannot issue duplicate tickets. Previous ticket still valid

### Case 4: Invalid Registration
```json
{
  "status": 404,
  "message": "No registration found with that ID"
}
```
**Fix:** Check registrationId is correct

---

## Event Ticket Lifecycle

| Stage | ticketsSold | Status | New Registration Status |
|-------|-------------|--------|------------------------|
| Event Created | 0 | - | - |
| First Ticket Issued | 1 | - | available |
| More Tickets Issued | 1-499 | - | available |
| All Sold | 500 | Sold Out | pending (waiting list) |
| User Cancels | 499 | - | available (if 499 < 500) |

---

## Payment Integration Pattern

### Your Frontend Flow:
```javascript
// 1. Create registration
const registration = await api.createRegistration({
  userId, eventId
});

// 2. Show payment UI
const paymentDetails = await showPaymentGateway({
  amount: registration.price,
  registrationId: registration._id
});

// 3. After payment success
if (paymentSuccess) {
  const ticket = await api.issueTicket({
    registrationId: registration._id,
    paymentId: paymentDetails.paymentId,
    amount: paymentDetails.amount,
    price: registration.price
  });
  
  // Show ticket to user
  showTicket(ticket);
}
```

---

## Postman Collection

Import the updated `user-verification-api.postman_collection.json` which now includes:
- ✅ Create Registration (Auto Status)
- ✅ Get User Registrations
- ✅ Issue Ticket After Payment

---

## Key Features

✅ **Automatic Face Verification Check**
- Validates user has face record before allowing ticket

✅ **Automatic Ticket Availability**
- Validates tickets are available before issuing
- Marks as "pending" when sold out

✅ **Unique Ticket Generation**
- Creates unique `ticketId` combining EventID-UserID-Timestamp
- Cannot be duplicated

✅ **Automatic Event Update**
- Increments `ticketsSold` count
- Affects next registrations' `ticketAvailabilityStatus`

✅ **Registration Status Tracking**
- pending → verified (when ticket issued)
- Tracks `ticketIssuedDate`

✅ **Complete Validation**
- Prevents duplicate tickets
- Checks registration exists
- Validates all conditions before issuing

---

## Success Scenario Tested ✅

```
User: daksh (ID: 6915c1ce111e057ff7b315bc)
Event: New Tech Conference (ID: 691337e4c4145e1999997a49)

Registration Created:
✅ faceVerificationStatus: true
✅ ticketAvailabilityStatus: available
✅ ticketIssued: false

Ticket Issued After Payment:
✅ Ticket ID: 691337e4c4145e1999997a49-6915c1ce111e057ff7b315bc-1763043860180
✅ Status: active
✅ Price: 500

Registration Updated:
✅ status: "verified"
✅ ticketIssued: true
✅ ticketIssuedDate: 2025-11-13T14:24:20.262Z

Event Updated:
✅ ticketsSold: 1 (was 0)
```

All systems working perfectly! 🎉
