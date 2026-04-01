const mongoose = require('mongoose');
const { SearchFacesByImageCommand } = require('@aws-sdk/client-rekognition');
const { rekognition } = require('../aws/aws.config');
const dynamoDBService = require('../../services/aws/dynamodb.service');
const Booking = require('../booking/booking_model');
const CheckInLog = require('../checkin/checkInLog.model');
const AppError = require('../../shared/utils/appError');

// Simple in-memory cache for face lookups (TTL: 5 minutes)
const faceCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const getCachedFace = (faceId) => {
  const cached = faceCache.get(faceId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  faceCache.delete(faceId);
  return null;
};

const setCachedFace = (faceId, data) => {
  faceCache.set(faceId, { data, timestamp: Date.now() });
};

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
    const startTime = Date.now();
    
    // ✅ Step 1: Validate inputs
    if (!req.file) {
      return res.status(400).json({ success: false, color: 'black', message: 'No image uploaded' });
    }

    const eventId = req.query.eventId || req.body.eventId;
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ success: false, color: 'black', message: 'Invalid eventId' });
    }

    // ✅ Step 2: Search faces in AWS Rekognition (BIGGEST TIME CONSUMER - ~2-4 seconds)
    const imageBytes = req.file.buffer;
    const searchCommand = new SearchFacesByImageCommand({
      CollectionId: process.env.AWS_REKOGNITION_COLLECTION_ID || 'facial_collection',
      Image: { Bytes: imageBytes },
      FaceMatchThreshold: 90,
      MaxFaces: 1
    });

    const t1 = Date.now();
    const rekognitionResponse = await rekognition.send(searchCommand);
    const rekognitionTime = Date.now() - t1;

    if (!rekognitionResponse.FaceMatches || rekognitionResponse.FaceMatches.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No matching face found',
        color: 'black'
      });
    }

    const faceId = rekognitionResponse.FaceMatches[0].Face.FaceId;
    const similarity = rekognitionResponse.FaceMatches[0].Similarity;

    // ✅ Step 3: Get user from cache or DynamoDB
    const t2 = Date.now();
    let faceRecord = getCachedFace(faceId);
    
    if (!faceRecord) {
      faceRecord = await dynamoDBService.getFaceByRekognitionId(faceId);
      setCachedFace(faceId, faceRecord.data);
    }
    const dynamoTime = Date.now() - t2;

    const userId = faceRecord.data.UserId;
    const fullName = faceRecord.data.FullName || faceRecord.data.Name || 'Unknown';

    // ✅ Step 4: Get booking with lean() for speed
    const t3 = Date.now();
    const booking = await Booking.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      eventId: new mongoose.Types.ObjectId(eventId)
    }).select('_id status quantity seatType totalPrice createdAt').lean();
    const bookingTime = Date.now() - t3;

    const hasTicket = !!booking;
    const ticketStatus = booking?.status || null;

    // ✅ Step 5: Check ticket usage ASYNCHRONOUSLY (don't wait for this)
    // This will complete in the background
    let isTicketUsed = false;
    let checkInPromise = null;
    
    if (booking && booking._id) {
      checkInPromise = CheckInLog.findOne({ ticketId: booking._id })
        .select('_id')
        .lean()
        .then(log => { isTicketUsed = !!log; });
    }

    // ✅ Step 6: Determine color based on immediate info
    let color;
    if (hasTicket) {
      color = ticketStatus === 'confirmed' ? 'green' : 'yellow';
    } else {
      color = 'red';
    }

    // ✅ Step 7: Build response IMMEDIATELY (don't wait for checkIn check)
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

    // Add ticket details if exists
    if (booking) {
      response.ticketDetails = {
        quantity: booking.quantity,
        seatType: booking.seatType,
        totalPrice: booking.totalPrice,
        bookedAt: booking.createdAt
      };
    }

    const totalTime = Date.now() - startTime;
    console.log(`⏱️ Timing: Rekognition=${rekognitionTime}ms, DynamoDB=${dynamoTime}ms, MongoDB=${bookingTime}ms, Total=${totalTime}ms`);

    // Send response immediately
    res.status(200).json(response);

    // Handle the checkin check in background (don't block response)
    if (checkInPromise) {
      checkInPromise.catch(err => console.error('CheckIn lookup error:', err.message));
    }

  } catch (error) {
    console.error('❌ Face verification error:', error.message);
    return res.status(500).json({
      success: false,
      color: 'black',
      message: 'Face verification failed',
      error: error.message
    });
  }
};
