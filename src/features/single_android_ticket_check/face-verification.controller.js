const mongoose = require('mongoose');
const { SearchFacesByImageCommand } = require('@aws-sdk/client-rekognition');
const { rekognition } = require('../aws/aws.config');
const dynamoDBService = require('../../services/aws/dynamodb.service');
const Booking = require('../booking/booking_model');
const CheckInLog = require('../checkin/checkInLog.model');
const AppError = require('../../shared/utils/appError');

/**
 * Face Verification with Ticket Check
 * Receives selfie image + eventId → Searches AWS Rekognition → Returns userId and ticket status
 * 
 * POST /api/face-verify/verify?eventId=<eventId>
 * OR
 * POST /api/face-verify/verify
 * Body: FormData with image + eventId (form field)
 * 
 * Response:
 * {
 *   success: true,
 *   userId: "user_123",
 *   fullName: "Rahul Sharma",
 *   hasTicket: true,
 *   ticketStatus: "confirmed",
 *   ticketDetails: { quantity, seatType, totalPrice, bookedAt }
 * }
 */
exports.verifyFaceAndGetUser = async (req, res, next) => {
  try {
    // ✅ Step 1: Check if image was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        color: 'black',
        message: 'No image uploaded'
      });
    }

    // ✅ Step 1.5: Get eventId from query or body
    const eventId = req.query.eventId || req.body.eventId;
    
    if (!eventId) {
      return res.status(400).json({
        success: false,
        color: 'black',
        message: 'eventId is required'
      });
    }

    // Validate eventId format
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        color: 'black',
        message: 'Invalid eventId format'
      });
    }

    console.log('📸 Face verification started for file:', req.file.originalname);
    console.log('🎫 Checking ticket for eventId:', eventId);

    // ✅ Step 2: Get image bytes (from memory storage buffer)
    const imageBytes = req.file.buffer;

    // ✅ Step 3: Search faces in AWS Rekognition Collection
    const searchCommand = new SearchFacesByImageCommand({
      CollectionId: process.env.AWS_REKOGNITION_COLLECTION_ID || 'facial_collection',
      Image: { Bytes: imageBytes },
      FaceMatchThreshold: 90,
      MaxFaces: 1
    });

    console.log('🔍 Searching AWS Rekognition for face match...');
    const rekognitionResponse = await rekognition.send(searchCommand);

    // ✅ Step 4: Check if face was matched
    if (!rekognitionResponse.FaceMatches || rekognitionResponse.FaceMatches.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No matching face found in database',
        color: 'black',
        details: 'Your face does not match any registered entry'
      });
    }

    const faceId = rekognitionResponse.FaceMatches[0].Face.FaceId;
    const similarity = rekognitionResponse.FaceMatches[0].Similarity;

    console.log(`✅ Face matched! FaceId: ${faceId}, Similarity: ${similarity}%`);

    // ✅ Step 5: Get user details from DynamoDB using RekognitionId
    const faceRecord = await dynamoDBService.getFaceByRekognitionId(faceId);

    // ✅ Step 6: Extract userId and fullName
    const userId = faceRecord.data.UserId;
    const fullName = faceRecord.data.FullName || faceRecord.data.Name || 'Unknown';

    console.log(`✅ User found: ${fullName} (ID: ${userId})`);

    // ✅ Step 7: Check if user has ticket for this event
    const booking = await Booking.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      eventId: new mongoose.Types.ObjectId(eventId)
    }).select('_id status quantity seatType totalPrice createdAt');

    const hasTicket = !!booking;
    const ticketStatus = booking?.status || null;

    console.log(`🎫 Ticket check for user ${userId} at event ${eventId}: ${hasTicket ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`🎫 Booking Status: ${ticketStatus}`);
    console.log(`🎫 Booking ID: ${booking?._id}`);

    // ✅ Step 7.5: Check if ticket has been used by looking at CheckInLog
    let usageCount = 0;
    let isTicketUsed = false;
    
    if (hasTicket && booking._id) {
      try {
        usageCount = await CheckInLog.countDocuments({
          ticketId: booking._id
        });
        console.log(`📊 CheckInLog count query result: ${usageCount}`);
        isTicketUsed = usageCount > 0; // If there are any checkin logs, ticket has been used
        console.log(`📊 Is ticket used: ${isTicketUsed}, Usage count: ${usageCount}`);
      } catch (checkInError) {
        console.error(`❌ Error checking CheckInLog:`, checkInError.message);
      }
    }

    // Clean up temp file 
    // (No cleanup needed with memory storage)

    // ✅ Step 8: Determine color based on conditions
    let color;
    if (hasTicket) {
      if (isTicketUsed) {
        color = 'blue';   // 🔵 Ticket already checked = BLUE (with usage count)
      } else {
        color = 'green';  // 🟢 Confirmed ticket not yet used = GREEN
      }
    } else {
      color = 'red';      // 🔴 No ticket = RED
    }

    // ✅ Step 9: Return response
    const response = {
      success: true,
      color: color,
      userId: userId,
      fullName: fullName,
      hasTicket: hasTicket,
      ticketStatus: ticketStatus,
      similarity: Math.round(similarity * 100) / 100,
      timestamp: new Date().toISOString()
    };

    // Add ticket details if ticket exists
    if (booking) {
      response.ticketDetails = {
        quantity: booking.quantity,
        seatType: booking.seatType,
        totalPrice: booking.totalPrice,
        bookedAt: booking.createdAt
      };
      
      // Add usage count if ticket has been checked
      if (isTicketUsed) {
        response.usageCount = usageCount;
      }
      
      // Debug info
      response._debug = {
        bookingId: booking._id.toString(),
        isTicketUsed: isTicketUsed,
        usageCount: usageCount,
        hasCheckInLogs: usageCount > 0
      };
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Face verification error:', error.message);

    if (error.message && error.message.includes('No face record found')) {
      return res.status(404).json({
        success: false,
        color: 'black',
        message: 'Face record not found in database',
        details: error.message
      });
    }

    return res.status(500).json({
      success: false,
      color: 'black',
      message: 'Face verification failed',
      error: error.message
    });
  }
};
