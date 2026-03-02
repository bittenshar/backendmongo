const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { getPublicUserImage } = require('./presigned-url.controller');

// Configure S3
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

/**
 * PUBLIC ENDPOINT: Get user image URL (no authentication required)
 * GET /api/public/:userId/image
 */
router.get('/:userId/image', getPublicUserImage);

// Get presigned URLs for user's images
router.get('/:userId/presigned-urls', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Get user model
        const User = mongoose.model('User');
        
        // Try to find user by both _id and userId
        let user;
        if (mongoose.Types.ObjectId.isValid(userId)) {
            // First try with MongoDB _id
            user = await User.findById(userId);
        }
        
        if (!user) {
            // If not found by _id, try with custom userId
            user = await User.findOne({ userId: userId });
        }

        console.log('🔍 User lookup result:', {
            userIdParam: userId,
            userFound: !!user,
            userDetails: user ? {
                _id: user._id,
                userId: user.userId,
                hasUploadedPhoto: !!user.uploadedPhoto
            } : null
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                details: `No user found with id: ${userId} (tried both _id and userId)`
            });
        }

        // If no uploaded photo, return empty array but include user info
        if (!user.uploadedPhoto) {
            return res.status(200).json({
                success: true,
                images: [],
                user: {
                    _id: user._id,
                    userId: user.userId,
                    verificationStatus: user.verificationStatus
                }
            });
        }

        // Parse the S3 key from the URL
        const url = new URL(user.uploadedPhoto);
        const key = url.pathname.substring(1); // Remove leading slash
        
        // Extract bucket name from URL if available
        const bucketMatch = user.uploadedPhoto.match(/https:\/\/([a-z0-9-]+)\.s3/);
        const bucketName = bucketMatch ? bucketMatch[1] : (process.env.AWS_S3_BUCKET || 'adminthrill-uploads');

        // Generate presigned URL
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key
        });

        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        res.status(200).json({
            success: true,
            images: [{
                url: presignedUrl,
                originalUrl: user.uploadedPhoto,
                filename: key.split('/').pop(),
                isPublic: true,
                uploadedAt: user.updatedAt
            }]
        });

    } catch (error) {
        console.error('Error in presigned URL generation:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
