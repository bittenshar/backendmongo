# Razorpay Integration - Quick Start

## ✅ What's Been Created

Complete Razorpay payment integration with:

- **payment.model.js** - MongoDB schema for payments
- **payment.service.js** - Business logic for Razorpay operations
- **payment.controller.js** - API route handlers
- **payment.routes.js** - Express routes
- **RAZORPAY_SETUP.md** - Detailed documentation
- **Razorpay_Payment_API.postman_collection.json** - API tests

---

## 🚀 Installation & Setup

### Step 1: Already Done ✓
- Razorpay package installed (`npm install razorpay`)
- Environment variables added to `.env`

### Step 2: Add Routes to Server

Open `src/server.js` and add:

```javascript
// Add after other route imports
const paymentRoutes = require('./features/payment/payment.routes');

// Add in app.use() section (before error middleware)
app.use('/api/payments', paymentRoutes);
```

**Example location in src/server.js:**
```javascript
// Around line 100-150
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);  // ← ADD THIS LINE
```

### Step 3: Configure Razorpay Credentials

Update `.env` with your Razorpay credentials:

```dotenv
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=webhook_secret_from_dashboard
```

Get these from: https://dashboard.razorpay.com/ → Settings → API Keys

### Step 4: Restart Server

```bash
npm start
```

---

## 🧪 Testing Endpoints

### Option 1: Use Postman Collection

1. Open Postman
2. Import `Razorpay_Payment_API.postman_collection.json`
3. Set `base_url` variable to `http://localhost:3000`
4. Set `token` variable to your JWT token
5. Test endpoints

### Option 2: Manual Testing with cURL

**Create Payment Order:**
```bash
curl -X POST http://localhost:3000/api/payments/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 500,
    "description": "Test payment",
    "customer": {
      "email": "test@example.com",
      "phone": "9876543210",
      "name": "Test User"
    }
  }'
```

**Get Payment History:**
```bash
curl -X GET http://localhost:3000/api/payments \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📋 API Quick Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/payments/create-order` | Create payment order |
| POST | `/api/payments/verify` | Verify payment signature |
| GET | `/api/payments` | Get payment history |
| GET | `/api/payments/:paymentId` | Get payment details |
| POST | `/api/payments/:paymentId/refund` | Refund payment |
| POST | `/api/payments/webhook` | Webhook handler |

---

## 🎯 Frontend Integration Example

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>

<button id="pay-btn">Pay Now</button>

<script>
const payBtn = document.getElementById('pay-btn');

payBtn.addEventListener('click', async () => {
  // Step 1: Create order on backend
  const response = await fetch('/api/payments/create-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({
      amount: 500,
      description: 'Test Payment',
      customer: {
        email: 'user@example.com',
        phone: '9876543210',
        name: 'John Doe'
      }
    })
  });

  const { data } = await response.json();

  // Step 2: Open Razorpay checkout
  const options = {
    key: data.key,
    amount: data.amount * 100, // Convert to paise
    currency: 'INR',
    order_id: data.razorpayOrderId,
    handler: async (response) => {
      // Step 3: Verify payment on backend
      const verifyResponse = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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
      } else {
        alert('Payment failed!');
      }
    },
    theme: {
      color: '#3399cc'
    }
  };

  const rzp = new Razorpay(options);
  rzp.open();
});
</script>
```

---

## 🧪 Test Credentials (Razorpay Sandbox)

**Test Card (Success):**
- Card: 4111 1111 1111 1111
- CVV: Any 3 digits
- Expiry: Any future date

**Test Card (Declined):**
- Card: 4111 1111 1111 1110
- CVV: Any 3 digits
- Expiry: Any future date

---

## 📊 Database Schema

```javascript
Payment {
  userId: ObjectId,           // User who made payment
  orderId: String,            // Unique local order ID
  razorpayOrderId: String,    // Razorpay order ID
  razorpayPaymentId: String,  // Razorpay payment ID
  amount: Number,             // Amount in INR
  status: String,             // pending|success|failed|cancelled
  description: String,        // Payment description
  customer: Object,           // Customer info
  notes: Object,              // Additional notes
  metadata: Object,           // Razorpay response
  createdAt: Date,
  updatedAt: Date
}
```

---

## ✅ Verification Checklist

- [ ] Razorpay package installed
- [ ] `.env` updated with credentials
- [ ] Routes added to `server.js`
- [ ] Server restarted
- [ ] Can create payment orders
- [ ] Can verify payments
- [ ] Can get payment history
- [ ] Webhook configured (for production)

---

## 🔗 Useful Links

- [Razorpay Dashboard](https://dashboard.razorpay.com/)
- [Razorpay API Docs](https://razorpay.com/docs/api/)
- [Razorpay Test Cards](https://razorpay.com/docs/payment-gateway/test-cards/)
- [Razorpay Webhooks](https://razorpay.com/docs/webhooks/)

---

## ⚠️ Important Notes

1. **Never commit credentials** - Use `.env` file (already in `.gitignore`)
2. **Webhook secret** - Get from Razorpay dashboard Settings → Webhooks
3. **HTTPS required** - For production, use HTTPS for all endpoints
4. **Test mode first** - Use test keys before going live
5. **Verify signatures** - Always verify payment signatures on backend

---

## 🆘 Troubleshooting

**Error: "Razorpay credentials not configured"**
- Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `.env`

**Error: "Invalid payment signature"**
- Ensure `orderId`, `paymentId`, and `signature` match exactly
- Check webhook secret is correct

**Webhook not working**
- Ensure `RAZORPAY_WEBHOOK_SECRET` is set correctly
- Verify webhook URL is publicly accessible
- Check `x-razorpay-signature` header is being sent

---

## Next Steps

1. Add payment status updates to user model
2. Implement order tracking
3. Add email notifications for payments
4. Set up subscription management
5. Add refund request workflow

For detailed documentation, see: `RAZORPAY_SETUP.md`
