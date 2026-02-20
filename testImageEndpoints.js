#!/usr/bin/env node

/**
 * IMAGE ENDPOINT TEST SCRIPT
 * Tests all image endpoints after server restart
 * Run: node testImageEndpoints.js
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

async function testEndpoints() {
  console.log('\n🧪 IMAGE ENDPOINT TESTS\n');
  console.log(`Testing: ${API_BASE}\n`);

  // Test 1: Health check
  console.log('1️⃣  Testing health endpoint...');
  try {
    const res = await axios.get(`${API_BASE}/api/images/health`, { timeout: 5000 });
    console.log('   ✅ Health check: OK\n');
  } catch (error) {
    console.log(`   ❌ Health check failed: ${error.message}\n`);
    process.exit(1);
  }

  // Test 2: Get events
  console.log('2️⃣  Fetching events...');
  let events = [];
  try {
    const res = await axios.get(`${API_BASE}/api/events?limit=1`, { timeout: 5000 });
    events = res.data.data.events || [];
    
    if (events.length === 0) {
      console.log('   ⚠️  No events found in database\n');
      console.log('   💡 Create an event first, then test with its image\n');
      process.exit(0);
    }
    
    console.log(`   ✅ Found ${events.length} event(s)\n`);
  } catch (error) {
    console.log(`   ❌ Failed to fetch events: ${error.message}\n`);
    process.exit(1);
  }

  // Test 3: Test public image endpoint
  const event = events[0];
  console.log(`3️⃣  Testing public image endpoint for event: ${event.name}`);
  console.log(`   Event ID: ${event._id}`);
  console.log(`   S3 Key: ${event.s3ImageKey || 'NOT SET'}\n`);

  if (!event.s3ImageKey) {
    console.log('   ⚠️  Event has no image (s3ImageKey is empty)\n');
    console.log('   💡 Upload an image to the event first\n');
    process.exit(0);
  }

  const publicUrl = `${API_BASE}/api/images/public/${event.s3ImageKey}`;
  console.log(`   URL: ${publicUrl}`);

  try {
    const res = await axios.head(publicUrl, { timeout: 10000 });
    console.log(`   ✅ Image accessible (${res.headers['content-length']} bytes)\n`);
  } catch (error) {
    console.log(`   ❌ Image not accessible: ${error.message}\n`);
    console.log('   Possible causes:');
    console.log('   - S3 bucket name or region incorrect');
    console.log('   - AWS credentials invalid');
    console.log('   - Image doesn\'t exist in S3');
    console.log('   - S3 bucket is not public\n');
    process.exit(1);
  }

  // Test 4: Fetch image data
  console.log('4️⃣  Fetching image content...');
  try {
    const res = await axios.get(publicUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    const sizeKB = (res.data.length / 1024).toFixed(2);
    console.log(`   ✅ Image downloaded (${sizeKB} KB)\n`);
  } catch (error) {
    console.log(`   ❌ Failed to download image: ${error.message}\n`);
    process.exit(1);
  }

  // Test 5: Direct S3 URL
  console.log('5️⃣  Testing direct S3 URL...');
  const bucket = process.env.AWS_EVENT_IMAGES_BUCKET || 'event-images-collection';
  const region = process.env.AWS_REGION || 'ap-south-1';
  const s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${event.s3ImageKey}`;
  
  console.log(`   S3 URL: ${s3Url}`);
  
  try {
    const res = await axios.head(s3Url, { timeout: 10000 });
    console.log(`   ✅ Direct S3 access works\n`);
  } catch (error) {
    console.log(`   ⚠️  Direct S3 access failed: ${error.message}`);
    console.log(`   (This might be OK if S3 bucket is private)\n`);
  }

  console.log('✨ ALL TESTS PASSED! Image endpoints are working\n');
  console.log('📋 Summary:');
  console.log(`   • API health: ✅`);
  console.log(`   • Events endpoint: ✅`);
  console.log(`   • Image endpoint: ✅`);
  console.log(`   • Image data: ✅`);
  console.log('\n🎉 Ready to use! You can now access images via:\n');
  console.log(`   <img src="${publicUrl}" />\n`);
}

testEndpoints().catch(error => {
  console.error('💥 Test failed:', error.message);
  process.exit(1);
});
