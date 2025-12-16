const mongoose = require("mongoose");

const userFcmTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    deviceType: {
      type: String,
      enum: ["android", "ios", "web"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.UserFcmToken || mongoose.model("UserFcmToken", userFcmTokenSchema);
