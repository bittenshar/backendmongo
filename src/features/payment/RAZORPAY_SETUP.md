# Razorpay Payment Integration

Complete Razorpay payment gateway integration for your Node.js backend.

## Features

✅ Create payment orders  
✅ Verify payment signatures  
✅ Capture payments  
✅ Refund payments  
✅ Webhook handling  
✅ Payment history tracking  
✅ MongoDB persistence  

---

## Setup

### 1. Install Razorpay Package

```bash
npm install razorpay
```

### 2. Add Environment Variables

Add to `.env`:

```dotenv
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

**How to get credentials:**
1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Navigate to Settings → API Keys
3. Copy your Key ID and Key Secret
4. For webhook secret, go to Settings → Webhooks

### 3. Register Routes in Server

Add to `src/server.js`:

```javascript
const paymentRoutes = require('./features/payment/payment.routes');

// Add this in the app.use() section
app.use('/api/payments', paymentRoutes);
```

### 4. Restart Server

```bash
npm start
```

---

## API Endpoints

### 1. Create Payment Order

**POST** `/api/payments/create-order`

Create a new payment order in Razorpay.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 500,
  "description": "Product/Service description",
  "receipt": "receipt_12345",
  "notes": {
    "productId": "prod_123",
    "orderId": "order_456"
  },
  "customer": {
    "email": "customer@example.com",
    "phone": "9876543210",
    "name": "John Doe"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Order created successfully",
  "data": {
    "orderId": "ORDER_userId_timestamp",
    "razorpayOrderId": "order_1234567890",
    "amount": 500,
    "currency": "INR",
    "key": "razorpay_key_id",
    "payment": {
      "_id": "...",
      "userId": "...",
      "status": "pending",
      "createdAt": "..."
    }
  }
}
```

---

### 2. Verify Payment

**POST** `/api/payments/verify`

Verify payment signature after successful payment.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "orderId": "order_1234567890",
  "paymentId": "pay_1234567890",
  "signature": "razorpay_signature_hash"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Payment verified successfully",
  "data": {
    "success": true,
    "payment": {
      "_id": "...",
      "status": "success",
      "razorpayPaymentId": "pay_1234567890",
      "amount": 500
    }
  }
}
```

---

### 3. Get Payment Details

**GET** `/api/payments/:paymentId`

Get details of a specific payment from Razorpay.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "data": {
      "id": "pay_1234567890",
      "entity": "payment",
      "amount": 50000,
      "currency": "INR",
      "status": "captured",
      "method": "card",
      "description": "...",
      "notes": {...}
    }
  }
}
```

---

### 4. Get Order Details

**GET** `/api/payments/order/:orderId`

Get Razorpay order details.

**Headers:**
```
Authorization: Bearer <token>
```

---

### 5. Refund Payment

**POST** `/api/payments/:paymentId/refund`

Refund a captured payment.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 500,
  "notes": {
    "reason": "Customer requested refund"
  }
}
```

**Note:** If `amount` is omitted, full refund is processed.

**Response:**
```json
{
  "status": "success",
  "message": "Payment refunded successfully",
  "data": {
    "success": true,
    "data": {
      "id": "rfnd_1234567890",
      "entity": "refund",
      "payment_id": "pay_1234567890",
      "amount": 50000,
      "status": "processed"
    }
  }
}
```

---

### 6. Get Payment History

**GET** `/api/payments`

Get user's payment history with pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional): Results per page (default: 10)
- `skip` (optional): Results to skip (default: 0)

**Response:**
```json
{
  "status": "success",
  "data": {
    "payments": [
      {
        "_id": "...",
        "userId": "...",
        "orderId": "ORDER_...",
        "amount": 500,
        "status": "success",
        "createdAt": "..."
      }
    ],
    "total": 25,
    "limit": 10,
    "skip": 0
  }
}
```

---

### 7. Get Payment by Order ID

**GET** `/api/payments/lookup/:orderId`

Get payment from database by local order ID.

**Headers:**
```
Authorization: Bearer <token>
```

---

### 8. Webhook Handler

**POST** `/api/payments/webhook`

Handle Razorpay webhook events (no authentication required).

**Events Handled:**
- `payment.authorized` - Payment authorized
- `payment.failed` - Payment failed
- `payment.captured` - Payment captured
- `order.paid` - Order marked as paid
- `refund.created` - Refund initiated

**Webhook Setup:**
1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/payments/webhook`
3. Select events to subscribe
4. Copy webhook secret to `.env` as `RAZORPAY_WEBHOOK_SECRET`

---

## Frontend Integration

### Step 1: Load Razorpay Script

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### Step 2: Create Order

```javascript
const response = await fetch('/api/payments/create-order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    amount: 500,
    description: 'Product purchase',
    customer: {
      email: 'user@example.com',
      phone: '9876543210',
      name: 'John Doe'
    }
  })
});

const { data } = await response.json();
```

### Step 3: Open Checkout

```javascript
const options = {
  key: data.key,
  amount: data.amount * 100, // Razorpay expects amount in paise
  currency: 'INR',
  order_id: data.razorpayOrderId,
  handler: async (response) => {
    // Verify payment on backend
    const verifyResponse = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        orderId: data.razorpayOrderId,
        paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature
      })
    });

    const result = await verifyResponse.json();
    if (result.data.success) {
      alert('Payment successful!');
      // Handle success
    }
  },
  theme: {
    color: '#3399cc'
  }
};

const rzp = new Razorpay(options);
rzp.open();
```

---

## Database Schema

### Payment Document

```javascript
{
  userId: ObjectId,           // User who made payment
  orderId: String,            // Unique local order ID
  razorpayOrderId: String,    // Razorpay order ID
  razorpayPaymentId: String,  // Razorpay payment ID
  razorpaySignature: String,  // Payment signature
  amount: Number,             // Amount in rupees
  currency: String,           // Currency (default: INR)
  status: String,             // pending | success | failed | cancelled
  description: String,        // Payment description
  receipt: String,            // Receipt number
  notes: Object,              // Additional notes
  customer: Object,           // Customer details
  failureReason: String,      // Reason for failure
  metadata: Object,           // Razorpay response data
  createdAt: Date,
  updatedAt: Date
}
```

---

## Error Handling

Common errors and solutions:

### Invalid amount
```json
{
  "success": false,
  "message": "Invalid amount"
}
```
Ensure amount is a positive number.

### Invalid signature
```json
{
  "success": false,
  "message": "Invalid payment signature"
}
```
Verify that orderId, paymentId, and signature are correct.

### Credentials not configured
```json
{
  "success": false,
  "message": "Razorpay credentials not configured"
}
```
Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `.env`.

---

## Testing

### Using Razorpay Test Cards

**Success:**
- Card: 4111 1111 1111 1111
- CVV: Any 3 digits
- Expiry: Any future date

**Declined:**
- Card: 4111 1111 1111 1110
- CVV: Any 3 digits
- Expiry: Any future date

### Using Postman

Import the provided Postman collection for ready-to-use endpoints.

---

## Security Considerations

1. **Never expose secrets** in client-side code
2. **Always verify webhooks** using the webhook secret
3. **Validate amounts** before creating orders
4. **Use HTTPS** for all payment endpoints
5. **Store sensitive data** securely in database
6. **Implement rate limiting** on payment endpoints

---

## Support

For issues or questions:
- [Razorpay Documentation](https://razorpay.com/docs/)
- [Razorpay API Reference](https://razorpay.com/docs/api/)
- [Razorpay Support](https://razorpay.com/support/)
