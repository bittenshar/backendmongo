# Unified Booking + Payment Flow Guide

## Overview

The new `/api/booking/book` endpoint provides a **one-step booking and payment confirmation** flow, eliminating the need for separate API calls to verify payment and confirm the booking.

### Old Flow (3 API Calls)
```
1. POST /api/booking/create-with-payment    → Creates booking + Razorpay order
2. Frontend: User completes Razorpay payment
3. POST /api/booking/:bookingId/verify-payment → Verifies signature + Confirms booking
```

### New Flow (1 API Call)
```
1. POST /api/booking/book (with payment verification data)
   ├─ Creates Razorpay order internally
   ├─ Verifies payment signature
   ├─ Confirms booking
   └─ Returns complete response with token
```

---

## Endpoint Details

### POST `/api/booking/book`

**Authentication:** Required (Bearer token)

**Description:** One-step booking with automatic payment processing

#### Request Body

```json
{
  "eventId": "6526a1b2c3d4e5f6g7h8i9j0",
  "seatingId": "6526a1b2c3d4e5f6g7h8i9j1",
  "seatType": "VIP",
  "quantity": 2,
  "pricePerSeat": 500,
  "specialRequirements": "Wheelchair accessible seat",
  "paymentData": {
    "razorpayOrderId": "order_1234567890abcd",
    "razorpayPaymentId": "pay_1234567890abcd",
    "razorpaySignature": "9e86a5e1f53f19d7a0f3be6b1b8c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b"
  }
}
```

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `eventId` | string | ✅ Yes | MongoDB Event ID |
| `seatingId` | string | ✅ Yes | MongoDB Seating ID within the event |
| `seatType` | string | ✅ Yes | Seat category (e.g., "VIP", "General", "Premium") |
| `quantity` | number | ✅ Yes | Number of tickets to book |
| `pricePerSeat` | number | ✅ Yes | Price per ticket in INR |
| `specialRequirements` | string | ❌ No | Special requests (wheelchair, dietary, etc.) |
| `paymentData` | object | ✅ Yes | Razorpay payment details |
| `paymentData.razorpayOrderId` | string | ✅ Yes | Order ID from Razorpay |
| `paymentData.razorpayPaymentId` | string | ✅ Yes | Payment ID from Razorpay (after user pays) |
| `paymentData.razorpaySignature` | string | ✅ Yes | Signature for verification |

#### Success Response (201)

```json
{
  "status": "success",
  "message": "Booking confirmed with successful payment",
  "data": {
    "paymentStatus": "success",
    "booking": {
      "_id": "6526a1b2c3d4e5f6g7h8i9j2",
      "userId": "6526a1b2c3d4e5f6g7h8i9j3",
      "eventId": "6526a1b2c3d4e5f6g7h8i9j0",
      "seatingId": "6526a1b2c3d4e5f6g7h8i9j1",
      "seatType": "VIP",
      "quantity": 2,
      "pricePerSeat": 500,
      "totalPrice": 1000,
      "status": "confirmed",
      "paymentStatus": "verified",
      "razorpayOrderId": "order_1234567890abcd",
      "razorpayPaymentId": "pay_1234567890abcd",
      "ticketNumbers": ["TKT001", "TKT002"],
      "bookedAt": "2026-01-19T12:34:56.789Z",
      "confirmedAt": "2026-01-19T12:34:57.000Z"
    },
    "payment": {
      "orderId": "order_1234567890abcd",
      "paymentId": "pay_1234567890abcd",
      "amount": 1000,
      "currency": "INR",
      "verifiedAt": "2026-01-19T12:34:57.123Z"
    },
    "ticketInfo": {
      "seatType": "VIP",
      "quantity": 2,
      "pricePerSeat": 500,
      "totalPrice": 1000,
      "ticketNumbers": ["TKT001", "TKT002"]
    }
  }
}
```

#### Error Response

```json
{
  "status": "error",
  "message": "Payment verification failed: Invalid signature",
  "details": "Payment signature verification failed"
}
```

**Status Codes:**
- `201` - Booking confirmed with successful payment
- `400` - Missing fields, payment verification failed, or booking error
- `401` - User not authenticated
- `404` - Event or seating not found
- `500` - Server error

---

## Implementation Flow

### Step 1: Initialize Razorpay Payment (Frontend)

```javascript
// Create order first
const orderResponse = await fetch('/api/payments/create-order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    amount: 1000,
    description: 'Event Booking',
    notes: {
      eventId: '6526a1b2c3d4e5f6g7h8i9j0'
    }
  })
});

const orderData = await orderResponse.json();
const razorpayOrderId = orderData.data.razorpayOrderId;

// Open Razorpay checkout
const options = {
  key: orderData.data.key,
  amount: 1000 * 100, // Convert to paise
  currency: 'INR',
  order_id: razorpayOrderId,
  name: 'Event Booking',
  description: 'VIP Ticket x2',
  handler: function(response) {
    // Success: Now call the unified booking endpoint
    confirmBooking(response);
  },
  prefill: {
    email: userEmail,
    contact: userPhone
  }
};

const rzp = new Razorpay(options);
rzp.open();
```

### Step 2: Call Unified Booking Endpoint (After Payment)

```javascript
async function confirmBooking(paymentResponse) {
  const bookingResponse = await fetch('/api/booking/book', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      eventId: '6526a1b2c3d4e5f6g7h8i9j0',
      seatingId: '6526a1b2c3d4e5f6g7h8i9j1',
      seatType: 'VIP',
      quantity: 2,
      pricePerSeat: 500,
      specialRequirements: 'Wheelchair accessible',
      paymentData: {
        razorpayOrderId: paymentResponse.razorpay_order_id,
        razorpayPaymentId: paymentResponse.razorpay_payment_id,
        razorpaySignature: paymentResponse.razorpay_signature
      }
    })
  });

  if (bookingResponse.ok) {
    const result = await bookingResponse.json();
    console.log('✅ Booking confirmed!', result.data);
    // Redirect to success page with ticket details
  } else {
    const error = await bookingResponse.json();
    console.error('❌ Booking failed:', error.message);
    // Show error message to user
  }
}
```

---

## Complete Client-Side Example

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
    <button onclick="initiateBooking()">Book Now</button>

    <script>
        const token = localStorage.getItem('authToken');
        const eventId = '6526a1b2c3d4e5f6g7h8i9j0';

        async function initiateBooking() {
            try {
                // Step 1: Create Razorpay order
                const orderResponse = await fetch('https://backendmongo-tau.vercel.app/api/payments/create-order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        amount: 1000,
                        description: 'Event Booking - VIP Ticket x2',
                        notes: { eventId }
                    })
                });

                const orderData = await orderResponse.json();
                if (!orderData.data.razorpayOrderId) {
                    throw new Error('Failed to create Razorpay order');
                }

                // Step 2: Open Razorpay checkout
                const options = {
                    key: orderData.data.key,
                    amount: 1000 * 100,
                    currency: 'INR',
                    order_id: orderData.data.razorpayOrderId,
                    name: 'Event Booking System',
                    description: 'VIP Ticket x2',
                    handler: async (paymentResponse) => {
                        await confirmBooking(paymentResponse, orderData.data.razorpayOrderId);
                    },
                    prefill: {
                        email: 'user@example.com',
                        contact: '919876543210'
                    }
                };

                const rzp = new Razorpay(options);
                rzp.open();

            } catch (error) {
                alert('Error: ' + error.message);
            }
        }

        async function confirmBooking(paymentResponse, orderID) {
            try {
                // Step 3: Call unified booking endpoint
                const bookingResponse = await fetch('https://backendmongo-tau.vercel.app/api/booking/book', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        eventId: '6526a1b2c3d4e5f6g7h8i9j0',
                        seatingId: '6526a1b2c3d4e5f6g7h8i9j1',
                        seatType: 'VIP',
                        quantity: 2,
                        pricePerSeat: 500,
                        specialRequirements: '',
                        paymentData: {
                            razorpayOrderId: paymentResponse.razorpay_order_id,
                            razorpayPaymentId: paymentResponse.razorpay_payment_id,
                            razorpaySignature: paymentResponse.razorpay_signature
                        }
                    })
                });

                const result = await bookingResponse.json();

                if (bookingResponse.ok) {
                    alert('✅ Booking Confirmed!\nTickets: ' + result.data.booking.ticketNumbers.join(', '));
                    // Redirect to booking details page
                    window.location.href = `/booking/${result.data.booking._id}`;
                } else {
                    alert('❌ Booking Failed: ' + result.message);
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }
    </script>
</body>
</html>
```

---

## Postman Collection

### Request Setup

**URL:** `POST` `https://backendmongo-tau.vercel.app/api/booking/book`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "eventId": "6526a1b2c3d4e5f6g7h8i9j0",
  "seatingId": "6526a1b2c3d4e5f6g7h8i9j1",
  "seatType": "VIP",
  "quantity": 2,
  "pricePerSeat": 500,
  "specialRequirements": "Wheelchair accessible",
  "paymentData": {
    "razorpayOrderId": "order_1234567890abcd",
    "razorpayPaymentId": "pay_1234567890abcd",
    "razorpaySignature": "9e86a5e1f53f19d7a0f3be6b1b8c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b"
  }
}
```

---

## Workflow Comparison

### Old Three-Step Flow
```
Frontend                         Backend
   │                               │
   ├─ POST /booking/create-with-payment
   │                               ├─ Create booking (temporary)
   │                               ├─ Create Razorpay order
   │◄──────────────────────────────┤ Return: razorpayOrderId, booking
   │
   ├─ Open Razorpay Checkout
   │     (User completes payment)
   │
   ├─ POST /booking/:id/verify-payment
   │                               ├─ Verify Razorpay signature
   │                               ├─ Confirm booking
   │                               ├─ Generate tickets
   │◄──────────────────────────────┤ Return: confirmed booking + tickets
   │
   └─ Show Success + Tickets
```

### New One-Step Flow
```
Frontend                         Backend
   │                               │
   ├─ POST /payments/create-order
   │                               ├─ Create Razorpay order only
   │◄──────────────────────────────┤ Return: razorpayOrderId, key
   │
   ├─ Open Razorpay Checkout
   │     (User completes payment)
   │
   ├─ POST /booking/book (with payment data)
   │                               ├─ Create Razorpay order again
   │                               ├─ Verify Razorpay signature
   │                               ├─ Create booking (temporary)
   │                               ├─ Confirm booking
   │                               ├─ Generate tickets
   │◄──────────────────────────────┤ Return: confirmed booking + tickets + token
   │
   └─ Show Success + Tickets
```

---

## Benefits of Unified Endpoint

✅ **Single API Call** - No need for separate verification endpoint
✅ **Atomic Operation** - Booking and payment verification happen together
✅ **Better UX** - Reduced API calls = faster response
✅ **Automatic Confirmation** - No manual confirmation needed
✅ **Comprehensive Response** - Everything in one response
✅ **Backward Compatible** - Old endpoints still work

---

## Error Handling

### Case 1: Payment Signature Invalid
```json
{
  "status": "error",
  "message": "Payment verification failed: Invalid signature"
}
```
**Action:** Ask user to contact support, payment NOT processed

### Case 2: Razorpay Order Mismatch
```json
{
  "status": "error",
  "message": "Booking creation failed: Payment order ID does not match"
}
```
**Action:** Retry booking with correct payment details

### Case 3: Seats Not Available
```json
{
  "status": "error",
  "message": "Booking creation failed: Not enough seats available"
}
```
**Action:** Select different seat type or quantity

### Case 4: User Not Authenticated
```json
{
  "status": "error",
  "message": "Unauthorized"
}
```
**Action:** Login and retry

---

## Testing Checklist

- [ ] Create event with seating
- [ ] Create Razorpay order via `/api/payments/create-order`
- [ ] Complete Razorpay payment test
- [ ] Call `/api/booking/book` with payment data
- [ ] Verify booking is confirmed
- [ ] Verify ticket numbers are generated
- [ ] Verify payment status is "verified"
- [ ] Test error cases (invalid signature, missing fields)
- [ ] Test with different seat types and quantities
- [ ] Verify response includes all required fields

---

## FAQ

**Q: What if payment is captured but booking creation fails?**
A: The endpoint will verify payment first, then create booking. If booking fails, the payment will be refunded automatically.

**Q: Can I use the old endpoints?**
A: Yes! The old `/booking/create-with-payment` and `/booking/:id/verify-payment` endpoints still work.

**Q: What happens if user navigates away after payment?**
A: The booking will remain temporary until verified. Temporary bookings expire after 15 minutes.

**Q: How do I handle the ticket download?**
A: Use the `/api/booking/:bookingId/download-ticket` endpoint after booking is confirmed.

