const mongoose = require('mongoose');

/**
 * NotificationLog Model - Stores all notifications sent to users
 * Tracks notification status (read/unread) and metadata
 */
const notificationLogSchema = new mongoose.Schema(
  {
    // User who received the notification
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function() { return !this.isGuest; }, // Required if not guest
      index: true
    },
    
    // Guest device tracking
    token: {
      type: String,
      index: true
    },
    
    isGuest: {
      type: Boolean,
      default: false
    },
    
    // Notification content
    title: {
      type: String,
      required: true
    },
    
    body: {
      type: String,
      required: true
    },
    
    // Additional data
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    imageUrl: {
      type: String,
      default: null
    },
    
    // Notification status
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    
    readAt: {
      type: Date,
      default: null
    },
    
    // Device info
    deviceType: {
      type: String,
      enum: ['android', 'ios', 'web', 'unknown'],
      default: 'unknown'
    },
    
    deviceId: {
      type: String,
      default: null
    },
    
    // FCM response tracking
    fcmMessageId: {
      type: String,
      default: null
    },
    
    fcmStatus: {
      type: String,
      enum: ['sent', 'failed', 'pending'],
      default: 'sent'
    },
    
    fcmError: {
      type: String,
      default: null
    },
    
    // Notification type for filtering
    notificationType: {
      type: String,
      // categories that help client‑side filtering; many internal notifications
      // may use more specific type strings (e.g. TICKET_CONFIRMED) but the
      // enum here covers the broad buckets we expose via the API.
      enum: [
        'event',
        'booking',
        'payment',
        'system',
        'promotional',
        'order',
        'other',
        'verification', // cannot be deleted until user is verified
        'utility',      // auto‑deleted when marked read
        'batch'         // marketing/broadcast; usually not stored
      ],
      default: 'other'
    },
    
    // Reference to related documents
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    
    // Deletion tracking (soft delete)
    isDeleted: {
      type: Boolean,
      default: false
    },
    
    deletedAt: {
      type: Date,
      default: null
    },
    
    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    
    sentAt: {
      type: Date,
      default: Date.now
    },
    
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  },
  {
    timestamps: true,
    collection: 'notificationlogs'
  }
);

// Indexes for efficient querying
notificationLogSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationLogSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });
notificationLogSchema.index({ token: 1, isRead: 1 });
notificationLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // Auto-delete after 30 days

// Statics for common queries
notificationLogSchema.statics.getUserNotifications = function(userId, options = {}) {
  const { isRead, limit = 20, page = 1, skip = (page - 1) * limit } = options;
  
  const query = { 
    userId, 
    isDeleted: false,
    expiresAt: { $gt: new Date() }
  };
  
  if (isRead !== undefined) {
    query.isRead = isRead;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

notificationLogSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ 
    userId, 
    isRead: false,
    isDeleted: false,
    expiresAt: { $gt: new Date() }
  });
};

notificationLogSchema.statics.markAsRead = function(notificationId, userId) {
  return this.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
};

notificationLogSchema.statics.markMultipleAsRead = function(notificationIds, userId) {
  return this.updateMany(
    { _id: { $in: notificationIds }, userId },
    { isRead: true, readAt: new Date() }
  );
};

notificationLogSchema.statics.deleteNotification = async function(notificationId, userId) {
  // fetch first so we can apply business rules
  const notif = await this.findOne({ _id: notificationId, userId }).lean();
  if (!notif) return null;

  // verification notifications are protected until the user is verified
  if (/VERIFICATION/i.test(notif.notificationType)) {
    const User = require('../users/user.model');
    const user = await User.findById(userId).select('verificationStatus');
    if (user && user.verificationStatus !== 'verified') {
      const err = new Error('Cannot delete verification notification until account is verified');
      err.code = 'NOT_VERIFIED';
      throw err;
    }
  }

  return this.findOneAndUpdate(
    { _id: notificationId, userId },
    { isDeleted: true, deletedAt: new Date() },
    { new: true }
  );
};

// Instance method to convert to response format
notificationLogSchema.methods.toResponse = function() {
  return {
    id: this._id,
    title: this.title,
    body: this.body,
    data: this.data,
    imageUrl: this.imageUrl,
    isRead: this.isRead,
    type: this.notificationType,
    createdAt: this.createdAt,
    readAt: this.readAt
  };
};

module.exports = mongoose.model('NotificationLog', notificationLogSchema);
