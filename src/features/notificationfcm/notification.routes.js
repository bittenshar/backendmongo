const express = require("express");
const {
  registerToken,
  sendNotification,
  sendBatch,
  deleteToken,
} = require("./notification.controller");

const { protect } = require("../auth/auth.middleware");

const router = express.Router();

router.post("/register-token", protect, registerToken);

router.post("/send", sendNotification);
router.post("/send-batch", sendBatch);
router.delete("/delete-token", protect, deleteToken);

module.exports = router;
