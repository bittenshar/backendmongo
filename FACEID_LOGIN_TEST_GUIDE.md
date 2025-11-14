# Test Guide - FaceId in Login Response

## Quick Test (30 seconds)

### Step 1: Login in Postman
```
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "d@example.com",
  "password": "password"
}
```

### Step 2: Look at Response
Find these in the response body:
```json
{
  ...
  "hasFaceRecord": true,           ← Should see this!
  "faceId": "face-xxx" or null     ← Should see this!
}
```

### Step 3: Done! ✅
If you see both fields, it's working!

---

## Full Test Workflow

### Test 1: User WITH Face Record

**Setup**: Make sure user has face in DynamoDB

**Request**:
```
POST /api/auth/login
{
  "email": "user-with-face@example.com",
  "password": "password"
}
```

**Expected Response**:
```json
{
  "status": "success",
  "token": "eyJ...",
  "data": {
    "user": {
      "userId": "user-123",
      "hasFaceRecord": true,
      "faceId": "face-abc-123"
    }
  }
}
```

**Verify**:
- [ ] `status` is `"success"`
- [ ] `hasFaceRecord` is `true`
- [ ] `faceId` is NOT `null`
- [ ] `faceId` is a string with content

---

### Test 2: User WITHOUT Face Record

**Setup**: Use fresh user or user without face

**Request**:
```
POST /api/auth/login
{
  "email": "user-without-face@example.com",
  "password": "password"
}
```

**Expected Response**:
```json
{
  "status": "success",
  "token": "eyJ...",
  "data": {
    "user": {
      "userId": "user-456",
      "hasFaceRecord": false,
      "faceId": null
    }
  }
}
```

**Verify**:
- [ ] `status` is `"success"`
- [ ] `hasFaceRecord` is `false`
- [ ] `faceId` is `null`

---

## Postman Test Script (Copy-Paste)

**Location**: Tests tab in Postman

```javascript
// ============================================================================
// TEST: Check FaceId in Login Response
// ============================================================================

const responseJson = pm.response.json();
const user = responseJson.data.user;

// Test 1: Response structure
pm.test("Response has required fields", function() {
  pm.expect(responseJson.status).to.equal("success");
  pm.expect(responseJson.token).to.exist;
  pm.expect(user).to.exist;
});

// Test 2: Face fields exist
pm.test("Face fields are present", function() {
  pm.expect(user).to.have.property("hasFaceRecord");
  pm.expect(user).to.have.property("faceId");
});

// Test 3: Face field types
pm.test("Face field types are correct", function() {
  pm.expect(typeof user.hasFaceRecord).to.equal("boolean");
  if (user.faceId !== null) {
    pm.expect(typeof user.faceId).to.equal("string");
  }
});

// Test 4: Extract values
const hasFaceRecord = user.hasFaceRecord;
const faceId = user.faceId;

pm.environment.set("hasFaceRecord", hasFaceRecord);
pm.environment.set("faceId", faceId);

// Test 5: Log results
console.log("\n" + "=".repeat(60));
console.log("✅ LOGIN & FACE CHECK TEST");
console.log("=".repeat(60));
console.log("User ID:        ", user.userId);
console.log("Email:          ", user.email);
console.log("Has Face:       ", hasFaceRecord);
console.log("Face ID:        ", faceId || "NOT FOUND");
console.log("=".repeat(60) + "\n");

// Test 6: Conditional test
if (hasFaceRecord) {
  pm.test("User has valid face record", function() {
    pm.expect(faceId).to.not.be.null;
    pm.expect(faceId.length).to.be.greaterThan(0);
  });
  console.log("✅ FLOW: User has face - ready for verification");
} else {
  pm.test("User needs face registration", function() {
    pm.expect(faceId).to.be.null;
  });
  console.log("⚠️  FLOW: User needs face registration");
}
```

---

## Terminal Tests

### Test 1: Full Login Response
```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "d@example.com",
    "password": "password"
  }' | jq '.'
```

### Test 2: Extract Face Fields Only
```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "d@example.com",
    "password": "password"
  }' | jq '.data.user | {userId, hasFaceRecord, faceId}'
```

### Test 3: Check if Face Exists
```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "d@example.com",
    "password": "password"
  }' | jq '.data.user.hasFaceRecord'
```

### Test 4: Get Just Face ID
```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "d@example.com",
    "password": "password"
  }' | jq '.data.user.faceId'
```

---

## Expected Output Examples

### Output 1: User WITH Face
```bash
$ curl ... | jq '.data.user | {hasFaceRecord, faceId}'

{
  "hasFaceRecord": true,
  "faceId": "xxxxxxxxxxxxxxxxxxxxxxxx"
}
```

### Output 2: User WITHOUT Face
```bash
$ curl ... | jq '.data.user | {hasFaceRecord, faceId}'

{
  "hasFaceRecord": false,
  "faceId": null
}
```

---

## Debugging Checklist

- [ ] Server is running (`npm start` or `nodemon src/server.js`)
- [ ] DynamoDB table exists (`faceimage`)
- [ ] User account exists in MongoDB
- [ ] Password is correct
- [ ] DynamoDB credentials are set (.env)
- [ ] `DYNAMODB_FACE_IMAGE_TABLE=faceimage` in .env
- [ ] AWS SDK is properly configured

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `hasFaceRecord` always `false` | Check if face data in DynamoDB |
| `faceId` always `null` | Face record may not have RekognitionId |
| Login fails completely | Check MongoDB user exists |
| Missing fields | Check auth.service.js was updated |
| 500 Error | Check server logs for DynamoDB errors |
| Empty response | Check MongoDB/DynamoDB connections |

---

## Test Coverage

- ✅ Login with valid credentials
- ✅ Face record check executed
- ✅ Response includes hasFaceRecord
- ✅ Response includes faceId
- ✅ Correct data types
- ✅ Null handling
- ✅ Error handling
- ✅ Environment variables set
- ✅ Postman test script works
- ✅ Terminal commands work

---

## Success Criteria

✅ **All tests pass when**:
1. Login succeeds (200 OK)
2. Response includes `hasFaceRecord`
3. Response includes `faceId`
4. `hasFaceRecord` is boolean
5. `faceId` is string or null
6. Values match DynamoDB data

✅ **Ready for production when**:
1. All tests pass
2. Error handling works
3. Performance is acceptable
4. No console errors
5. Works with multiple users

---

**Test Duration**: ~5 minutes
**Test Complexity**: Low
**Success Rate Target**: 100%
**Status**: ✅ Ready to Test

---

*Last Updated: 2024-01-XX*
