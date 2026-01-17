# 🧪 PAYMENT VERIFICATION TEST - MANUAL GUIDE

## Endpoint: `POST /api/payments/verify`

### Quick Test

#### Step 1: Create User & Get Token
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email":"verify@test.com",
    "password":"TestPass123!",
    "name":"Verify Test",
    "phone":"9999999999"
  }' | jq '.token'

# Save token as: export TOKEN="eyJ..."
```

#### Step 2: Create Payment Order
```bash
curl -X POST http://localhost:3000/api/payments/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"amount":500}' | jq '.'

# Save response: orderId, razorpayOrderId
export ORDER_ID="ORD_..."
```

#### Step 3: Generate Valid Signature
```bash
# Signature = HMAC-SHA256(orderId|paymentId, secret)
# orderId: ORD_...
# paymentId: pay_... (from Razorpay)
# secret: degfS9w5klNpAJg2SBEFXR8y

# Use Node.js to generate:
node -e "
const crypto = require('crypto');
const orderId = 'ORD_696805cd_009365';
const paymentId = 'pay_12345678901234';
const secret = 'degfS9w5klNpAJg2SBEFXR8y';
const sig = crypto.createHmac('sha256', secret).update(orderId + '|' + paymentId).digest('hex');
console.log('Signature:', sig);
"
```

#### Step 4: Verify Payment
```bash
curl -X POST http://localhost:3000/api/payments/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "orderId":"ORD_696805cd_009365",
    "paymentId":"pay_12345678901234",
    "signature":"<generated_signature>"
  }' | jq '.'
```

---

## Test Cases

### ✅ Test 1: Valid Signature
```bash
curl -X POST http://localhost:3000/api/payments/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "orderId":"ORD_696805cd_009365",
    "paymentId":"pay_12345678901234",
    "signature":"<correct_signature>"
  }'

# Expected: 200 OK, verified: true
```

### ❌ Test 2: Invalid Signature (Tampered)
```bash
curl -X POST http://localhost:3000/api/payments/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "orderId":"ORD_696805cd_009365",
    "paymentId":"pay_12345678901234",
    "signature":"wrong_signature_123"
  }'

# Expected: 400 Bad Request or 403 Forbidden
```

### ❌ Test 3: Missing Fields
```bash
curl -X POST http://localhost:3000/api/payments/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "orderId":"ORD_696805cd_009365"
    # Missing paymentId and signature
  }'

# Expected: 400 Bad Request, "Missing required fields"
```

### ❌ Test 4: No Authentication
```bash
curl -X POST http://localhost:3000/api/payments/verify \
  -H "Content-Type: application/json" \
  -d '{
    "orderId":"ORD_696805cd_009365",
    "paymentId":"pay_12345678901234",
    "signature":"<signature>"
  }'
  # No Authorization header

# Expected: 401 Unauthorized
```

### ❌ Test 5: Wrong Order ID
```bash
curl -X POST http://localhost:3000/api/payments/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "orderId":"ORD_WRONG_123456",
    "paymentId":"pay_12345678901234",
    "signature":"<signature>"
  }'

# Expected: 404 Not Found or error
```

---

## Request Format

```json
POST /api/payments/verify
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "orderId": "ORD_696805cd_009365",
  "paymentId": "pay_12345678901234",
  "signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
}
```

---

## Response Formats

### Success (200)
```json
{
  "status": "success",
  "message": "Payment verified successfully",
  "data": {
    "verified": true,
    "payment": {
      "_id": "...",
      "status": "success",
      "razorpayPaymentId": "pay_12345678901234"
    }
  }
}
```

### Error - Missing Fields (400)
```json
{
  "status": "error",
  "message": "Missing required fields: orderId, paymentId, signature"
}
```

### Error - Invalid Signature (400)
```json
{
  "status": "error",
  "message": "Payment verification failed - Invalid signature"
}
```

### Error - Unauthorized (401)
```json
{
  "status": "error",
  "message": "Invalid or missing authorization token"
}
```

---

## Signature Generation Algorithm

### Formula
```
HMAC-SHA256(orderId|paymentId, razorpayKeySecret)
```

### JavaScript Example
```javascript
const crypto = require('crypto');

function generateSignature(orderId, paymentId, secret) {
  const message = `${orderId}|${paymentId}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
  return signature;
}

// Usage
const sig = generateSignature(
  'ORD_696805cd_009365',
  'pay_12345678901234',
  'degfS9w5klNpAJg2SBEFXR8y'
);
console.log(sig); // Outputs signature hex
```

### Python Example
```python
import hmac
import hashlib

def generate_signature(order_id, payment_id, secret):
    message = f"{order_id}|{payment_id}"
    signature = hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    return signature

# Usage
sig = generate_signature(
    'ORD_696805cd_009365',
    'pay_12345678901234',
    'degfS9w5klNpAJg2SBEFXR8y'
)
print(sig)
```

---

## Complete Flow Test Script (Bash)

```bash
#!/bin/bash

echo "1️⃣ Creating user..."
USER=$(curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email":"flow@test.com",
    "password":"Test@123",
    "name":"Flow Test",
    "phone":"1111111111"
  }')

TOKEN=$(echo $USER | jq -r '.token')
echo "✅ Token: ${TOKEN:0:30}..."

echo ""
echo "2️⃣ Creating payment order..."
ORDER=$(curl -s -X POST http://localhost:3000/api/payments/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"amount":500}')

ORDER_ID=$(echo $ORDER | jq -r '.data.orderId')
echo "✅ Order ID: $ORDER_ID"

echo ""
echo "3️⃣ Generating signature..."
PAYMENT_ID="pay_test_$(date +%s)"
SIGNATURE=$(node -e "
const crypto = require('crypto');
const sig = crypto.createHmac('sha256', 'degfS9w5klNpAJg2SBEFXR8y')
  .update('$ORDER_ID|$PAYMENT_ID')
  .digest('hex');
console.log(sig);
")
echo "✅ Signature: ${SIGNATURE:0:30}..."

echo ""
echo "4️⃣ Verifying payment..."
VERIFY=$(curl -s -X POST http://localhost:3000/api/payments/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "orderId":"'$ORDER_ID'",
    "paymentId":"'$PAYMENT_ID'",
    "signature":"'$SIGNATURE'"
  }')

STATUS=$(echo $VERIFY | jq -r '.status')
VERIFIED=$(echo $VERIFY | jq -r '.data.verified')

echo "✅ Status: $STATUS"
echo "✅ Verified: $VERIFIED"

if [ "$STATUS" = "success" ] && [ "$VERIFIED" = "true" ]; then
  echo ""
  echo "🎉 Payment verification successful!"
else
  echo ""
  echo "❌ Payment verification failed"
  echo $VERIFY | jq '.'
fi
```

---

## Key Points

### ✅ Important
- **Signature must match:** `HMAC-SHA256(orderId|paymentId, secret)`
- **Order must exist:** The orderId must be in database
- **Must be authenticated:** Always include JWT token
- **Format exact:** orderId|paymentId with exact separator

### ⚠️ Common Issues
- **Wrong signature:** Most common - use exact formula
- **No token:** Will get 401 Unauthorized
- **Missing fields:** Must have all three (orderId, paymentId, signature)
- **Case sensitive:** Signature is hex lowercase

### 🔐 Security
- Signature prevents tampered payments
- Only valid signatures are accepted
- Database checks order exists
- User can only verify their own orders

---

## Expected Results

```
Test 1 (Valid Sig):     ✅ 200 OK - verified: true
Test 2 (Invalid Sig):   ✅ 400/403 - rejected
Test 3 (Missing):       ✅ 400 - missing fields error
Test 4 (No Auth):       ✅ 401 - unauthorized
Test 5 (Wrong Order):   ✅ Error - order not found
```

---

**Status:** Ready to test  
**Endpoint:** POST /api/payments/verify  
**Authentication:** Required (JWT Bearer)  
**Response:** JSON
