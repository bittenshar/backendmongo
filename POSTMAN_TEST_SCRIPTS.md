# Postman Test Scripts for FaceId Extraction

## Quick Copy-Paste Test Scripts

### Script 1: Check Face Exists - Extract faceId

**Location**: Postman Request → Tests tab

```javascript
// ============================================================================
// TEST: Check Face Exists and Extract faceId
// ============================================================================

const responseJson = pm.response.json();

// Test 1: Response is successful
pm.test("Face check response is successful", function() {
  pm.expect(responseJson.status).to.equal("success");
});

// Test 2: Response has required fields
pm.test("Response contains required fields", function() {
  pm.expect(responseJson.data).to.have.property("userId");
  pm.expect(responseJson.data).to.have.property("hasFaceRecord");
  pm.expect(responseJson.data).to.have.property("faceId");
});

// Test 3: Extract and save faceId
const hasFaceRecord = responseJson.data.hasFaceRecord;
const faceId = responseJson.data.faceId;

pm.environment.set("hasFaceRecord", hasFaceRecord);
pm.environment.set("faceId", faceId);

// Test 4: Validate faceId if record exists
if (hasFaceRecord) {
  pm.test("faceId is present when face record exists", function() {
    pm.expect(faceId).to.not.be.null;
    pm.expect(faceId).to.be.a('string');
    pm.expect(faceId.length).to.be.greaterThan(0);
  });
  console.log("✅ Face exists - faceId extracted:", faceId);
} else {
  pm.test("faceId is null when face record does not exist", function() {
    pm.expect(faceId).to.be.null;
  });
  console.log("⚠️ No face record found - faceId is null");
}
```

---

### Script 2: Get Face ID Only - Minimal Extraction

**Location**: Postman Request → Tests tab

```javascript
// ============================================================================
// TEST: Get Face ID Only (Simplified)
// ============================================================================

const responseJson = pm.response.json();

// Check status
pm.test("Status is success", function() {
  pm.expect(responseJson.status).to.equal("success");
});

// Extract faceId
const faceId = responseJson.data.faceId;
const hasFaceRecord = responseJson.data.hasFaceRecord;

pm.environment.set("faceId", faceId);
pm.environment.set("hasFaceRecord", hasFaceRecord);

// Test faceId
if (faceId) {
  pm.test("faceId is valid string", function() {
    pm.expect(faceId).to.be.a('string');
    pm.expect(faceId.length).to.be.greaterThan(5);
  });
  console.log("✅ FaceId:", faceId);
} else {
  console.log("⚠️ FaceId is null");
}

// Display in console
console.log("📊 Face Record Details:");
console.log("   hasFaceRecord:", hasFaceRecord);
console.log("   faceId:", faceId);
console.log("   createdAt:", responseJson.data.createdAt);
```

---

### Script 3: Conditional Flow Based on faceId

**Location**: Postman Request → Tests tab

```javascript
// ============================================================================
// TEST: Conditional Flow - Route Based on FaceId
// ============================================================================

const responseJson = pm.response.json();
const faceId = responseJson.data.faceId;
const hasFaceRecord = responseJson.data.hasFaceRecord;

pm.environment.set("faceId", faceId);

// Decision logic
if (hasFaceRecord && faceId) {
  // Face record exists - proceed with verification
  console.log("✅ FLOW: User has face - Proceeding with verification");
  pm.environment.set("flowStep", "verify");
  pm.environment.set("verificationFaceId", faceId);
  
  pm.test("Flow set to VERIFICATION", function() {
    pm.expect(pm.environment.get("flowStep")).to.equal("verify");
  });
} else {
  // No face record - user needs to register
  console.log("⚠️ FLOW: User needs face registration");
  pm.environment.set("flowStep", "register");
  
  pm.test("Flow set to REGISTRATION", function() {
    pm.expect(pm.environment.get("flowStep")).to.equal("register");
  });
}

// Display flow status
console.log("📋 Flow Status: " + pm.environment.get("flowStep"));
```

---

### Script 4: Automatic Retry if faceId is Missing

**Location**: Postman Request → Tests tab

```javascript
// ============================================================================
// TEST: Retry Logic - Auto-retry if faceId Missing
// ============================================================================

const responseJson = pm.response.json();
const faceId = responseJson.data.faceId;
const userId = pm.environment.get("userId");

pm.environment.set("faceId", faceId);

// Initialize retry counter
if (!pm.environment.get("faceIdRetryCount")) {
  pm.environment.set("faceIdRetryCount", 0);
}

let retryCount = parseInt(pm.environment.get("faceIdRetryCount"));
const MAX_RETRIES = 3;

if (!faceId && retryCount < MAX_RETRIES) {
  // faceId is missing and we haven't exceeded retry limit
  retryCount++;
  pm.environment.set("faceIdRetryCount", retryCount);
  
  console.warn(`⚠️ FaceId is null - Retry ${retryCount}/${MAX_RETRIES}`);
  
  pm.test("Retry attempt " + retryCount, function() {
    pm.expect(true).to.be.true;
  });
  
  // Wait and retry
  setTimeout(function() {
    postman.setNextRequest(pm.info.requestName);
  }, 2000);
} else if (faceId) {
  // faceId found - reset counter
  console.log("✅ FaceId found on attempt " + (retryCount + 1));
  pm.environment.set("faceIdRetryCount", 0);
  
  pm.test("FaceId successfully retrieved", function() {
    pm.expect(faceId).to.not.be.null;
  });
} else {
  // Max retries exceeded
  console.error("❌ Max retries exceeded - faceId still missing");
  pm.environment.set("faceIdRetryCount", 0);
  
  pm.test("ERROR: Max retries exceeded", function() {
    pm.expect(false).to.be.true; // This will fail
  });
}
```

---

### Script 5: Extract and Log All Face Data

**Location**: Postman Request → Tests tab

```javascript
// ============================================================================
// TEST: Comprehensive Data Extraction and Logging
// ============================================================================

const responseJson = pm.response.json();
const data = responseJson.data;

// Extract all fields
const userId = data.userId;
const faceId = data.faceId;
const hasFaceRecord = data.hasFaceRecord;
const createdAt = data.createdAt;

// Save all to environment
pm.environment.set("userId", userId);
pm.environment.set("faceId", faceId);
pm.environment.set("hasFaceRecord", hasFaceRecord);
pm.environment.set("createdAt", createdAt);

// Comprehensive logging
console.log("\n" + "=".repeat(60));
console.log("📊 FACE ID EXTRACTION REPORT");
console.log("=".repeat(60));
console.log("User ID:         " + userId);
console.log("Face Exists:     " + hasFaceRecord);
console.log("Face ID:         " + (faceId || "NOT FOUND"));
console.log("Created At:      " + (createdAt || "N/A"));
console.log("=".repeat(60) + "\n");

// Test all extracted values
pm.test("All data extracted successfully", function() {
  pm.expect(userId).to.be.a('string');
  pm.expect(typeof hasFaceRecord).to.equal('boolean');
  if (faceId) {
    pm.expect(faceId).to.be.a('string');
  }
});

// Create a summary object
const summary = {
  timestamp: new Date().toISOString(),
  userId: userId,
  faceId: faceId,
  hasFaceRecord: hasFaceRecord,
  createdAt: createdAt,
  status: faceId ? "READY_FOR_USE" : "PENDING_REGISTRATION"
};

pm.environment.set("lastFaceCheckSummary", JSON.stringify(summary));
console.log("✅ Summary saved to environment: lastFaceCheckSummary");
```

---

### Script 6: Validate faceId Format

**Location**: Postman Request → Tests tab

```javascript
// ============================================================================
// TEST: Validate FaceId Format
// ============================================================================

const responseJson = pm.response.json();
const faceId = responseJson.data.faceId;

pm.environment.set("faceId", faceId);

if (faceId) {
  // Test faceId format
  pm.test("FaceId format is valid", function() {
    // Check if it's a non-empty string
    pm.expect(faceId).to.be.a('string');
    pm.expect(faceId.length).to.be.greaterThan(10);
    
    // Check if it doesn't contain invalid characters
    pm.expect(faceId).to.match(/^[a-zA-Z0-9\-._~]+$/);
  });
  
  // Check length
  pm.test("FaceId length is reasonable", function() {
    pm.expect(faceId.length).to.be.above(10);
    pm.expect(faceId.length).to.be.below(500);
  });
  
  console.log("✅ FaceId validation passed");
  console.log("   Length: " + faceId.length + " chars");
  console.log("   Format: VALID");
} else {
  pm.test("FaceId format check skipped (no face record)", function() {
    pm.expect(true).to.be.true;
  });
}
```

---

## How to Use These Scripts

### Step 1: Create/Select a Request in Postman

```
GET {{base_url}}/api/registrations/check-face-exists/{{userId}}
```

### Step 2: Go to Tests Tab

Click on the **Tests** tab in the request

### Step 3: Copy Script

Copy one of the scripts above into the Tests tab

### Step 4: Send Request

Click **Send** button

### Step 5: View Results

- Check **Test Results** tab to see passed/failed tests
- Check **Console** (Ctrl+Alt+C) to see detailed logging
- Check **Environment** to see extracted variables

### Step 6: Use Extracted Variables

In next requests, use:
```
{{faceId}}
{{hasFaceRecord}}
{{userId}}
```

---

## Complete Request Example

### Pre-request Script (Optional)

```javascript
// Auto-set userId if not set
if (!pm.environment.get("userId")) {
  pm.environment.set("userId", "user-btiflyc5h-mhulcxxq");
  console.log("⚠️ userId not set - using default");
}
```

### Request Configuration

```
Method:  GET
URL:     {{base_url}}/api/registrations/check-face-exists/{{userId}}
Headers: Authorization: Bearer {{token}}
```

### Tests Script

```javascript
// Copy Script #1 or #2 from above
```

### Variables Used

```
{{base_url}}     = http://localhost:3000
{{userId}}       = user-btiflyc5h-mhulcxxq
{{token}}        = your_jwt_token
```

---

## Debugging

If tests fail, check:

1. **Console Output**: Open Postman Console (Ctrl+Alt+C)
2. **Response Body**: Look at the actual response JSON
3. **Status Code**: Should be 200
4. **Environment Variables**: Check if values are being set

```javascript
// Add debug logging
console.log("Response status:", pm.response.code);
console.log("Response body:", pm.response.json());
console.log("Environment userId:", pm.environment.get("userId"));
console.log("Environment faceId:", pm.environment.get("faceId"));
```

---

**Status**: ✅ READY TO USE
**Scripts**: 6 variations
**Last Updated**: 2024-01-XX
