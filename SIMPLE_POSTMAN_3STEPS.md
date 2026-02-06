# 🎯 Updated Postman - Signature Optional

## Simple 3-Step Flow

### Step 1: Login
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "test123"
}
```
**Save:** `TOKEN`, `USER_ID`

---

### Step 2: Book Seats
```
POST http://localhost:5000/api/booking-payment/initiate-with-verification
Authorization: Bearer {{TOKEN}}
Content-Type: application/json

{
  "userId": "{{USER_ID}}",
  "eventId": "EVENT_ID",
  "seatingId": "SEATING_ID",
  "seatType": "Premium",
  "quantity": 2,
  "pricePerSeat": 500
}
```
**Save:** `bookingId`, `razorpayOrderId`, `razorpayPaymentId`

---

### Step 3: Confirm Booking (NO SIGNATURE NEEDED!)
```
POST http://localhost:5000/api/booking-payment/confirm-booking
Authorization: Bearer {{TOKEN}}
Content-Type: application/json

{
  "bookingId": "{{bookingId}}",
  "razorpayOrderId": "{{razorpayOrderId}}",
  "razorpayPaymentId": "{{razorpayPaymentId}}"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Booking confirmed successfully! Payment received.",
  "data": {
    "booking": {
      "status": "confirmed",
      "ticketNumbers": ["TKT001", "TKT002"]
    }
  }
}
```

---

## 🎉 That's it! 

No more signature headaches! ✅

Backend automatically:
- Fetches payment from Razorpay API
- Verifies it's captured
- Confirms booking
- Generates tickets

**Simple & Secure!** 🚀
