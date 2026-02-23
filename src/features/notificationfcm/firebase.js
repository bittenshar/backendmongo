const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// Initialize Firebase only if service account is available
let initialized = false;
let serviceAccount = null;

// Try environment variable first (for Vercel/production)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log("[Firebase] Loaded service account from environment variable");
  } catch (err) {
    console.error("[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT env var:", err.message);
  }
}

// Fall back to local file if environment variable not found (for local development)
if (!serviceAccount) {
  const serviceAccountPath = path.join(__dirname, "firebase-service-account.json");
  if (fs.existsSync(serviceAccountPath)) {
    try {
      const serviceAccountJson = fs.readFileSync(serviceAccountPath, "utf8");
      serviceAccount = JSON.parse(serviceAccountJson);
      console.log("[Firebase] Loaded service account from file");
    } catch (err) {
      console.warn("[Firebase] Failed to read service account file:", err.message);
    }
  } else {
    console.warn("[Firebase] firebase-service-account.json not found");
  }
}

// Initialize Firebase if we have service account credentials
if (serviceAccount && !admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    initialized = true;
    console.log("[Firebase] Initialized successfully");
  } catch (err) {
    console.error("[Firebase] Failed to initialize:", err.message);
  }
} else if (!serviceAccount) {
  console.warn("[Firebase] No service account credentials found. Firebase notifications disabled.");
}

module.exports = { admin, initialized };