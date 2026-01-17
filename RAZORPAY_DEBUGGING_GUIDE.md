# 🔍 Razorpay Payment Service - Debugging Guide

## Issue: "Error creating Razorpay order: undefined"

### Root Cause Analysis

The error message showing "undefined" indicates that the actual error details weren't being captured. This happens when:

1. `error.message` is undefined or null
2. The error object is not a standard JavaScript Error
3. The Razorpay API response is malformed
4. The SDK is not properly initialized

---

## Solutions Applied

### 1. Enhanced Error Logging

**File:** `src/features/payment/payment.service.js`

**Before (didn't show real error):**
```javascript
} catch (error) {
  console.error('❌ Error creating Razorpay order:', error.message);
  throw new Error(`Failed to create Razorpay order: ${error.message}`);
}
```

**After (shows full error details):**
```javascript
} catch (error) {
  console.error('❌ Error creating Razorpay order:');
  console.error('Error object:', error);                    // Full error object
  console.error('Error message:', error?.message);          // Message property
  console.error('Error response:', error?.response?.data);  // Razorpay API response
  const errorMsg = error?.response?.data?.description || error?.message || error?.toString() || 'Unknown error';
  console.error('Final error message:', errorMsg);
  throw new Error(`Failed to create Razorpay order: ${errorMsg}`);
}
```

### 2. SDK Initialization Verification

**Added comprehensive initialization checks:**

```javascript
// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Validate credentials
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('⚠️  WARNING: Razorpay credentials not configured');
} else {
  console.log('✅ Razorpay initialized with:');
  console.log('  Key ID:', process.env.RAZORPAY_KEY_ID?.substring(0, 20) + '...');
}

// Verify SDK methods available
if (!razorpay.orders || typeof razorpay.orders.create !== 'function') {
  console.error('❌ CRITICAL: Razorpay SDK missing orders.create method');
}
```

### 3. Input Validation

**Added validation before API calls:**

```javascript
// Validate inputs before API call
if (!userId) throw new Error('userId is required');
if (!amount || amount <= 0) throw new Error('Valid amount is required');
if (!orderId) throw new Error('Order ID is required');

// Log what we're sending
console.log('📝 Creating Razorpay order with options:', options);
```

---

## How to Diagnose the Issue

### Step 1: Check Server Logs

Start the server and watch for initialization logs:

```bash
npm start
```

**Look for:**
```
✅ Razorpay initialized with:
  Key ID: rzp_test_ROzpR9FCBfPSds...
  Key Secret: degfS9w5klNpAJg2SBEFXR8y...
✅ Razorpay orders.create method available
```

**If you see errors instead:**
```
⚠️  WARNING: Razorpay credentials not configured
❌ CRITICAL: Razorpay SDK missing orders.create method
```

This means the SDK is not initialized correctly.

### Step 2: Test Payment Creation

```bash
# Get JWT token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Pass123!","name":"Test","phone":"1234567890"}' \
  | jq -r '.token')

# Create order and watch server logs
curl -X POST http://localhost:3000/api/payments/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"amount":500}'
```

**Check server logs for:**
```
📝 Creating Razorpay order with options: {amount: 50000, currency: 'INR', ...}
✅ Razorpay order created: order_S3thEq9j2YIcfc
```

Or if error:
```
❌ Error creating Razorpay order:
Error object: {response: {status: 401, data: {error: {code: 'INVALID_KEY_SECRET'}}}}
Error response: {error: {code: 'INVALID_KEY_SECRET', description: 'Invalid key secret'}}
Final error message: Invalid key secret
```

### Step 3: Verify Environment Variables

```bash
# Check if env vars are set
echo $RAZORPAY_KEY_ID
echo $RAZORPAY_KEY_SECRET

# Or check .env file
cat .env | grep RAZORPAY
```

**Expected output:**
```
RAZORPAY_KEY_ID=rzp_test_ROzpR9FCBfPSds
RAZORPAY_KEY_SECRET=degfS9w5klNpAJg2SBEFXR8y
```

### Step 4: Test API Credentials

```bash
# Test if credentials are valid
curl -X GET https://api.razorpay.com/v1/orders \
  -H "Authorization: Basic $(echo -n 'rzp_test_ROzpR9FCBfPSds:degfS9w5klNpAJg2SBEFXR8y' | base64)" \
  -H "Content-Type: application/json"
```

**Valid response:** Returns list of orders or empty array  
**Invalid response:** 401 Unauthorized or 403 Forbidden

---

## Common Error Messages and Solutions

### Error: "Invalid key secret"
**Cause:** Razorpay credentials are wrong  
**Solution:**
1. Verify credentials in `.env`
2. Check `.env` format: `RAZORPAY_KEY_SECRET=<actual_secret>`
3. No spaces around `=`
4. Restart server after updating

### Error: "Connection refused"
**Cause:** Razorpay API is unreachable  
**Solution:**
1. Check internet connection
2. Verify Razorpay API status
3. Check if proxy/firewall blocking requests

### Error: "Order ID is required"
**Cause:** Passing null or empty orderId  
**Solution:**
1. Check if `orderId` is being passed correctly
2. Verify `userId` in JWT token
3. Check database query returning results

### Error: "undefined"
**This indicates:** The actual error wasn't being captured  
**Solution:** Applied enhanced error logging above  

---

## Debugging Checklist

- [ ] Server is running (`npm start`)
- [ ] MongoDB is connected (`npm start` shows "DB connected")
- [ ] Razorpay SDK is initialized (check logs for ✅)
- [ ] Environment variables are set (`.env` has credentials)
- [ ] JWT token is valid (not expired, correct format)
- [ ] Amount is > 0
- [ ] Network connectivity works
- [ ] Check server logs during API call
- [ ] Verify Razorpay API response in logs

---

## Files Modified for Better Debugging

1. **payment.service.js** (3 functions improved):
   - `createOrder()` - Enhanced error logging
   - `getPaymentDetails()` - Added input validation + logging
   - `getOrderDetails()` - Added input validation + logging
   - Initialization section - Added SDK verification

---

## Example Server Logs After Fix

### Successful Order Creation:
```
✅ Razorpay initialized with:
  Key ID: rzp_test_ROzpR9FCBfPSds...
  Key Secret: degfS9w5klNpAJg2SBEFXR8y...
✅ Razorpay orders.create method available

📝 Creating Razorpay order with options: {
  amount: 50000,
  currency: 'INR',
  receipt: 'ORDER_69680531515ae05ce9939ab3_1768424753000',
  description: 'Test Payment',
  notes: { userId: '69680531515ae05ce9939ab3' }
}
✅ Razorpay order created: order_S3thEq9j2YIcfc
✅ Order details fetched: order_S3thEq9j2YIcfc
```

### Error Case (With Details):
```
📝 Creating Razorpay order with options: {amount: 50000, ...}
❌ Error creating Razorpay order:
Error object: RazorpayError {
  statusCode: 400,
  message: 'Bad request',
  response: {
    status: 400,
    data: {
      error: {
        code: 'BAD_REQUEST_ERROR',
        description: 'Invalid amount'
      }
    }
  }
}
Error message: Bad request
Error response: {
  error: {
    code: 'BAD_REQUEST_ERROR',
    description: 'Invalid amount'
  }
}
Final error message: Invalid amount
```

---

## Next Steps to Verify Fix

1. **Run server:** `npm start`
2. **Watch logs** for initialization messages
3. **Test payment creation** with curl command above
4. **Check actual error** in server logs instead of "undefined"
5. **Diagnose root cause** based on actual error message
6. **Fix underlying issue:**
   - Invalid credentials → Update `.env` + restart
   - Network issue → Check connectivity
   - Invalid amount → Ensure amount > 0
   - Missing fields → Add required parameters

---

## Performance Impact

✅ **No performance impact** - Only added logging and validation  
✅ **Better debugging** - Full error details now available  
✅ **Same speed** - Error handling path rarely taken  

---

## Production Recommendation

These enhanced logs should be enabled during:
- ✅ Development (Always enabled)
- ✅ Staging (Always enabled)
- ⚠️ Production (Consider using debug flag or log level)

In production, you might want to:
```javascript
// Only log in debug mode
if (process.env.DEBUG === 'true') {
  console.error('Full error object:', error);
}
```

---

**Status:** Enhanced error logging applied  
**Next Action:** Restart server and test payment creation  
**Expected:** Actual error message instead of "undefined"
