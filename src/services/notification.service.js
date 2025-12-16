const { buildNotificationFromTemplate } = require("../features/notificationfcm/notification.helper");
const UserFcmToken = require("../features/notificationfcm/userFcmToken.model");
const admin = require("firebase-admin");

exports.sendNotificationService = async ({
  userId,
  type,
  payload = {},
  data = {},
}) => {
  const { title, body, imageUrl } =
    buildNotificationFromTemplate(type, payload);

  const tokens = await UserFcmToken.find({ userId, isActive: true });

  for (const t of tokens) {
    const notification = { title, body };
    if (imageUrl) notification.imageUrl = imageUrl;

    const message = {
      token: t.token,
      notification,
      data,
    };

    // 🌐 WEB
    if (t.deviceType === "web" && imageUrl) {
      message.webpush = {
        notification: {
          title,
          body,
          icon: imageUrl,
          image: imageUrl,
        },
        data,
      };
    }

    // 🤖 ANDROID
    if (t.deviceType === "android" && imageUrl) {
      message.android = {
        notification: {
          title,
          body,
          imageUrl,
        },
      };
    }

    // 🍎 iOS
    if (t.deviceType === "ios" && imageUrl) {
      message.apns = {
        payload: {
          aps: {
            alert: { title, body },
          },
        },
        fcmOptions: {
          image: imageUrl,
        },
      };
    }

    try {
      await admin.messaging().send(message);
    } catch (error) {
      if (
        error.code === "messaging/registration-token-not-registered" ||
        error.code === "messaging/invalid-registration-token"
      ) {
        await UserFcmToken.deleteOne({ token: t.token });
      }
    }
  }
};
