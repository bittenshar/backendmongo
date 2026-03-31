const express = require('express');
const organizerController = require('./organizer.controller');
const authMiddleware = require('../auth/auth.middleware');

const router = express.Router();

// Protect only non-auth routes
// Auth routes (/auth/*) use their own protection
router.use((req, res, next) => {
  // Skip protection for auth routes
  if (req.path.startsWith('/auth')) {
    return next();
  }
  authMiddleware.protect(req, res, next);
});

router.route('/')
  .get(organizerController.getAllOrganizers)
  .post(organizerController.createOrganizer);

router.route('/:id')
  .get(organizerController.getOrganizer)
  .patch(authMiddleware.restrictTo('admin'), organizerController.updateOrganizer)
  .delete(authMiddleware.restrictTo('admin'), organizerController.deleteOrganizer);

module.exports = router;