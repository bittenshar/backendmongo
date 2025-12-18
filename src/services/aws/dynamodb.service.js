const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const AppError = require('../../shared/utils/appError');

/**
 * ============================================================================
 * DynamoDB Service - Face Image Storage (faceimage Table)
 * ============================================================================
 * 
 * ACTUAL TABLE STRUCTURE:
 * 
 * Table Name: faceimage
 * - Primary Key (HASH): RekognitionId (String) - UNIQUE IDENTIFIER FOR EACH FACE
 * - Global Secondary Index (GSI): userId-index
 *   - HASH: UserId (String)
 *   - RANGE: RekognitionId (String)
 * 
 * BUSINESS RULE: ONE FACE PER USER (STRICT DUPLICATE PREVENTION)
 * - Before storing new face: Query GSI by UserId
 * - If UserId exists in GSI: Return 409 Conflict (duplicate not allowed)
 * - If UserId not found: Proceed with storage using unique RekognitionId as PK
 * 
 * Data Structure:
 * {
 *   RekognitionId: "rek_id_12345" [PK - HASH KEY],
 *   UserId: "user_123" [GSI - Query key for duplicate check],
 *   Name: "John Doe",
 *   FaceS3Url: "s3://bucket/path/face.jpg",
 *   FaceId: "face_abc123" [Rekognition face ID],
 *   Confidence: 95.5,
 *   Status: "verified|pending",
 *   Timestamp: "2024-01-15T10:30:00Z",
 *   CreatedAt: "2024-01-15T10:30:00Z",
 *   UpdatedAt: "2024-01-15T10:30:00Z"
 * }
 * ============================================================================
 */

/**
 * Initialize DynamoDB client
 */
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  })
});

const docClient = DynamoDBDocumentClient.from(client);

const FACE_IMAGE_TABLE = process.env.DYNAMODB_FACE_IMAGE_TABLE || 'faceimage';
const USER_ID_INDEX = 'userId-index';
// Backwards-compatibility: some parts of the codebase expect DYNAMODB_FACE_VALIDATION_TABLE
process.env.DYNAMODB_FACE_VALIDATION_TABLE = process.env.DYNAMODB_FACE_VALIDATION_TABLE || process.env.DYNAMODB_FACE_IMAGE_TABLE;

/**
 * CHECK IF USER ALREADY HAS A FACE RECORD (DUPLICATE PREVENTION)
 * 
 * CRITICAL: Call this BEFORE creating a new face record.
 * Queries the userId-index GSI to check if userId already has a face image.
 * Prevents duplicate userId entries (one face per user policy).
 * 
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>} true if user exists, false if new user
 * @throws {AppError} 409 Conflict if user already has face record
 */
/**
 * CHECK IF USER FACE EXISTS (Simple query - doesn't throw errors)
 * Used by /check-face-exists endpoint to just report existence
 * Returns: true if face exists, false otherwise
 */
exports.checkIfUserFaceExists = async (userId) => {
  try {
    const params = {
      TableName: FACE_IMAGE_TABLE,
      IndexName: USER_ID_INDEX,
      KeyConditionExpression: 'UserId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      Select: 'COUNT' // Only count, don't fetch items
    };

    const result = await docClient.send(new QueryCommand(params));
    return result.Count > 0; // Just return true/false
  } catch (error) {
    console.error('❌ Error checking user face existence:', error);
    throw new AppError(`Failed to check user face existence: ${error.message}`, 500);
  }
};

/**
 * VALIDATE USER FACE EXISTS (Validation query - throws 409 on duplicate)
 * Used by /validate-before-creation endpoint for duplicate prevention
 * Throws 409 Conflict if user already has a face record
 */
exports.userFaceExists = async (userId) => {
  try {
    const params = {
      TableName: FACE_IMAGE_TABLE,
      IndexName: USER_ID_INDEX,
      KeyConditionExpression: 'UserId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      Select: 'COUNT' // Only count, don't fetch items
    };

    const result = await docClient.send(new QueryCommand(params));

    // If count > 0, user already has a face record
    if (result.Count > 0) {
      console.warn(`⚠️  Duplicate userId attempt: ${userId} already has face record`);
      throw new AppError(
        `User already has a face record. Only one face per user is allowed. Please contact support to reset.`,
        409 // Conflict status code
      );
    }

    console.log(`✅ Validation passed: ${userId} is new user, safe to create face record`);
    return false; // User is new, safe to proceed
  } catch (error) {
    if (error.statusCode === 409) {
      throw error; // Re-throw duplicate error
    }
    console.error('❌ Error checking user face existence:', error);
    throw new AppError(`Failed to validate user: ${error.message}`, 500);
  }
};

/**
 * STORE FACE IMAGE (WITH DUPLICATE PREVENTION)
 * 
 * Creates a NEW face record for a user. 
 * REQUIRED: Call userFaceExists() FIRST to check for duplicates.
 * Only ONE record per userId allowed. Throws 409 if userId already exists.
 * 
 * Uses RekognitionId as Primary Key for unique identification.
 * UserId stored in record for GSI querying and duplicate prevention.
 * 
 * @param {string} rekognitionId - Unique Rekognition ID (becomes Primary Key)
 * @param {string} userId - User ID (stored for GSI query)
 * @param {string} name - User name
 * @param {Object} faceData - Face image data
 *   - faceData.faceS3Url: S3 URL of face image
 *   - faceData.faceId: Rekognition face ID
 *   - faceData.confidence: Confidence score
 *   - faceData.status: "verified" or "pending"
 * @returns {Promise<Object>} Created record confirmation
 * @throws {AppError} 409 if userId already has face record (duplicate)
 */
exports.storeFaceImage = async (rekognitionId, userId, name, faceData) => {
  try {
    // Step 1: VALIDATE - Check for duplicate BEFORE storing
    await exports.userFaceExists(userId);

    const timestamp = new Date().toISOString();

    // Step 2: STORE - Create new record with RekognitionId as PK
    const params = {
      TableName: FACE_IMAGE_TABLE,
      Item: {
        RekognitionId: rekognitionId, // Primary Key (HASH)
        UserId: userId, // For GSI queries and duplicate checks
        Name: name,
        FaceS3Url: faceData.faceS3Url,
        FaceId: faceData.faceId,
        Confidence: faceData.confidence || 0,
        Status: faceData.status || 'pending',
        Timestamp: timestamp,
        CreatedAt: timestamp,
        UpdatedAt: timestamp
      }
    };

    const result = await docClient.send(new PutCommand(params));
    
    console.log(`✅ Face image stored for userId: ${userId}, rekognitionId: ${rekognitionId}`);
    
    return {
      success: true,
      userId,
      rekognitionId,
      name,
      timestamp,
      message: 'Face image stored successfully - duplicate prevention enforced'
    };
  } catch (error) {
    if (error.statusCode === 409) {
      throw error; // Re-throw duplicate error
    }
    console.error('❌ Error storing face image in DynamoDB:', error);
    throw new AppError(`Failed to store face image: ${error.message}`, 500);
  }
};

/**
 * GET USER'S FACE IMAGE (BY USERID)
 * 
 * Retrieve the ONE face record for a user using the userId-index GSI.
 * Returns the user's face data if exists.
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User's face record
 * @throws {AppError} 404 if record not found
 */
exports.getUserFaceRecord = async (userId) => {
  try {
    const params = {
      TableName: FACE_IMAGE_TABLE,
      IndexName: USER_ID_INDEX,
      KeyConditionExpression: 'UserId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      Limit: 1
    };

    const result = await docClient.send(new QueryCommand(params));
    
    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return {
      success: true,
      data: result.Items[0]
    };
  } catch (error) {
    // Check if it's a credential error
    if (error.message && (error.message.includes('security token') || error.message.includes('InvalidSignatureException'))) {
      console.error('❌ AWS Credential Error:', error.message);
      console.error('   Your AWS credentials may be expired or invalid');
      console.error('   Please update AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env');
      throw new AppError(
        `AWS credentials invalid or expired: ${error.message}`,
        401
      );
    }
    console.error('❌ Error retrieving face record:', error);
    throw new AppError(`Failed to retrieve face record: ${error.message}`, 500);
  }
};



/**
 * GET FACE IMAGE BY REKOGNITION ID (BY PRIMARY KEY)
 * 
 * Direct lookup using RekognitionId as primary key.
 * Fast direct access to a specific face record.
 * 
 * @param {string} rekognitionId - Rekognition ID (Primary Key)
 * @returns {Promise<Object>} Face record
 * @throws {AppError} 404 if record not found
 */
exports.getFaceByRekognitionId = async (rekognitionId) => {
  try {
    const params = {
      TableName: FACE_IMAGE_TABLE,
      Key: {
        RekognitionId: rekognitionId
      }
    };

    const result = await docClient.send(new GetCommand(params));

    if (!result.Item) {
      throw new AppError(`No face record found for rekognitionId: ${rekognitionId}`, 404);
    }

    console.log(`✅ Face record retrieved for rekognitionId: ${rekognitionId}`);

    return {
      success: true,
      data: result.Item
    };
  } catch (error) {
    if (error.statusCode === 404) {
      throw error;
    }
    console.error('❌ Error retrieving face record:', error);
    throw new AppError(`Failed to retrieve face record: ${error.message}`, 500);
  }
};

/**
 * UPDATE FACE IMAGE RECORD
 * 
 * Update an existing face record by RekognitionId (Primary Key).
 * Cannot change RekognitionId or UserId (primary/GSI keys).
 * 
 * @param {string} rekognitionId - Rekognition ID (Primary Key)
 * @param {Object} updateData - Data to update (cannot include RekognitionId or UserId)
 * @returns {Promise<Object>} Updated record
 */
exports.updateFaceImage = async (rekognitionId, updateData) => {
  try {
    // Build update expression dynamically
    const updateExpressions = [];
    const expressionAttributeValues = {};
    let counter = 0;

    Object.keys(updateData).forEach(key => {
      // Cannot update primary or GSI keys
      if (key !== 'RekognitionId' && key !== 'UserId') {
        updateExpressions.push(`${key} = :val${counter}`);
        expressionAttributeValues[`:val${counter}`] = updateData[key];
        counter++;
      }
    });

    // Always update timestamp
    updateExpressions.push(`UpdatedAt = :timestamp`);
    expressionAttributeValues[':timestamp'] = new Date().toISOString();

    const params = {
      TableName: FACE_IMAGE_TABLE,
      Key: {
        RekognitionId: rekognitionId
      },
      UpdateExpression: 'SET ' + updateExpressions.join(', '),
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    const result = await docClient.send(new UpdateCommand(params));

    console.log(`✅ Face image updated for rekognitionId: ${rekognitionId}`);

    return {
      success: true,
      data: result.Attributes
    };
  } catch (error) {
    console.error('❌ Error updating face image:', error);
    throw new AppError(`Failed to update face image: ${error.message}`, 500);
  }
};

/**
 * DELETE FACE IMAGE RECORD
 * 
 * Remove face record by RekognitionId (Primary Key).
 * Allows user to reset and re-register.
 * USE WITH CAUTION - This removes all face data for the user.
 * 
 * @param {string} rekognitionId - Rekognition ID to delete
 * @returns {Promise<Object>} Deletion confirmation
 */
exports.deleteFaceImage = async (rekognitionId) => {
  try {
    const params = {
      TableName: FACE_IMAGE_TABLE,
      Key: {
        RekognitionId: rekognitionId
      }
    };

    const result = await docClient.send(new DeleteCommand(params));

    console.log(`✅ Face image deleted for rekognitionId: ${rekognitionId}`);

    return {
      success: true,
      rekognitionId,
      message: 'Face image deleted successfully - user can now re-register'
    };
  } catch (error) {
    console.error('❌ Error deleting face image:', error);
    throw new AppError(`Failed to delete face image: ${error.message}`, 500);
  }
};

/**
 * DELETE USER'S FACE RECORD BY USERID
 * 
 * Remove face record for a user by querying userId-index GSI first.
 * Useful for admin operations when userId is known but RekognitionId is not.
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Deletion confirmation
 */
exports.deleteFaceImageByUserId = async (userId) => {
  try {
    // Step 1: Find the face record by UserId using GSI
    const queryParams = {
      TableName: FACE_IMAGE_TABLE,
      IndexName: USER_ID_INDEX,
      KeyConditionExpression: 'UserId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    };

    const queryResult = await docClient.send(new QueryCommand(queryParams));

    if (!queryResult.Items || queryResult.Items.length === 0) {
      throw new AppError(`No face record found for userId: ${userId}`, 404);
    }

    const rekognitionId = queryResult.Items[0].RekognitionId;

    // Step 2: Delete using RekognitionId (Primary Key)
    const deleteParams = {
      TableName: FACE_IMAGE_TABLE,
      Key: {
        RekognitionId: rekognitionId
      }
    };

    await docClient.send(new DeleteCommand(deleteParams));

    console.log(`✅ Face image deleted for userId: ${userId}, rekognitionId: ${rekognitionId}`);

    return {
      success: true,
      userId,
      rekognitionId,
      message: 'Face image deleted successfully - user can now re-register'
    };
  } catch (error) {
    if (error.statusCode === 404) {
      throw error;
    }
    console.error('❌ Error deleting face image by userId:', error);
    throw new AppError(`Failed to delete face image: ${error.message}`, 500);
  }
};

/**
 * GET ALL FACE IMAGES (ADMIN USE)
 * 
 * Scan entire table to get all face records.
 * WARNING: This is expensive for large tables - use pagination.
 * 
 * @param {number} limit - Maximum records to return
 * @returns {Promise<Object>} Array of face records
 */
exports.getAllFaceImages = async (limit = 100) => {
  try {
    const params = {
      TableName: FACE_IMAGE_TABLE,
      Limit: limit
    };

    const result = await docClient.send(new ScanCommand(params));

    console.log(`✅ Retrieved ${result.Items.length} face records`);

    return {
      success: true,
      count: result.Items.length,
      data: result.Items,
      lastEvaluatedKey: result.LastEvaluatedKey || null
    };
  } catch (error) {
    console.error('❌ Error scanning face records:', error);
    throw new AppError(`Failed to retrieve face records: ${error.message}`, 500);
  }
};

/**
 * VALIDATE USER CAN CREATE FACE
 * 
 * Combined check for duplicate prevention.
 * Returns user existence status and enforces one-face-per-user policy.
 * 
 * @param {string} userId - User ID to validate
 * @returns {Promise<Object>} Validation result with exists flag
 * @throws {AppError} 409 if user already has face record
 */
exports.validateUserCanCreateFace = async (userId) => {
  try {
    const params = {
      TableName: FACE_IMAGE_TABLE,
      IndexName: USER_ID_INDEX,
      KeyConditionExpression: 'UserId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      Select: 'COUNT'
    };

    const result = await docClient.send(new QueryCommand(params));

    if (result.Count > 0) {
      throw new AppError(
        `User already has a face record. Only one face per user is allowed.`,
        409
      );
    }

    return {
      success: true,
      canCreate: true,
      message: 'User can create face record'
    };
  } catch (error) {
    if (error.statusCode === 409) {
      throw error;
    }
    console.error('❌ Error validating user:', error);
    throw new AppError(`Validation failed: ${error.message}`, 500);
  }
};

/**
 * INITIALIZE DYNAMODB SERVICE
 * 
 * Note: Table is already created. This validates configuration.
 * 
 * Table Configuration (ALREADY CREATED):
 * - Table Name: faceimage
 * - Primary Key (HASH): RekognitionId (String)
 * - Global Secondary Index (GSI): userId-index
 *   - HASH: UserId (String)
 *   - RANGE: RekognitionId (String)
 * - Billing Mode: Provisioned (1 RCU, 1 WCU)
 * - Status: ACTIVE
 */
exports.initializeService = async () => {
  try {
    console.log('ℹ️  DynamoDB Service Initialized');
    console.log(`Table Name: ${FACE_IMAGE_TABLE}`);
    console.log('Primary Key (HASH): RekognitionId (String)');
    console.log(`Global Secondary Index: ${USER_ID_INDEX}`);
    console.log('  - HASH: UserId (String)');
    console.log('  - RANGE: RekognitionId (String)');
    console.log('Duplicate Prevention: UserId queried via GSI before storage');
    console.log('Business Rule: One face per user (409 Conflict if duplicate)');
    
    // Check if AWS credentials are configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.warn('⚠️  WARNING: AWS credentials not configured');
      console.warn('   - AWS_ACCESS_KEY_ID: ' + (process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing'));
      console.warn('   - AWS_SECRET_ACCESS_KEY: ' + (process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing'));
      console.warn('   DynamoDB operations may fail if credentials are invalid or expired');
    }
    
    return {
      success: true,
      message: 'DynamoDB service ready',
      table: FACE_IMAGE_TABLE,
      index: USER_ID_INDEX
    };
  } catch (error) {
    console.error('❌ Error initializing DynamoDB service:', error);
    throw error;
  }
};

/**
 * --------------------------------------------------------------------------
 * Backwards compatibility adapter functions
 * --------------------------------------------------------------------------
 * The controller code previously used different function names and a
 * different DynamoDB variable name. Provide thin adapters so existing
 * controller code continues to work until the controller is migrated.
 *
*/


// Adapter: getAllFaceRecords -> getAllFaceImages
exports.getAllFaceRecords = async (limit) => {
  return exports.getAllFaceImages(limit);
};

// Adapter: deleteFaceRecord(userId) -> deleteFaceImageByUserId(userId)
exports.deleteFaceRecord = async (userId) => {
  return exports.deleteFaceImageByUserId(userId);
};

// Adapter: updateFaceRecord(userId, updateData)
// Finds RekognitionId via GSI and updates using updateFaceImage(rekognitionId,..)
exports.updateFaceRecord = async (userId, updateData) => {
  try {
    // Find the RekognitionId for this UserId via GSI
    const queryParams = {
      TableName: FACE_IMAGE_TABLE,
      IndexName: USER_ID_INDEX,
      KeyConditionExpression: 'UserId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      Limit: 1
    };

    const queryResult = await docClient.send(new QueryCommand(queryParams));

    if (!queryResult.Items || queryResult.Items.length === 0) {
      throw new AppError(`No face record found for userId: ${userId}`, 404);
    }

    const rekognitionId = queryResult.Items[0].RekognitionId;
    return exports.updateFaceImage(rekognitionId, updateData);
  } catch (error) {
    if (error.statusCode === 404) throw error;
    console.error('❌ Error in updateFaceRecord adapter:', error);
    throw new AppError(`Failed to update face record: ${error.message}`, 500);
  }
};

module.exports = exports;
