# WhatsApp OTP Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Your Mobile App / Web                       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  User Interface                                           │   │
│  │  1. Enter phone number                                    │   │
│  │  2. Tap "Send OTP"                                        │   │
│  │  3. Enter OTP from WhatsApp                               │   │
│  │  4. Tap "Verify"                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP POST
                              │ /api/auth/send-otp
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Your Node.js Server                           │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  auth.controller.js                                       │   │
│  │  - exports.sendOTP()                                      │   │
│  │  - exports.verifyOTP()                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  wati-otp.service.js                                      │   │
│  │  - Generate OTP (6 digits)                                │   │
│  │  - Store in Map {phone → {otp, expiry, attempts}}         │   │
│  │  - Call WATI API                                          │   │
│  │  - Handle responses/errors                                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS POST
                              │ (API Key in header)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    WATI Platform (Hosted)                        │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  /api/v1/sendTemplateMessage                             │   │
│  │  - Validate API Key                                       │   │
│  │  - Check template "login_otp" is approved                │   │
│  │  - Render template with {{otp}} parameter                │   │
│  │  - Queue message for sending                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Message Queue                                            │   │
│  │  - Wait for availability                                  │   │
│  │  - Prepare WhatsApp message                              │   │
│  │  - Send to WhatsApp servers                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ WhatsApp Message
                              │ (via WhatsApp servers)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    User's Phone (WhatsApp)                       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  WhatsApp Notification                                    │   │
│  │                                                            │   │
│  │  "Your login OTP is 123456.                               │   │
│  │   Do not share it with anyone.                            │   │
│  │   Valid for 5 minutes."                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ (User copies OTP)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      Your Mobile App / Web                       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  HTTP POST /api/auth/verify-otp                           │   │
│  │  {                                                         │   │
│  │    phone: "919876543210",                                 │   │
│  │    code: "123456"                                         │   │
│  │  }                                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Your Node.js Server                           │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  wati-otp.service.js (verifyOTP)                          │   │
│  │  1. Find OTP in Map                                       │   │
│  │  2. Check not expired                                     │   │
│  │  3. Check attempts < 3                                    │   │
│  │  4. Compare code with stored OTP                          │   │
│  │  5. Return success/fail                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  auth.controller.js (verifyOTP)                           │   │
│  │  - If verified: Create/Login user                         │   │
│  │  - Generate JWT token                                     │   │
│  │  - Return token to client                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ JWT Token
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Your Mobile App / Web                       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ✅ User Authenticated                                    │   │
│  │  - Store JWT in localStorage                              │   │
│  │  - Use JWT for API requests                               │   │
│  │  - Redirect to home/dashboard                             │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow (Simplified)

```
User Input:
├─ Phone: "919876543210"
└─ Code: "123456"

Send OTP Request:
├─ Client sends: POST /api/auth/send-otp {phone}
├─ Backend generates: otp = "123456"
├─ Backend stores: Map["919876543210"] = {otp, expiry, attempts: 0}
├─ Backend calls: WATI API with {phone, otp, template}
├─ WATI returns: {messageId, status: "success"}
└─ Client gets: {status: "success", expiresIn: "5 minutes"}

User Receives WhatsApp:
├─ Message: "Your login OTP is 123456..."
└─ User copies code: "123456"

Verify OTP Request:
├─ Client sends: POST /api/auth/verify-otp {phone, code}
├─ Backend checks:
│  ├─ OTP exists in Map? YES
│  ├─ Not expired? YES (5 min not passed)
│  ├─ Attempts < 3? YES (0 attempts)
│  └─ Code matches? YES (123456 == 123456)
├─ Backend deletes: Map["919876543210"]
├─ Backend creates: User + JWT token
└─ Client gets: {status: "success", token: "eyJhbG..."}

User Authenticated:
├─ Save JWT in localStorage
└─ Use JWT for all API requests
```

---

## OTP Storage Lifecycle

```
Timeline (5 minutes = 300 seconds)

Time: 0:00 (Now)
│
├─ sendOTP() called
├─ OTP generated: "123456"
├─ Stored in Map:
│  {
│    phone: "919876543210",
│    otp: "123456",
│    expiresAt: 1640000000 (current time + 5 min),
│    attempts: 0
│  }
├─ Sent to WATI
└─ User receives WhatsApp message
   │
   │ (User reads message, enters code)
   │

Time: 1:30 (1 minute 30 seconds later)
│
├─ verifyOTP("123456") called
├─ Check: expiresAt > now? YES ✓
├─ Check: attempts < 3? YES (0 attempts) ✓
├─ Check: otp matches? YES ✓
├─ Delete from Map
└─ Return success → User logged in
   │
   │ (OTP cleared, cannot reuse)
   │

Time: 5:01 (5 minutes 1 second later)
│
├─ If verifyOTP() called NOW:
├─ Check: expiresAt > now? NO ✗
├─ Delete from Map
└─ Return error: "OTP has expired"
```

---

## Error Handling Flow

```
sendOTP("919876543210")
│
├─ Validation
│  ├─ Phone empty? → Return: "Please provide phone number"
│  ├─ Phone invalid? → Return: "Invalid phone number format"
│  └─ OK ✓
│
├─ Generate OTP
│  └─ otp = "123456" ✓
│
├─ Store in Map
│  └─ Map["919876543210"] = {...} ✓
│
└─ Call WATI API
   │
   ├─ WATI_API_KEY missing?
   │  └─ Error: "WATI_API_KEY not configured"
   │
   ├─ WATI_BASE_URL missing?
   │  └─ Error: "WATI_BASE_URL not configured"
   │
   ├─ API returns 401 (Unauthorized)?
   │  └─ Delete OTP from Map
   │  └─ Error: "WATI API authentication failed"
   │
   ├─ API returns 404 (Template not found)?
   │  └─ Delete OTP from Map
   │  └─ Error: "WATI template not found"
   │
   ├─ Network timeout?
   │  └─ Delete OTP from Map
   │  └─ Error: "Failed to send OTP"
   │
   └─ API returns 200 (OK)?
      └─ Success! Message queued for sending
         └─ Return: {status: "success", sid, expiresIn}


verifyOTP("919876543210", "123456")
│
├─ Check if OTP exists
│  ├─ Not found? → "No OTP found for phone"
│  └─ Found ✓
│
├─ Check expiry
│  ├─ Expired? → Delete + "OTP has expired"
│  └─ Valid ✓
│
├─ Check attempts
│  ├─ >= 3? → Delete + "Too many failed attempts"
│  └─ < 3 ✓
│
├─ Compare OTP code
│  ├─ Doesn't match?
│  │  ├─ Increment attempts
│  │  └─ "Invalid OTP. 2 attempts remaining"
│  └─ Matches ✓
│
└─ Success!
   ├─ Delete OTP from Map
   ├─ Create/Login user
   ├─ Generate JWT
   └─ Return: {status: "success", verified: true}
```

---

## Deployment Architecture (Production)

```
┌────────────────────────────────────────────────────────────┐
│                   Load Balancer                             │
│                 (nginx / AWS ELB)                           │
└────────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ↓                ↓                ↓
   ┌─────────┐      ┌─────────┐      ┌─────────┐
   │ Server 1│      │ Server 2│      │ Server N│
   │(Node.js)│      │(Node.js)│      │(Node.js)│
   └─────────┘      └─────────┘      └─────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
                         ↓
              ┌─────────────────────┐
              │   Redis Cluster     │
              │  (OTP Storage)      │
              │  (Session Storage)  │
              └─────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ↓                ↓                ↓
   ┌─────────┐      ┌─────────┐      ┌──────────┐
   │ MongoDB │      │ WATI API│      │Monitoring│
   │ (Users) │      │(WhatsApp│      │  (Logs)  │
   │         │      │Messages)│      │          │
   └─────────┘      └─────────┘      └──────────┘

Benefits:
✓ Multiple servers (load balanced)
✓ Shared OTP storage (Redis)
✓ Persistent data (MongoDB)
✓ Real-time messages (WATI)
✓ Monitoring & logs
```

---

## Scaling OTP Storage (Future Upgrade)

```
Current (In-Memory Map):
┌─────────────┐
│   Map()     │
│  {phone     │
│   → otp}    │
└─────────────┘
Problems: Lost on restart, single server

Recommended (Redis):
┌─────────────────────────────────┐
│   Redis                         │
│   SET "otp:919876543210" "123456"
│   EXPIRE "otp:919876543210" 300
│                                 │
│   Benefits:                     │
│   ✓ Persistent                  │
│   ✓ Multi-server support        │
│   ✓ Automatic expiry            │
│   ✓ High performance            │
└─────────────────────────────────┘

Migration Code:
const redis = require('redis');
const client = redis.createClient();

// Instead of: otpStore.set(phone, otp)
await client.setEx(`otp:${phone}`, 300, otp);

// Instead of: otpStore.get(phone)
const otp = await client.get(`otp:${phone}`);
```

---

## File Organization

```
Your Project:
│
├─ src/
│  ├─ features/
│  │  ├─ auth/
│  │  │  ├─ auth.controller.js (MODIFIED)
│  │  │  ├─ auth.service.js
│  │  │  ├─ auth.model.js
│  │  │  └─ auth.middleware.js
│  │  │
│  │  └─ [other features...]
│  │
│  └─ shared/
│     ├─ services/
│     │  ├─ wati-otp.service.js (NEW) ←─── WhatsApp OTP
│     │  ├─ mock-otp.service.js (OLD - kept for reference)
│     │  └─ [other services...]
│     │
│     └─ [other shared...]
│
├─ .env (UPDATED with WATI credentials)
│
├─ Documentation/
│  ├─ WATI_INTEGRATION_COMPLETE.md
│  ├─ WATI_WHATSAPP_OTP_SETUP.md
│  ├─ WATI_QUICK_REFERENCE.md
│  ├─ WATI_DEBUGGING_GUIDE.md
│  └─ WATI_ARCHITECTURE_DIAGRAM.md (this file)
│
└─ WhatsApp_OTP_WATI.postman_collection.json (Postman tests)
```

---

**This architecture is production-ready and scalable!**
