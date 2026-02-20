const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';

/**
 * Generate encryption key from secret
 * @returns {Buffer} 32-byte encryption key
 */
const getEncryptionKey = () => {
  const secret = process.env.URL_SECRET || 'default-secret-key-change-in-production';
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Generate static IV (Initialization Vector)
 * For non-sensitive data like URLs, static IV is acceptable
 * @returns {Buffer} 16-byte IV
 */
const getIV = () => {
  return Buffer.alloc(16, 0);
};

/**
 * Encrypt S3 URL using AES-256-CBC
 * @param {String} url - S3 URL to encrypt
 * @returns {String} Base64 encrypted string
 */
const encryptUrl = (url) => {
  try {
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), getIV());
    let encrypted = cipher.update(url, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    console.log('🔐 URL encrypted successfully');
    return encrypted;
  } catch (error) {
    console.error('❌ Encryption error:', error.message);
    throw new Error(`URL encryption failed: ${error.message}`);
  }
};

/**
 * Decrypt S3 URL using AES-256-CBC
 * @param {String} encrypted - Base64 encrypted string
 * @returns {String} Decrypted S3 URL
 */
const decryptUrl = (encrypted) => {
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), getIV());
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    console.log('🔓 URL decrypted successfully');
    return decrypted;
  } catch (error) {
    console.error('❌ Decryption error:', error.message);
    throw new Error(`URL decryption failed: ${error.message}`);
  }
};

/**
 * Validate encrypted token format
 * @param {String} token - Encrypted token to validate
 * @returns {Boolean} True if valid base64 format
 */
const isValidEncryptedToken = (token) => {
  try {
    Buffer.from(token, 'base64');
    return true;
  } catch (error) {
    return false;
  }
};

module.exports = {
  encryptUrl,
  decryptUrl,
  isValidEncryptedToken,
  getEncryptionKey,
  getIV
};
