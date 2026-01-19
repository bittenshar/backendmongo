# WhatsApp OTP Integration - Quick Reference

## What Changed?
✓ OTP now sent via **WhatsApp** (not just console logs)
✓ Uses **WATI API** (easy integration)
✓ 5-minute expiry + 3 attempt limit

---

## 3-Step Setup

### Step 1: Get WATI Credentials (5 min)
```
1. Sign up: https://www.wati.io/
2. Connect WhatsApp Business Account
3. Settings → API Keys → Copy API Key
4. Copy instance URL from dashboard
```

### Step 2: Create Template in WATI (2 min)
```
Name: login_otp
Message: "Your login OTP is {{otp}}. Do not share it with anyone."
Parameter: {{otp}}
Category: AUTHENTICATION
→ Wait for Meta approval (1-2 hours)
```

### Step 3: Update .env (1 min)
```env
WATI_API_KEY=your_api_key_here
WATI_BASE_URL=https://live.wati.io/your_instance_id
WATI_TEMPLATE_NAME=login_otp
```

---

## Test It

### Send OTP
```bash
curl -X POST http://localhost:8000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "919876543210"}'
```

### Verify OTP
```bash
curl -X POST http://localhost:8000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "919876543210", "code": "RECEIVED_OTP"}'
```

---

## API Endpoints (No Change)

```
POST /api/auth/send-otp
  Body: {"phone": "919876543210"}
  Response: {status, message, data: {phone, sid, expiresIn}}

POST /api/auth/verify-otp
  Body: {"phone": "919876543210", "code": "123456"}
  Response: {status, message, data: {verified}}
```

---

## Files Changed

```
✓ NEW: src/shared/services/wati-otp.service.js
✓ UPDATED: src/features/auth/auth.controller.js
✓ NEW: WATI_WHATSAPP_OTP_SETUP.md (full guide)
```

---

## Phone Number Format
✓ `919876543210` (with country code)
✓ `+919876543210` (with + prefix)
✗ `9876543210` (will auto-add country code)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "API authentication failed" | Check WATI_API_KEY |
| "Template not found" | Template must be **Approved** |
| "OTP not received" | Wait for Meta approval + check phone |
| "Invalid phone" | Use format: 919876543210 |

---

## Production Checklist
- [ ] Get WATI paid plan (free tier limited)
- [ ] Create + approve template
- [ ] Test with real WhatsApp account
- [ ] Move OTP storage from Map to Redis
- [ ] Add rate limiting (max 1 OTP/minute per phone)
- [ ] Enable HTTPS
- [ ] Add monitoring/alerts

---

## Next: Redis Integration (Optional)
Replace in-memory Map with Redis for:
- Persistent OTP storage
- Multi-server support
- Better performance

```javascript
// Current
const otpStore = new Map();

// Better (Redis)
const redis = require('redis');
const client = redis.createClient();
await client.setEx(phone, 300, otp); // 5 min expiry
```

---

**Full documentation**: See `WATI_WHATSAPP_OTP_SETUP.md`
