const express = require('express');
const router = express.Router();

// Import controllers
const listyourshowController = require('./listyourshow.controller');
const authMiddleware = require('../auth/auth.middleware');

/**
 * ==========================================
 * LIST YOUR SHOW - PARTNER INQUIRY ROUTES
 * ==========================================
 * Routes for managing partner inquiries
 */

// ==========================================
// PUBLIC ROUTES (No authentication required)
// ==========================================

// Create new partner inquiry (PUBLIC - for unknown users)
// POST /api/listyourshow/inquiry
// Body: { fullName, email, phone, organizationName, city, state, partnershipType, eventType, experienceLevel, message }
router.post('/inquiry', listyourshowController.createInquiry);

// ==========================================
// PROTECTED ROUTES (Authentication required)
// ==========================================
router.use(authMiddleware.protect);

/**
 * USER ROUTES
 */

// Get current user's inquiries
// GET /api/listyourshow/my-inquiries?page=1&limit=10
router.get('/my-inquiries', listyourshowController.getMyInquiries);

// Get single inquiry details
// GET /api/listyourshow/inquiry/:inquiryId
router.get('/inquiry/:inquiryId', listyourshowController.getInquiryDetails);


/**
 * ADMIN ROUTES
 * All routes below require admin authentication
 */

router.use(authMiddleware.restrictTo('admin'));

// Get all inquiries with filters
// GET /api/listyourshow/inquiries?status=submitted&partnershipType=organizer&city=Mumbai&page=1&limit=10&sort=newest|oldest|name
router.get('/inquiries', listyourshowController.getAllInquiries);

// Get inquiry statistics
// GET /api/listyourshow/stats
router.get('/stats', listyourshowController.getInquiryStats);

// Update inquiry status
// PATCH /api/listyourshow/inquiry/:inquiryId/status
// Body: { status: 'submitted|under-review|approved|rejected|contacted', adminNotes: 'optional notes' }
router.patch('/inquiry/:inquiryId/status', listyourshowController.updateInquiryStatus);

module.exports = router;
