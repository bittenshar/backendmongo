# 📱 Twilio OTP Phone Verification API

Complete guide for adding phone number OTP verification to your authentication system.

---

## 🎯 Overview

This API uses **Twilio Verify Service** to send and verify one-time passwords (OTPs) via SMS for secure phone number verification.

**Features:**
- ✅ Send OTP to any phone number
- ✅ Verify OTP code
- ✅ Automatic formatting for Indian numbers (+91)
- ✅ SMS delivery tracking
- ✅ 6-digit code generation
- ✅ Real-time verification status

---

## 🔑 Setup Instructions

### 1. Add Twilio Credentials to .env

```env
# Twilio OTP Verification
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_VERIFY_SERVICE_SID=your_verify_service_sid_here
TWILIO_PHONE_NUMBER=+1234567890
```

⚠️ **IMPORTANT: Keep credentials secure!**
- Never commit `.env` file to git
- Add `.env` to `.gitignore`

**Where to get these:**
1. Create account at [Twilio Console](https://console.twilio.com)
2. Copy Account SID from Dashboard
3. Get Auth Token from Account Settings
4. Create Verify Service and copy Service SID

### 2. Install Twilio Package
```bash
npm install twilio
```

✅ Already done in your setup!

---

## 📡 API Endpoints

### 1️⃣ Send OTP

**Send a one-time password to user's phone number**

```
POST /api/auth/send-otp
Content-Type: application/json
```

**Request Body:**
```json
{
  "phone": "+918824223395"  // or "8824223395" (auto-formatted)
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "OTP sent successfully",
  "data": {
    "phone": "+918824223395",
    "verificationSid": "VE6f66e82ffa059852a3075ced89458634",
    "channel": "sms",
    "status": "pending"
  }
}
```

**Response (Error - Not Configured):**
```json
{
  "status": "fail",
  "message": "Twilio OTP service not configured. Please add credentials to .env",
  "error": "TWILIO_NOT_CONFIGURED"
}
```

**Response (Error - Invalid Phone):**
```json
{
  "status": "fail",
  "message": "Invalid phone number format",
  "error": "INVALID_PHONE"
}
```

---

### 2️⃣ Verify OTP

**Verify the OTP code sent to user's phone**

```
POST /api/auth/verify-otp
Content-Type: application/json
```

**Request Body:**
```json
{
  "phone": "+918824223395",
  "code": "9393"
}
```

**Response (Success - Valid OTP):**
```json
{
  "status": "success",
  "message": "Phone verified successfully",
  "data": {
    "phone": "+918824223395",
    "verified": true,
    "status": "approved",
    "validTill": "2025-11-14T15:10:09Z"
  }
}
```

**Response (Error - Invalid OTP):**
```json
{
  "status": "fail",
  "message": "Invalid OTP code",
  "error": "INVALID_CODE"
}
```

**Response (Error - Expired OTP):**
```json
{
  "status": "fail",
  "message": "OTP has expired",
  "error": "OTP_EXPIRED"
}
```

---

## 🔄 Complete Auth Flow with OTP

### Step 1: User Signs Up with Phone
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+918824223395",
    "password": "password123"
  }'
```

### Step 2: Send OTP to Verify Phone
```bash
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+918824223395"
  }'
```

**User receives SMS:** "Your verification code is: 9393"

### Step 3: User Enters OTP from SMS
```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+918824223395",
    "code": "9393"
  }'
```

### Step 4: Phone Verified ✅
User's phone number is now verified in the system.

---

## 📋 Implementation Details

### OTP Service (`twilio.service.js`)

**Auto Phone Formatting:**
```javascript
// User enters: "9012345678"
// System converts to: "+919012345678"

// User enters: "09012345678"
// System converts to: "+919012345678"

// User enters: "+919012345678"
// System uses as-is
```

**OTP Characteristics:**
- Length: 6 digits
- Delivery: SMS
- Expiry: 10 minutes (Twilio default)
- Resend: Available after initial send

---

## 🧪 Test Examples

### Test with Your Phone

```bash
# 1. Send OTP
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+918824223395"
  }'

# Response:
# {
#   "status": "success",
#   "message": "OTP sent successfully",
#   "data": {
#     "phone": "+918824223395",
#     "verificationSid": "VE...",
#     "status": "pending"
#   }
# }

# 2. Check SMS for code (e.g., "9393")

# 3. Verify OTP
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+918824223395",
    "code": "9393"
  }'

# Response:
# {
#   "status": "success",
#   "message": "Phone verified successfully",
#   "data": {
#     "phone": "+918824223395",
#     "verified": true,
#     "status": "approved"
#   }
# }
```

---

## 📱 Android Integration Example

### Kotlin Implementation

```kotlin
// 1. Send OTP
suspend fun sendOTP(phone: String): OTPResult {
    return api.post("/api/auth/send-otp", OTPRequest(phone))
}

// 2. Show OTP Input Dialog
@Composable
fun OTPInputDialog(phone: String) {
    var otpCode by remember { mutableStateOf("") }
    var isVerifying by remember { mutableStateOf(false) }
    
    Column {
        Text("Enter OTP sent to $phone")
        
        TextField(
            value = otpCode,
            onValueChange = { otpCode = it.take(6) },
            label = { Text("OTP Code") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
        )
        
        Button(onClick = {
            isVerifying = true
            // Verify OTP
            viewModelScope.launch {
                val result = verifyOTP(phone, otpCode)
                if (result.success) {
                    // Phone verified!
                    proceedToNextStep()
                } else {
                    showError(result.message)
                }
                isVerifying = false
            }
        }) {
            Text("Verify")
        }
    }
}

// 3. Verify OTP
suspend fun verifyOTP(phone: String, code: String): OTPVerifyResult {
    return api.post("/api/auth/verify-otp", {
        phone = phone
        code = code
    })
}
```

---

## 🎨 React/JavaScript Integration

### React Component

```javascript
import { useState } from 'react';
import axios from 'axios';

export function PhoneVerification() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // phone or otp
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('http://localhost:3000/api/auth/send-otp', {
        phone
      });
      
      if (response.data.status === 'success') {
        setStep('otp');
        setError('');
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('http://localhost:3000/api/auth/verify-otp', {
        phone,
        code: otp
      });
      
      if (response.data.status === 'success') {
        alert('✅ Phone verified successfully!');
        // Proceed to next step
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'phone') {
    return (
      <form onSubmit={handleSendOTP}>
        <input
          type="tel"
          placeholder="Enter phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send OTP'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyOTP}>
      <p>OTP sent to {phone}</p>
      <input
        type="text"
        placeholder="Enter 6-digit OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value.slice(0, 6))}
        maxLength="6"
        required
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Verifying...' : 'Verify OTP'}
      </button>
      <button onClick={() => setStep('phone')} type="button">
        Change Phone
      </button>
    </form>
  );
}
```

---

## ⚙️ Configuration

### Phone Number Formatting

The system automatically handles various phone number formats:

| Input | Output | Country |
|-------|--------|---------|
| `8824223395` | `+918824223395` | India (+91) |
| `09012345678` | `+919012345678` | India (+91) |
| `+918824223395` | `+918824223395` | Any (as-is) |
| `+447911123456` | `+447911123456` | UK (+44) |

**To support other countries, update the formatting logic in `twilio.service.js`:**

```javascript
// Current: Defaults to +91 (India)
// To support multiple countries, detect country code or use library like `libphonenumber-js`

// Example with country code:
function formatPhone(phone, countryCode = 'IN') {
  const countryPhoneCodes = {
    'IN': '+91',
    'US': '+1',
    'GB': '+44',
    'CA': '+1'
  };
  // ... formatting logic
}
```

---

## 🔒 Security Considerations

✅ **OTP Best Practices Implemented:**
- Minimum 6-digit codes (can increase to 8)
- 10-minute expiration (Twilio default)
- One verification per code
- Rate limiting recommended (see below)

⚠️ **Additional Security (Recommended):**

```javascript
// Rate limiting to prevent OTP abuse
const rateLimit = require('express-rate-limit');

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Max 3 OTP requests per phone in 15 min
  message: 'Too many OTP requests, try again later'
});

router.post('/send-otp', otpLimiter, authController.sendOTP);
```

---

## 📊 Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `TWILIO_NOT_CONFIGURED` | Missing credentials | Add .env variables |
| `INVALID_PHONE` | Bad phone format | Check phone number |
| `OTP_EXPIRED` | Code too old | Request new OTP |
| `INVALID_CODE` | Wrong code | Enter correct code |
| `DELIVERY_FAILED` | SMS didn't send | Check Twilio logs |
| `TOO_MANY_ATTEMPTS` | Rate limited | Wait and retry |

---

## 🚀 Production Deployment

### Pre-Deployment Checklist

- [ ] Add Twilio credentials to production .env
- [ ] Enable rate limiting on OTP endpoints
- [ ] Add OTP attempt logging
- [ ] Configure CORS for production domain
- [ ] Enable HTTPS only
- [ ] Monitor Twilio API usage
- [ ] Set up SMS cost alerts
- [ ] Test with real phone numbers
- [ ] Document customer support procedures

### Production Environment Variables

```env
# Production Twilio
TWILIO_ACCOUNT_SID=AC... (production SID)
TWILIO_AUTH_TOKEN=... (production token)
TWILIO_VERIFY_SERVICE_SID=VA... (production service)

# Add rate limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=3    # Max 3 OTP requests

# Add monitoring
TWILIO_MONITORING_ENABLED=true
```

---

## 📈 Monitoring & Analytics

**Track OTP Metrics:**
```javascript
// Log OTP attempts
console.log({
  timestamp: new Date(),
  phone: '+918824223395',
  action: 'send_otp',
  status: 'success',
  platform: 'mobile'
});

// Monitor success rate
// Track average verification time
// Monitor SMS delivery times
// Identify common failure patterns
```

---

## 🆘 Troubleshooting

### "SMS Not Received"
- Check phone number format
- Verify Twilio account has SMS credit
- Check Twilio logs for delivery failures
- Confirm SMS isn't being blocked by carrier

### "Invalid OTP Code"
- Ensure code is exactly 6 digits
- Check code hasn't expired (10 min max)
- Verify no leading/trailing spaces

### "Service Not Configured"
- Add all 3 Twilio credentials to .env
- Restart server after .env changes
- Check credentials in Twilio Console

---

## 📞 Support

- **Twilio Docs:** https://www.twilio.com/docs/verify
- **API Status:** https://status.twilio.com
- **Support:** Open ticket in Twilio Console

---

**Your OTP system is ready for production!** ✅

For production deployment, ensure all security measures are in place and monitor OTP metrics regularly.
