const mongoose = require('mongoose');
require('dotenv').config({ path: './src/config/config.env' });

async function dropAdminIdIndex() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    // Connect to MongoDB with timeout
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });

    console.log('✅ Connected to MongoDB');

    // Get the admin collection
    const db = mongoose.connection.db;
    const adminCollection = db.collection('admins');

    // List all indexes before dropping
    console.log('\n📋 Current indexes:');
    const indexesBefore = await adminCollection.indexes();
    console.log(indexesBefore.map(idx => idx.name || idx.key));

    // Drop the adminId index
    try {
      await adminCollection.dropIndex('adminId_1');
      console.log('\n✅ Successfully dropped adminId_1 index');
    } catch (error) {
      if (error.message && error.message.includes('index not found')) {
        console.log('\nℹ️  adminId_1 index does not exist or already removed');
      } else {
        console.log('\n⚠️  Error dropping index:', error.message);
      }
    }

    // List remaining indexes
    console.log('\n📋 Remaining indexes after cleanup:');
    const indexesAfter = await adminCollection.indexes();
    console.log(indexesAfter.map(idx => idx.name || idx.key));

    await mongoose.connection.close();
    console.log('\n✅ Done! You can now create admins without errors.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

dropAdminIdIndex();
