#!/usr/bin/env node

/**
 * IMAGE ACCESS - DIAGNOSTIC SCRIPT
 * 
 * Diagnoses why image endpoints might fail
 * Run: node diagnoseImageIssue.js
 */

// Load .env file
require('dotenv').config();

console.log('\n📊 IMAGE ACCESS DIAGNOSTIC REPORT\n');
console.log('================================\n');

// 1. Check environment variables
console.log('1️⃣  ENVIRONMENT VARIABLES:\n');

const requiredVars = [
  'AWS_EVENT_IMAGES_BUCKET',
  'AWS_S3_BUCKET',
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY'
];

const envVars = {};
let envOk = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const display = value ? value.substring(0, 20) + '...' : 'NOT SET';
  
  console.log(`   ${status} ${varName.padEnd(30)} ${display}`);
  envVars[varName] = value;
  
  if (!value && (varName.includes('AWS') || varName.includes('BUCKET'))) {
    envOk = false;
  }
});

// 2. Check S3 bucket configuration
console.log('\n2️⃣  S3 BUCKET CONFIGURATION:\n');

const bucket = process.env.AWS_EVENT_IMAGES_BUCKET || process.env.AWS_S3_BUCKET || 'event-images-collection';
const region = process.env.AWS_REGION || 'ap-south-1';

console.log(`   Bucket: ${bucket}`);
console.log(`   Region: ${region}`);
console.log(`   Base URL: https://${bucket}.s3.${region}.amazonaws.com/`);

// 3. Show example S3 URL construction
console.log('\n3️⃣  EXAMPLE S3 URL CONSTRUCTION:\n');

const exampleKey = 'events/694291bb1e613c43e1b18a76/cover.jpeg';
const s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${exampleKey}`;

console.log(`   S3 Key: ${exampleKey}`);
console.log(`   S3 URL: ${s3Url}`);

// 4. API endpoint URLs
console.log('\n4️⃣  API ENDPOINT URLS:\n');

const baseUrl = process.env.API_BASE || 'http://localhost:3000';

console.log(`   Public endpoint:`);
console.log(`   ${baseUrl}/api/images/public/${exampleKey}`);
console.log(`\n   Secure endpoint (needs encryption first):`);
console.log(`   ${baseUrl}/api/images/secure/{encryptedToken}`);
console.log(`\n   Direct proxy endpoint:`);
console.log(`   ${baseUrl}/api/images/proxy?key=${exampleKey}`);

// 5. Common issues
console.log('\n5️⃣  COMMON ISSUES & FIXES:\n');

const issues = [];

if (!process.env.AWS_EVENT_IMAGES_BUCKET && !process.env.AWS_S3_BUCKET) {
  issues.push({
    issue: 'No S3 bucket specified',
    default: 'event-images-collection',
    fix: 'Set AWS_EVENT_IMAGES_BUCKET in .env'
  });
}

if (!process.env.AWS_REGION) {
  issues.push({
    issue: 'No AWS region specified',
    default: 'ap-south-1',
    fix: 'Set AWS_REGION in .env'
  });
}

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  issues.push({
    issue: 'Missing AWS credentials',
    fix: 'Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env'
  });
}

if (issues.length === 0) {
  console.log('   ✅ No obvious issues detected\n');
} else {
  issues.forEach((item, i) => {
    console.log(`   Issue ${i + 1}: ${item.issue}`);
    if (item.default) {
      console.log(`   Default: ${item.default}`);
    }
    console.log(`   Fix: ${item.fix}\n`);
  });
}

// 6. Testing commands
console.log('6️⃣  TESTING COMMANDS:\n');

console.log('   Test health check:');
console.log(`   curl ${baseUrl}/api/images/health\n`);

console.log('   Test public image access:');
console.log(`   curl ${baseUrl}/api/images/public/events/YOUR_EVENT_ID/cover.jpeg\n`);

console.log('   Test with direct S3 key:');
console.log(`   curl ${baseUrl}/api/images/proxy?key=events/YOUR_EVENT_ID/cover.jpeg\n`);

// 7. Vercel specific checks
console.log('7️⃣  VERCEL DEPLOYMENT CHECKLIST:\n');

console.log('   If deploying to Vercel:');
console.log('   ☐ Set AWS_EVENT_IMAGES_BUCKET in Vercel env vars');
console.log('   ☐ Set AWS_REGION in Vercel env vars');
console.log('   ☐ Set AWS_ACCESS_KEY_ID in Vercel env vars');
console.log('   ☐ Set AWS_SECRET_ACCESS_KEY in Vercel env vars');
console.log('   ☐ Set URL_SECRET in Vercel env vars (for encryption)');
console.log('   ☐ Verify S3 bucket is public-readable');
console.log('   ☐ Check AWS IAM permissions allow GetObject');
console.log('   ☐ Verify image exists in S3');
console.log('   ☐ Check CORS settings on S3 bucket\n');

// 8. Summary
console.log('8️⃣  SUMMARY:\n');

if (envOk) {
  console.log('   ✅ Environment variables look good');
} else {
  console.log('   ❌ Missing required environment variables');
  console.log('   👉 The .env file must be configured');
}

console.log(`   Using bucket: ${bucket}`);
console.log(`   Using region: ${region}`);

console.log('\n================================\n');
console.log('For more help, check:');
console.log('   📖 IMAGE_QUICK_REFERENCE.md');
console.log('   📖 IMAGE_RETRIEVAL_GUIDE.md\n');

process.exit(envOk ? 0 : 1);
