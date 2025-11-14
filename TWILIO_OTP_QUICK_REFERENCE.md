# 📱 Twilio OTP - Quick Reference

## Setup
```env
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_VERIFY_SERVICE_SID=your_verify_service_sid_here
```
⚠️ Keep these credentials in `.env` only - never commit!

## Endpoints

### Send OTP
```
POST /api/auth/send-otp
Content-Type: application/json

{
  "phone": "+918824223395"
}

Response:
{
  "status": "success",
  "message": "OTP sent successfully",
  "data": {
    "phone": "+918824223395",
    "verificationSid": "VE...",
    "status": "pending"
  }
}
```

### Verify OTP
```
POST /api/auth/verify-otp
Content-Type: application/json

{
  "phone": "+918824223395",
  "code": "9393"
}

Response:
{
  "status": "success",
  "message": "Phone verified successfully",
  "data": {
    "verified": true,
    "status": "approved"
  }
}
```

## Test Commands

```bash
# Send OTP
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+918824223395"}'

# Verify OTP
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+918824223395", "code": "9393"}'
```

## Phone Number Formats

| Input | Auto-Converted To |
|-------|-------------------|
| `9876543210` | `+919876543210` |
| `09876543210` | `+919876543210` |
| `+919876543210` | `+919876543210` (as-is) |

## OTP Specs

- **Length:** 6 digits
- **Delivery:** SMS
- **Expiry:** 10 minutes
- **Attempts:** Unlimited (until expiry)

## Error Responses

| Error | Message |
|-------|---------|
| `TWILIO_NOT_CONFIGURED` | Credentials missing in .env |
| `INVALID_PHONE` | Bad phone format |
| `OTP_EXPIRED` | Code expired (>10 min) |
| `INVALID_CODE` | Wrong OTP code |

## Files

- **Service:** `src/shared/services/twilio.service.js`
- **Controller:** `src/features/auth/auth.controller.js` (sendOTP, verifyOTP)
- **Routes:** `src/features/auth/auth.routes.js`
- **Docs:** `src/docs/TWILIO_OTP_API.md`

## Complete Flow

```
1. User signs up → POST /api/auth/signup
2. Send OTP → POST /api/auth/send-otp
3. User enters OTP from SMS
4. Verify OTP → POST /api/auth/verify-otp
5. Phone verified ✅
```

## Android Usage

```kotlin
// Send OTP
api.post("/api/auth/send-otp", { phone = "+918824223395" })

// Verify OTP
api.post("/api/auth/verify-otp", { 
  phone = "+918824223395"
  code = userInput
})
```

## React Usage

```javascript
// Send OTP
await fetch('http://localhost:3000/api/auth/send-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: '+918824223395' })
})

// Verify OTP
await fetch('http://localhost:3000/api/auth/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: '+918824223395', code: '9393' })
})
```

## Status

✅ **Server:** Running on http://localhost:3000
✅ **Twilio:** Configured and ready
✅ **Database:** Connected
✅ **Endpoints:** Ready to test
