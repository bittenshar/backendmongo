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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Public route - no authentication required
router.get('/', eventController.getAllEvents);

// Event CRUD routes with optional image upload
router.post(
  '/',
  upload.single('coverImage'),
  authMiddleware.protect,
  authMiddleware.restrictTo('admin', 'organizer'),
  eventController.createEvent
);

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