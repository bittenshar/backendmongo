const mongoose = require('mongoose');

const ListYourShowInquiry = require('./src/features/listyourshow/listyourshow_inquiry.model');

async function cleanupUserIds() {
  try {
    await mongoose.connect('mongodb+srv://adminn:adm@123@cluster0.mongodb.net/admin-thrill?retryWrites=true&w=majority');
    console.log('Connected to MongoDB');

    const result = await ListYourShowInquiry.updateMany(
      {},
      { $unset: { userId: 1 } }
    );

    console.log(`Updated ${result.modifiedCount} documents - userId field removed`);
    
    await mongoose.connection.close();
    console.log('Cleaned up successfully!');
  } catch (error) {
    console.error('Cleanup error:', error.message);
  }
}

cleanupUserIds();
