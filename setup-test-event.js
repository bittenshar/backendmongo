/**
 * Setup script to create test event for booking tests
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function setupTestEvent() {
  try {
    console.log('🔧 Creating test event for booking tests...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Load Event model
    const Event = require('./src/features/events/event.model');

    // Check if test event exists
    let event = await Event.findOne({ title: 'Test Concert 2026' });

    if (event) {
      console.log('ℹ️  Test event already exists\n');
    } else {
      console.log('📝 Creating new test event...');
      event = await Event.create({
        title: 'Test Concert 2026',
        description: 'A test concert for booking system',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        time: '19:00',
        location: 'Test Venue',
        city: 'Test City',
        state: 'Test State',
        capacity: 1000,
        ticketPrice: 500,
        image: 'https://via.placeholder.com/400x300',
        status: 'active'
      });
      console.log('✅ Event created\n');
    }

    console.log('✅ Test event setup complete!\n');
    console.log('📋 Event Details:');
    console.log('   Title:', event.title);
    console.log('   Event ID:', event._id);
    console.log('   Date:', event.date);
    console.log('   Ticket Price:', event.ticketPrice);
    console.log('   Capacity:', event.capacity);
    console.log('\n🚀 Event ID to use in tests:\n');
    console.log('   ' + event._id.toString() + '\n');

    await mongoose.connection.close();
    console.log('✅ Disconnected from MongoDB\n');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

setupTestEvent();
