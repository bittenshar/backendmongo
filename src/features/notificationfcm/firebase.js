const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// Initialize Firebase only if service account is available
let initialized = false;
const serviceAccountPath = path.join(__dirname, "firebase-service-account.json");

if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    initialized = true;
    console.log("[Firebase] Initialized successfully");
  } catch (err) {
    console.warn("[Firebase] Failed to initialize:", err.message);
  }
} else {
  console.warn("[Firebase] firebase-service-account.json not found. Firebase notifications disabled.");
}

module.exports = { admin, initialized };


