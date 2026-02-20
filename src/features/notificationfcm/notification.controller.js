const { admin, initialized: firebaseInitialized } = require("./firebase");
const UserFcmToken = require("./UserFcmToken.model");

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
exports.sendNotification = async (req, res) => {
  const { userId, token, title, body, data, imageUrl } = req.body;

  // Validate required fields
  if (!title || !body) {
    return res.status(400).json({ 
      success: false,
      message: "Title and body are required" 
    });
  }

  let tokens = [];
  let tokenSource = null;

  // Primary: If userId is provided, find all tokens for that user
  if (userId) {
    try {
      tokens = await UserFcmToken.find({ userId });
      tokenSource = "userId";
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
      message: "Either userId or token is required" 
    });
  }

  // Check if tokens found
  if (!tokens || tokens.length === 0) {
    return res.status(404).json({ 
      success: false,
      message: `No FCM tokens found for ${tokenSource === 'userId' ? 'userId: ' + userId : 'token'}`,
      tokenSource,
      userId: tokenSource === 'userId' ? userId : undefined
    });
  }

  const responses = [];
  let successCount = 0;
  let failureCount = 0;

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

      // If Firebase is initialized, send via Firebase Cloud Messaging
      if (firebaseInitialized && admin.messaging) {
        response = await admin.messaging().send(message);
      } else {
        // Mock response if Firebase is not initialized
        response = { 
          messageId: `mock-${Date.now()}`,
          warning: "Firebase not initialized - mock response"
        };
      }

      responses.push({ 
        token: t.token || t, 
        response,
        success: true 
      });
      successCount++;
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

      responses.push({ 
        token: t.token || t, 
        error: error.message,
        success: false 
      });
    }
  }

  res.json({ 
    success: true, 
    message: "Notifications sent",
    summary: {
      total: tokens.length,
      successful: successCount,
      failed: failureCount,
      tokenSource,
      userId: tokenSource === 'userId' ? userId : undefined
    },
    responses 
  });
};

/**
 * Batch Notification (Event updates)
 */
exports.sendBatch = async (req, res) => {
  const { title, body, data, imageUrl } = req.body;

  const tokens = await UserFcmToken.find().select("token deviceType");

  const responses = [];

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

      // If Firebase is initialized, send via Firebase Cloud Messaging
      if (firebaseInitialized && admin.messaging) {
        response = await admin.messaging().send(message);
      } else {
        // Mock response if Firebase is not initialized
        response = { 
          messageId: `mock-${Date.now()}`,
          warning: "Firebase not initialized - mock response"
        };
      }

      responses.push({ 
        token: t.token, 
        response,
        success: true 
      });
    } catch (error) {
      console.error("FCM error:", error.code);

      // 🔥 APP UNINSTALLED → DELETE TOKEN
      if (
        error.code === "messaging/registration-token-not-registered" ||
        error.code === "messaging/invalid-registration-token"
      ) {
        await UserFcmToken.deleteOne({ token: t.token });
      }

      responses.push({ 
        token: t.token, 
        error: error.message,
        success: false 
      });
    }
  }

  res.json({
    success: true,
    message: "Batch notifications sent",
    sent: responses.length,
    total: tokens.length,
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
