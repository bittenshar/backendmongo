const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Generate PDF ticket for a booking
 * @param {Object} booking - Booking document with populated data
 * @param {Object} event - Event document
 * @param {Object} user - User document
 * @returns {Promise<Buffer>} PDF buffer
 */
exports.generateTicketPDF = async (booking, event, user) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40
      });

      // Collect PDF data
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ===== HEADER =====
      doc.fontSize(24).font('Helvetica-Bold').text('EVENT TICKET', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(14).font('Helvetica').text(event.name, { align: 'center' });
      doc.moveDown(1);

      // ===== TICKET DETAILS BOX =====
      doc.fontSize(12).font('Helvetica-Bold').text('TICKET INFORMATION', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica');
      doc.text(`Ticket ID: ${booking.ticketNumbers[0]}`, { width: 300 });
      doc.text(`Booking ID: ${booking._id}`);
      doc.text(`User: ${user.name || user.email}`);
      doc.text(`Phone: ${user.phone || 'N/A'}`);
      doc.moveDown(0.8);

      // ===== EVENT DETAILS BOX =====
      doc.fontSize(12).font('Helvetica-Bold').text('EVENT DETAILS', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica');
      doc.text(`Event: ${event.name}`);
      doc.text(`Date: ${new Date(event.date).toLocaleDateString()}`);
      doc.text(`Time: ${event.startTime || 'N/A'}`);
      doc.text(`Location: ${event.location}`);
      doc.moveDown(0.8);

      // ===== SEAT/PRICING DETAILS =====
      doc.fontSize(12).font('Helvetica-Bold').text('BOOKING DETAILS', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica');
      doc.text(`Seat Type: ${booking.seatType}`);
      doc.text(`Quantity: ${booking.quantity} ticket(s)`);
      doc.text(`Price per Seat: ₹${booking.pricePerSeat}`);
      doc.text(`Total Amount: ₹${booking.totalPrice}`, { font: 'Helvetica-Bold' });
      doc.text(`Payment Status: ${booking.paymentStatus.toUpperCase()}`);
      doc.moveDown(0.8);

      // ===== TICKET NUMBERS =====
      doc.fontSize(12).font('Helvetica-Bold').text('TICKET NUMBERS', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(9).font('Helvetica');
      booking.ticketNumbers.forEach((ticket, index) => {
        doc.text(`${index + 1}. ${ticket}`);
      });
      doc.moveDown(1);

      // ===== FOOTER =====
      doc.fontSize(9).font('Helvetica').fillColor('#666666');
      doc.text('This is a digital ticket. Please keep it safe.', { align: 'center' });
      doc.text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(0.5);
      doc.text('For support, contact: support@thrillathon.com', { align: 'center' });

      // Draw border
      doc.rect(20, 20, 555, 787).stroke();

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate and save ticket PDF to file system
 * @param {Object} booking - Booking document
 * @param {Object} event - Event document
 * @param {Object} user - User document
 * @returns {Promise<string>} File path
 */
exports.saveTicketPDF = async (booking, event, user) => {
  try {
    const ticketsDir = path.join(__dirname, '../../../tickets');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(ticketsDir)) {
      fs.mkdirSync(ticketsDir, { recursive: true });
    }

    const fileName = `ticket-${booking._id}-${Date.now()}.pdf`;
    const filePath = path.join(ticketsDir, fileName);

    const pdfBuffer = await exports.generateTicketPDF(booking, event, user);
    fs.writeFileSync(filePath, pdfBuffer);

    return filePath;
  } catch (error) {
    console.error('Error saving ticket PDF:', error);
    throw error;
  }
};

module.exports = exports;
