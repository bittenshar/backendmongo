# Booking Payment Flow - Postman Test JSON

## Complete 3-Step Flow for Testing

---

## STEP 1: Initiate Booking with Verification

**Endpoint:** `POST http://localhost:3000/api/booking-payment/initiate-with-verification`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer JWT_TOKEN (if required)
```

### Request Body 1A - Minimal Test
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "eventId": "507f1f77bcf86cd799439012",
  "seatingId": "507f1f77bcf86cd799439013",
  "seatType": "standard",
  "quantity": 2,
  "pricePerSeat": 500
}
```

### Request Body 1B - Full Test (with all details)
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "eventId": "507f1f77bcf86cd799439012",
  "seatingId": "507f1f77bcf86cd799439013",
  "seatType": "premium",
  "quantity": 3,
  "pricePerSeat": 1000
}
```

### Expected Response (Save these values for Step 3):
```json
{
  "status": "success",
  "message": "Booking initiated successfully",
  "data": {
    "bookingId": "507f1f77bcf86cd799439020",
    "razorpayOrderId": "order_MZCdDfn3sNhkxt",
    "amount": 6000,
    "currency": "INR",
    "receipt": "booking_507f1f77",
    "notes": {
      "bookingId": "507f1f77bcf86cd799439020",
      "userId": "507f1f77bcf86cd799439011",
      "eventId": "507f1f77bcf86cd799439012"
    },
    "expiresIn": "15 minutes"
  }
}
```

**💾 COPY THESE FROM RESPONSE:**
- `data.bookingId` → Save as `BOOKING_ID`
- `data.razorpayOrderId` → Save as `RAZORPAY_ORDER_ID`

---

## STEP 2: Get Razorpay Payment Details (Optional)

**Endpoint:** `GET http://localhost:3000/api/booking-payment/razorpay-order/:razorpayOrderId`

**Replace `:razorpayOrderId` with the value from Step 1**

Example:
```
GET http://localhost:3000/api/booking-payment/razorpay-order/order_MZCdDfn3sNhkxt
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "id": "order_MZCdDfn3sNhkxt",
    "amount": 6000,
    "currency": "INR",
    "status": "created",
    "payments": null
  }
}
```

---

## STEP 3: Confirm Booking After Payment

**Endpoint:** `POST http://localhost:3000/api/booking-payment/confirm-booking`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer JWT_TOKEN (if required)
```

### Request Body 3A - Using values from Step 1
```json
{
  "bookingId": "507f1f77bcf86cd799439020",
  "razorpayOrderId": "order_MZCdDfn3sNhkxt"
}
```

### Request Body 3B - Alternative with test data
```json
{
  "bookingId": "ORD_696b83b5_541639",
  "razorpayOrderId": "order_test_12345"
}
```

### Expected Response (Success):
```json
{
  "status": "success",
  "message": "Booking confirmed successfully",
  "data": {
    "bookingId": "507f1f77bcf86cd799439020",
    "status": "confirmed",
    "paymentStatus": "completed",
    "razorpayOrderId": "order_MZCdDfn3sNhkxt",
    "razorpayPaymentId": "pay_MZCdDfn3sNhkxt",
    "totalPrice": 6000,
    "userDetails": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210"
    },
    "eventDetails": {
      "name": "Concert 2026",
      "date": "2026-03-15",
      "location": "Mumbai"
    },
    "ticketNumbers": ["TKT001", "TKT002", "TKT003"]
  }
}
```

---

## Quick Copy-Paste for Postman

### Step 1 JSON (Copy directly)
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "eventId": "507f1f77bcf86cd799439012",
  "seatingId": "507f1f77bcf86cd799439013",
  "seatType": "standard",
  "quantity": 2,
  "pricePerSeat": 500
}
```

### Step 3 JSON (After Step 1 - Replace with actual values)
```json
{
  "bookingId": "REPLACE_WITH_BOOKING_ID_FROM_STEP_1",
  "razorpayOrderId": "REPLACE_WITH_RAZORPAY_ORDER_ID_FROM_STEP_1"
}
```

---

## How to Use in Postman

### Method 1: Manual Testing

1. **Open Postman**
2. **Create New Request → POST Tab**
3. **Set URL:** `http://localhost:3000/api/booking-payment/initiate-booking-with-verification`
4. **Set Headers:**
   ```
   Content-Type: application/json
   ```
5. **Set Body (raw JSON):** Copy Request Body 1A above
6. **Click Send**
7. **Copy values from response** for Step 3

---

### Method 2: Using Postman Environment Variables

1. **Create a Postman Environment** called "Booking Test"
2. **Add variables:**
   ```
   BASE_URL: http://localhost:3000
   BOOKING_ID: (empty - will be set after Step 1)
   RAZORPAY_ORDER_ID: (empty - will be set after Step 1)
   USER_ID: 507f1f77bcf86cd799439011
   EVENT_ID: 507f1f77bcf86cd799439012
   SEATING_ID: 507f1f77bcf86cd799439013
   ```

3. **Request 1 - Initiate Booking:**
   - URL: `{{BASE_URL}}/api/booking-payment/initiate-with-verification`
   - Method: POST
   - Body:
     ```json
     {
       "userId": "{{USER_ID}}",
       "eventId": "{{EVENT_ID}}",
       "seatingId": "{{SEATING_ID}}",
       "seatType": "standard",
       "quantity": 2,
       "pricePerSeat": 500
     }
     ```
   - In **Tests** tab, add:
     ```javascript
     pm.environment.set("BOOKING_ID", pm.response.json().data.bookingId);
     pm.environment.set("RAZORPAY_ORDER_ID", pm.response.json().data.razorpayOrderId);
     ```

4. **Request 2 - Confirm Booking:**
   - URL: `{{BASE_URL}}/api/booking-payment/confirm-booking`
   - Method: POST
   - Body:
     ```json
     {
       "bookingId": "{{BOOKING_ID}}",
       "razorpayOrderId": "{{RAZORPAY_ORDER_ID}}"
     }
     ```

---

## Test Database IDs

Use these IDs for testing (if they exist in your database):

```
User IDs:
- 507f1f77bcf86cd799439011
- 507f1f77bcf86cd799439001
- 507f1f77bcf86cd799439002

Event IDs:
- 507f1f77bcf86cd799439012
- 507f1f77bcf86cd799439003
- 507f1f77bcf86cd799439004

Seating IDs:
- 507f1f77bcf86cd799439013
- 507f1f77bcf86cd799439005
- 507f1f77bcf86cd799439006
```

---

## Troubleshooting

### Error: "User not found"
- Make sure `userId` exists in MongoDB Users collection
- Check: `db.users.findOne({ _id: ObjectId("507f1f77bcf86cd799439011") })`

### Error: "Event not found"
- Make sure `eventId` exists in MongoDB Events collection
- Check: `db.events.findOne({ _id: ObjectId("507f1f77bcf86cd799439012") })`

### Error: "Booking not found" in Step 3
- Make sure you completed Step 1 first
- Use the exact `bookingId` and `razorpayOrderId` from Step 1 response

### Error: "Face verification required"
- The user must have `verificationStatus: "verified"` in database
- Update user: 
  ```
  db.users.updateOne(
    { _id: ObjectId("507f1f77bcf86cd799439011") },
    { $set: { verificationStatus: "verified", faceId: "test-face-id" } }
  )
  ```

---

## Real IDs (Update with your actual MongoDB data)

Get real IDs from your database:

```javascript
// MongoDB commands to find real IDs

// Find a real user
db.users.findOne({}, { _id: 1 })

// Find a real event
db.events.findOne({}, { _id: 1 })

// Find a real seating
db.seatings.findOne({}, { _id: 1 })
```

---

## Complete Flow Summary

```
┌─────────────────────────────────────────┐
│ STEP 1: Initiate Booking                │
│ POST /initiate-booking-with-verification│
│ Input: userId, eventId, seatingId, etc  │
│ Output: bookingId, razorpayOrderId      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ STEP 2: Payment (Razorpay Front-end)    │
│ User completes payment on Razorpay      │
│ (This is done by frontend, not API)     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ STEP 3: Confirm Booking                 │
│ POST /confirm-booking                   │
│ Input: bookingId, razorpayOrderId       │
│ Output: Confirmed booking details       │
└─────────────────────────────────────────┘
```

---

**Now copy the JSON and test in Postman! 🚀**
