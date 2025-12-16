const templates = require("./notification.templates");


exports.buildNotificationFromTemplate = (type, payload = {}) => {
  const template = templates[type];

  if (!template) {
    throw new Error(`Notification template not found: ${type}`);
  }

  return {
    title: template.title,
    body:
      typeof template.body === "function"
        ? template.body(payload)
        : template.body,
    imageUrl: template.imageUrl || null,
  };
};
