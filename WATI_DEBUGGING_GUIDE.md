# WhatsApp OTP Debugging Guide

## 🔍 Common Issues & Solutions

### Issue 1: "WATI_API_KEY is not configured"

**Error Message:**
```
WATI_API_KEY is not configured in environment variables
```

**Solution:**
1. Check your `.env` file exists and has WATI_API_KEY
   ```bash
   cat .env | grep WATI_API_KEY
   ```

2. Verify the value is not empty:
   ```bash
   echo $WATI_API_KEY
   # Should print your API key, not empty
   ```

3. If using a new terminal, reload environment:
   ```bash
   # Option 1: Source the .env (doesn't work with node-dotenv)
   source .env
   
   # Option 2: Restart your Node server
   npm run dev
   
   # Option 3: Check .env is in project root
   pwd  # Should be your project folder
   ls .env  # Should show .env file exists
   ```

4. In Windows PowerShell:
   ```powershell
   # Use system environment variables instead of .env
   [Environment]::SetEnvironmentVariable("WATI_API_KEY", "your_key_here", "User")
   ```

---

### Issue 2: "WATI API authentication failed"

**Error Message:**
```
[WATI API] Error: WATI API authentication failed. Check WATI_API_KEY.
```

**Root Causes & Solutions:**

#### A) Wrong API Key
```bash
# 1. Get the right key from WATI
# WATI Dashboard → Settings → API Keys

# 2. Copy the entire key (including any prefix like "Bearer")
# Some APIs add "Bearer " prefix automatically

# 3. Update .env
WATI_API_KEY=1234567890abcdefg  # No "Bearer" prefix needed

# 4. Restart your server
npm run dev
```

#### B) API Key Format Issues
```
✗ WATI_API_KEY=Bearer 1234567890  (has Bearer prefix - remove it)
✗ WATI_API_KEY=1234567890 (with spaces - remove them)
✗ WATI_API_KEY="1234567890" (with quotes - remove them)
✓ WATI_API_KEY=1234567890 (just the key)
```

---

### Issue 3: "WATI template not found"

**Error Message:**
```
[WATI API] Error: 404 - WATI template not found
```

**Causes & Solutions:**

#### A) Template Doesn't Exist
```bash
# 1. Go to WATI Dashboard
# 2. Click "Templates" or "Messages" → "Templates"
# 3. Check if "login_otp" template exists

# If NOT:
# - Create new template
# - Name: login_otp
# - Category: AUTHENTICATION
# - Message: "Your login OTP is {{otp}}. Do not share it with anyone."
# - Wait for approval
```

#### B) Template Name Mismatch
```bash
# In .env, template name must EXACTLY match WATI:
WATI_TEMPLATE_NAME=login_otp

# ✗ Wrong names:
WATI_TEMPLATE_NAME=loginotp (no underscore)
WATI_TEMPLATE_NAME=login_OTP (wrong case)
WATI_TEMPLATE_NAME=otp_login (wrong order)
```

#### C) Template Not Approved Yet
```
Status in WATI:
✗ Pending → Not ready yet (wait 1-2 hours)
✗ Rejected → Need to fix and resubmit
✓ Approved → Ready to use!

Test Status:
1. Go to WATI Dashboard
2. Find your template "login_otp"
3. Check status is "Approved"
4. If pending, check back later
```

#### D) Wrong Base URL
```bash
# Your WATI_BASE_URL should match your instance
# Format: https://live.wati.io/YOUR_INSTANCE_ID

# Correct:
WATI_BASE_URL=https://live.wati.io/1080383

# ✗ Wrong:
WATI_BASE_URL=https://app.wati.io (wrong domain)
WATI_BASE_URL=https://live.wati.io (missing instance ID)
WATI_BASE_URL=live.wati.io/1080383 (missing https://)
```

---

### Issue 4: "OTP not received on WhatsApp"

**Symptoms:**
- API response is "success"
- But user doesn't receive WhatsApp message

**Troubleshooting Steps:**

#### Step 1: Verify Template is Approved
```
In WATI:
Templates → login_otp → Status: Approved ✓
```
⚠️ Templates must be Meta-approved before they work

#### Step 2: Check Phone Number Format
```
✓ Correct: 919876543210 (country code + number)
✓ Correct: +919876543210 (with + prefix)
✗ Wrong: 9876543210 (no country code)
✗ Wrong: (91) 9876-543210 (with formatting)

The system auto-adds country code 91 if missing, but:
- Phone must be exactly 10 digits without code
- Or 12 digits with code
```

#### Step 3: Check Phone is on WhatsApp
```
The phone must have:
✓ WhatsApp installed
✓ WhatsApp Business Account (for some WATI plans)
✓ Active WhatsApp number (not blocked/deactivated)

Test:
1. Can you manually send WhatsApp message to this number?
2. If no, the number isn't on WhatsApp
```

#### Step 4: Check WATI Webhook Logs
```
WATI Dashboard → Webhooks / Logs / Message Status
Look for your phone number and OTP message
Check status: Sent, Delivered, Read, Failed?

If Failed:
- See error message in WATI
- Common: "Phone not found on WhatsApp"
```

#### Step 5: Check OTP is in 6-Digit Format
```javascript
// Generated OTP should be 6 digits:
100000-999999

// Check in server logs:
console.log(`📝 OTP Code: ${otp}`);
// Should print something like: 📝 OTP Code: 123456
```

---

### Issue 5: "Invalid phone number format"

**Error Message:**
```
Invalid phone number format
```

**Solution:**

#### Supported Formats:
```javascript
✓ "919876543210" (with country code)
✓ "+919876543210" (with + prefix)
✓ "9876543210" (will auto-add country code 91)

✗ "(91) 9876-543210" (formatted - won't work)
✗ "91 9876543210" (with space)
✗ "" (empty)
✗ null or undefined
```

#### How to Format:
```javascript
// User input from form (might have spaces/formatting)
let userInput = "(91) 9876-543210";

// Clean it:
let cleaned = userInput.replace(/\D/g, ''); // Remove non-digits
// Result: "919876543210"

// Now send to API:
{
  "phone": "919876543210"
}
```

---

### Issue 6: "OTP has expired"

**Error Message:**
```
OTP has expired. Please request a new one.
```

**Explanation:**
- OTP valid for 5 minutes only
- If user enters code after 5 minutes, it expires
- User must request new OTP

**Solution:**
1. Ask user to request new OTP
2. Consider extending expiry for longer codes:
   ```javascript
   // In wati-otp.service.js
   const otpExpiry = 10 * 60 * 1000; // 10 minutes instead of 5
   ```

---

### Issue 7: "Too many failed attempts"

**Error Message:**
```
Too many failed attempts. Please request a new OTP.
```

**Explanation:**
- User has 3 attempts to enter correct OTP
- After 3 wrong attempts, OTP is deleted
- User must request a new OTP

**Solution:**
- Ask user to request new OTP
- Check server logs for why wrong OTP was entered:
  ```bash
  tail -f server.log | grep "OTP"
  ```

---

## 🐛 Debug Mode

### Enable Detailed Logging

**Step 1: Update wati-otp.service.js**
```javascript
// Add this at the top of wati-otp.service.js
const DEBUG = process.env.DEBUG === 'true';

// Then use in logs:
if (DEBUG) {
  console.log('[DEBUG] Full payload:', payload);
  console.log('[DEBUG] Response:', response.data);
}
```

**Step 2: Enable in .env**
```env
DEBUG=true
```

**Step 3: Restart server and check logs**
```bash
npm run dev 2>&1 | grep "DEBUG"
```

---

## 📊 Testing Checklist

- [ ] WATI account created
- [ ] WhatsApp Business Account connected
- [ ] Template "login_otp" created in WATI
- [ ] Template approved by Meta
- [ ] WATI_API_KEY added to .env
- [ ] WATI_BASE_URL added to .env
- [ ] WATI_TEMPLATE_NAME added to .env
- [ ] Server restarted after .env changes
- [ ] Phone number is on WhatsApp
- [ ] Tested send-otp endpoint:
  ```bash
  curl -X POST http://localhost:8000/api/auth/send-otp \
    -H "Content-Type: application/json" \
    -d '{"phone": "919876543210"}'
  ```
- [ ] Received WhatsApp message with OTP
- [ ] Tested verify-otp endpoint with received code
- [ ] Got "OTP verified successfully" response

---

## 🔧 Manual Testing Steps

### 1. Test API Connection
```bash
curl -X POST http://localhost:8000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "919876543210"}' -v
```

**Check for:**
- Response code: 200 (not 401, 404, 500)
- Body contains: "status": "success"
- Message: "OTP sent successfully via WhatsApp"

### 2. Check Server Logs
```bash
# In another terminal, watch logs
tail -f server.log

# Or if using nodemon:
npm run dev
# Logs will show in terminal
```

**Look for:**
```
🔐 [WATI OTP] Sending OTP to 919876543210
📝 OTP Code: 123456
🔄 [WATI API] Sending to endpoint: https://live.wati.io/1080383/api/v1/sendTemplateMessage
📤 [WATI API] Payload: {...}
✅ [WATI API] Message sent successfully
```

### 3. Check WATI Dashboard
1. Log in to WATI
2. Go to "Message Logs" or "Sent Messages"
3. Look for your phone number
4. Check message status:
   - ✓ Sent
   - ✓ Delivered
   - ✗ Failed (shows error)

---

## 🆘 Still Not Working?

### Option 1: Check WATI Documentation
- WATI Docs: https://docs.wati.io/
- WATI API Reference: https://docs.wati.io/api/

### Option 2: Contact WATI Support
- WATI Support: https://www.wati.io/contact/
- Provide:
  - API Key (first 10 chars)
  - Instance ID
  - Template name
  - Error message from WATI

### Option 3: Fallback to Mock OTP
```bash
# Temporarily switch back to mock OTP for testing
# In auth.controller.js:

const mockOtpService = require('../../shared/services/mock-otp.service');
// Change: const watiOtpService = require(...);
// To: const mockOtpService = require(...);

// In sendOTP function:
const result = await mockOtpService.sendOTP(phone); // Instead of watiOtpService
```

---

## 📝 Log Collection for Support

If you need to ask for help, gather these logs:

```bash
# 1. Server logs (last 50 lines)
npm run dev 2>&1 | head -50

# 2. Environment variables (hide secret key)
echo "WATI_BASE_URL: $WATI_BASE_URL"
echo "WATI_TEMPLATE_NAME: $WATI_TEMPLATE_NAME"

# 3. Check files exist
ls -la src/shared/services/wati-otp.service.js
ls -la src/features/auth/auth.controller.js
```

Then share these logs when asking for help.

---

**Happy testing! 🚀**
