const { admin, initialized: firebaseInitialized } = require('./firebase');
const { buildNotificationFromTemplate } = require('./notification.helper');
const UserFcmToken = require('./userFcmToken.model');

/**
 * Main notification service function
 * Sends notifications to users via FCM
 * 
 * @param {Object} options - Notification options
 * @param {string} options.userId - User ID to send notification to
 * @param {string} options.type - Notification type (from NOTIFICATION_TYPES)
 * @param {Object} options.payload - Dynamic payload for template rendering
 * @param {Object} options.data - Additional data to attach to notification
 */
exports.sendNotificationService = async ({ userId, type, payload = {}, data = {} }) => {
  try {
    // Validate Firebase initialization
    if (!firebaseInitialized) {
      console.warn('⚠️  Firebase not initialized, skipping notification');
      return { success: false, reason: 'Firebase not initialized' };
    }

    // Build notification from template
    const notification = buildNotificationFromTemplate(type, payload);

    // Get all FCM tokens for the user
    const fcmTokens = await UserFcmToken.find({ userId, isActive: true }).select('token deviceType');

    if (!fcmTokens || fcmTokens.length === 0) {
      console.warn(`⚠️  No FCM tokens found for user ${userId}`);
      return { success: false, reason: 'No FCM tokens found' };
    }

    // Prepare message for FCM
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...data,
        type: data.type || type,
        timestamp: new Date().toISOString(),
      },
    };

    // Add image if present
    if (notification.imageUrl) {
      message.notification.imageUrl = notification.imageUrl;
    }

    // Send notification to all tokens
    const results = [];
    const invalidTokens = [];

    for (const tokenDoc of fcmTokens) {
      try {
        const tokenMessage = {
          ...message,
          token: tokenDoc.token,
        };

        // Format message based on device type
        if (tokenDoc.deviceType === 'android') {
          tokenMessage.android = {
            priority: 'high',
            notification: {
              sound: 'default',
            },
          };
        } else if (tokenDoc.deviceType === 'ios') {
          tokenMessage.apns = {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
                'mutable-content': 1,
              },
            },
          };
        }

        const response = await admin.messaging().send(tokenMessage);
        results.push({ token: tokenDoc.token, messageId: response, success: true });
      } catch (error) {
        results.push({ token: tokenDoc.token, error: error.message, success: false });

        // If token is invalid, mark it for deletion
        if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
          invalidTokens.push(tokenDoc.token);
        }
      }
    }

    // Clean up invalid tokens
    if (invalidTokens.length > 0) {
      await UserFcmToken.deleteMany({ token: { $in: invalidTokens } });
      console.warn(`🗑️  Cleaned up ${invalidTokens.length} invalid FCM token(s)`);
    }

    // Count successful sends
    const successCount = results.filter((r) => r.success).length;

    console.log(`📤 Notification sent to ${successCount}/${results.length} device(s)`);

    return {
      success: successCount > 0,
      totalSent: successCount,
      totalFailed: results.length - successCount,
      details: results,
    };
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    throw error;
  }
};
