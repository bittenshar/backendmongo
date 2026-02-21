# WATI OTP Quick Reference

## 🚀 Quick Start (5 Minutes)

### 1. Verify Configuration
```bash
# Check if WATI credentials are set
grep -E "WATI_(API_KEY|BASE_URL|TEMPLATE_NAME)" .env

# Should show:
# WATI_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# WATI_BASE_URL=https://live-mt-server.wati.io/1080383
# WATI_TEMPLATE_NAME=login_otp
```

### 2. Run Integration Test
```bash
node test-wati-integration.js

# Expected output:
# ✅ Configuration: PASS
# ✅ OTP Sending: PASS
# 📱 Message sent to WhatsApp
```

### 3. Test via API
```bash
# Send OTP
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210"}'

# Verify OTP (replace 123456 with code from WhatsApp)
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","code":"123456"}'
```

---

## 📋 API Endpoints

### Send OTP
```
POST /api/auth/send-otp
Content-Type: application/json

{
  "phone": "9876543210"
}

Response:
{
  "status": "success",
  "data": {
    "phone": "919876543210",
    "phoneStatus": "new|existing",
    "otp": "123456"
  }
}
```

### Verify OTP
```
POST /api/auth/verify-otp
Content-Type: application/json

{
  "phone": "9876543210",
  "code": "123456"
}

Response:
{
  "status": "success",
  "data": {
    "user": {
      "userId": "...",
      "name": "User Name",
      "phone": "9876543210"
    },
    "token": "jwt_token"
  }
}
```

### Get Profile
```
GET /api/auth/complete-profile
Authorization: Bearer <jwt_token>

Response:
{
  "status": "success",
  "data": {
    "user": { ... },
    "aadhaarStatus": { ... },
    "faceVerification": { ... }
  }
}
```

---

## 🔧 Configuration

### .env Variables
| Variable | Sample Value | Purpose |
|----------|--------------|---------|
| `WATI_API_KEY` | `eyJ...` | API authentication token from WATI |
| `WATI_BASE_URL` | `https://live-mt-server.wati.io/1080383` | WATI API endpoint |
| `WATI_TEMPLATE_NAME` | `login_otp` | WhatsApp message template name |

### Environment Modes
```
NODE_ENV=development  # OTP shown in response + dev mode features
NODE_ENV=production   # OTP hidden from response + secure mode
```

---

## 📱 WhatsApp Template

**Template Name**: `login_otp`

**Format**:
```
Your login OTP is {{otp}}. Do not share it with anyone.
```

**Status**: ✅ Approved

**Parameters**:
- `otp` - 6-digit code

---

## ⏱️ OTP Timing

| Item | Duration |
|------|----------|
| OTP Validity | 5 minutes |
| Resend Wait | 30 seconds (optional) |
| Max Attempts | 3 failed tries |
| Message Delivery | <2 seconds |

---

## ✅ Verification Checklist

- [x] WATI API key configured
- [x] WATI base URL configured
- [x] Template name configured
- [x] Controller using wati-otp-service
- [x] WATI service using template from env
- [x] Test script created
- [x] Documentation complete

---

## 🐛 Common Issues

| Problem | Solution |
|---------|----------|
| "API Key missing" | Check `.env` file has WATI_API_KEY |
| "Invalid phone" | Use 10 digits: 9876543210 (not +91...) |
| "Template not found" | Verify template name in WATI dashboard |
| "OTP expired" | OTP valid for 5 mins only |
| "Too many attempts" | Max 3 tries, then need new OTP |

---

## 📊 File Changes

| File | Change |
|------|--------|
| [src/features/auth/auth.controller.js](#) | Switched to wati-otp-service |
| [src/shared/services/wati-otp.service.js](#) | Updated template config |
| [.env](#) | WATI credentials added |
| [test-wati-integration.js](#) | New test suite |
| [WATI_OTP_INTEGRATION_COMPLETE.md](#) | Full documentation |

---

## 🎯 Next Steps

1. **Test Now**
   ```bash
   node test-wati-integration.js
   ```

2. **Try API**
   ```bash
   curl -X POST http://localhost:3000/api/auth/send-otp \
     -d '{"phone":"9876543210"}'
   ```

3. **Check WhatsApp**
   - Should receive OTP message within 2 seconds

4. **Verify Code**
   ```bash
   curl -X POST http://localhost:3000/api/auth/verify-otp \
     -d '{"phone":"9876543210","code":"XXXX"}'
   ```

---

**🎉 WATI Integration Complete & Ready to Use!**
