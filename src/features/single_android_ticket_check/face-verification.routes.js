const express = require('express');
const multer = require('multer');
const faceVerificationController = require('./face-verification.controller');
const checkInTestController = require('./checkin-test.controller');

const router = express.Router();

// Configure multer for image uploads
const upload = multer({
  dest: 'uploads/face-verification/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG images are allowed'), false);
    }
  }
});

/**
 * POST /api/face-verify/verify
 * Verify face and check if user has ticket for event
 * 
 * Request option 1 - Query Parameter:
 *   POST /api/face-verify/verify?eventId=<eventId>
 *   Content-Type: multipart/form-data
 *   Body: image (file)
 * 
 * Request option 2 - Form Data:
 *   POST /api/face-verify/verify
 *   Content-Type: multipart/form-data
 *   Body: image (file) + eventId (form field)
 * 
 * Response (with ticket):
 * {
 *   "success": true,
 *   "userId": "507f1f77bcf86cd799439011",
 *   "fullName": "Rahul Sharma",
 *   "hasTicket": true,
 *   "ticketStatus": "confirmed",
 *   "ticketDetails": {
 *     "quantity": 2,
 *     "seatType": "VIP",
 *     "totalPrice": 5000,
 *     "bookedAt": "2024-03-16T10:00:00.000Z"
 *   },
 *   "similarity": 95.5,
 *   "timestamp": "2024-03-16T10:30:00.000Z"
 * }
 */
router.post('/verify', upload.single('image'), faceVerificationController.verifyFaceAndGetUser);

/**
 * TEST ENDPOINTS for creating CheckInLogs (to test blue color)
 */

/**
 * POST /api/face-verify/test-checkin
 * Create a test CheckInLog entry to simulate a ticket check
 * 
 * Body:
 * {
 *   "bookingId": "69b7068967d20af290a187d6",
 *   "eventId": "669a58ad13d6d7daf05492307"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Test check-in created successfully",
 *   "checkInId": "...",
 *   "details": { ... }
 * }
 */
router.post('/test-checkin', checkInTestController.createTestCheckIn);

/**
 * GET /api/face-verify/checkin-logs/:bookingId
 * Get all check-in logs for a booking
 * 
 * Response:
 * {
 *   "success": true,
 *   "count": 3,
 *   "logs": [ ... ]
 * }
 */
router.get('/checkin-logs/:bookingId', checkInTestController.getCheckInLogs);

module.exports = router;
