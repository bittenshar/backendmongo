# Direct Login Guide - Phone: 8824223395

## Quick Start

Since Twilio OTP is removed, use direct email/password login:

### Credentials
```
Email: test8824223395@example.com
Password: TestPass123!
Phone: 8824223395
Name: Test User
```

## Step 1: Create Account (First Time)

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test8824223395@example.com",
    "password": "TestPass123!",
    "name": "Test User",
    "phone": "8824223395"
  }'
```

**Response:**
```json
{
  "status": "success",
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "_id": "...",
    "email": "test8824223395@example.com",
    "phone": "8824223395",
    "name": "Test User",
    "role": "user"
  }
}
```

## Step 2: Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test8824223395@example.com",
    "password": "TestPass123!"
  }'
```

**Response:**
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "_id": "...",
    "email": "test8824223395@example.com",
    "phone": "8824223395"
  }
}
```

## Step 3: Copy JWT Token

Save the `token` value from the response. This is your JWT token for authenticated requests.

## Step 4: Test Razorpay Payment API

**Create Payment Order:**
```bash
curl -X POST http://localhost:3000/api/payments/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 500,
    "description": "Test Payment",
    "customer": {
      "email": "test8824223395@example.com",
      "phone": "8824223395",
      "name": "Test User"
    }
  }'
```

**Get Payment History:**
```bash
curl -X GET http://localhost:3000/api/payments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Using Postman

1. Import: `Razorpay_Payment_API.postman_collection.json`
2. Create environment variable:
   - `base_url` = `http://localhost:3000`
   - `token` = Your JWT token from login

3. All endpoints now work with authentication!

## All API Endpoints

| Method | Endpoint | Requires Auth | Purpose |
|--------|----------|---------------|---------|
| POST | `/api/auth/signup` | No | Create account |
| POST | `/api/auth/login` | No | Login |
| POST | `/api/payments/create-order` | Yes | Create payment |
| POST | `/api/payments/verify` | Yes | Verify payment |
| GET | `/api/payments` | Yes | Get payment history |
| GET | `/api/payments/:paymentId` | Yes | Get payment details |
| POST | `/api/payments/:paymentId/refund` | Yes | Refund payment |
| POST | `/api/payments/webhook` | No | Razorpay webhooks |

## Test with Your Phone Number

Everything is configured with:
- **Phone**: 8824223395
- **Email**: test8824223395@example.com

Just create an account and start testing payments!

## Razorpay Test Card

For testing payments:
- **Card**: 4111 1111 1111 1111
- **CVV**: Any 3 digits
- **Expiry**: Any future date

## Need Help?

- See: `RAZORPAY_QUICK_START.md`
- See: `src/features/payment/RAZORPAY_SETUP.md`
- Run: `node test-razorpay-endpoints.js`
