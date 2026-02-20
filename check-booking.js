const mongoose = require('mongoose');

// Load environment from root .env file
require('dotenv').config();

const Booking = require('./src/features/booking/booking_model');

async function checkBookingData() {
  try {
    const mongoUri = process.env.MONGO_URI;
    
    if (!mongoUri) {
      console.error('❌ MONGO_URI not found in environment variables');
      console.log('📍 Looking for .env file at: ./src/config/config.env');
      console.log('Current environment variables:', Object.keys(process.env).filter(k => k.includes('MONGO') || k.includes('DB')));
      return;
    }

    console.log('✅ Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get the latest booking
    const latestBooking = await Booking.findOne()
      .sort({ bookedAt: -1 })
      .populate('userId', 'name email phone')
      .populate('eventId', 'name date location');

    if (!latestBooking) {
      console.log('❌ No bookings found in database');
      return;
    }

    console.log('\n📊 LATEST BOOKING DATA:\n');
    console.log('Booking ID:', latestBooking._id);
    console.log('Status:', latestBooking.status);
    console.log('Payment Status:', latestBooking.paymentStatus);
    console.log('Payment Verified:', latestBooking.paymentVerified);
    console.log('\n🎫 TICKET INFORMATION:');
    console.log('Ticket Numbers:', latestBooking.ticketNumbers);
    console.log('Ticket Count:', latestBooking.ticketNumbers?.length || 0);
    console.log('\n📱 QR CODES:');
    console.log('QR Code Count:', latestBooking.qrCodes?.length || 0);
    if (latestBooking.qrCodes?.length > 0) {
      console.log('First QR Code (truncated):', latestBooking.qrCodes[0]?.substring(0, 50) + '...');
    }
    console.log('\n📬 NOTIFICATIONS:');
    console.log('Notifications Sent:', latestBooking.notificationsSent);

    console.log('\n👤 USER:');
    console.log('Name:', latestBooking.userId?.name);
    console.log('Email:', latestBooking.userId?.email);
    console.log('Phone:', latestBooking.userId?.phone);

    console.log('\n🎪 EVENT:');
    console.log('Event Name:', latestBooking.eventId?.name);
    console.log('Event Date:', latestBooking.eventId?.date);

    console.log('\n💳 PAYMENT:');
    console.log('Razorpay Order ID:', latestBooking.razorpayOrderId);
    console.log('Razorpay Payment ID:', latestBooking.razorpayPaymentId);
    console.log('Total Price:', latestBooking.totalPrice);

    console.log('\n⏱️ TIMESTAMPS:');
    console.log('Booked At:', latestBooking.bookedAt);
    console.log('Confirmed At:', latestBooking.confirmedAt);
    console.log('Created At:', latestBooking.createdAt);

    console.log('\n✅ Full Booking Object:');
    console.log(JSON.stringify(latestBooking.toObject(), null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkBookingData();
