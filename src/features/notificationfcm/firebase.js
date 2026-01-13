import admin from "firebase-admin";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Create __dirname for ES6 modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase only if service account is available
let initialized = false;
const serviceAccountPath = path.join(__dirname, "firebase-service-account.json");

if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccountJson = fs.readFileSync(serviceAccountPath, "utf8");
    const serviceAccount = JSON.parse(serviceAccountJson);
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
export { admin, initialized };