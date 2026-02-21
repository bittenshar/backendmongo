require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('./src/features/events/event.model');
const { encryptUrl, decryptUrl } = require('./src/shared/services/urlEncryption2.service');
const imageService = require('./src/shared/services/encryptedImageService');

(async () => {
  try {
    const mongoUrl = process.env.MONGO_URI;
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB\n');

    // Get events with images
    const eventId = process.argv[2];
    let events;

    if (eventId) {
      console.log(`📌 Fetching event: ${eventId}`);
      const event = await Event.findById(eventId);
      events = event ? [event] : [];
    } else {
      console.log('📋 Fetching all events with images...');
      events = await Event.find({ s3ImageKey: { $ne: null } }).limit(5);
    }

    if (events.length === 0) {
      console.log('❌ No events with images found');
      process.exit(0);
    }

    console.log(`\n📊 Found ${events.length} event(s) with images\n`);

    for (const event of events) {
      console.log('═'.repeat(60));
      console.log(`Event: ${event.name} (${event._id})`);
      console.log(`S3 Key: ${event.s3ImageKey}`);
      console.log(`Image Token: ${event.imageToken ? 'YES' : 'NO'}`);

      if (event.s3ImageKey && event.imageToken) {
        // Test decryption
        console.log('\n🔐 Testing token decryption...');
        try {
          const decrypted = decryptUrl(event.imageToken);
          console.log(`✅ Decrypted token: ${decrypted}`);
        } catch (err) {
          console.error(`❌ Decryption failed: ${err.message}`);
          continue;
        }

        // Test S3 retrieval
        console.log('\n📦 Testing S3 retrieval...');
        try {
          const imageBuffer = await imageService.getEventImage(event.s3ImageKey);
          console.log(`✅ Retrieved image: ${imageBuffer.length} bytes`);
        } catch (err) {
          console.error(`❌ S3 retrieval failed: ${err.message}`);
          console.error(`Code: ${err.code}`);
          continue;
        }

        // Generate test URL
        console.log('\n🌐 Test URL:');
        console.log(`GET /api/images/encrypted/${event.imageToken}`);
      }
    }

    console.log('\n' + '═'.repeat(60));
    await mongoose.connection.close();
    console.log('✅ Done');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
