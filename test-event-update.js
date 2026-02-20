require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('./src/features/events/event.model');

(async () => {
  try {
    const mongoUrl = process.env.MONGO_URI || process.env.MONGO_URL;
    console.log('Connecting to MongoDB...');
    
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected');
    
    const eventId = '694291bb1e613c43e1b18a76';
    
    // Try to update with image data
    console.log('\n1️⃣ Updating event with image data...');
    const result = await Event.findByIdAndUpdate(
      eventId,
      {
        coverImage: 'https://event-images-collection.s3.ap-south-1.amazonaws.com/events/694291bb1e613c43e1b18a76/cover.jpg',
        s3ImageKey: 'events/694291bb1e613c43e1b18a76/cover.jpg'
      },
      { new: true, runValidators: true }
    );
    
    if (result) {
      console.log('✅ Update successful');
      console.log('  - coverImage:', result.coverImage);
      console.log('  - s3ImageKey:', result.s3ImageKey);
    } else {
      console.log('❌ No document found');
    }
    
    // Check the document again
    console.log('\n2️⃣ Fetching event again...');
    const event = await Event.findById(eventId);
    console.log('  - coverImage:', event.coverImage);
    console.log('  - s3ImageKey:', event.s3ImageKey);
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.errors) {
      console.error('Validation errors:', err.errors);
    }
    process.exit(1);
  }
})();
