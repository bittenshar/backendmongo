const express = require('express');
const router = express.Router();
const multer = require('multer');
const adsController = require('./ads.controller');
const { protect, restrictTo } = require('../../features/auth/auth.middleware');

// Configure multer for image upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Allow multiple possible field names from different clients and normalize to req.file
const SUPPORTED_IMAGE_FIELDS = ['image', 'Image', 'adImage'];
const adImageUpload = [
  upload.fields(SUPPORTED_IMAGE_FIELDS.map((name) => ({ name, maxCount: 1 }))),
  (req, _res, next) => {
    if (!req.file) {
      const files = req.files || {};
      const normalizedFile = SUPPORTED_IMAGE_FIELDS
        .map((field) => (files[field] && files[field][0] ? files[field][0] : null))
        .find(Boolean);

      if (normalizedFile) {
        req.file = normalizedFile; // keep controller logic unchanged
      }
    }

    next();
  }
];



// ============================================
// PUBLIC ROUTES (No Auth Required)
// ============================================

// Get all active ads for Android app
router.get('/active', adsController.getActiveAds);

// Get single ad
router.get('/:id', adsController.getAd);

// Record ad click
router.post('/:id/click', adsController.recordClick);

// ============================================
// PROTECTED ROUTES (Auth Required)
// ============================================

// Create new ad (with image upload)
router.post('/', protect, ...adImageUpload, adsController.createAd);

// Get ads by organizer
router.get('/organizer/:organizerId', protect, adsController.getAdsByOrganizer);

// Update ad
router.patch('/:id', protect, ...adImageUpload, adsController.updateAd);

// Delete ad
router.delete('/:id', protect, adsController.deleteAd);

// Get ad analytics
router.get('/:id/analytics', protect, adsController.getAnalytics);

// ============================================
// ADMIN ROUTES
// ============================================

// Get pending ads for review
router.get('/admin/pending-ads', protect, restrictTo('admin'), adsController.getPendingAds);

// Approve ad
router.patch('/admin/:id/approve', protect, restrictTo('admin'), adsController.approveAd);

// Reject ad
router.patch('/admin/:id/reject', protect, restrictTo('admin'), adsController.rejectAd);

module.exports = router;
