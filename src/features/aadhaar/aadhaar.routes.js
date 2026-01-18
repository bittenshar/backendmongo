const express = require('express');
const router = express.Router();
const multer = require('multer');
const aadhaarController = require('./aadhaar.controller');
const authMiddleware = require('../auth/auth.middleware');
const catchAsync = require('../../shared/utils/catchAsync');

// Multer configuration for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    console.log('📄 File received:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

/**
 * ==========================================
 * AADHAAR IMAGE ROUTES
 * ==========================================
 */

// Apply authentication middleware
router.use(authMiddleware.protect);

/**
 * POST /api/aadhaar/upload-image
 * Upload Aadhaar front image
 * 
 * Body:
 * - file: image file (only front image needed)
 */
router.post(
  '/upload-image',
  authMiddleware.protect,
  upload.any(),
  (req, res, next) => {
    console.log('📤 Aadhaar Upload Request:', {
      files: req.files,
      body: req.body,
      headers: req.headers
    });

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'No file uploaded. Send file as multipart/form-data with field name "file"'
      });
    }

    // Find the file with field name 'file'
    const fileField = req.files.find(f => f.fieldname === 'file');
    if (!fileField) {
      return res.status(400).json({
        status: 'fail',
        message: 'File field not found. Make sure field name is "file". Received fields: ' + req.files.map(f => f.fieldname).join(', ')
      });
    }

    // Attach the file to req.file for compatibility
    req.file = fileField;
    next();
  },
  catchAsync(aadhaarController.uploadAadhaarImage)
);

/**
 * GET /api/aadhaar/images
 * Get all Aadhaar images for authenticated user
 */
router.get(
  '/images',
  catchAsync(aadhaarController.getAadhaarImages)
);

/**
 * DELETE /api/aadhaar/images/:imageId
 * Delete specific Aadhaar image
 */
router.delete(
  '/images/:imageId',
  catchAsync(aadhaarController.deleteAadhaarImage)
);

module.exports = router;
