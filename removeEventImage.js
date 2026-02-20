require('dotenv').config();
const mongoose = require('mongoose');
const AWS = require('aws-sdk');

// Initialize S3
const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const Event = require('./src/features/events/event.model');

(async () => {
  try {
    const mongoUrl = process.env.MONGO_URI || 'mongodb+srv://daksh121:daksh121@cluster0.8mnqh8s.mongodb.net/?appName=Cluster0';
    
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected');
    
    const eventId = '694291bb1e613c43e1b18a76';
    
    // Get the event
    const event = await Event.findById(eventId);
    if (!event) {
      console.log('❌ Event not found');
      process.exit(1);
    }
    
    console.log('\n📋 Event before cleanup:');
    console.log({
      name: event.name,
      s3ImageKey: event.s3ImageKey,
      coverImage: event.coverImage
    });
    
    // Delete from S3 if key exists
    if (event.s3ImageKey) {
      console.log('\n🗑️ Deleting from S3:', event.s3ImageKey);
      try {
        await s3.deleteObject({
          Bucket: process.env.AWS_EVENT_IMAGES_BUCKET || 'event-images-collection',
          Key: event.s3ImageKey
        }).promise();
        console.log('✅ Deleted from S3');
      } catch (err) {
        console.warn('⚠️ S3 deletion error (file may not exist):', err.message);
      }
    }
    
    // Clear fields in MongoDB
    console.log('\n🧹 Clearing image fields in MongoDB...');
    const updated = await Event.findByIdAndUpdate(
      eventId,
      {
        s3ImageKey: null,
        coverImage: null,
        imageToken: null
      },
      { new: true }
    );
    
    console.log('✅ Event after cleanup:');
    console.log({
      name: updated.name,
      s3ImageKey: updated.s3ImageKey,
      coverImage: updated.coverImage,
      imageToken: updated.imageToken
    });
    
    await mongoose.connection.close();
    console.log('\n✅ Complete! Event image removed');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
