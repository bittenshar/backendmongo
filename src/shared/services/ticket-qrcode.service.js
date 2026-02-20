const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

/**
 * Generate QR code for a ticket
 * @param {string} ticketNumber - Ticket number to encode
 * @returns {Promise<string>} Data URL of QR code
 */
exports.generateQRCodeDataURL = async (ticketNumber) => {
  try {
    const qrDataUrl = await QRCode.toDataURL(ticketNumber, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 2,
      width: 300
    });
    return qrDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

/**
 * Save QR code to file system
 * @param {string} ticketNumber - Ticket number
 * @returns {Promise<string>} File path
 */
exports.saveQRCode = async (ticketNumber) => {
  try {
    const qrDir = path.join(__dirname, '../../../qr-codes');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }

    const fileName = `qr-${ticketNumber}-${Date.now()}.png`;
    const filePath = path.join(qrDir, fileName);

    await QRCode.toFile(filePath, ticketNumber, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 2,
      width: 300
    });

    return filePath;
  } catch (error) {
    console.error('Error saving QR code:', error);
    throw error;
  }
};

/**
 * Generate QR codes for multiple tickets
 * @param {Array<string>} ticketNumbers - Array of ticket numbers
 * @returns {Promise<Array<Object>>} Array of QR code objects with path and dataURL
 */
exports.generateMultipleQRCodes = async (ticketNumbers) => {
  try {
    const qrCodes = await Promise.all(
      ticketNumbers.map(async (ticket) => {
        const dataUrl = await exports.generateQRCodeDataURL(ticket);
        return {
          ticket,
          dataUrl,
          savedAt: new Date()
        };
      })
    );
    return qrCodes;
  } catch (error) {
    console.error('Error generating multiple QR codes:', error);
    throw error;
  }
};

/**
 * Validate ticket by QR code content
 * @param {string} qrContent - Content from QR code
 * @param {string} expectedTicketNumber - Expected ticket number
 * @returns {boolean} True if valid
 */
exports.validateQRCode = (qrContent, expectedTicketNumber) => {
  return qrContent === expectedTicketNumber;
};

module.exports = exports;
