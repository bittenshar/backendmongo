const express = require('express');
const registrationController = require('./userEventRegistration.controller');
// Temporarily comment out auth middleware for testing
// const authMiddleware = require('../auth/auth.middleware');
// const adminMiddleware = require('../../shared/middlewares/admin.middleware');

const router = express.Router();

// Temporarily disable auth middleware for testing
// router.use(authMiddleware.protect);

router.route('/')
  .get(registrationController.getAllRegistrations)
  .post(registrationController.createRegistration);

// IMPORTANT: Define specific routes BEFORE parameterized routes
// Get registration statistics (temporarily remove admin requirement for testing)
router.get('/stats', registrationController.getRegistrationStats);

// Get registrations by status
router.get('/status/:status', registrationController.getRegistrationsByStatus);

// Get registrations by event
router.get('/event/:eventId', registrationController.getEventRegistrations);

// Get registrations by user
router.get('/users/:userId', registrationController.getUserRegistrations);

// Face verification and ticket issuance routes
router.post('/:registrationId/verify-face', registrationController.verifyFaceAndIssueTicket);
router.post('/:registrationId/validate-face-image', registrationController.validateFaceImage);
router.get('/:registrationId/status', registrationController.getRegistrationStatus);
router.post('/:registrationId/retry-verification', registrationController.retryFaceVerification);

// Admin review routes
router.get('/admin/failed-verifications', registrationController.getFailedVerifications);
router.post('/:registrationId/admin/override-ticket', registrationController.adminOverrideIssueTicket);
router.post('/:registrationId/admin/review-failure', registrationController.reviewVerificationFailure);

// ============================================================================
// DynamoDB Face Validation Routes (NEW - ONE RECORD PER USER DESIGN)
// ============================================================================

// Check if User Face Exists (before /:userId routes to avoid conflict)
router.get('/check-face-exists/:userId', registrationController.checkUserFaceExists);

// Get User Face ID Only (Simple endpoint for faceId extraction)
router.get('/face-id/:userId', registrationController.getUserFaceId);

// Get All Face Records (Admin - before /:userId routes)
router.get('/all-faces', registrationController.getAllFaceRecords);

// Validate User Before Face Creation (Check for duplicates)
router.get('/:userId/face/validate-before-creation', registrationController.validateUserBeforeFaceCreation);

// Get User's Face Record
router.get('/:userId/face', registrationController.getUserFaceRecord);

// Update User's Face Record
router.put('/:userId/face', registrationController.updateUserFaceRecord);

// Delete User's Face Record (Admin/Reset)
router.delete('/:userId/face', registrationController.deleteUserFaceRecord);

// Check if User Face Exists (alternate path)
router.get('/:userId/face/exists', registrationController.checkUserFaceExists);

// ============================================================================
// DEPRECATED Routes (maintained for backward compatibility)
// ============================================================================

// [DEPRECATED] Get user face validation history - use /:userId/face instead
router.get('/:userId/face-validation/history', registrationController.getUserFaceValidationHistory);

// [DEPRECATED] Get specific face validation record - use /:userId/face instead
router.get('/:userId/face-validation/:registrationId', registrationController.getFaceValidationRecord);

// [DEPRECATED] Get validation stats - use /:userId/face/exists instead
router.get('/:userId/face-validation/stats', registrationController.getUserFaceValidationStats);

// [DEPRECATED] Check recent validation - use /:userId/face instead
router.get('/:userId/face-validation/check-recent', registrationController.checkRecentValidation);

// [DEPRECATED] Get event face validations - query MongoDB registrations instead
router.get('/event/:eventId/face-validations', registrationController.getEventFaceValidations);

// Parameterized routes come AFTER specific routes
// Provide a top-level admin route for retrieving all faces to avoid
// conflict with parameterized '/:id' route (prevents 'all-faces' being
// interpreted as an ObjectId).
router.get('/all-faces', registrationController.getAllFaceRecords);

router.route('/:id')
  .get(registrationController.getRegistration)
  .put(registrationController.updateRegistration) // Changed from patch to put
  .delete(registrationController.deleteRegistration);

router.put('/:id/checkin', registrationController.checkInUser); // Changed from patch to put

// Face verification endpoints
router.put('/:id/face-verification/start', registrationController.startFaceVerification); // Updated path and method
router.put('/:id/face-verification/complete', registrationController.completeFaceVerification); // Updated path and method

// Ticket issuance
router.put('/:id/issue-ticket', registrationController.issueTicket); // Changed from patch to put

// Admin override (temporarily remove admin requirement for testing)
router.put('/:id/admin-override', registrationController.adminOverride); // Changed from patch to put, removed admin middleware
module.exports = router;