# Unified Booking API - Quick Reference

## New Endpoint

```
POST /api/booking/book
Authorization: Bearer <token>
Content-Type: application/json
```

## One-Step Flow

```
User clicks "Book Now"
         ↓
Razorpay payment checkout opens
         ↓
User completes payment
         ↓
POST /api/booking/book (with Razorpay payment data)
         ↓
Backend verifies payment signature
         ↓
Backend creates booking + confirms + generates tickets
         ↓
Response: { booking, payment, tickets }
         ↓
Show success + display tickets
```

## Request Example

```bash
curl -X POST https://backendmongo-tau.vercel.app/api/booking/book \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "EVENT_ID",
    "seatingId": "SEATING_ID",
    "seatType": "VIP",
    "quantity": 2,
    "pricePerSeat": 500,
    "paymentData": {
      "razorpayOrderId": "order_xxx",
      "razorpayPaymentId": "pay_xxx",
      "razorpaySignature": "signature_xxx"
    }
  }'
```

## Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | string | Event ID from MongoDB |
| `seatingId` | string | Seating ID from event |
| `seatType` | string | Seat category (VIP, General, etc.) |
| `quantity` | number | Number of tickets |
| `pricePerSeat` | number | Price per ticket in INR |
| `paymentData.razorpayOrderId` | string | From Razorpay |
| `paymentData.razorpayPaymentId` | string | From Razorpay |
| `paymentData.razorpaySignature` | string | From Razorpay |

## Success Response

```json
{
  "status": "success",
  "message": "Booking confirmed with successful payment",
  "data": {
    "paymentStatus": "success",
    "booking": {
      "_id": "BOOKING_ID",
      "status": "confirmed",
      "paymentStatus": "verified",
      "ticketNumbers": ["TKT001", "TKT002"],
      "totalPrice": 1000
    },
    "payment": {
      "orderId": "order_xxx",
      "paymentId": "pay_xxx",
      "amount": 1000,
      "currency": "INR"
    }
  }
}
```

## Error Codes

- `400` - Missing fields or payment verification failed
- `401` - User not authenticated
- `404` - Event/seating not found
- `500` - Server error

## JavaScript Example

```javascript
async function bookWithPayment(eventId, paymentResponse) {
  const response = await fetch('/api/booking/book', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      eventId,
      seatingId: 'SEATING_ID',
      seatType: 'VIP',
      quantity: 2,
      pricePerSeat: 500,
      paymentData: {
        razorpayOrderId: paymentResponse.razorpay_order_id,
        razorpayPaymentId: paymentResponse.razorpay_payment_id,
        razorpaySignature: paymentResponse.razorpay_signature
      }
    })
  });

  const result = await response.json();
  
  if (response.ok) {
    console.log('✅ Booking confirmed!');
    console.log('Tickets:', result.data.booking.ticketNumbers);
  } else {
    console.error('❌ Booking failed:', result.message);
  }
}
```

## Process Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│  Frontend: Initialize Booking                       │
│  - Display event details                            │
│  - Show seat selection                              │
│  - Show price summary                               │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│  Step 1: Create Razorpay Order                      │
│  POST /api/payments/create-order                    │
│  Response: { razorpayOrderId, key }                 │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│  Step 2: Open Razorpay Checkout                     │
│  - Display payment form                             │
│  - User enters card/UPI details                     │
│  - Razorpay handles payment                         │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│  Step 3: Payment Success Callback                   │
│  - razorpay_order_id                                │
│  - razorpay_payment_id                              │
│  - razorpay_signature                               │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│  Step 4: Unified Booking Endpoint                   │
│  POST /api/booking/book                             │
│  - Create booking record                            │
│  - Verify Razorpay signature                        │
│  - Confirm booking                                  │
│  - Generate tickets                                 │
│  Response: { booking, payment, tickets }            │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│  Step 5: Show Success                               │
│  - Display booking ID                               │
│  - Display ticket numbers                           │
│  - Show download ticket option                      │
└─────────────────────────────────────────────────────┘
```

## Comparison: Old vs New

### Old Flow
```
POST /api/booking/create-with-payment
  ↓ (Gets razorpayOrderId)
Razorpay Checkout
  ↓ (User pays)
POST /api/booking/:id/verify-payment
  ↓ (Confirms booking)
Success
```

### New Flow
```
POST /api/payments/create-order
  ↓ (Gets razorpayOrderId)
Razorpay Checkout
  ↓ (User pays)
POST /api/booking/book
  ↓ (Everything in one call!)
Success
```

## Key Improvements

✅ **Fewer API calls** - From 2-3 calls to 2 calls
✅ **Faster confirmation** - Combined verification + booking
✅ **Better error handling** - All steps in one transaction
✅ **Cleaner response** - All info in one response
✅ **Atomic operation** - No partial bookings

## Implementation Checklist

- [ ] Get event ID and seating ID
- [ ] Call `/api/payments/create-order` to get Razorpay order
- [ ] Open Razorpay checkout with order ID
- [ ] User completes payment
- [ ] In Razorpay handler, call `/api/booking/book`
- [ ] Display booking confirmation and tickets
- [ ] Provide download ticket option
- [ ] Send booking confirmation email

