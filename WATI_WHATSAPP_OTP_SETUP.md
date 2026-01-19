# WhatsApp OTP Authentication Setup Guide (WATI)

## Overview
Your OTP login system has been **upgraded from mock OTP to WhatsApp OTP using WATI**.

- **Old**: OTP logged to console only
- **New**: OTP sent via WhatsApp (real delivery)

---

## 📋 Step 1: Get WATI API Credentials

### 1.1 Create a WATI Account
- Go to https://www.wati.io/
- Click "Sign Up" or "Get Started"
- Create your account

### 1.2 Connect Your WhatsApp Business Account
- In WATI Dashboard, go to **Settings** → **WhatsApp Account**
- Connect your WhatsApp Business Account
  - You need a Meta Business Account
  - If you don't have one: https://business.facebook.com/

### 1.3 Get Your API Key
- In WATI Dashboard, go to **Settings** → **API Keys**
- Click **View API Key**
- Copy the API Key

### 1.4 Get Your Instance URL
- Your instance URL is shown in the WATI dashboard
- Format: `https://live.wati.io/YOUR_INSTANCE_ID`
- Example: `https://live.wati.io/1080383`

---

## 🔧 Step 2: Create WhatsApp Template

### Important: Templates are Required
WhatsApp requires pre-approved templates. You **cannot** send arbitrary messages.

### 2.1 Create Template in WATI
1. In WATI Dashboard, go to **Templates** or **Messages** → **Templates**
2. Click **Create Template**
3. Fill in:
   - **Template Name**: `login_otp`
   - **Language**: English
   - **Category**: AUTHENTICATION (important!)
   - **Message Body**:
     ```
     Your login OTP is {{otp}}. Do not share it with anyone. Valid for 5 minutes.
     ```

### 2.2 Template Parameters
- **Variable Name**: `otp`
- **Type**: Text
- **Example**: `123456`

### 2.3 Await Approval
- Meta will review your template (usually 1-2 hours)
- Status: Pending → Approved
- Only **approved templates** can send messages

---

## ⚙️ Step 3: Update Your .env File

### 3.1 Open or Create .env
```bash
# In your project root
nano .env
# or
code .env
```

### 3.2 Add WATI Configuration
```env
# WATI WhatsApp Configuration
WATI_API_KEY=your_api_key_from_step_1
WATI_BASE_URL=https://live.wati.io/your_instance_id
WATI_TEMPLATE_NAME=login_otp
```

### Example .env
```env
# Existing config...
NODE_ENV=development
JWT_SECRET=your_secret
PORT=8000

# NEW: WATI WhatsApp OTP
WATI_API_KEY=1234567890abcdef
WATI_BASE_URL=https://live.wati.io/1080383
WATI_TEMPLATE_NAME=login_otp
```

---

## 🧪 Step 4: Test the Integration

### 4.1 Send OTP Request
```bash
curl -X POST http://localhost:8000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "919876543210"}'
```

### Response (Success)
```json
{
  "status": "success",
  "message": "OTP sent successfully via WhatsApp",
  "data": {
    "phone": "919876543210",
    "sid": "wati-1234567890",
    "expiresIn": "5 minutes",
    "otp": "123456"  // Only in development
  }
}
```

### 4.2 Check WhatsApp
- The OTP should arrive on the phone number's WhatsApp within seconds
- Message: "Your login OTP is 123456. Do not share it with anyone. Valid for 5 minutes."

### 4.3 Verify OTP
```bash
curl -X POST http://localhost:8000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "919876543210", "code": "123456"}'
```

### Response (Success)
```json
{
  "status": "success",
  "message": "OTP verified successfully",
  "data": {
    "verified": true
  }
}
```

---

## 📱 Complete Auth Flow

### 1. Frontend: User enters phone number
```javascript
// POST /api/auth/send-otp
{
  "phone": "+919876543210"
}
```

### 2. Backend: Generate OTP → Send via WhatsApp
- Generate: 6-digit OTP (e.g., 123456)
- Send via WATI API to WhatsApp
- Store OTP with 5-minute expiry

### 3. Frontend: User receives WhatsApp message
```
Your login OTP is 123456. Do not share it with anyone. Valid for 5 minutes.
```

### 4. Frontend: User enters OTP
```javascript
// POST /api/auth/verify-otp
{
  "phone": "+919876543210",
  "code": "123456"
}
```

### 5. Backend: Verify OTP → Create User/Login
- Check OTP matches & not expired
- If valid: create/login user
- Return JWT token

### 6. Frontend: Store token → Authenticated
- Save JWT in localStorage/sessionStorage
- Use for subsequent API calls

---

## 🔒 Security Best Practices

### ✅ What We Do
- ✓ OTP expires after 5 minutes
- ✓ Max 3 verification attempts
- ✓ OTP sent only once (old OTP deleted on new request)
- ✓ OTP not returned in production (only dev mode)

### ⚠️ What You Should Do
1. **Move OTP storage to Redis** (not in-memory)
   ```javascript
   // Current: Map (process restarts = data loss)
   // Better: Redis (persistent, distributed)
   ```

2. **Rate limit OTP requests**
   ```
   Max 1 OTP request per phone/minute
   Max 5 requests per phone/hour
   ```

3. **Mask phone numbers in logs**
   ```
   Instead of: 919876543210
   Log: 91987654****
   ```

4. **Monitor failed attempts**
   - Alert if phone has >10 failed OTPs in 1 hour
   - Possible brute force attack

5. **Use HTTPS in production**
   - WATI requires HTTPS
   - Set: `NODE_ENV=production`

---

## 🚨 Troubleshooting

### Issue: "WATI API authentication failed"
**Solution**: Check your WATI_API_KEY
```bash
echo $WATI_API_KEY  # Should show your key
```

### Issue: "WATI template not found"
**Solution**: 
1. Check template name matches: `login_otp`
2. Verify template is **Approved** in WATI
3. Check WATI_BASE_URL is correct

### Issue: "Invalid phone number format"
**Solution**: Use format with country code
```
✗ 9876543210 (no country code)
✓ 919876543210 (with country code)
✓ +919876543210 (with + prefix)
```

### Issue: OTP not received on WhatsApp
**Possible causes**:
1. Template not approved yet (wait for Meta approval)
2. Phone number is not on WhatsApp
3. WATI_API_KEY is incorrect
4. Check WATI dashboard for error logs

---

## 📊 Files Modified

| File | Change |
|------|--------|
| `src/shared/services/wati-otp.service.js` | NEW - WhatsApp OTP service |
| `src/features/auth/auth.controller.js` | Updated to use WATI |
| `.env` | Add WATI credentials |

---

## 🎯 Next Steps

1. ✓ Get WATI credentials (Step 1)
2. ✓ Create WhatsApp template (Step 2)
3. ✓ Update .env file (Step 3)
4. ✓ Test the flow (Step 4)
5. → Move OTP storage to Redis (production)
6. → Add rate limiting (production)
7. → Deploy to production

---

## 📚 Useful Links

- WATI: https://www.wati.io/
- WATI Docs: https://docs.wati.io/
- WhatsApp Business API: https://developers.facebook.com/docs/whatsapp
- WhatsApp Templates: https://www.whatsapp.com/business/api-documentation/message-templates/

---

## 💡 FAQ

**Q: Does user need WhatsApp installed?**
- Yes, OTP is sent via WhatsApp. User needs WhatsApp Business or regular WhatsApp.

**Q: Can I customize the OTP message?**
- Yes! Create different templates in WATI with different messages.

**Q: What if user loses phone?**
- User can't verify OTP. No recovery mechanism yet (build in next phase).

**Q: How much does WATI cost?**
- Free tier available (limited messages/month)
- Paid plans start around $7/month

**Q: Can I use this for SMS as well?**
- WATI is WhatsApp only. For SMS: use Twilio instead.

---

**Need help?** Check WATI dashboard logs or contact WATI support.
