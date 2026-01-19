# Unified Booking Flow - Visual Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React/Vue/Angular)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐  │
│  │  Event Details   │      │  Seat Selection  │      │  Payment Page    │  │
│  │  - Event info    │──────│  - Choose seats  │──────│  - Show price    │  │
│  │  - Prices        │      │  - Qty selector  │      │  - Razorpay btn  │  │
│  └──────────────────┘      └──────────────────┘      └──────────────────┘  │
│                                                               │               │
│                                                               ▼               │
│                                                    ┌──────────────────┐     │
│                                                    │  Razorpay Modal  │     │
│                                                    │  - Payment form  │     │
│                                                    │  - UPI/Card      │     │
│                                                    └──────────────────┘     │
│                                                               │               │
│                                                               ▼               │
│                                                    ┌──────────────────┐     │
│                                                    │ Success Callback │     │
│                                                    │ - Get payment ID │     │
│                                                    │ - Get signature  │     │
│                                                    └──────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ HTTPS
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (Node.js/Express)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  POST /api/booking/book (Authentication required)                  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐  │   │
│  │  │ STEP 1: Validate Request                                   │  │   │
│  │  │ ┌──────────────────────────────────────────────────────┐   │  │   │
│  │  │ │ • Check authentication                              │   │  │   │
│  │  │ │ • Validate required fields                          │   │  │   │
│  │  │ │ • Validate payment data present                     │   │  │   │
│  │  │ └──────────────────────────────────────────────────────┘   │  │   │
│  │  └─────────────────────────────────────────────────────────────┘  │   │
│  │                          ▼                                         │   │
│  │  ┌─────────────────────────────────────────────────────────────┐  │   │
│  │  │ STEP 2: Create Razorpay Order                             │  │   │
│  │  │ ┌──────────────────────────────────────────────────────┐   │  │   │
│  │  │ │ • Calculate total: quantity × pricePerSeat           │   │  │   │
│  │  │ │ • Call Razorpay API                                  │   │  │   │
│  │  │ │ • Store order ID in booking                          │   │  │   │
│  │  │ │ • Create receipt ID                                  │   │  │   │
│  │  │ └──────────────────────────────────────────────────────┘   │  │   │
│  │  └─────────────────────────────────────────────────────────────┘  │   │
│  │                          ▼                                         │   │
│  │  ┌─────────────────────────────────────────────────────────────┐  │   │
│  │  │ STEP 3: Create Temporary Booking                          │  │   │
│  │  │ ┌──────────────────────────────────────────────────────┐   │  │   │
│  │  │ │ • Create booking record in MongoDB                   │   │  │   │
│  │  │ │ • Status: "temporary"                                │   │  │   │
│  │  │ │ • Expiry: 15 minutes                                 │   │  │   │
│  │  │ │ • Lock seats in event                                │   │  │   │
│  │  │ └──────────────────────────────────────────────────────┘   │  │   │
│  │  └─────────────────────────────────────────────────────────────┘  │   │
│  │                          ▼                                         │   │
│  │  ┌─────────────────────────────────────────────────────────────┐  │   │
│  │  │ STEP 4: Verify Payment Signature                          │  │   │
│  │  │ ┌──────────────────────────────────────────────────────┐   │  │   │
│  │  │ │ • Hash signature components                          │   │  │   │
│  │  │ │ • Verify against Razorpay signature                  │   │  │   │
│  │  │ │ • Check against stored order ID                      │   │  │   │
│  │  │ │ • Confirm payment was successful                     │   │  │   │
│  │  │ └──────────────────────────────────────────────────────┘   │  │   │
│  │  └─────────────────────────────────────────────────────────────┘  │   │
│  │                          ▼                                         │   │
│  │  ┌─────────────────────────────────────────────────────────────┐  │   │
│  │  │ STEP 5: Confirm Booking                                   │  │   │
│  │  │ ┌──────────────────────────────────────────────────────┐   │  │   │
│  │  │ │ • Update status: temporary → confirmed               │   │  │   │
│  │  │ │ • Remove expiry time                                 │   │  │   │
│  │  │ │ • Mark payment as verified                           │   │  │   │
│  │  │ │ • Update payment status                              │   │  │   │
│  │  │ └──────────────────────────────────────────────────────┘   │  │   │
│  │  └─────────────────────────────────────────────────────────────┘  │   │
│  │                          ▼                                         │   │
│  │  ┌─────────────────────────────────────────────────────────────┐  │   │
│  │  │ STEP 6: Generate Tickets                                  │  │   │
│  │  │ ┌──────────────────────────────────────────────────────┐   │  │   │
│  │  │ │ • Generate unique ticket numbers                    │   │  │   │
│  │  │ │ • Format: TKT{date}{booking_id}{seq}                │   │  │   │
│  │  │ │ • Store in booking record                           │   │  │   │
│  │  │ │ • Generate QR codes                                 │   │  │   │
│  │  │ └──────────────────────────────────────────────────────┘   │  │   │
│  │  └─────────────────────────────────────────────────────────────┘  │   │
│  │                          ▼                                         │   │
│  │  ┌─────────────────────────────────────────────────────────────┐  │   │
│  │  │ STEP 7: Send Confirmation                                 │  │   │
│  │  │ ┌──────────────────────────────────────────────────────┐   │  │   │
│  │  │ │ • Send email to user                                │   │  │   │
│  │  │ │ • Include booking details                           │   │  │   │
│  │  │ │ • Include ticket numbers                            │   │  │   │
│  │  │ │ • Include download link                             │   │  │   │
│  │  │ └──────────────────────────────────────────────────────┘   │  │   │
│  │  └─────────────────────────────────────────────────────────────┘  │   │
│  │                          ▼                                         │   │
│  │  ┌─────────────────────────────────────────────────────────────┐  │   │
│  │  │ STEP 8: Return Success Response (201)                     │  │   │
│  │  │ {                                                          │  │   │
│  │  │   status: "success",                                       │  │   │
│  │  │   data: {                                                  │  │   │
│  │  │     paymentStatus: "success",                              │  │   │
│  │  │     booking: { _id, status, tickets, ... },               │  │   │
│  │  │     payment: { orderId, paymentId, amount },               │  │   │
│  │  │     ticketInfo: { seatType, quantity, totalPrice }         │  │   │
│  │  │   }                                                        │  │   │
│  │  │ }                                                          │  │   │
│  │  └─────────────────────────────────────────────────────────────┘  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS + JSON
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐   │
│  │  Razorpay API      │  │   MongoDB          │  │   Email Service    │   │
│  │  - Create Order    │  │   - Save Booking   │  │   - Send Confirm   │   │
│  │  - Verify Payment  │  │   - Update Seats   │  │   - Tickets        │   │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
Frontend                     Backend                    External Services
   │                           │                             │
   │ 1. POST /booking/book      │                             │
   ├──────────────────────────►│                             │
   │                           │                             │
   │                           │ 2. Create Razorpay Order   │
   │                           ├────────────────────────────►│
   │                           │                    order_id │
   │                           │◄────────────────────────────┤
   │                           │                             │
   │                           │ 3. Create Booking Record    │
   │                           │ (status: temporary)         │
   │                           │ INSERT into bookings        │
   │                           │ UPDATE events (lock seats)  │
   │                           │                             │
   │                           │ 4. Verify Signature         │
   │                           │ (Compare with stored data)  │
   │                           │                             │
   │                           │ 5. Confirm Booking          │
   │                           │ UPDATE booking (confirmed)  │
   │                           │ GENERATE tickets            │
   │                           │                             │
   │                           │ 6. Send Email               │
   │                           ├────────────────────────────►│
   │                           │         confirmation_email  │
   │                           │                             │
   │ Response (201)             │                             │
   │ {                          │                             │
   │   booking (confirmed)      │                             │
   │   tickets                  │                             │
   │   payment details          │                             │
   │ }                          │                             │
   │◄──────────────────────────┤                             │
   │                           │                             │
```

---

## Request/Response Timeline

```
T+0ms     Frontend sends POST /api/booking/book
          ├─ Authentication check
          ├─ Field validation
          └─ Request accepted

T+50ms    Backend calls Razorpay API
          ├─ Create order
          ├─ Verify order creation
          └─ Store order ID

T+150ms   Backend creates booking
          ├─ Insert in MongoDB
          ├─ Lock seats
          └─ Booking created (temporary)

T+200ms   Backend verifies signature
          ├─ Hash calculation
          ├─ Comparison
          └─ Signature verified

T+250ms   Backend confirms booking
          ├─ Update status
          ├─ Generate tickets
          └─ Booking confirmed

T+300ms   Backend sends email
          └─ Confirmation queued

T+350ms   Response sent to frontend
          ├─ HTTP 201 Created
          ├─ Complete booking data
          ├─ Payment details
          └─ Ticket information

T+400ms   Frontend receives response
          ├─ Display success page
          ├─ Show tickets
          └─ Enable download

Total Time: ~400ms (depends on network)
```

---

## State Transition Diagram

```
                    ┌──────────────────────┐
                    │   NOT STARTED        │
                    │                      │
                    │  - User on event     │
                    │    details page      │
                    └──────────┬───────────┘
                               │
                               │ User clicks "Book Now"
                               ▼
                    ┌──────────────────────┐
                    │  SEAT SELECTION      │
                    │                      │
                    │  - Select seats      │
                    │  - Choose quantity   │
                    └──────────┬───────────┘
                               │
                               │ User proceeds to payment
                               ▼
                    ┌──────────────────────┐
                    │  PAYMENT PENDING     │
                    │                      │
                    │  - Create Razorpay   │
                    │    order            │
                    │  - Show checkout     │
                    └──────────┬───────────┘
                               │
                    ┌──────────┴──────────┐
                    │                    │
        Payment Failed          Payment Successful
                    │                    │
                    ▼                    ▼
          ┌──────────────────┐  ┌──────────────────────┐
          │  PAYMENT FAILED  │  │  BOOKING TEMPORARY   │
          │                  │  │                      │
          │  - Show error    │  │  - Create booking    │
          │  - Retry option  │  │  - Lock seats        │
          │  - Refund issued │  │  - 15 min expiry     │
          └──────────────────┘  │                      │
                                └──────────┬───────────┘
                                           │
                                           │ Backend verifies signature
                                           │
                    ┌──────────┬───────────┘
                    │          │
        Verification Failed    Verification Success
                    │          │
                    ▼          ▼
          ┌──────────────────┐  ┌──────────────────────┐
          │  BOOKING FAILED  │  │  BOOKING CONFIRMED   │
          │                  │  │                      │
          │  - Delete booking│  │  - Generate tickets  │
          │  - Unlock seats  │  │  - Send email        │
          │  - Show error    │  │  - Enable download   │
          │  - Refund issued │  │  - Permanent record  │
          └──────────────────┘  │                      │
                                └──────────┬───────────┘
                                           │
                                           │ User can download/share
                                           ▼
                                ┌──────────────────────┐
                                │   BOOKING COMPLETE   │
                                │                      │
                                │  - Tickets ready     │
                                │  - Download ticket   │
                                │  - Share booking     │
                                │  - Proceed to event  │
                                └──────────────────────┘
```

---

## Error Handling Flow

```
                       POST /api/booking/book
                              │
                              ▼
                    ┌──────────────────────┐
                    │  Validate Request    │
                    └──────────┬───────────┘
                               │
                    ┌──────────┴──────────────────┐
                    │                            │
           Valid Fields              Invalid Fields
                    │                            │
                    ▼                            ▼
            Continue                  ┌──────────────────┐
                    │                 │  Return 400      │
                    ▼                 │  Missing fields  │
         ┌──────────────────────┐     └──────────────────┘
         │ Create Razorpay      │
         │ Order                │
         └──────────┬───────────┘
                    │
         ┌──────────┴──────────┐
         │                    │
      Success            Error
         │                    │
         ▼                    ▼
    Continue         ┌──────────────────┐
         │           │ Cancel booking   │
         ▼           │ Return 400       │
    ┌────────────┐   │ Razorpay error   │
    │ Verify     │   └──────────────────┘
    │ Signature  │
    └──┬────┬────┘
       │    │
    Pass Fail
       │    │
       ▼    ▼
    Continue  ┌──────────────────┐
       │      │ Cancel booking   │
       ▼      │ Return 400       │
    ┌────────────────┐  │ Signature invalid│
    │ Confirm booking│  └──────────────────┘
    │ Generate       │
    │ Tickets        │
    │ Send Email     │
    │ Return 201     │
    └────────────────┘
```

---

## Component Interaction Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                   Frontend Components                         │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Event Page   │─►│ Booking Form │─►│ Payment Page │         │
│  │              │  │              │  │              │         │
│  │ - Event info │  │ - Select qty │  │ - Razorpay   │         │
│  │ - Price      │  │ - Select seat│  │ - Checkout   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                               │                 │
│                                               ▼                 │
│                                    ┌──────────────────┐         │
│                                    │ Success Page     │         │
│                                    │                  │         │
│                                    │ - Booking ID     │         │
│                                    │ - Ticket numbers │         │
│                                    │ - Download link  │         │
│                                    └──────────────────┘         │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
        ┌──────────────────┐  ┌──────────────────┐
        │ API Layer        │  │ Storage Layer    │
        │                  │  │                  │
        │ - Auth           │  │ - Session Storage│
        │ - Request Format │  │ - Cache          │
        └──────────────────┘  └──────────────────┘
                    │                   │
                    ├───────────┬───────┤
                    ▼           ▼
        ┌──────────────────────────────┐
        │   Backend Services           │
        ├──────────────────────────────┤
        │ • Booking Service            │
        │ • Payment Service            │
        │ • Email Service              │
        │ • Razorpay Integration       │
        │ • Database (MongoDB)         │
        └──────────────────────────────┘
```

---

## Performance Metrics

```
Operation                    Time      Database Calls  API Calls
─────────────────────────────────────────────────────────────────
Validate Request             ~5ms      0               0
Create Razorpay Order        ~80ms     0               1 (Razorpay)
Create Booking (Temporary)   ~30ms     1 (INSERT)      0
Lock Seats                   ~20ms     1 (UPDATE)      0
Verify Signature             ~15ms     0               0
Confirm Booking              ~20ms     1 (UPDATE)      0
Generate Tickets             ~25ms     0               0
Send Email                   ~100ms    0               1 (Email)
Prepare Response             ~5ms      0               0
─────────────────────────────────────────────────────────────────
Total                        ~300ms    3               2
Average (without email)      ~200ms    3               1
```

---

## Database Operation Sequence

```
1. INSERT booking (status: temporary)
   └─ _id: Generated
   └─ userId: From auth
   └─ eventId: From request
   └─ status: "temporary"
   └─ expiresAt: Now + 15min
   └─ paymentStatus: "pending"

2. UPDATE event (lock seats)
   └─ lockedSeats += quantity
   └─ eventId: From request
   └─ seatingId: From request

3. UPDATE booking (confirm)
   └─ status: "temporary" → "confirmed"
   └─ paymentStatus: "pending" → "verified"
   └─ ticketNumbers: [generated]
   └─ confirmedAt: Now

Result: Atomic transaction with 3 operations
Time: ~70ms total
Consistency: Guaranteed via MongoDB transactions
```

---

## Data Model Changes

```
Booking Collection Update:
─────────────────────────────

Before (create-with-payment):
{
  _id: ObjectId,
  userId: ObjectId,
  eventId: ObjectId,
  status: "temporary",        ← Waiting for verification
  paymentStatus: "pending"
  expiresAt: Date
}

After (book endpoint):
{
  _id: ObjectId,
  userId: ObjectId,
  eventId: ObjectId,
  status: "confirmed",        ← Already confirmed!
  paymentStatus: "verified"   ← Verified immediately
  ticketNumbers: [str],
  confirmedAt: Date,
  razorpayOrderId: str,
  razorpayPaymentId: str
}

Key Difference:
  OLD: Temporary → Waiting for verification
  NEW: Temporary → Confirmed in same request
```

---

## Deployment Architecture

```
┌─────────────────┐
│   Frontend      │
│   (React/Vue)   │
└────────┬────────┘
         │ HTTPS
         ▼
┌──────────────────────────┐
│  Vercel / Deployment     │
│  ┌────────────────────┐  │
│  │  Node.js Backend   │  │
│  │  ┌──────────────┐  │  │
│  │  │ /api/booking │  │  │
│  │  │ /api/payment │  │  │
│  │  └──────────────┘  │  │
│  └────────────────────┘  │
└──────────────────────────┘
         │ │ │
    ┌────┘ │ └────┐
    ▼      ▼      ▼
  ┌──────────────────────────┐
  │  External Services       │
  │  ┌────────────────────┐  │
  │  │ Razorpay API       │  │
  │  │ MongoDB Atlas      │  │
  │  │ Email Service      │  │
  │  └────────────────────┘  │
  └──────────────────────────┘
```

---

## Monitoring & Logging Points

```
Request Received
    │
    ▼ Log: Incoming request
    │ Level: DEBUG
    │ Data: {userId, eventId, quantity}
    │
Validation
    │
    ▼ Log: Request validated
    │ Level: DEBUG
    │
Create Razorpay Order
    │
    ├─ Log: Razorpay order created
    │ Level: INFO
    │ Data: {razorpayOrderId, amount}
    │
    └─ Log: Razorpay error (if fails)
      Level: ERROR
      Data: {error, message}
      
Create Booking
    │
    ├─ Log: Booking created
    │ Level: INFO
    │ Data: {bookingId, status}
    │
    └─ Log: DB error (if fails)
      Level: ERROR
      
Verify Signature
    │
    ├─ Log: Signature verified
    │ Level: INFO
    │
    └─ Log: Signature invalid
      Level: WARN
      
Confirm Booking
    │
    ▼ Log: Booking confirmed
    │ Level: INFO
    │ Data: {bookingId, ticketNumbers}
    │
Send Email
    │
    ├─ Log: Email sent
    │ Level: INFO
    │
    └─ Log: Email error (non-blocking)
      Level: WARN
      
Response
    │
    ▼ Log: Response sent
      Level: DEBUG
      Data: {status, bookingId, duration}
```

This comprehensive visual architecture provides a complete understanding of the unified booking + payment flow system.
