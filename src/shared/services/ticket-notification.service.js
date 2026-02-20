const nodemailer = require('nodemailer');
const path = require('path');

/**
 * Send ticket via WhatsApp using WATI service
 * @param {string} phone - Phone number with country code
 * @param {Object} booking - Booking data
 * @param {string} ticketNumber - Ticket number
 * @returns {Promise<Object>} Response from WATI
 */
exports.sendTicketViaWhatsApp = async (phone, booking, ticketNumber) => {
  try {
    if (!process.env.WATI_API_KEY || !process.env.WATI_API_URL) {
      console.warn('⚠️ WATI credentials not configured, skipping WhatsApp notification');
      return { success: false, message: 'WATI not configured' };
    }

    const watiService = require('./wati-otp.service');
    
    const message = `🎫 Your Ticket is Ready!\n\nEvent: ${booking.eventName || 'Event'}\nTicket: ${ticketNumber}\nDate: ${booking.eventDate || 'Date TBA'}\n\nKeep this ticket safe for check-in. For support, contact support@thrillathon.com`;

    const response = await fetch(`${process.env.WATI_API_URL}/sendSessionMessage?token=${process.env.WATI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumber: phone.replace(/[+\s-]/g, ''),
        message: message
      })
    });

    const data = await response.json();
    
    if (data.result) {
      console.log('✅ WhatsApp ticket sent to:', phone);
      return { success: true, message: 'Ticket sent via WhatsApp' };
    } else {
      console.warn('⚠️ Failed to send WhatsApp ticket:', data);
      return { success: false, message: 'Failed to send WhatsApp' };
    }
  } catch (error) {
    console.error('Error sending WhatsApp ticket:', error.message);
    return { success: false, message: error.message };
  }
};

/**
 * Send ticket via Email
 * @param {string} email - Email address
 * @param {Object} booking - Booking data
 * @param {Array<string>} ticketNumbers - Ticket numbers
 * @param {string} pdfPath - Path to PDF file (optional)
 * @returns {Promise<Object>} Response
 */
exports.sendTicketViaEmail = async (email, booking, ticketNumbers, pdfPath = null) => {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('⚠️ SMTP not configured, skipping email notification');
      return { success: false, message: 'SMTP not configured' };
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const ticketList = ticketNumbers.map((t, i) => `${i + 1}. ${t}`).join('\n');

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@thrillathon.com',
      to: email,
      subject: `🎫 Your Ticket for ${booking.eventName || 'Event'} is Ready!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #667eea;">Your Ticket is Ready!</h1>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2>${booking.eventName || 'Event'}</h2>
            <p><strong>Date:</strong> ${booking.eventDate || 'Date TBA'}</p>
            <p><strong>Location:</strong> ${booking.eventLocation || 'Location TBA'}</p>
            <p><strong>Seat Type:</strong> ${booking.seatType}</p>
            <p><strong>Quantity:</strong> ${booking.quantity} ticket(s)</p>
            <p><strong>Total Amount:</strong> ₹${booking.totalPrice}</p>
          </div>

          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Ticket Numbers:</h3>
            <pre style="background: white; padding: 10px; border-radius: 4px; overflow-x: auto;">${ticketList}</pre>
          </div>

          <p style="color: #666;">Keep your ticket numbers safe. You'll need them for check-in.</p>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
            For support, contact: support@thrillathon.com<br/>
            This is an automated email, please do not reply.
          </p>
        </div>
      `,
      attachments: pdfPath ? [{
        filename: `ticket-${booking._id}.pdf`,
        path: pdfPath
      }] : []
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email ticket sent to:', email);
    return { success: true, message: 'Ticket sent via email', messageId: result.messageId };

  } catch (error) {
    console.error('Error sending email ticket:', error.message);
    return { success: false, message: error.message };
  }
};

/**
 * Send ticket via SMS using TWILIO or similar
 * @param {string} phone - Phone number with country code
 * @param {Object} booking - Booking data
 * @param {string} ticketNumber - Ticket number
 * @returns {Promise<Object>} Response
 */
exports.sendTicketViaSMS = async (phone, booking, ticketNumber) => {
  try {
    if (!process.env.SMS_API_KEY || !process.env.SMS_API_URL) {
      console.warn('⚠️ SMS provider not configured, skipping SMS notification');
      return { success: false, message: 'SMS provider not configured' };
    }

    const message = `🎫 Ticket: ${ticketNumber} | Event: ${booking.eventName} | Date: ${booking.eventDate}. Visit: thrillathon.com`;

    const response = await fetch(process.env.SMS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SMS_API_KEY}`
      },
      body: JSON.stringify({
        phone: phone.replace(/[+\s-]/g, ''),
        message: message
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ SMS ticket sent to:', phone);
      return { success: true, message: 'Ticket sent via SMS' };
    } else {
      console.warn('⚠️ Failed to send SMS ticket:', data);
      return { success: false, message: 'Failed to send SMS' };
    }
  } catch (error) {
    console.error('Error sending SMS ticket:', error.message);
    return { success: false, message: error.message };
  }
};

/**
 * Send tickets via all available channels
 * @param {Object} user - User data
 * @param {Object} booking - Booking data
 * @param {Array<string>} ticketNumbers - Ticket numbers
 * @param {Object} event - Event data
 * @returns {Promise<Object>} Results from all channels
 */
exports.sendTicketViaAllChannels = async (user, booking, ticketNumbers, event) => {
  try {
    console.log('📤 Sending tickets via all channels...');
    
    const results = {
      whatsapp: { success: false },
      email: { success: false },
      sms: { success: false }
    };

    const bookingData = {
      ...booking,
      eventName: event?.name,
      eventDate: event?.date ? new Date(event.date).toLocaleDateString() : 'Date TBA',
      eventLocation: event?.location
    };

    // Send via WhatsApp
    if (user.phone) {
      results.whatsapp = await exports.sendTicketViaWhatsApp(user.phone, bookingData, ticketNumbers[0]);
    }

    // Send via Email
    if (user.email) {
      results.email = await exports.sendTicketViaEmail(user.email, bookingData, ticketNumbers);
    }

    // Send via SMS
    if (user.phone) {
      results.sms = await exports.sendTicketViaSMS(user.phone, bookingData, ticketNumbers[0]);
    }

    console.log('✅ Ticket notifications sent:', results);
    return results;

  } catch (error) {
    console.error('Error sending tickets via all channels:', error.message);
    throw error;
  }
};

module.exports = exports;
