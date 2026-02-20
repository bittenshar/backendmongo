#!/usr/bin/env node

/**
 * IMAGE RETRIEVAL - TEST & VERIFICATION SCRIPT
 * 
 * Tests all image retrieval methods
 * Run: node testImageRetrieval.js
 */

const axios = require('axios');
const colors = require('colors');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
let testResults = [];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function log(type, message, details = '') {
  const icons = {
    info: 'ℹ️ ',
    success: '✅',
    error: '❌',
    warning: '⚠️ ',
    step: '📍',
    test: '🧪'
  };

  const icon = icons[type] || '';
  
  if (type === 'success') {
    console.log(`\n${icon} ${colors.green(message)}`);
  } else if (type === 'error') {
    console.log(`\n${icon} ${colors.red(message)}`);
  } else if (type === 'warning') {
    console.log(`\n${icon} ${colors.yellow(message)}`);
  } else if (type === 'step') {
    console.log(`\n${icon} ${colors.cyan(message)}`);
  } else if (type === 'test') {
    console.log(`\n${icon} ${colors.blue(message)}`);
  } else {
    console.log(`\n${icon} ${message}`);
  }

  if (details) {
    console.log(`   ${colors.gray(details)}`);
  }
}

function recordResult(testName, passed, error = null) {
  testResults.push({
    name: testName,
    passed,
    error
  });

  if (passed) {
    log('success', testName);
  } else {
    log('error', testName, error);
  }
}

function printSummary() {
  console.log(colors.bold.underline('\n\n📊 TEST SUMMARY\n'));
  
  const passed = testResults.filter(r => r.passed).length;
  const total = testResults.length;
  const percentage = Math.round((passed / total) * 100);

  console.log(`   Total Tests: ${total}`);
  console.log(`   Passed: ${colors.green(passed)}`);
  console.log(`   Failed: ${colors.red(total - passed)}`);
  console.log(`   ${colors.bold('Success Rate: ' + percentage + '%')}`);

  testResults.forEach(result => {
    const status = result.passed ? colors.green('✓') : colors.red('✗');
    console.log(`   ${status} ${result.name}`);
    if (result.error) {
      console.log(`      ${colors.gray(result.error)}`);
    }
  });
}

// ============================================================================
// TESTS
// ============================================================================

async function testHealthCheck() {
  try {
    log('test', 'Testing health check endpoint');
    const response = await axios.get(`${API_BASE}/api/images/health`);
    
    if (response.status === 200) {
      recordResult('Health Check', true);
      return true;
    }
  } catch (error) {
    recordResult('Health Check', false, error.message);
    return false;
  }
}

async function testGetEvents() {
  try {
    log('test', 'Fetching events from API');
    const response = await axios.get(`${API_BASE}/api/events?limit=5`);
    
    if (response.data?.data?.events?.length > 0) {
      recordResult('Get Events', true);
      return response.data.data.events;
    } else {
      recordResult('Get Events', false, 'No events found');
      return [];
    }
  } catch (error) {
    recordResult('Get Events', false, error.message);
    return [];
  }
}

async function testPublicImageUrl(event) {
  try {
    if (!event.s3ImageKey) {
      log('warning', 'Event has no s3ImageKey, skipping public URL test');
      recordResult('Public Image URL', false, 'No s3ImageKey in event');
      return false;
    }

    log('test', `Testing public image URL for event: ${event.name}`);
    
    const imageUrl = `${API_BASE}/api/images/public/${event.s3ImageKey}`;
    
    const response = await axios.head(imageUrl, {
      timeout: 10000
    });

    if (response.status === 200) {
      recordResult('Public Image URL Access', true);
      log('info', 'Public URL', imageUrl);
      return true;
    }
  } catch (error) {
    recordResult('Public Image URL Access', false, error.message);
    return false;
  }
}

async function testPublicImageFetch(event) {
  try {
    if (!event.s3ImageKey) {
      return false;
    }

    log('test', 'Fetching public image content');
    
    const imageUrl = `${API_BASE}/api/images/public/${event.s3ImageKey}`;
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    if (response.data && response.data.length > 0) {
      recordResult('Public Image Fetch', true);
      log('info', 'Image size', `${(response.data.length / 1024).toFixed(2)} KB`);
      return true;
    }
  } catch (error) {
    recordResult('Public Image Fetch', false, error.message);
    return false;
  }
}

async function testEncryptImageUrl(directS3Url) {
  try {
    if (!directS3Url) {
      recordResult('Encrypt Image URL', false, 'No S3 URL provided');
      return null;
    }

    log('test', 'Encrypting S3 URL with AES-256-CBC');
    
    const response = await axios.post(`${API_BASE}/api/images/encrypt-aes`, {
      url: directS3Url
    });

    if (response.data?.data?.encryptedToken) {
      recordResult('Encrypt Image URL', true);
      log('info', 'Encrypted token generated');
      return response.data.data.encryptedToken;
    }
  } catch (error) {
    recordResult('Encrypt Image URL', false, error.message);
    return null;
  }
}

async function testSecureImageUrl(encryptedToken) {
  try {
    if (!encryptedToken) {
      recordResult('Secure Image URL Access', false, 'No encrypted token');
      return false;
    }

    log('test', 'Accessing encrypted image URL');
    
    const response = await axios.head(`${API_BASE}/api/images/secure/${encryptedToken}`, {
      timeout: 10000
    });

    if (response.status === 200) {
      recordResult('Secure Image URL (Encrypted)', true);
      log('info', 'Secure URL', `/api/images/secure/${encryptedToken.substring(0, 30)}...`);
      return true;
    }
  } catch (error) {
    recordResult('Secure Image URL (Encrypted)', false, error.message);
    return false;
  }
}

async function testSecureImageFetch(encryptedToken) {
  try {
    if (!encryptedToken) {
      return false;
    }

    log('test', 'Fetching encrypted image content');
    
    const response = await axios.get(`${API_BASE}/api/images/secure/${encryptedToken}`, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    if (response.data && response.data.length > 0) {
      recordResult('Secure Image Fetch (Encrypted)', true);
      log('info', 'Image size', `${(response.data.length / 1024).toFixed(2)} KB`);
      return true;
    }
  } catch (error) {
    recordResult('Secure Image Fetch (Encrypted)', false, error.message);
    return false;
  }
}

async function testEventImageDetails(event) {
  try {
    if (!event._id) {
      recordResult('Event Image Details', false, 'No event ID');
      return false;
    }

    log('test', 'Checking event image location details');
    
    const response = await axios.get(`${API_BASE}/api/events/${event._id}`);
    const eventData = response.data.data.event;

    const hasImageLocation = eventData.imageLocation?.s3Key;
    const hasCoverImageUrl = eventData.coverImageUrl;

    if (hasImageLocation && hasCoverImageUrl) {
      recordResult('Event Image Details', true);
      log('info', 'S3 Key', eventData.imageLocation.s3Key);
      log('info', 'Cover Image URL', eventData.coverImageUrl);
      
      if (eventData.imageLocation.encryptedS3Url) {
        log('info', 'Encrypted URL available', '✓');
      }
      
      return true;
    }
  } catch (error) {
    recordResult('Event Image Details', false, error.message);
    return false;
  }
}

async function testDirectS3Key(event) {
  try {
    if (!event.s3ImageKey) {
      return false;
    }

    log('test', 'Testing direct S3 key access');
    
    const response = await axios.head(
      `${API_BASE}/api/images/proxy?key=${event.s3ImageKey}`,
      { timeout: 10000 }
    );

    if (response.status === 200) {
      recordResult('Direct S3 Key Access', true);
      return true;
    }
  } catch (error) {
    recordResult('Direct S3 Key Access', false, error.message);
    return false;
  }
}

async function testImageContentType(event) {
  try {
    if (!event.s3ImageKey) {
      return false;
    }

    log('test', 'Checking image content type');
    
    const response = await axios.head(`${API_BASE}/api/images/public/${event.s3ImageKey}`);
    const contentType = response.headers['content-type'];

    if (contentType && contentType.includes('image')) {
      recordResult('Image Content Type Validation', true);
      log('info', 'Content-Type', contentType);
      return true;
    }
  } catch (error) {
    recordResult('Image Content Type Validation', false, error.message);
    return false;
  }
}

async function testCacheHeaders(event) {
  try {
    if (!event.s3ImageKey) {
      return false;
    }

    log('test', 'Checking cache headers');
    
    const response = await axios.head(`${API_BASE}/api/images/public/${event.s3ImageKey}`);
    const cacheControl = response.headers['cache-control'];

    if (cacheControl) {
      recordResult('Cache Headers', true);
      log('info', 'Cache-Control', cacheControl);
      return true;
    }
  } catch (error) {
    recordResult('Cache Headers', false, error.message);
    return false;
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log(colors.bold.cyan('\n╔════════════════════════════════════════╗'));
  console.log(colors.bold.cyan('║  🖼️  IMAGE RETRIEVAL TEST SUITE       ║'));
  console.log(colors.bold.cyan('╚════════════════════════════════════════╝\n'));

  log('info', `API Endpoint: ${colors.cyan(API_BASE)}`);
  log('step', 'Starting image retrieval tests...\n');

  // Test 1: Health check
  const apiHealthy = await testHealthCheck();
  if (!apiHealthy) {
    log('error', `API not responding at ${API_BASE}`, 'Aborting tests');
    return;
  }

  // Test 2: Get events
  const events = await testGetEvents();
  if (events.length === 0) {
    log('warning', 'No events found in database', 'Create events before testing');
    printSummary();
    return;
  }

  const firstEvent = events[0];
  log('info', `Testing with event: ${colors.cyan(firstEvent.name)}`);

  // Test 3-5: Public image access
  await testPublicImageUrl(firstEvent);
  await testPublicImageFetch(firstEvent);
  
  // Test 6: Event image details
  const detailsOk = await testEventImageDetails(firstEvent);
  
  // Test 7: Image content type
  await testImageContentType(firstEvent);

  // Test 8: Cache headers
  await testCacheHeaders(firstEvent);

  // Test 9: Direct S3 key
  await testDirectS3Key(firstEvent);

  // Test 10-11: Encrypted image access
  if (firstEvent.imageLocation?.directS3Url) {
    const encryptedToken = await testEncryptImageUrl(
      firstEvent.imageLocation.directS3Url
    );
    
    if (encryptedToken) {
      await testSecureImageUrl(encryptedToken);
      await testSecureImageFetch(encryptedToken);
    }
  }

  // Print summary
  printSummary();

  // Exit with appropriate code
  const failed = testResults.filter(r => !r.passed).length;
  process.exit(failed > 0 ? 1 : 0);
}

// ============================================================================
// CLI ARGUMENT HANDLING
// ============================================================================

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  IMAGE RETRIEVAL TEST SCRIPT

  Usage: node testImageRetrieval.js [options]

  Options:
    --api <url>      Set API endpoint (default: http://localhost:3000)
    --help, -h       Show this help message

  Environment Variables:
    API_BASE         API endpoint URL

  Examples:
    node testImageRetrieval.js
    node testImageRetrieval.js --api http://localhost:4000
    API_BASE=http://staging-api.com node testImageRetrieval.js
  `);
  process.exit(0);
}

const apiArgIndex = args.indexOf('--api');
if (apiArgIndex !== -1 && args[apiArgIndex + 1]) {
  process.env.API_BASE = args[apiArgIndex + 1];
}

// Run tests
runAllTests().catch(error => {
  log('error', 'Test suite failed', error.message);
  process.exit(1);
});
