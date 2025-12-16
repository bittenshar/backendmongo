# Registration → Ticket → Waitlist Flow Guide

## Overview
Complete flow for user registration, face verification, ticket issuance, and waitlist management.

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER REGISTRATION FLOW                        │
└─────────────────────────────────────────────────────────────────┘

STEP 1: Initialize Registration
        ↓
    Does user exist? ─→ NO → Error
        ↓ YES
    Does event exist? ─→ NO → Error
        ↓ YES
    Photo uploaded? ─→ NO → Return: "Upload Photo First"
        ↓ YES

STEP 2: Face Verification (Optional face image)
        ↓
    No face image? ─→ Return: "Proceed with Face Verification"
        ↓ YES
    Face verification process starts
        ↓
    ┌───────────────────────────────────┐
    │ FACE VERIFICATION RESULT          │
    ├───────────────────────────────────┤
    │ SUCCESS          │    FAILED      │
    │    ↓             │      ↓         │
    │ Check Tickets    │  Add to       │
    │                  │  Waitlist     │
    │    ↓             │      ↓         │
    │ Available?       │  Return       │
    │ YES    │  NO     │  "Waitlisted" │
    │ ↓      │  ↓      │               │
    │ Issue  │ Add to  │               │
    │ Ticket │ Waitlist│               │
    │ ↓      │  ↓      │               │
    │ Succ   │ Succ    │               │
    └───────────────────────────────────┘

STEP 3: Waitlist Management
        ↓
    Ticket cancellation? → Promote from Waitlist
        ↓
    New ticket issued automatically
```

---

## Core Functions

### 1. **initializeRegistrationFlow**
Start a new registration journey.

**Parameters:**
- `userId` - User ID
- `eventId` - Event ID  
- `faceImageKey` - S3 key of face image (optional)

**Returns:**
```javascript
{
  success: true,
  currentStep: "STEP_1_UPLOAD_PHOTO" | "STEP_2_VERIFY_FACE",
  message: "...",
  registration: { /* registration object */ },
  nextAction: "..."
}
```

**Usage:**
```javascript
// Step 1: Start registration
const result1 = await registrationFlowService.initializeRegistrationFlow(userId, eventId);
// Response: "Please upload your profile photo first"

// Step 2: After photo upload, verify face
const result2 = await registrationFlowService.initializeRegistrationFlow(userId, eventId, faceImageKey);
// Response: Process verification and issue ticket or add to waitlist
```

---

### 2. **processRegistrationWithFaceVerification**
Process face verification and issue ticket or add to waitlist.

**Parameters:**
- `registrationId` - Registration ID
- `faceImageKey` - S3 key of face image
- `similarityThreshold` - Similarity threshold (default: 80)

**Returns:**
```javascript
{
  success: true/false,
  message: "...",
  action: "TICKET_ISSUED" | "ADDED_TO_WAITLIST",
  registration: { /* updated registration */ },
  ticket: { /* ticket details if issued */ },
  waitlist: { /* waitlist details if added */ }
}
```

**Scenarios:**
1. **Face Verification Fails** → Added to Waitlist
2. **Face Verification Succeeds + Tickets Available** → Ticket Issued
3. **Face Verification Succeeds + Tickets Sold Out** → Added to Waitlist

---

### 3. **getCompleteRegistrationFlowStatus**
Get current status in the registration flow.

**Parameters:**
- `registrationId` - Registration ID

**Returns:**
```javascript
{
  registrationId: "...",
  userId: "...",
  eventId: "...",
  eventName: "...",
  currentStep: "PENDING_PHOTO_UPLOAD" | "PENDING_FACE_VERIFICATION" | 
              "FACE_VERIFICATION_FAILED" | "TICKET_ISSUED" | "ON_WAITLIST",
  currentStatus: "pending" | "verified" | "rejected" | "cancelled",
  flowSteps: [
    {
      step: 1,
      name: "Upload Photo",
      status: "pending" | "completed" | "failed" | "blocked",
      completed: true/false
    },
    // ... more steps
  ],
  progress: 0-100,
  nextAction: "...",
  
  // If on waitlist:
  waitlistDetails: {
    position: 5,
    reason: "tickets_sold_out",
    dateAdded: "...",
    totalWaitlistCount: 12
  },
  
  // If ticket issued:
  ticketDetails: {
    ticketId: "TKT-...",
    seatNumber: "SEAT-...",
    price: 500,
    purchaseDate: "...",
    status: "active"
  },
  
  eventCapacity: {
    totalTickets: 100,
    ticketsSold: 95,
    ticketsAvailable: 5,
    ticketPrice: 500
  }
}
```

**Example Response Scenarios:**

**Scenario 1: Photo Upload Pending**
```javascript
{
  currentStep: "PENDING_PHOTO_UPLOAD",
  progress: 0,
  flowSteps: [
    { step: 1, name: "Upload Photo", status: "pending", completed: false },
    { step: 2, name: "Face Verification", status: "blocked", completed: false },
    { step: 3, name: "Issue Ticket/Waitlist", status: "blocked", completed: false }
  ],
  nextAction: "Upload profile photo"
}
```

**Scenario 2: On Waitlist**
```javascript
{
  currentStep: "ON_WAITLIST",
  progress: 75,
  flowSteps: [
    { step: 1, name: "Upload Photo", status: "completed", completed: true },
    { step: 2, name: "Face Verification", status: "completed", completed: true },
    { step: 3, name: "Waitlisted", status: "in-progress", completed: false }
  ],
  waitlistDetails: {
    position: 5,
    reason: "tickets_sold_out",
    totalWaitlistCount: 12
  }
}
```

**Scenario 3: Ticket Issued**
```javascript
{
  currentStep: "TICKET_ISSUED",
  progress: 100,
  flowSteps: [
    { step: 1, name: "Upload Photo", status: "completed", completed: true },
    { step: 2, name: "Face Verification", status: "completed", completed: true },
    { step: 3, name: "Issue Ticket", status: "completed", completed: true }
  ],
  ticketDetails: {
    ticketId: "TKT-...",
    seatNumber: "SEAT-...",
    price: 500,
    status: "active"
  }
}
```

---

### 4. **promoteFromWaitlistToTicket**
Automatically promote users from waitlist when tickets become available.

**Parameters:**
- `eventId` - Event ID

**Returns:**
```javascript
{
  success: true,
  message: "2 users promoted from waitlist",
  promotedUsers: [
    {
      userId: "...",
      userName: "John Doe",
      ticketId: "TKT-PROMO-...",
      seatNumber: "SEAT-..."
    },
    // ...
  ]
}
```

**When to Call:**
- When a ticket is cancelled/refunded
- When event capacity is increased
- As a scheduled batch job

---

### 5. **getRegistrationFlowAnalytics**
Get analytics for all registrations at an event.

**Parameters:**
- `eventId` - Event ID

**Returns:**
```javascript
{
  eventId: "...",
  eventName: "Tech Summit 2025",
  totalRegistrations: 150,
  flowBreakdown: {
    photoUploadPending: 5,
    faceVerificationPending: 10,
    faceVerificationFailed: 3,
    ticketsIssued: 100,
    onWaitlist: 32
  },
  flowStagePercentage: {
    photoUploadPending: "3.33",
    faceVerificationPending: "6.67",
    faceVerificationFailed: "2.00",
    ticketsIssued: "66.67",
    onWaitlist: "21.33"
  },
  ticketCapacity: {
    total: 100,
    sold: 100,
    available: 0
  }
}
```

---

### 6. **cancelRegistration**
Cancel a registration and automatically promote waitlisted users.

**Parameters:**
- `registrationId` - Registration ID
- `cancellationReason` - Reason for cancellation

**Returns:**
```javascript
{
  success: true,
  message: "Registration cancelled successfully",
  registration: { /* cancelled registration */ },
  promotionResult: {
    success: true,
    message: "2 users promoted from waitlist",
    promotedUsers: [ /* promoted users */ ]
  }
}
```

**Flow:**
1. Find and delete associated ticket
2. Update event ticket count
3. Remove user from waitlist
4. Mark registration as cancelled
5. Promote next waitlisted users automatically

---

### 7. **retryFaceVerification**
Allow user to retry face verification (max 3 attempts).

**Parameters:**
- `registrationId` - Registration ID
- `faceImageKey` - S3 key of new face image

**Returns:**
Same as `processRegistrationWithFaceVerification`

**Limits:**
- Max 3 verification attempts
- After 3 failures: User must contact support

---

### 8. **adminOverrideIssueTicket**
Admin can bypass verification and issue ticket directly.

**Parameters:**
- `registrationId` - Registration ID
- `overrideReason` - Reason for override

**Returns:**
```javascript
{
  success: true,
  message: "Ticket issued by admin override",
  registration: { /* updated registration */ },
  ticket: { /* ticket details */ }
}
```

**Conditions:**
- Only for admins
- Tickets must be available
- Removes user from waitlist if on it

---

## Event Registration Status Codes

### Registration Status
| Status | Meaning |
|--------|---------|
| `pending` | Registration created, awaiting verification |
| `verified` | Face verified, ticket issued |
| `rejected` | Face verification failed, on waitlist |
| `cancelled` | User cancelled registration |

### Face Verification Status
| Status | Meaning |
|--------|---------|
| `pending` | Awaiting face image upload |
| `processing` | Currently verifying face |
| `success` | Face verified successfully |
| `failed` | Face verification failed |

### Ticket Availability Status
| Status | Meaning |
|--------|---------|
| `available` | Ticket issued |
| `unavailable` | No tickets, added to waitlist |

---

## API Integration Examples

### Example 1: Complete User Journey

```javascript
// Route 1: Start registration (after login)
router.post('/register/:eventId', async (req, res) => {
  const { userId, eventId } = req.params;
  const result = await registrationFlowService.initializeRegistrationFlow(userId, eventId);
  
  if (result.currentStep === 'STEP_1_UPLOAD_PHOTO') {
    // Redirect user to upload photo
    return res.json({ 
      step: 'UPLOAD_PHOTO',
      message: result.message,
      registrationId: result.registration._id
    });
  }
  
  res.json(result);
});

// Route 2: After photo upload, verify face
router.post('/verify-face/:registrationId', async (req, res) => {
  const { faceImageKey } = req.body;
  const result = await registrationFlowService.processRegistrationWithFaceVerification(
    req.params.registrationId,
    faceImageKey
  );
  
  res.json(result);
});

// Route 3: Check status anytime
router.get('/status/:registrationId', async (req, res) => {
  const status = await registrationFlowService.getCompleteRegistrationFlowStatus(
    req.params.registrationId
  );
  
  res.json(status);
});
```

### Example 2: Handle Cancellation

```javascript
router.delete('/cancel/:registrationId', async (req, res) => {
  const { reason } = req.body;
  const result = await registrationFlowService.cancelRegistration(
    req.params.registrationId,
    reason
  );
  
  // Automatically promotes waitlisted users
  res.json(result);
});
```

### Example 3: Event Analytics

```javascript
router.get('/analytics/:eventId', async (req, res) => {
  const analytics = await registrationFlowService.getRegistrationFlowAnalytics(
    req.params.eventId
  );
  
  res.json(analytics);
});
```

---

## Flow State Transitions

```
START
  ↓
  └─→ photoUploadPending? → User uploads photo
         ↓
         └─→ faceVerificationPending → User verifies face
            ├─→ verification SUCCESS
            │     ├─→ ticketsAvailable?
            │     │    ├─→ YES: TICKET_ISSUED (status: verified)
            │     │    └─→ NO: ON_WAITLIST (status: pending)
            │     └─→ [Stored for ticket issuance]
            │
            └─→ verification FAILED
                  └─→ ON_WAITLIST (status: rejected)
                  └─→ Can retry (max 3 attempts)
                        ├─→ Retry SUCCESS: Same as above
                        └─→ Retry FAILED: Stay on waitlist

TICKET_ISSUED → User attends event → Ticket marked used
               OR User cancels → Ticket deleted, capacity freed
                  → Waitlist promotion triggered

ON_WAITLIST → Ticket becomes available (someone cancels)
            → Automatic promotion to TICKET_ISSUED
            → Notification sent to user

Any Status → CANCELLED (by user) → User data retained for history
```

---

## Database Schema Integration

### UserEventRegistration Schema
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  eventId: ObjectId (ref: Event),
  registrationDate: Date,
  status: String, // pending, verified, rejected, cancelled
  faceVerificationStatus: String, // pending, processing, success, failed
  verificationAttempts: Number,
  lastVerificationAttempt: Date,
  ticketIssued: Boolean,
  ticketIssuedDate: Date,
  ticketAvailabilityStatus: String, // available, unavailable
  adminBooked: Boolean,
  adminOverrideReason: String,
  cancellationDate: Date,
  cancellationReason: String
}
```

### Ticket Schema
```javascript
{
  _id: ObjectId,
  event: ObjectId (ref: Event),
  user: ObjectId (ref: User),
  ticketId: String, // TKT-...
  seatNumber: String,
  price: Number,
  status: String, // active, used, cancelled
  purchaseDate: Date,
  promotedFromWaitlist: Boolean,
  promotionDate: Date
}
```

### Waitlist Schema
```javascript
{
  _id: ObjectId,
  eventId: ObjectId (ref: Event),
  userId: ObjectId (ref: User),
  registrationId: ObjectId (ref: UserEventRegistration),
  position: Number,
  reason: String, // tickets_sold_out, face_verification_failed
  status: String, // waiting, promoted, cancelled
  dateAdded: Date
}
```

---

## Summary

The complete flow ensures:
✅ Users verify themselves before getting tickets
✅ Fair queue management via waitlist
✅ Automatic promotion when capacity opens
✅ Admin override capability
✅ Progress tracking at every step
✅ Transparent status and next actions

