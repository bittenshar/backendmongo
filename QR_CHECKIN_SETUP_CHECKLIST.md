# QR Check-In Implementation Checklist

## ✅ Phase 1: Code Integration (COMPLETED)

- [x] Added QR fields to Booking model
- [x] Added isActive field to Event model
- [x] Created CheckInLog model
- [x] Created Staff model
- [x] Created checkIn.controller.js
- [x] Created staff.controller.js
- [x] Created checkIn.routes.js
- [x] Created staff.routes.js
- [x] Created implementation guide
- [x] Created Postman collection

## 📋 Phase 2: Server Integration (ACTION REQUIRED)

### Step 1: Register Routes in Main Server File
- [ ] Open `src/server.js` (or main entry file)
- [ ] Add these imports:
```javascript
const checkInRoutes = require('./features/booking/checkIn.routes');
const staffRoutes = require('./features/admin/staff.routes');
```
- [ ] Mount routes before error handling:
```javascript
app.use('/api/checkin', checkInRoutes);
app.use('/api/staff', staffRoutes);
```

### Step 2: Install Dependencies
- [ ] Run: `npm install jsonwebtoken bcryptjs`
- [ ] Verify with: `npm list jsonwebtoken bcryptjs`

### Step 3: Set Up Environment Variables
- [ ] Open `.env` file
- [ ] Add (if not already present):
```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
APP_URL=http://localhost:3000
```
- [ ] For production: Use strong random string for JWT_SECRET

### Step 4: Create Authentication Middleware
- [ ] Create `src/middleware/staffAuth.js`
- [ ] Implement staff JWT verification
- [ ] Update `checkIn.routes.js` line with actual middleware
- [ ] Update `staff.routes.js` line with actual middleware

Example implementation:
```javascript
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token' });
    }
    
    const token = auth.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
```

### Step 5: Create Admin Authentication Middleware (if needed)
- [ ] Similar to staff middleware
- [ ] For admin endpoints in routes

## 🗄️ Phase 3: Database Setup (ACTION REQUIRED)

### Step 1: Create Indexes
- [ ] Run one-time index creation script:

```javascript
// Run this once when deploying
const Booking = require('./features/booking/booking_model');
const CheckInLog = require('./features/booking/checkInLog.model');
const Staff = require('./features/admin/staff.model');

async function createIndexes() {
  try {
    // Booking indexes
    await Booking.collection.createIndex({ eventId: 1, checkedIn: 1 });
    await Booking.collection.createIndex({ paymentStatus: 1, eventId: 1 });
    await Booking.collection.createIndex({ qrToken: 1 });
    
    // CheckInLog indexes
    await CheckInLog.collection.createIndex({ eventId: 1, checkInTime: -1 });
    await CheckInLog.collection.createIndex({ isFlagged: 1, eventId: 1 });
    
    // Staff indexes
    await Staff.collection.createIndex({ eventId: 1, isActive: 1 });
    
    console.log('✅ All indexes created');
  } catch (err) {
    console.error('Index creation error:', err);
  }
}

createIndexes();
```

### Step 2: Verify Database Fields
- [ ] Check existing bookings have `paymentStatus` field
- [ ] Check existing events have at least `startTime` and `endTime`
- [ ] Run a test query:
```javascript
db.bookings.findOne(); // Should show qrToken field
db.events.findOne();   // Should show isActive field
```

## 🧪 Phase 4: Testing (ACTION REQUIRED)

### Unit Tests
- [ ] Test models can be instantiated
- [ ] Test password hashing in Staff model
- [ ] Test JWT token generation

### API Testing with Postman
1. **Import Collection**
   - [ ] Open Postman
   - [ ] File → Import → Select `QR_Ticket_CheckIn_API.postman_collection.json`
   - [ ] Set `baseUrl` to `http://localhost:3000`

2. **Test Staff Login**
   - [ ] Create test staff member manually in database OR via API
   - [ ] Call `Staff Login` endpoint
   - [ ] Copy returned token to `staffToken` variable
   - [ ] Verify 8-hour expiry

3. **Test QR Generation**
   - [ ] Create test booking in database
   - [ ] Call `Generate QR Token` endpoint
   - [ ] Copy returned `qrToken` to variable
   - [ ] Verify QR URL format

4. **Test Check-In Flow**
   - [ ] Call `Scanner - Scan QR Code` endpoint
   - [ ] Verify: `success: true, message: "Entry allowed"`
   - [ ] Check database: booking should have `checkedIn: true`

5. **Test Duplicate Prevention**
   - [ ] Scan same QR code again
   - [ ] Verify: `success: false, error: "ALREADY_CHECKED_IN"`

6. **Test Event Status Validation**
   - [ ] Set event `isActive: false` in database
   - [ ] Try to scan → Should fail with "EVENT_INACTIVE"
   - [ ] Set event `isActive: true` again

7. **Test Failed Login Attempts**
   - [ ] Try staff login 5 times with wrong password
   - [ ] 6th attempt should fail with "ACCOUNT_LOCKED"
   - [ ] Call unlock endpoint
   - [ ] Verify can login again

8. **Test Event Statistics**
   - [ ] Do several successful check-ins
   - [ ] Call `Get Event Check-In Stats`
   - [ ] Verify counts match

### Manual Testing Scenarios
- [ ] Test QR code scan at different gate locations
- [ ] Test with different staff roles
- [ ] Test with cancelled event
- [ ] Test outside event time window
- [ ] Test with incomplete payment
- [ ] Test with missing required fields

## 📊 Phase 5: Monitoring & Analytics (ACTION REQUIRED)

### Set Up Monitoring
- [ ] Log all check-in attempts (success & failure)
- [ ] Monitor staff login failures
- [ ] Track flagged check-ins
- [ ] Create alerts for:
  - [ ] Unusual spike in check-ins
  - [ ] High failure rate
  - [ ] Multiple failed logins from same IP

### Create Dashboard Endpoints (Optional)
- [ ] Real-time check-in count
- [ ] Staff performance metrics
- [ ] Event statistics
- [ ] Fraud alerts

Example:
```javascript
// Get live stats
GET /api/checkin/event/:eventId/stats

// Get flagged check-ins
await CheckInLog.getFlaggedCheckIns(eventId)

// Get staff stats
Staff.findById(staffId).select('totalCheckIns checkInsToday lastLoginTime')
```

## 🔒 Phase 6: Security Hardening (ACTION REQUIRED)

### Rate Limiting
- [ ] Add rate limiter to `/api/staff/login`
- [ ] Add rate limiter to `/api/checkin/scanner`
- [ ] Limit to 60 scans/minute per staff

Example:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60
});

router.post('/scanner', limiter, staffAuth, checkIn);
```

### CORS & Security Headers
- [ ] Configure CORS for staff app domain
- [ ] Set security headers for API
- [ ] Enable HTTPS in production

### Input Validation
- [ ] Validate all request inputs
- [ ] Sanitize strings
- [ ] Type check numbers
- [ ] Size check arrays

### Logging
- [ ] Log all check-in attempts
- [ ] Log staff login/logout
- [ ] Log failed validations
- [ ] Store logs securely

## 📱 Phase 7: Mobile App Integration (Optional)

### User App
- [ ] Display QR code from `qrToken` response
- [ ] Show ticket details with QR
- [ ] Add "Share Ticket" functionality (with warnings)

### Staff Scanner App
- [ ] QR scan library integration
- [ ] Staff login screen
- [ ] Scanner interface
- [ ] Result feedback (success/failure)
- [ ] Offline mode (cache QR tokens)
- [ ] Statistics dashboard

## 🚀 Phase 8: Deployment (ACTION REQUIRED)

### Pre-Deployment
- [ ] Environment variables set correctly
- [ ] Database indexes created
- [ ] Authentication middleware implemented
- [ ] All endpoints tested
- [ ] Rate limiting configured
- [ ] Logging configured
- [ ] Error handling verified

### Staging Deployment
- [ ] Deploy to staging environment
- [ ] Run full test suite
- [ ] Test with real scanner hardware
- [ ] Performance testing
- [ ] Load testing (simulate peak check-ins)
- [ ] Security audit

### Production Deployment
- [ ] Database backups in place
- [ ] Monitoring alerts configured
- [ ] Rollback plan ready
- [ ] Deploy with zero-downtime strategy
- [ ] Monitor for 24+ hours
- [ ] Have support team ready

### Post-Deployment
- [ ] Verify all endpoints working
- [ ] Check database for new fields
- [ ] Monitor error rates
- [ ] Verify check-ins being logged
- [ ] Test fraud detection
- [ ] Verify email notifications working

## 📈 Phase 9: Optimization (Post-Launch)

- [ ] Monitor database query performance
- [ ] Check if additional indexes needed
- [ ] Review slow queries
- [ ] Optimize check-in lookup queries
- [ ] Cache frequently accessed data
- [ ] Monitor server load
- [ ] Analyze staffi performance patterns
- [ ] Identify bottlenecks

## 🔮 Phase 10: Future Enhancements

- [ ] Integrate face recognition
- [ ] Build admin dashboard
- [ ] Add waitlist management
- [ ] Implement capacity alerts
- [ ] Add dynamic gate routing
- [ ] Mobile app notifications
- [ ] Offline mode for scanner
- [ ] Real-time analytics dashboard
- [ ] Fraud detection ML model
- [ ] Biometric staff authentication

## 📝 Files Created/Modified Summary

### New Files (9)
1. `checkInLog.model.js` - ✅ Done
2. `staff.model.js` - ✅ Done
3. `checkIn.controller.js` - ✅ Done
4. `staff.controller.js` - ✅ Done
5. `checkIn.routes.js` - ✅ Done
6. `staff.routes.js` - ✅ Done
7. `QR_CHECKIN_IMPLEMENTATION_GUIDE.md` - ✅ Done
8. `QR_CHECKIN_QUICK_REFERENCE.md` - ✅ Done
9. `QR_Ticket_CheckIn_API.postman_collection.json` - ✅ Done

### Modified Files (2)
1. `booking_model.js` - ✅ Added QR fields
2. `event.model.js` - ✅ Added isActive field

---

## 🎯 Quick Start (TL;DR)

```bash
# 1. Install dependencies
npm install jsonwebtoken bcryptjs

# 2. Add to server.js
const checkInRoutes = require('./features/booking/checkIn.routes');
const staffRoutes = require('./features/admin/staff.routes');
app.use('/api/checkin', checkInRoutes);
app.use('/api/staff', staffRoutes);

# 3. Set env variables
JWT_SECRET=your-secret-key
APP_URL=http://localhost:3000

# 4. Create auth middleware
# See src/middleware/staffAuth.js example

# 5. Test with Postman
# Import QR_Ticket_CheckIn_API.postman_collection.json

# 6. Deploy!
```

---

## 📞 Troubleshooting

**Routes not found?**
- Verify imports in server.js
- Check route paths are correct
- Restart server

**Auth middleware not working?**
- JWT token format correct?
- Secret key matches?
- Token not expired?

**Database errors?**
- Models imported correctly?
- MongoDB connection working?
- Indexes created?

**Check-ins failing?**
- Payment status correct?
- Event time valid?
- Staff authenticated?

See `QR_CHECKIN_IMPLEMENTATION_GUIDE.md` for detailed troubleshooting.

---

## ✨ You're All Set!

The QR check-in system is ready for integration. Follow the checklist above to complete the setup. Good luck! 🎉
