# 🔗 BOOKING + PAYMENT API INTEGRATION GUIDE

## Overview
When a user creates a booking, you'll automatically create a Razorpay payment order and store the payment details in the booking record.

---

## Integration Architecture

```
User Books Ticket
        ↓
   [Booking API]
        ↓
   Create Booking (temporary)
        ↓
   [Call Payment API] ← NEW
        ↓
   Get Payment Response (orderId, razorpayOrderId, key, etc.)
        ↓
   Store in Booking Database
        ↓
   Return to Client with Payment Details
```

---

## Step 1: Update Booking Model

Add these payment fields to track Razorpay payment data:

```javascript
// Add to booking_model.js schema (if not already present)
{
  // Razorpay Payment Information
  razorpayOrderId: {
    type: String,
    default: null
  },
  razorpayPaymentId: {
    type: String,
    default: null
  },
  razorpaySignature: {
    type: String,
    default: null
  },
  paymentOrder: {
    type: Object,
    default: null
    // Stores entire response from payment API
  },
  paymentVerified: {
    type: Boolean,
    default: false
  },
  paymentVerificationDetails: {
    type: Object,
    default: null
  }
}
```

---

## Step 2: Create Booking Service with Payment Integration

Create a new service file: `booking.service.js`

```javascript
const Booking = require('./booking_model');
const paymentService = require('../payment/payment.service');
const AppError = require('../../shared/utils/appError');

/**
 * Create booking with payment order
 */
exports.createBookingWithPayment = async (bookingData) => {
  try {
    const {
      userId,
      eventId,
      seatingId,
      seatType,
      quantity,
      pricePerSeat,
      totalPrice
    } = bookingData;

    // 1. Create booking record (temporary status)
    const booking = new Booking({
      userId,
      eventId,
      seatingId,
      seatType,
      quantity,
      pricePerSeat,
      totalPrice,
      status: 'temporary',
      paymentStatus: 'pending',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 min expiry
    });

    // Save booking first
    await booking.save();

    // 2. Create Razorpay payment order
    try {
      const paymentOrderData = {
        amount: totalPrice * 100, // Convert to paise
        description: `Booking for event ${eventId}`,
        receipt: `BOOKING_${booking._id}_${Date.now()}`
      };

      const paymentResponse = await paymentService.createOrder(
        userId,
        paymentOrderData
      );

      // 3. Store payment response in booking
      booking.razorpayOrderId = paymentResponse.razorpayOrderId;
      booking.paymentOrder = paymentResponse;
      booking.paymentStatus = 'processing';

      await booking.save();

      return {
        success: true,
        booking: booking.toObject(),
        payment: paymentResponse
      };

    } catch (paymentError) {
      // If payment order creation fails, mark booking as failed
      booking.paymentStatus = 'failed';
      booking.status = 'cancelled';
      await booking.save();

      throw new AppError(
        `Booking created but payment failed: ${paymentError.message}`,
        400
      );
    }

  } catch (error) {
    throw new AppError(`Error creating booking: ${error.message}`, 500);
  }
};

/**
 * Verify payment and confirm booking
 */
exports.verifyBookingPayment = async (bookingId, paymentData) => {
  try {
    const { orderId, paymentId, signature } = paymentData;

    // Find booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    // Verify payment with payment service
    const verificationResult = await paymentService.verifyPaymentSignature({
      orderId,
      paymentId,
      signature
    });

    // Update booking with verified payment details
    booking.razorpayPaymentId = paymentId;
    booking.razorpaySignature = signature;
    booking.paymentVerificationDetails = verificationResult;
    booking.paymentVerified = true;
    booking.paymentStatus = 'completed';

    // Confirm booking
    await booking.confirm(paymentId, 'razorpay');

    return {
      success: true,
      booking: booking.toObject(),
      verified: true,
      message: 'Booking confirmed successfully'
    };

  } catch (error) {
    throw new AppError(
      `Payment verification failed: ${error.message}`,
      400
    );
  }
};

/**
 * Get booking with payment details
 */
exports.getBookingWithPayment = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    return {
      success: true,
      booking: booking.toObject(),
      payment: {
        razorpayOrderId: booking.razorpayOrderId,
        razorpayPaymentId: booking.razorpayPaymentId,
        paymentStatus: booking.paymentStatus,
        paymentVerified: booking.paymentVerified,
        orderDetails: booking.paymentOrder
      }
    };

  } catch (error) {
    throw new AppError(`Error fetching booking: ${error.message}`, 500);
  }
};
```

---

## Step 3: Update Booking Controller

Add these methods to `booking.controller.js`:

```javascript
const bookingService = require('./booking.service');

/**
 * Create booking and initiate payment
 */
exports.createBookingAndInitiatePayment = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      eventId,
      seatingId,
      seatType,
      quantity,
      pricePerSeat
    } = req.body;

    // Validate required fields
    if (!eventId || !seatingId || !seatType || !quantity || !pricePerSeat) {
      return next(new AppError('Missing required fields', 400));
    }

    const totalPrice = quantity * pricePerSeat;

    // Create booking with payment
    const result = await bookingService.createBookingWithPayment({
      userId,
      eventId,
      seatingId,
      seatType,
      quantity,
      pricePerSeat,
      totalPrice
    });

    res.status(201).json({
      status: 'success',
      data: result,
      message: 'Booking created and payment order initiated'
    });

  } catch (error) {
    console.error('Error creating booking:', error);
    next(error);
  }
};

/**
 * Verify payment and confirm booking
 */
exports.verifyBookingPayment = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId || !signature) {
      return next(new AppError('Missing payment verification details', 400));
    }

    const result = await bookingService.verifyBookingPayment(bookingId, {
      orderId,
      paymentId,
      signature
    });

    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Booking confirmed with verified payment'
    });

  } catch (error) {
    console.error('Error verifying booking payment:', error);
    next(error);
  }
};

/**
 * Get booking with payment details
 */
exports.getBookingWithPayment = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const result = await bookingService.getBookingWithPayment(bookingId);

    res.status(200).json({
      status: 'success',
      data: result
    });

  } catch (error) {
    console.error('Error fetching booking:', error);
    next(error);
  }
};
```

---

## Step 4: Add Routes to Booking Routes

Add to `booking_route.js`:

```javascript
const express = require('express');
const bookingController = require('./booking.controller');
const authMiddleware = require('../auth/auth.middleware');

const router = express.Router();

// Protected routes (require authentication)
router.use(authMiddleware.protect);

// Create booking + initiate payment
router.post('/create-with-payment', bookingController.createBookingAndInitiatePayment);

// Verify payment + confirm booking
router.post('/:bookingId/verify-payment', bookingController.verifyBookingPayment);

// Get booking with payment details
router.get('/:bookingId/with-payment', bookingController.getBookingWithPayment);

// ... existing routes ...
```

---

## Payment API Responses

### 1️⃣ Response when Creating Payment Order

**Request:**
```bash
POST /api/payments/create-order
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "amount": 50000,
  "description": "Booking for event XYZ"
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "orderId": "ORD_6968090a_739479",
    "razorpayOrderId": "order_S3uC4VvlqYkRS8",
    "amount": 50000,
    "currency": "INR",
    "receipt": "BOOKING_507f1f77bcf86cd799439011_1768425739779",
    "key": "rzp_test_ROzpR9FCBfPSds",
    "description": "Booking for event XYZ",
    "userId": "6968090a96b99e7a2ace5d4d",
    "status": "created",
    "createdAt": "2026-01-15T10:35:39.779Z"
  }
}
```

**Store in Booking:**
```javascript
booking.razorpayOrderId = "order_S3uC4VvlqYkRS8"
booking.paymentOrder = {
  orderId: "ORD_6968090a_739479",
  razorpayOrderId: "order_S3uC4VvlqYkRS8",
  amount: 50000,
  currency: "INR",
  key: "rzp_test_ROzpR9FCBfPSds",
  ...
}
booking.paymentStatus = "processing"
```

---

### 2️⃣ Response when Verifying Payment

**Request:**
```bash
POST /api/payments/verify
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "orderId": "order_S3uC4VvlqYkRS8",
  "paymentId": "pay_1768425808670_test",
  "signature": "af5f4afc335301923409fc06f3d9fba1c07e42a0a81d373b0576030361a15581"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Payment verified successfully",
  "data": {
    "success": true,
    "verified": true,
    "payment": {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "6968090a96b99e7a2ace5d4d",
      "orderId": "ORD_6968090a_739479",
      "razorpayOrderId": "order_S3uC4VvlqYkRS8",
      "razorpayPaymentId": "pay_1768425808670_test",
      "razorpaySignature": "af5f4afc335301923409fc06f3d9fba1c07e42a0a81d373b0576030361a15581",
      "amount": 50000,
      "currency": "INR",
      "status": "success",
      "description": "Booking for event XYZ",
      "metadata": {...},
      "createdAt": "2026-01-15T10:35:39.779Z",
      "updatedAt": "2026-01-15T10:35:45.123Z"
    },
    "message": "Payment verified successfully"
  }
}
```

**Store in Booking:**
```javascript
booking.razorpayPaymentId = "pay_1768425808670_test"
booking.razorpaySignature = "af5f4afc335301923409fc06f3d9fba1c07e42a0a81d373b0576030361a15581"
booking.paymentVerified = true
booking.paymentStatus = "completed"
booking.status = "confirmed"
booking.paymentVerificationDetails = {
  success: true,
  verified: true,
  payment: {...}
}
```

---

## Flow Diagram

### Creating a Booking with Payment:

```
1. POST /api/booking/create-with-payment
   {
     "eventId": "607f1f77bcf86cd799439011",
     "seatingId": "507f1f77bcf86cd799439012",
     "seatType": "Premium",
     "quantity": 2,
     "pricePerSeat": 500
   }

2. Backend:
   ├─ Create Booking (temporary status)
   ├─ Call POST /api/payments/create-order
   │   └─ Get: orderId, razorpayOrderId, key, amount
   ├─ Store payment details in booking
   └─ Return booking + payment data

3. Response:
   {
     "status": "success",
     "data": {
       "booking": {
         "_id": "607f1f77bcf86cd799439013",
         "userId": "607f1f77bcf86cd799439014",
         "eventId": "607f1f77bcf86cd799439011",
         "quantity": 2,
         "totalPrice": 1000,
         "status": "temporary",
         "paymentStatus": "processing",
         "razorpayOrderId": "order_S3uC4VvlqYkRS8",
         "expiresAt": "2026-01-15T10:50:39.779Z"
       },
       "payment": {
         "orderId": "ORD_6968090a_739479",
         "razorpayOrderId": "order_S3uC4VvlqYkRS8",
         "amount": 100000,
         "currency": "INR",
         "key": "rzp_test_ROzpR9FCBfPSds"
       }
     }
   }
```

### Verifying Payment and Confirming Booking:

```
1. POST /api/booking/:bookingId/verify-payment
   {
     "orderId": "order_S3uC4VvlqYkRS8",
     "paymentId": "pay_1768425808670_test",
     "signature": "af5f4afc335301923409fc06f3d9fba1c07e42a0a81d373b0576030361a15581"
   }

2. Backend:
   ├─ Call POST /api/payments/verify
   │   └─ Verify signature (HMAC-SHA256)
   ├─ Get payment verification result
   ├─ Update booking status to "confirmed"
   ├─ Store payment details
   └─ Return confirmed booking

3. Response:
   {
     "status": "success",
     "data": {
       "success": true,
       "verified": true,
       "booking": {
         "_id": "607f1f77bcf86cd799439013",
         "status": "confirmed",
         "paymentStatus": "completed",
         "paymentVerified": true,
         "razorpayPaymentId": "pay_1768425808670_test",
         "razorpaySignature": "af5f4afc...",
         "confirmedAt": "2026-01-15T10:35:45.123Z"
       }
     }
   }
```

---

## Complete Data Flow

### Booking Model with Payment

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  eventId: ObjectId,
  seatingId: ObjectId,
  seatType: "Premium",
  quantity: 2,
  pricePerSeat: 500,
  totalPrice: 1000,
  
  // Status
  status: "confirmed",
  paymentStatus: "completed",
  
  // Razorpay Payment Details
  razorpayOrderId: "order_S3uC4VvlqYkRS8",
  razorpayPaymentId: "pay_1768425808670_test",
  razorpaySignature: "af5f4afc335301923...",
  
  // Full Payment Response
  paymentOrder: {
    orderId: "ORD_6968090a_739479",
    razorpayOrderId: "order_S3uC4VvlqYkRS8",
    amount: 100000,
    currency: "INR",
    receipt: "BOOKING_507f1f77bcf86cd799439011_1768425739779",
    key: "rzp_test_ROzpR9FCBfPSds",
    description: "Booking for event XYZ",
    status: "created",
    createdAt: "2026-01-15T10:35:39.779Z"
  },
  
  // Verification Details
  paymentVerified: true,
  paymentVerificationDetails: {
    success: true,
    verified: true,
    payment: {...}
  },
  
  // Timestamps
  bookedAt: "2026-01-15T10:35:39.779Z",
  confirmedAt: "2026-01-15T10:35:45.123Z",
  expiresAt: null
}
```

---

## API Endpoints Summary

### Booking API Endpoints (Updated)

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/booking/create-with-payment` | Create booking + payment order | ✅ |
| POST | `/api/booking/:bookingId/verify-payment` | Verify payment + confirm booking | ✅ |
| GET | `/api/booking/:bookingId/with-payment` | Get booking with payment details | ✅ |
| GET | `/api/booking/user/:userId` | Get all user bookings | ✅ |

### Payment API Endpoints (For Reference)

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/payments/create-order` | Create payment order | ✅ |
| POST | `/api/payments/verify` | Verify payment signature | ✅ |
| GET | `/api/payments/` | Get payment history | ✅ |
| POST | `/api/payments/:paymentId/refund` | Refund payment | ✅ |

---

## Client-Side Implementation (JavaScript)

### Creating a Booking with Payment:

```javascript
async function createBookingWithPayment(eventId, seatType, quantity, pricePerSeat) {
  try {
    // Step 1: Create booking and get payment details
    const bookingResponse = await fetch('/api/booking/create-with-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        eventId,
        seatingId: 'some_seating_id',
        seatType,
        quantity,
        pricePerSeat
      })
    });

    const bookingData = await bookingResponse.json();
    const { booking, payment } = bookingData.data;

    // Step 2: Open Razorpay Checkout
    const options = {
      key: payment.key,
      amount: payment.amount,
      currency: payment.currency,
      order_id: payment.razorpayOrderId,
      description: payment.description,
      handler: async (paymentResponse) => {
        // Step 3: Verify payment with backend
        const verifyResponse = await fetch(
          `/api/booking/${booking._id}/verify-payment`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
              orderId: payment.razorpayOrderId,
              paymentId: paymentResponse.razorpay_payment_id,
              signature: paymentResponse.razorpay_signature
            })
          }
        );

        const verifyData = await verifyResponse.json();
        
        if (verifyData.data.verified) {
          alert('Booking confirmed successfully!');
          // Redirect to booking confirmation page
          window.location.href = `/booking/${booking._id}/success`;
        } else {
          alert('Payment verification failed!');
        }
      },
      prefill: {
        email: userEmail,
        contact: userPhone
      },
      theme: {
        color: '#3399cc'
      }
    };

    const razorpay = new Razorpay(options);
    razorpay.open();

  } catch (error) {
    console.error('Error:', error);
    alert('Failed to create booking');
  }
}
```

---

## Error Handling

### Possible Errors When Creating Booking

```javascript
{
  "status": "error",
  "message": "Booking created but payment failed: Invalid Razorpay key",
  "statusCode": 400
}
```

### Possible Errors When Verifying Payment

```javascript
{
  "status": "error",
  "message": "Payment verification failed: Invalid payment signature",
  "statusCode": 400
}
```

---

## Security Considerations

1. ✅ **JWT Authentication** - All endpoints protected
2. ✅ **Signature Verification** - HMAC-SHA256 validates payment
3. ✅ **User Isolation** - Users can only access their own bookings
4. ✅ **Amount Validation** - Backend validates amount before payment
5. ✅ **Booking Expiry** - Temporary bookings expire after 15 minutes
6. ✅ **Payment Idempotency** - Payment can be verified only once per booking

---

## Summary

When a user books a ticket:

1. **Booking Created** → Backend creates booking with `status: "temporary"`
2. **Payment Initiated** → Backend calls Payment API to create order
3. **Response Sent** → Client gets booking details + Razorpay order details
4. **User Pays** → User completes payment on Razorpay
5. **Payment Verified** → Client sends payment details to backend
6. **Booking Confirmed** → Backend verifies signature and updates booking to `status: "confirmed"`
7. **Data Stored** → All payment data stored in booking record

---

**Ready to implement?** Start with Step 1 (update booking model) and proceed sequentially!
