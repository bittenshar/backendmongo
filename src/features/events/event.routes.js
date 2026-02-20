const express = require('express');
const multer = require('multer');
const eventController = require('./event.controller');
const authMiddleware = require('../auth/auth.middleware');
const router = express.Router();
const {
  getSeatAvailability,
} = require('../booking/seatAvailability.controller');

const {
  bookSeat,
} = require('../booking/bookSeat.controller');

const {
  confirmSeatAfterPayment,
} = require('../booking/confirmSeat.controller');

const {
  cancelSeatBooking,
} = require('../booking/cancelSeat.controller');


// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Public route - no authentication required
router.get('/', eventController.getAllEvents);

// File upload routes (multer BEFORE auth middleware)
router.post(
  '/',
  upload.single('coverImage'),
  authMiddleware.protect,
  authMiddleware.restrictTo('admin', 'organizer'),
  eventController.createEvent
);

// Test endpoint - create events folder in S3
router.get('/test/create-folder', eventController.testCreateEventsFolder);

// ID-based routes
router.get('/:id', eventController.getEvent);

router.patch(
  '/:id',
  upload.single('coverImage'),
  authMiddleware.protect,
  authMiddleware.restrictTo('admin', 'organizer'),
  eventController.updateEvent
);

router.delete(
  '/:id',
  authMiddleware.protect,
  authMiddleware.restrictTo('admin'),
  eventController.deleteEvent
);

module.exports = router;