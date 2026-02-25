const express = require("express");
const {
  registerToken,
  sendNotification,
  sendBatch,
  deleteToken,
  softLogout,
  getUserNotifications,
  getUserNotificationStats,
  deleteNotification,
  markNotificationAsRead,
  markNotificationAsUnread,
  hardDeleteToken
} = require("./notification.controller");

const { protect } = require("../auth/auth.middleware");

const router = express.Router();

// ============================================
// ADMIN ROUTES (Send Notifications)
// ============================================

// Register FCM token
router.post("/register-token", protect, registerToken);

// Send notification to single user or token
router.post("/send", sendNotification);

// Send batch notification to all users
router.post("/send-batch", sendBatch);

// ============================================
// USER ROUTES (Get & Manage Notifications)
// ============================================

// Get user notifications (unread by default, supports filtering)
router.get("/user", getUserNotifications);
// Get user notification stats (numbers only)
router.get("/user/stats", getUserNotificationStats);

// Delete (soft delete) notification
router.delete("/:id", deleteNotification);

// Mark single notification as read/unread
router.patch("/mark-read/:id/", markNotificationAsRead);
router.patch("/mark-unread/:id/", markNotificationAsUnread);

// ============================================
// TOKEN MANAGEMENT ROUTES
// ============================================

// Soft logout - mark token as guest
router.delete("/token-soft", protect, softLogout);

// Hard delete token
router.delete("/token-hard", protect, hardDeleteToken);

module.exports = router;
