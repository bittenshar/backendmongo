const crypto = require('crypto');

/**
 * URL Encryption Service
 * Encrypts S3 URLs to hide AWS infrastructure details
 * Only server can decrypt - clients receive opaque tokens
 */

const ENCRYPTION_KEY = process.env.URL_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';

// Ensure encryption key is exactly 32 bytes for AES-256
const getEncryptionKey = () => {
  let key = ENCRYPTION_KEY;
  if (key.length < 32) {
    key = key.padEnd(32, '0');
  } else if (key.length > 32) {
    key = key.substring(0, 32);
  }
  return Buffer.from(key, 'utf8');
};

/**
 * Encrypt a URL
 * @param {String} url - The S3 URL to encrypt
 * @returns {String} - Encrypted token in format: iv:encryptedData
 */
const encryptUrl = (url) => {
  try {
    if (!url) return null;

    // Generate a random IV for each encryption
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);

    let encrypted = cipher.update(url, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV:encrypted for decryption later
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('❌ URL Encryption Error:', error.message);
    return null;
  }
};

/**
 * Decrypt a URL token
 * @param {String} token - The encrypted token (iv:encryptedData format)
 * @returns {String} - Decrypted S3 URL
 */
const decryptUrl = (token) => {
  try {
    if (!token) return null;

    const parts = token.split(':');
    if (parts.length !== 2) {
      console.warn('⚠️ Invalid token format');
      return null;
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];

    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('❌ URL Decryption Error:', error.message);
    return null;
  }
};

/**
 * Generate a shareable image token
 * Creates a time-limited token that can be used to fetch the image
 * @param {String} url - The S3 URL
 * @param {Number} expiryHours - Token expiry in hours (default: 24)
 * @returns {String} - Token that includes expiry info
 */
const generateImageToken = (url, expiryHours = 24) => {
  try {
    const expiryTime = Date.now() + (expiryHours * 60 * 60 * 1000);
    const tokenData = JSON.stringify({
      url,
      expiryTime,
      createdAt: Date.now()
    });

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);

    let encrypted = cipher.update(tokenData, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('❌ Image Token Generation Error:', error.message);
    return null;
  }
};

/**
 * Verify and retrieve URL from image token
 * @param {String} token - The image token
 * @returns {Object} - {valid: boolean, url: string, message: string}
 */
const verifyImageToken = (token) => {
  try {
    if (!token) {
      return { valid: false, url: null, message: 'No token provided' };
    }

    const parts = token.split(':');
    if (parts.length !== 2) {
      return { valid: false, url: null, message: 'Invalid token format' };
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];

    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const tokenData = JSON.parse(decrypted);

    // Check expiry
    if (tokenData.expiryTime && Date.now() > tokenData.expiryTime) {
      return { valid: false, url: null, message: 'Token has expired' };
    }

    return { valid: true, url: tokenData.url, message: 'Token is valid' };
  } catch (error) {
    console.error('❌ Token Verification Error:', error.message);
    return { valid: false, url: null, message: 'Invalid token' };
  }
};

/**
 * Hash a URL (for comparison, not for decryption)
 * Useful for storing reference to S3 URL without storing the full URL
 * @param {String} url - The S3 URL
 * @returns {String} - HMAC hash
 */
const hashUrl = (url) => {
  if (!url) return null;
  return crypto
    .createHmac('sha256', ENCRYPTION_KEY)
    .update(url)
    .digest('hex');
};

module.exports = {
  encryptUrl,
  decryptUrl,
  generateImageToken,
  verifyImageToken,
  hashUrl,
  ENCRYPTION_KEY
};
