const express = require('express');
const waitlistController = require('./waitlist.controller');
const authMiddleware = require('../auth/auth.middleware');

const router = express.Router();

// Public routes
router.get('/event/:eventId', waitlistController.getEventWaitlist);
router.get('/user/:userId/event/:eventId', waitlistController.getUserWaitlistPosition);

// Protected routes (requires authentication)
router.post('/offer/:waitlistId/accept', authMiddleware.protect, waitlistController.acceptOffer);
router.post('/offer/:waitlistId/reject', authMiddleware.protect, waitlistController.rejectOffer);

// Admin routes (requires admin role)
router.delete('/:waitlistId', authMiddleware.protect, authMiddleware.restrictTo('admin'), waitlistController.removeFromWaitlist);
router.post('/process/:eventId', authMiddleware.protect, authMiddleware.restrictTo('admin'), waitlistController.processWaitlist);
router.post('/cleanup', authMiddleware.protect, authMiddleware.restrictTo('admin'), waitlistController.cleanupExpiredOffers);

module.exports = router;