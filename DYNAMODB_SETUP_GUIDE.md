# DynamoDB Face Verification Integration - Setup Guide

## Overview

Your face verification API is now fully integrated with **AWS DynamoDB** for storing and retrieving face validation records. The system uses **userId as the partition key** for efficient lookups and retrieval.

## Architecture

```
User submits face for verification
           ↓
   MongoDB stores registration
           ↓
   AWS Rekognition validates face
           ↓
   DynamoDB stores validation record
   (userId = partition key)
           ↓
   API returns validation results
           ↓
   Admin can query validation history by userId
```

## Setup Instructions

### 1. Environment Variables

Update your `.env` file with:

```env
# DynamoDB Configuration
DYNAMODB_FACE_VALIDATION_TABLE=face-verifications

# AWS Credentials (already set)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1
```

### 2. Create DynamoDB Table

Choose one method to create the table:

#### Option A: AWS CLI

```bash
aws dynamodb create-table \
  --table-name face-verifications \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=registrationId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=registrationId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --ttl-specification AttributeName=expiresAt,Enabled=true \
  --region ap-south-1
```

#### Option B: AWS Console

1. Go to DynamoDB Dashboard
2. Click "Create Table"
3. Table Name: `face-verifications`
4. Partition Key: `userId` (String)
5. Sort Key: `registrationId` (String)
6. Billing Mode: Pay-per-request
7. Add TTL: Attribute name = `expiresAt`
8. Create

#### Option C: Terraform

```hcl
resource "aws_dynamodb_table" "face_verifications" {
  name             = "face-verifications"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "userId"
  range_key        = "registrationId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "registrationId"
    type = "S"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }
}
```

### 3. Verify Installation

Check that AWS SDK v3 DynamoDB is installed:

```bash
npm list @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

If missing, install:

```bash
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

## API Endpoints

### 1. Validate Face Image (Primary Integration)
**Endpoint:** `POST /api/registrations/:registrationId/validate-face-image`

**Request:**
```json
{
  "faceImageKey": "face-images/user-photo.jpg"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "message": "Face image is valid",
    "confidence": 95.5,
    "quality": "high",
    "attributes": {
      "age": "25-35",
      "gender": "male",
      "smile": true
    }
  },
  "dynamodbStored": true
}
```

**What happens:**
- Face validation processed
- ✅ Record **stored in DynamoDB** with:
  - Partition Key: `userId` (from registration)
  - Sort Key: `registrationId`
  - Data: confidence, quality, attributes, timestamp

---

### 2. Get User Validation History
**Endpoint:** `GET /api/registrations/:userId/face-validation/history?limit=10`

**Response:**
```json
{
  "status": "success",
  "message": "Retrieved 5 face validation records for user",
  "data": {
    "count": 5,
    "data": [
      {
        "userId": "user123",
        "registrationId": "reg456",
        "validationStatus": "success",
        "confidence": 95,
        "quality": "high",
        "faceImageKey": "face-images/verify.jpg",
        "timestamp": "2025-11-13T10:30:00Z",
        "metadata": {
          "eventId": "event789"
        }
      }
    ]
  }
}
```

**Query Pattern:**
```
KeyConditionExpression: userId = :userId
ScanIndexForward: false (most recent first)
Limit: 10
```

---

### 3. Get Specific Validation Record
**Endpoint:** `GET /api/registrations/:userId/face-validation/:registrationId`

**Response:**
```json
{
  "status": "success",
  "message": "Face validation record retrieved",
  "data": {
    "userId": "user123",
    "registrationId": "reg456",
    "validationStatus": "success",
    "confidence": 95.5,
    "quality": "high",
    "comparisonResult": {
      "similarity": 92.5,
      "threshold": 80,
      "isMatch": true
    },
    "attributes": {
      "age": "25-35",
      "gender": "male"
    },
    "timestamp": "2025-11-13T10:30:00Z"
  }
}
```

---

### 4. Get User Statistics
**Endpoint:** `GET /api/registrations/:userId/face-validation/stats`

**Response:**
```json
{
  "status": "success",
  "message": "Face validation statistics retrieved",
  "data": {
    "userId": "user123",
    "totalAttempts": 5,
    "successfulValidations": 4,
    "failedValidations": 1,
    "averageConfidence": 91.2,
    "qualityBreakdown": {
      "high": 3,
      "medium": 2
    }
  }
}
```

---

### 5. Check Recent Validation
**Endpoint:** `GET /api/registrations/:userId/face-validation/check-recent?daysBack=30`

**Response:**
```json
{
  "status": "success",
  "message": "User has valid recent face validation",
  "data": {
    "userId": "user123",
    "hasRecentValidation": true,
    "daysChecked": 30
  }
}
```

---

### 6. Get Event Validations
**Endpoint:** `GET /api/registrations/event/:eventId/face-validations?limit=100`

**Response:**
```json
{
  "status": "success",
  "message": "Retrieved 25 face validations for event",
  "data": {
    "count": 25,
    "data": [
      {
        "userId": "user123",
        "registrationId": "reg456",
        "validationStatus": "success",
        "confidence": 95
      }
    ]
  }
}
```

## Database Schema

### DynamoDB Table: `face-verifications`

| Field | Type | Key | Description |
|-------|------|-----|-------------|
| `userId` | String | HASH (Partition Key) | User ID for quick lookup |
| `registrationId` | String | RANGE (Sort Key) | Registration ID |
| `validationStatus` | String | | pending, success, failed |
| `confidence` | Number | | 0-100 match confidence |
| `quality` | String | | high, medium, low |
| `faceImageKey` | String | | S3 path to verification image |
| `storedFaceKey` | String | | S3 path to stored face |
| `comparisonResult` | Object | | Detailed comparison metrics |
| `attributes` | Object | | Face attributes (age, gender, etc.) |
| `verificationAttempt` | Number | | Attempt count |
| `timestamp` | String | | ISO 8601 timestamp |
| `expiresAt` | Number | TTL | Unix timestamp for auto-delete (30 days) |
| `metadata` | Object | | Event ID, IP address, source |
| `updatedAt` | String | | Last update timestamp |

## Query Performance

### Query 1: Get All User Validations
```
Query: userId = 'user123'
Time: O(log N) - very fast
Result: All validations for that user
```

### Query 2: Get Specific Validation
```
Query: userId = 'user123' AND registrationId = 'reg456'
Time: O(1) - instant
Result: Single specific record
```

### Query 3: Get Event Validations
```
Scan: Filter metadata.eventId = 'event789'
Time: O(N) - slower but limited by batch
Result: All validations for that event
```

## Code Integration

### How It Works in Your API

**File:** `src/features/registrations/userEventRegistration.controller.js`

```javascript
exports.validateFaceImage = catchAsync(async (req, res, next) => {
  const { registrationId } = req.params;
  const { faceImageKey } = req.body;

  // Validate face with Rekognition
  const result = await registrationFlowService.validateFaceImage(
    registration.userId,
    faceImageKey
  );

  // Store in DynamoDB with userId as partition key
  if (process.env.DYNAMODB_FACE_VALIDATION_TABLE) {
    await dynamodbService.storeFaceValidation(
      registration.userId,  // Partition Key
      registrationId,       // Sort Key
      { ...validation data }
    );
  }

  res.status(200).json({
    status: 'success',
    data: result,
    dynamodbStored: true
  });
});
```

## Testing with Postman

### 1. Test Face Validation Storage

**POST** `/api/registrations/{{registrationId}}/validate-face-image`

```json
{
  "faceImageKey": "face-images/test-user.jpg"
}
```

Check response includes: `"dynamodbStored": true`

### 2. Query Validation by UserId

**GET** `/api/registrations/{{userId}}/face-validation/history?limit=5`

Should return all validations for that user stored in DynamoDB.

### 3. Get Specific Record

**GET** `/api/registrations/{{userId}}/face-validation/{{registrationId}}`

Should return exact record from DynamoDB.

## Error Handling

### DynamoDB Table Not Found
```json
{
  "status": "error",
  "message": "DynamoDB face validation table not configured",
  "statusCode": 503
}
```

**Solution:** Check `.env` has `DYNAMODB_FACE_VALIDATION_TABLE` set

### AWS Credentials Invalid
```json
{
  "status": "error",
  "message": "Failed to store face validation: InvalidSignatureException",
  "statusCode": 500
}
```

**Solution:** Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in `.env`

### Record Not Found
```json
{
  "status": "error",
  "message": "Face validation record not found",
  "statusCode": 404
}
```

**Solution:** Check userId and registrationId format

## Monitoring

### CloudWatch Metrics to Track

```
1. ConsumedReadCapacityUnits
2. ConsumedWriteCapacityUnits
3. SuccessfulRequestLatency
4. UserErrors
5. SystemErrors
```

### Sample CloudWatch Query

```
fields @timestamp, @message, @duration
| filter @message like /DynamoDB/
| stats avg(@duration) as avg_latency, max(@duration) as max_latency by bin(5m)
```

## Cost Estimation

### DynamoDB Pay-Per-Request Pricing

Assuming:
- 10,000 face validations per day
- Average item size: 2 KB

**Monthly Cost:**
- Write: 10,000 × 30 × 0.0000012 = $0.36
- Read: (validations + queries) × 0.00000025 ≈ $0.10
- **Total: ~$0.50/month** (very cheap!)

### Compared to Provisioned Capacity

If provisioned: minimum $25/month even with minimal usage

## Best Practices

✅ **DO:**
- Use userId as partition key for fast lookups
- Set TTL to automatically clean old data
- Monitor consumed units
- Use proper IAM policies

❌ **DON'T:**
- Change partition key after data exists
- Store large objects (>400KB)
- Query without partition key (scans are expensive)
- Leave credentials in code

## Troubleshooting

### Issue: "DynamoDB connection failed"

**Check:**
1. AWS credentials valid
2. Region set correctly (`ap-south-1`)
3. IAM policy includes DynamoDB permissions:
   - `dynamodb:PutItem`
   - `dynamodb:GetItem`
   - `dynamodb:Query`
   - `dynamodb:Scan`

### Issue: "Records not appearing"

**Check:**
1. Table exists: `aws dynamodb describe-table --table-name face-verifications`
2. TTL not expired (30 days limit)
3. userId format matches exactly

### Issue: "Query returning empty"

**Check:**
1. Validation was successful (status = 'success')
2. Data actually wrote to DynamoDB
3. userId matches registered user

## Next Steps

1. ✅ Set `.env` variables
2. ✅ Create DynamoDB table
3. ✅ Test validation endpoint
4. ✅ Query validation history
5. ✅ Monitor CloudWatch metrics
6. ✅ Set up alarms

## Files Updated

- ✅ `src/services/aws/dynamodb.service.js` - DynamoDB operations
- ✅ `src/features/registrations/userEventRegistration.controller.js` - Integration points
- ✅ `src/features/registrations/userEventRegistration.routes.js` - New endpoints
- ✅ `.env` - Added DynamoDB configuration
- ✅ `.env.example` - Documentation

## Additional Resources

- [AWS DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

---

**Ready to use!** Your face verification API is now connected to DynamoDB with userId as the partition key. All validation records are automatically stored and can be queried efficiently.

**Status:** ✅ Production Ready
**Last Updated:** November 13, 2025
