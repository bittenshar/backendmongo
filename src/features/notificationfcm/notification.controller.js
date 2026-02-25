const { admin, initialized: firebaseInitialized } = require("./firebase");
const UserFcmToken = require("./UserFcmToken.model");
const NotificationLog = require("./notificationLog.model");

/**
 * Register FCM Token
 */
exports.registerToken = async (req, res) => {
  const { token, deviceId, deviceType } = req.body;
  const userId = req.user?.id || null;

  // Token is optional - if not provided, generate one
  const fcmToken = token || `unknown_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const result = await UserFcmToken.findOneAndUpdate(
      { token: fcmToken },
      {
        token: fcmToken,
        deviceId: deviceId || 'unknown',
        deviceType: deviceType || 'unknown',
        userId,
        isGuest: !userId,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    res.json({ 
      success: true, 
      message: "FCM token registered",
      data: {
        token: fcmToken,
        deviceId: result.deviceId,
        deviceType: result.deviceType
      }
    });
  } catch (error) {
    console.error('Error registering FCM token:', error);
    res.status(500).json({ 
      success: false,
      message: "Failed to register FCM token" 
    });
  }
};


/**
 * Send Notification to One User or Direct Token
 */
/**
 * Send Notification to One User or Direct Token
 * @param {string} userId - User ID
 * @param {string} phone - User Phone Number
 * @param {string} token - Direct FCM token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 */
exports.sendNotification = async (req, res) => {
  const { userId, phone, token, title, body, data, imageUrl, notificationType = 'other', relatedId } = req.body;

  // Validate required fields
  if (!title || !body) {
    return res.status(400).json({ 
      success: false,
      message: "Title and body are required" 
    });
  }

  let tokens = [];
  let tokenSource = null;
  let resolvedUserId = userId;

  // If phone is provided, find user by phone and get their userId
  if (phone && !userId) {
    try {
      const User = require("../users/user.model");
      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: `No user found with phone: ${phone}`
        });
      }
      resolvedUserId = user._id;
      tokenSource = "phone";
    } catch (err) {
      console.error("Error finding user by phone:", err);
      return res.status(500).json({
        success: false,
        message: "Error finding user by phone"
      });
    }
  }

  // Primary: If userId or phone (resolved to userId) is available, find all tokens for that user
  if (resolvedUserId) {
    try {
      tokens = await UserFcmToken.find({ userId: resolvedUserId });
      if (!tokenSource) tokenSource = "userId";
    } catch (err) {
      console.error("Error finding tokens by userId:", err);
      return res.status(500).json({ 
        success: false,
        message: "Error retrieving user tokens" 
      });
    }
  } 
  // Fallback: If direct token is provided, use it
  else if (token) {
    tokens = [{ token, deviceType: "android" }];
    tokenSource = "directToken";
  } 
  // No valid input
  else {
    return res.status(400).json({ 
      success: false,
      message: "Either userId, phone, or token is required" 
    });
  }

  // Check if tokens found
  if (!tokens || tokens.length === 0) {
    return res.status(404).json({ 
      success: false,
      message: `No FCM tokens found for ${tokenSource === 'phone' ? 'phone: ' + phone : tokenSource === 'userId' ? 'userId: ' + resolvedUserId : 'token'}`,
      tokenSource
    });
  }

  const responses = [];
  let successCount = 0;
  let failureCount = 0;
  const logsToSave = [];

  for (const t of tokens) {
    try {
      const notification = { title, body };
      if (imageUrl) {
        notification.imageUrl = imageUrl;
      }

      const message = {
        token: t.token || t,
        notification,
        data: data || {},
      };

      // Add webpush config for web platform
      if ((t.deviceType === "web" || t === "web") && imageUrl) {
        message.webpush = {
          notification: {
            title,
            body,
            icon: imageUrl,
            image: imageUrl,
          },
          data: data || {},
        };
      }

      // Add android config for Android platform
      if ((t.deviceType === "android" || t === "android") && imageUrl) {
        message.android = {
          notification: {
            title,
            body,
            imageUrl,
          },
          data: data || {},
        };
      }

      // Add apns config for iOS platform
      if ((t.deviceType === "ios" || t === "ios") && imageUrl) {
        message.apns = {
          payload: {
            aps: {
              alert: {
                title,
                body,
              },
            },
          },
          fcmOptions: {
            image: imageUrl,
          },
        };
      }

      let response;
      let fcmStatus = 'sent';
      let fcmMessageId = null;
      let fcmError = null;

      // If Firebase is initialized, send via Firebase Cloud Messaging
      if (firebaseInitialized && admin.messaging) {
        try {
          response = await admin.messaging().send(message);
          fcmMessageId = response;
        } catch (fcmErr) {
          fcmStatus = 'failed';
          fcmError = fcmErr.message;
          response = { error: fcmErr.message };
        }
      } else {
        // Mock response if Firebase is not initialized
        response = { 
          messageId: `mock-${Date.now()}`,
          warning: "Firebase not initialized - mock response"
        };
        fcmMessageId = response.messageId;
      }

      // Log to database
      logsToSave.push({
        userId: resolvedUserId ? resolvedUserId : null,
        token: t.token || t,
        isGuest: !resolvedUserId,
        title,
        body,
        data: data || {},
        imageUrl: imageUrl || null,
        deviceType: t.deviceType || 'unknown',
        deviceId: t.deviceId || null,
        fcmMessageId,
        fcmStatus,
        fcmError,
        notificationType,
        relatedId: relatedId || null,
        isRead: false
      });

      responses.push({ 
        token: t.token || t, 
        response,
        success: fcmStatus === 'sent'
      });

      if (fcmStatus === 'sent') {
        successCount++;
      } else {
        failureCount++;
      }
    } catch (error) {
      console.error("FCM error:", error.code);
      failureCount++;

      // 🔥 Remove invalid tokens
      if (
        error.code === "messaging/registration-token-not-registered" ||
        error.code === "messaging/invalid-registration-token"
      ) {
        if (t.token) {
          await UserFcmToken.deleteOne({ token: t.token });
        }
      }

      // Log failed notification
      logsToSave.push({
        userId: tokenSource === 'userId' ? userId : null,
        token: t.token || t,
        isGuest: tokenSource !== 'userId',
        title,
        body,
        data: data || {},
        imageUrl: imageUrl || null,
        deviceType: t.deviceType || 'unknown',
        deviceId: t.deviceId || null,
        fcmStatus: 'failed',
        fcmError: error.message,
        notificationType,
        relatedId: relatedId || null,
        isRead: false
      });

      responses.push({ 
        token: t.token || t, 
        error: error.message,
        success: false 
      });
    }
  }

  // Save all notifications to database
  try {
    await NotificationLog.insertMany(logsToSave);
    console.log(`✅ Stored ${logsToSave.length} notification logs in database`);
  } catch (dbError) {
    console.error("Error storing notifications in database:", dbError);
    // Don't fail the response if DB storage fails, but log the error
  }

  res.json({ 
    success: true, 
    message: "Notifications sent",
    summary: {
      total: tokens.length,
      successful: successCount,
      failed: failureCount,
      tokenSource,
      userId: tokenSource === 'userId' ? userId : undefined,
      stored: logsToSave.length
    },
    responses 
  });
};

/**
 * Batch Notification (Event updates)
 */
exports.sendBatch = async (req, res) => {
  const { title, body, data, imageUrl, notificationType = 'other', relatedId } = req.body;

  const tokens = await UserFcmToken.find().select("token deviceType userId deviceId");

  const responses = [];
  const logsToSave = [];
  let successCount = 0;
  let failureCount = 0;

  for (const t of tokens) {
    try {
      const notification = { title, body };
      if (imageUrl) {
        notification.imageUrl = imageUrl;
      }

      const message = {
        token: t.token,
        notification,
        data: data || {},
      };

      // Add platform-specific configs for image support
      if (imageUrl) {
        if (t.deviceType === "web") {
          message.webpush = {
            notification: {
              title,
              body,
              icon: imageUrl,
              image: imageUrl,
            },
            data: data || {},
          };
        } else if (t.deviceType === "android") {
          message.android = {
            notification: {
              title,
              body,
              imageUrl,
            },
            data: data || {},
          };
        } else if (t.deviceType === "ios") {
          message.apns = {
            payload: {
              aps: {
                alert: {
                  title,
                  body,
                },
              },
            },
            fcmOptions: {
              image: imageUrl,
            },
          };
        }
      }

      let response;
      let fcmStatus = 'sent';
      let fcmMessageId = null;
      let fcmError = null;

      // If Firebase is initialized, send via Firebase Cloud Messaging
      if (firebaseInitialized && admin.messaging) {
        try {
          response = await admin.messaging().send(message);
          fcmMessageId = response;
        } catch (fcmErr) {
          fcmStatus = 'failed';
          fcmError = fcmErr.message;
          response = { error: fcmErr.message };
        }
      } else {
        // Mock response if Firebase is not initialized
        response = { 
          messageId: `mock-${Date.now()}`,
          warning: "Firebase not initialized - mock response"
        };
        fcmMessageId = response.messageId;
      }

      // Log to database
      logsToSave.push({
        userId: t.userId || null,
        token: t.token,
        isGuest: !t.userId,
        title,
        body,
        data: data || {},
        imageUrl: imageUrl || null,
        deviceType: t.deviceType || 'unknown',
        deviceId: t.deviceId || null,
        fcmMessageId,
        fcmStatus,
        fcmError,
        notificationType,
        relatedId: relatedId || null,
        isRead: false
      });

      responses.push({ 
        token: t.token, 
        response,
        success: fcmStatus === 'sent'
      });

      if (fcmStatus === 'sent') {
        successCount++;
      } else {
        failureCount++;
      }
    } catch (error) {
      console.error("FCM error:", error.code);
      failureCount++;

      // 🔥 APP UNINSTALLED → DELETE TOKEN
      if (
        error.code === "messaging/registration-token-not-registered" ||
        error.code === "messaging/invalid-registration-token"
      ) {
        await UserFcmToken.deleteOne({ token: t.token });
      }

      // Log failed notification
      logsToSave.push({
        userId: t.userId || null,
        token: t.token,
        isGuest: !t.userId,
        title,
        body,
        data: data || {},
        imageUrl: imageUrl || null,
        deviceType: t.deviceType || 'unknown',
        deviceId: t.deviceId || null,
        fcmStatus: 'failed',
        fcmError: error.message,
        notificationType,
        relatedId: relatedId || null,
        isRead: false
      });

      responses.push({ 
        token: t.token, 
        error: error.message,
        success: false 
      });
    }
  }

  // Save all notifications to database
  try {
    await NotificationLog.insertMany(logsToSave);
    console.log(`✅ Stored ${logsToSave.length} batch notification logs in database`);
  } catch (dbError) {
    console.error("Error storing batch notifications in database:", dbError);
    // Don't fail the response if DB storage fails
  }

  res.json({
    success: true,
    message: "Batch notifications sent",
    sent: successCount,
    failed: failureCount,
    total: tokens.length,
    stored: logsToSave.length,
    responses
  });
};

/**
 * Delete FCM Token for User
 */
exports.deleteToken = async (req, res) => {
  const { token } = req.body;
  const userId = req.user.id;

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  const result = await UserFcmToken.deleteOne({ token, userId });

  if (result.deletedCount === 0) {
    return res.status(404).json({ message: "Token not found" });
  }

  res.json({ success: true, message: "Token deleted successfully" });
};



exports.softLogout = async (req, res) => {
  const { token } = req.body;

  await UserFcmToken.findOneAndUpdate(
    { token },
    { userId: null, isGuest: true }
  );

  res.json({ success: true });
};



exports.hardDeleteToken = async (req, res) => {
  const { token } = req.body;

  await UserFcmToken.deleteOne({ token });

  res.json({ success: true });
};

// ============================================
// USER NOTIFICATION APIS (2 required APIs)
// ============================================

/**
 * PATCH Mark All Notifications as Read
 * Mark all unread notifications as read for a user
 * @route   PATCH /api/notifications/mark-all-read
 * @access  Public (requires userId query param)
 */
exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId query parameter is required'
      });
    }

    const result = await NotificationLog.updateMany(
      { userId, isRead: false, isDeleted: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      }
    });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notifications as read',
      error: error.message
    });
  }
};

/**
 * GET User Notifications
 * Retrieve unread notifications for the authenticated user
 * @route   GET /api/notifications/user
 * @access  Private (requires authentication)
 */
exports.getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.query;
    const { type, isRead } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId query parameter is required'
      });
    }

    // Build query
    const query = { 
      userId, 
      isDeleted: false,
      expiresAt: { $gt: new Date() }
    };

    // Filter by read status if provided
    if (isRead !== undefined) {
      query.isRead = isRead === 'true' || isRead === true;
    }

    // Filter by notification type if provided
    if (type) {
      query.notificationType = type;
    }

    // Get all matching notifications (no pagination)
    const total = await NotificationLog.countDocuments(query);
    const notifications = await NotificationLog.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Mark all unread notifications as read for this user
    await NotificationLog.updateMany(
      { userId, isRead: false, isDeleted: false },
      { isRead: true, readAt: new Date() }
    );

    // Get updated unread count (should be 0 now)
    const unreadCount = await NotificationLog.countDocuments({
      userId,
      isRead: false,
      isDeleted: false,
      expiresAt: { $gt: new Date() }
    });

    res.json({
      success: true,
      message: 'Notifications retrieved and marked as read',
      data: {
        notifications: notifications.map(notif => ({
          id: notif._id,
          title: notif.title,
          body: notif.body,
          imageUrl: notif.imageUrl,
          data: notif.data,
          type: notif.notificationType,
          isRead: notif.isRead,
          readAt: notif.readAt,
          createdAt: notif.createdAt,
          relatedId: notif.relatedId
        })),
        stats: {
          totalNotifications: total,
          unreadCount
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
};

/**
 * DELETE Soft delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private (requires authentication)
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { userId } = req.query;
    const { id } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId query parameter is required'
      });
    }

    const notification = await NotificationLog.findOneAndUpdate(
      { _id: id, userId },
      { isDeleted: true, deletedAt: new Date() },
      { new: true, lean: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted',
      data: {
        id: notification._id,
        deletedAt: notification.deletedAt
      }
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: error.message
    });
  }
};
