# Fix: "Failed to send OTP" Error

## ❌ The Error
```json
{
  "status": "fail",
  "message": "Failed to send OTP"
}
```

## ✅ The Fix

Your `.env` file was **missing WATI credentials**. I've added them with placeholder values:

```env
WATI_API_KEY=your_wati_api_key_here
WATI_BASE_URL=https://live.wati.io/your_instance_id
WATI_TEMPLATE_NAME=login_otp
```

## 🔧 What You Need to Do NOW

### Step 1: Get Your WATI Credentials (5 minutes)

**Get WATI_API_KEY:**
1. Go to https://www.wati.io/ → Sign in
2. Click your name (top right) → Settings
3. Go to "API Keys"
4. Copy your API Key

**Get WATI_BASE_URL:**
1. Look at your WATI Dashboard URL
2. It should be: `https://live.wati.io/1080383` (example)
3. Use that entire URL as WATI_BASE_URL

### Step 2: Update Your .env File

Replace the placeholder values with your actual WATI credentials:

```env
# Before (current - has placeholders)
WATI_API_KEY=your_wati_api_key_here
WATI_BASE_URL=https://live.wati.io/your_instance_id
WATI_TEMPLATE_NAME=login_otp

# After (you need to fill in actual values)
WATI_API_KEY=1234567890abcdef1234567890abcdef
WATI_BASE_URL=https://live.wati.io/1080383
WATI_TEMPLATE_NAME=login_otp
```

### Step 3: Restart Your Server

```bash
# Stop current server (Ctrl+C)

# Restart
npm run dev
```

### Step 4: Test Again

```bash
curl -X POST http://localhost:8000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "919876543210"}'
```

---

## 🔍 Troubleshooting

### Still Getting Error? Check This:

**1. Did you add WATI credentials to .env?**
```bash
grep WATI_API_KEY .env
# Should show: WATI_API_KEY=1234567890...
```

**2. Did you restart the server?**
```bash
# Kill the old process
npm run dev  # Start fresh
```

**3. Is the API Key correct?**
- Go back to WATI Dashboard
- Settings → API Keys
- Copy the entire key (no extra spaces)

**4. Is the Base URL correct?**
- Should be: `https://live.wati.io/YOUR_INSTANCE_ID`
- Check in WATI Dashboard URL bar
- Example: `https://live.wati.io/1080383`

**5. Check Server Logs**
Look for detailed error messages:
```
🔐 [WATI OTP] Error sending OTP:
[WATI API] Error: ...
```

---

## 📝 Where to Find Your WATI Credentials

### WATI_API_KEY
- Location: WATI Dashboard → Settings → API Keys
- What it looks like: `1234567890abcdefghijklmnop`
- Don't include quotes

### WATI_BASE_URL
- Location: Look at your WATI Dashboard URL in browser
- What it looks like: `https://live.wati.io/1080383`
- The number changes per account

### WATI_TEMPLATE_NAME
- Default: `login_otp` (don't change unless you created different template)
- Must match template name in WATI

---

## ✅ Success Indicators

After fixing, you should see:
```
🔐 [WATI OTP] Sending OTP to 919876543210
📝 OTP Code: 123456
🔄 [WATI API] Sending to endpoint: https://live.wati.io/1080383/api/v1/sendTemplateMessage
✅ [WATI API] Message sent successfully
```

And you should **receive WhatsApp message** on your phone!

---

## 🆘 Still Not Working?

Check the detailed troubleshooting guide:
→ See: `WATI_DEBUGGING_GUIDE.md`

Error messages explained:
→ See: `WATI_WHATSAPP_OTP_SETUP.md` → Troubleshooting section

---

**Next Step:** Update your .env file and restart your server!
