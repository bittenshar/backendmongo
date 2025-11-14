const express = require("express");
const multer = require("multer");
const { S3Client, PutObjectCommand, DeleteObjectCommand, ListBucketsCommand } = require("@aws-sdk/client-s3");
const { fromNodeProviderChain } = require("@aws-sdk/credential-providers");
const jwt = require('jsonwebtoken');
const User = require('../../users/user.model');

// Import S3 signed URL service
const { getSignedImageUrl, checkObjectExists, getMultipleSignedUrls } = require('../s3-signed-url.service');

const router = express.Router();

// In-memory storage for user uploads
const userUploads = new Map();


// JWT Secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access token is required' 
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ 
            success: false, 
            message: 'Invalid or expired token' 
        });
    }
};

// Initialize S3 client with IAM Role credentials
let s3;
let s3Available = false;

try {
    const awsConfig = {
        region: process.env.AWS_REGION || "ap-south-1",
        credentials: fromNodeProviderChain()
    };

    s3 = new S3Client(awsConfig);
    s3Available = true;
} catch (s3Error) {
    console.error("[ERROR] S3 client initialization failed:", s3Error.message);
    s3Available = false;
}

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "image/jpeg" || file.mimetype === "image/png" || file.mimetype === "image/jpg") {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type. Only JPEG, JPG and PNG are allowed."), false);
        }
    }
});

// Upload Image Route
router.post("/upload", verifyToken, upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, msg: "No file uploaded" });
        }

        const userId = req.user.userId;
        const fullname = req.body.fullname || "default_filename";
        
        const sanitizedFullname = fullname.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${userId}_${sanitizedFullname}`;

        // Verify user exists first using userId as a string
        const user = await User.findOne({ userId: userId });
        if (!user) {
            console.log("[DEBUG] User not found for userId:", userId);
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check for existing upload
        if (userUploads.has(userId)) {
            const existingUpload = userUploads.get(userId);
            return res.status(409).json({
                success: false, 
                message: "You have already uploaded an image. Delete existing first.",
                existingUpload: {
                    filename: existingUpload.filename,
                    uploadedAt: existingUpload.uploadedAt,
                    fileUrl: existingUpload.fileUrl
                }
            });
        }

        if (!s3Available) {
            return res.status(503).json({ 
                success: false, 
                message: "S3 service unavailable" 
            });
        }

        // Upload to S3
        const params = {
            Bucket: "nfacialimagescollections",
            Key: `public/${filename}`,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            Metadata: { 
                userId: userId,
                uploadedAt: timestamp,
                fullname: fullname
            }
        };

        await s3.send(new PutObjectCommand(params));
        const fileUrl = `https://nfacialimagescollections.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/public/${filename}`;

        // Update user's uploadedPhoto field using userId as a string
        const updatedUser = await User.findOneAndUpdate(
            { userId: userId },
            { 
                $set: { 
                    uploadedPhoto: fileUrl,
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(500).json({
                success: false,
                message: "Failed to update user record"
            });
        }

        // Store upload info in memory
        const uploadData = {
            filename,
            originalName: req.file.originalname,
            size: req.file.size,
            sizeMB: Math.round(req.file.size / (1024 * 1024) * 100) / 100,
            mimetype: req.file.mimetype,
            uploadedBy: sanitizedFullname,
            originalFullname: fullname,
            userId: userId,
            uploadedAt: timestamp,
            storage: "aws_s3",
            fileUrl: fileUrl,
            s3Key: `public/${filename}`
        };
        userUploads.set(userId, uploadData);

        // Return success response
        return res.status(200).json({
            success: true,
            fileUrl,
            storage: "aws_s3",
            message: "File uploaded to AWS S3 and user record updated successfully",
            uploadInfo: {
                filename,
                originalName: req.file.originalname,
                size: req.file.size,
                sizeMB: uploadData.sizeMB,
                uploadedBy: sanitizedFullname,
                userId: userId,
                uploadedAt: timestamp
            },
            user: {
                userId: updatedUser.userId,
                name: updatedUser.name,
                email: updatedUser.email,
                uploadedPhoto: updatedUser.uploadedPhoto,
                verificationStatus: updatedUser.verificationStatus,
                updatedAt: updatedUser.updatedAt
            },
            fileInfo: uploadData
        });

    } catch (error) {
        console.error("[ERROR] Upload Failed:", error);
        return res.status(500).json({
            success: false,
            message: "Upload failed",
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
        });
    }
});

// Delete Image Route
router.delete("/delete", verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Check if user has an uploaded image
        if (!userUploads.has(userId)) {
            return res.status(404).json({
                success: false,
                message: "No image found for this user"
            });
        }

        // Get upload info
        const uploadInfo = userUploads.get(userId);

        // Delete from S3
        if (s3Available) {
            const deleteParams = {
                Bucket: "nfacialimagescollections",
                Key: uploadInfo.s3Key
            };

            try {
                await s3.send(new DeleteObjectCommand(deleteParams));
            } catch (s3Error) {
                console.error("[ERROR] S3 Delete Failed:", s3Error);
                // We'll still proceed with removing the record even if S3 delete fails
            }
        }

        // Update user record
        const updatedUser = await User.findOneAndUpdate(
            { userId: userId },
            { 
                $set: { 
                    uploadedPhoto: null,
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(500).json({
                success: false,
                message: "Failed to update user record"
            });
        }

        // Remove from in-memory storage
        const deletedFile = {...userUploads.get(userId)};
        userUploads.delete(userId);

        return res.status(200).json({
            success: true,
            message: "Image deleted successfully and user record updated",
            deletedFile,
            user: {
                userId: updatedUser.userId,
                uploadedPhoto: updatedUser.uploadedPhoto,
                updatedAt: updatedUser.updatedAt
            }
        });

    } catch (error) {
        console.error("[ERROR] Delete Failed:", error);
        return res.status(500).json({
            success: false,
            message: "Delete failed",
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
        });
    }
});

// Retrieve My Upload
router.get("/my-upload", verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // First check in-memory cache
        if (userUploads.has(userId)) {
            const uploadInfo = userUploads.get(userId);
            return res.status(200).json({
                success: true,
                uploadInfo: uploadInfo,
                message: "Upload information retrieved successfully"
            });
        }
        
        // If not in memory, check database
        const userRecord = await User.findOne({ userId: userId });
        
        if (userRecord && userRecord.uploadedPhoto) {
            const fileUrl = user.uploadedPhoto;
            const filename = fileUrl.split('/').pop();
            
            // Create a simplified uploadInfo object
            const uploadInfo = {
                filename: filename,
                userId: userId,
                fileUrl: fileUrl,
                uploadedAt: user.updatedAt.toISOString(),
                storage: "aws_s3"
            };
            
            // Store in memory for future requests
            userUploads.set(userId, uploadInfo);
            
            return res.status(200).json({
                success: true,
                uploadInfo: uploadInfo,
                message: "Upload information retrieved from database"
            });
        }
        
        // If not in memory, check database
        const user = await User.findOne({ userId: userId });
        
        if (!user || !user.uploadedPhoto) {
            return res.status(404).json({
                success: false,
                message: "No image found for this user"
            });
        }
        
        // Reconstruct upload info from database
        const filename = user.uploadedPhoto.split('/').pop();
        const timestamp = new Date(user.updatedAt).toISOString().replace(/[:.]/g, '-');
        
        // Create a minimal uploadInfo object from available data
        const uploadInfo = {
            filename: filename,
            userId: userId,
            uploadedAt: timestamp,
            fileUrl: user.uploadedPhoto,
            s3Key: `public/${filename}`
        };
        
        // Store in memory for future requests
        userUploads.set(userId, uploadInfo);
        
        return res.status(200).json({
            success: true,
            uploadInfo: uploadInfo,
            message: "Upload information retrieved successfully"
        });

    } catch (error) {
        console.error("[ERROR] Retrieving Upload Info Failed:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve upload information",
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
        });
    }
});

// Retrieve image URL
router.get("/retrieve-image", verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // First check in-memory cache
        if (userUploads.has(userId)) {
            const uploadInfo = userUploads.get(userId);
            return res.status(200).json({
                success: true,
                fileUrl: uploadInfo.fileUrl,
                filename: uploadInfo.filename,
                storage: uploadInfo.storage || "aws_s3",
                message: "S3 URL retrieved successfully"
            });
        }
        
        // If not in memory, check database
        const user = await User.findOne({ userId: userId });
        
        if (!user || !user.uploadedPhoto) {
            return res.status(404).json({
                success: false,
                message: "No image found for this user"
            });
        }
        
        // Get file information from URL
        const fileUrl = user.uploadedPhoto;
        const filename = fileUrl.split('/').pop();
        
        // Create minimal upload info and store in memory
        const uploadInfo = {
            filename,
            userId,
            fileUrl,
            uploadedAt: new Date(user.updatedAt).toISOString(),
            storage: "aws_s3",
            s3Key: `public/${filename}`
        };
        userUploads.set(userId, uploadInfo);
        
        return res.status(200).json({
            success: true,
            fileUrl,
            filename,
            storage: "aws_s3",
            message: "S3 URL retrieved successfully"
        });

    } catch (error) {
        console.error("[ERROR] Retrieving Image URL Failed:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve image URL",
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
        });
    }
});

// Get image status for a user
router.get("/get-image-status/:userId", verifyToken, async (req, res) => {
    try {
        const userId = req.params.userId;
        
        // Verify user has permission to access this data
        if (req.user.userId !== userId && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: "You don't have permission to access this user's data"
            });
        }
        
        // First check in-memory cache
        let hasUploadedImage = userUploads.has(userId);
        let imageUrl = null;
        let uploadInfo = null;
        
        if (hasUploadedImage) {
            uploadInfo = userUploads.get(userId);
            imageUrl = uploadInfo.fileUrl;
        } else {
            // Check database
            const user = await User.findOne({ userId: userId });
            
            if (user && user.uploadedPhoto) {
                hasUploadedImage = true;
                imageUrl = user.uploadedPhoto;
                
                // Reconstruct and cache upload info
                const filename = imageUrl.split('/').pop();
                uploadInfo = {
                    filename,
                    userId,
                    uploadedAt: new Date(user.updatedAt).toISOString(),
                    fileUrl: imageUrl,
                    storage: "aws_s3",
                    s3Key: `public/${filename}`
                };
                userUploads.set(userId, uploadInfo);
            }
        }
        
        return res.status(200).json({
            success: true,
            hasUploadedImage,
            message: hasUploadedImage ? 
                "User has an uploaded image" : 
                "User has not uploaded an image",
            ...(hasUploadedImage && { imageUrl, uploadInfo })
        });
        
    } catch (error) {
        console.error("[ERROR] Getting Image Status Failed:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get image status",
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
        });
    }
});

// Get a signed URL for my image
router.get("/my-signed-url", verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const expiresIn = parseInt(req.query.expires) || 1; // Default 1 hour if not specified

        // Check if user has an uploaded image
        if (!userUploads.has(userId)) {
            return res.status(404).json({
                success: false,
                message: "No image found for this user"
            });
        }

        const uploadInfo = userUploads.get(userId);
        
        // Generate signed URL
        const signedUrl = await getSignedImageUrl(
            "nfacialimagescollections", 
            uploadInfo.s3Key, 
            expiresIn * 60 * 60 // Convert hours to seconds
        );

        if (!signedUrl) {
            return res.status(500).json({
                success: false, 
                message: "Failed to generate signed URL"
            });
        }

        // Calculate expiration time
        const expirationTime = new Date();
        expirationTime.setHours(expirationTime.getHours() + expiresIn);

        return res.status(200).json({
            success: true,
            signedUrl,
            expires: expirationTime.toISOString(),
            expiresIn: `${expiresIn} ${expiresIn === 1 ? 'hour' : 'hours'}`,
            imageInfo: {
                filename: uploadInfo.filename,
                userId: uploadInfo.userId,
                uploadedAt: uploadInfo.uploadedAt,
                contentType: uploadInfo.mimetype
            }
        });

    } catch (error) {
        console.error("[ERROR] Generating Signed URL Failed:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate signed URL",
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
        });
    }
});

// Admin endpoint to get all signed URLs for all users - MUST be before /:userId routes
router.get("/signed-urls/admin/all-signed-urls", verifyToken, async (req, res) => {
    try {
        const AdminUser = require('../../admin/admin.model');
        const User = require('../../auth/auth.model');
        
        // Check if user is admin by looking up in database
        let isAdmin = false;
        
        // Try to find in User model first (by userId string or _id)
        const user = await User.findOne({ 
            $or: [
                { userId: req.user.userId },
                { _id: req.user.userId }
            ]
        });
        
        if (user && user.role === 'admin') {
            isAdmin = true;
            console.log(`✅ Admin access granted for user: ${user.userId || user._id}`);
        }
        
        // If not found in User, try admin users
        if (!isAdmin) {
            const adminUser = await AdminUser.findOne({ 
                $or: [
                    { adminId: req.user.userId },
                    { _id: req.user.userId }
                ]
            });
            
            if (adminUser && (adminUser.role === 'admin' || adminUser.role === 'super-admin')) {
                isAdmin = true;
                console.log(`✅ Admin access granted for admin: ${adminUser.adminId || adminUser._id}`);
            }
        }
        
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Only admins can access all signed URLs"
            });
        }

        // Get ALL users from database
        const allUsers = await User.find({}, '_id email name phone uploadedPhoto aadhaarPhoto verificationStatus')
            .select('-password')
            .lean();

        let uploadedCount = 0;
        let pendingCount = 0;
        const allSignedUrlsData = [];
        
        // Process each user
        for (const dbUser of allUsers) {
            const userObj = {
                _id: dbUser._id,
                email: dbUser.email,
                name: dbUser.name,
                phone: dbUser.phone,
                verificationStatus: dbUser.verificationStatus,
                uploadedPhoto: dbUser.uploadedPhoto,
                hasUpload: false,
                uploadSource: null,
                urls: null
            };
            
            // Generate presigned URLs for this user
            const urls = {
                uploadedPhoto: null,
                aadhaarPhoto: null
            };
            
            console.log(`\n📦 Processing user: ${dbUser._id}, uploadedPhoto: ${dbUser.uploadedPhoto ? 'YES' : 'NO'}`);
            
            // Generate URL for uploaded photo if it exists
            if (dbUser.uploadedPhoto) {
                try {
                    // Extract S3 key from full URL if needed
                    let s3Key = dbUser.uploadedPhoto;
                    if (dbUser.uploadedPhoto.includes('amazonaws.com/')) {
                        s3Key = dbUser.uploadedPhoto.split('amazonaws.com/').pop();
                    }
                    
                    console.log(`🔑 S3 Key for ${dbUser._id}: ${s3Key}`);
                    console.log(`🪣 Bucket: ${process.env.AWS_S3_BUCKET}`);
                    
                    const signedUrl = await s3.getSignedUrlPromise('getObject', {
                        Bucket: process.env.AWS_S3_BUCKET,
                        Key: s3Key,
                        Expires: 3600 // 1 hour
                    });
                    
                    console.log(`✅ Signed URL generated successfully for user: ${dbUser._id}`);
                    
                    urls.uploadedPhoto = {
                        url: signedUrl,
                        originalUrl: dbUser.uploadedPhoto,
                        filename: s3Key.split('/').pop(),
                        isPublic: true,
                        uploadedAt: dbUser.uploadedPhotoAt || null
                    };
                    
                    userObj.hasUpload = true;
                    userObj.uploadSource = 's3';
                    uploadedCount++;
                } catch (error) {
                    console.error(`❌ Error generating uploaded photo URL for user ${dbUser._id}:`, {
                        message: error.message,
                        code: error.code,
                        bucket: process.env.AWS_S3_BUCKET,
                        key: s3Key
                    });
                }
            } else {
                console.log(`ℹ️ No uploadedPhoto for user: ${dbUser._id}`);
            }
            
            // Generate URL for aadhaar photo if it exists
            if (dbUser.aadhaarPhoto) {
                try {
                    // Extract S3 key from full URL if needed
                    let s3Key = dbUser.aadhaarPhoto;
                    if (dbUser.aadhaarPhoto.includes('amazonaws.com/')) {
                        s3Key = dbUser.aadhaarPhoto.split('amazonaws.com/').pop();
                    }
                    
                    const signedUrl = await s3.getSignedUrlPromise('getObject', {
                        Bucket: process.env.AWS_S3_BUCKET,
                        Key: s3Key,
                        Expires: 3600 // 1 hour
                    });
                    
                    urls.aadhaarPhoto = {
                        url: signedUrl,
                        originalUrl: dbUser.aadhaarPhoto,
                        filename: s3Key.split('/').pop(),
                        isPublic: false,
                        uploadedAt: dbUser.aadhaarPhotoAt || null
                    };
                    
                    userObj.hasUpload = true;
                    userObj.uploadSource = 's3';
                    if (!dbUser.uploadedPhoto) uploadedCount++; // Only count once
                    console.log(`✅ Signed URL generated for aadhaar photo of user: ${dbUser._id}`);
                } catch (error) {
                    console.error(`❌ Error generating aadhaar photo URL for user ${dbUser._id}:`, error.message);
                }
            }
            
            if (userObj.hasUpload) {
                userObj.urls = urls;
            } else {
                pendingCount++;
            }
            
            allSignedUrlsData.push(userObj);
        }

        // Sort by hasUpload (uploads first) then by name
        allSignedUrlsData.sort((a, b) => {
            if (b.hasUpload !== a.hasUpload) {
                return b.hasUpload - a.hasUpload;
            }
            return (a.name || '').localeCompare(b.name || '');
        });

        return res.status(200).json({
            success: true,
            message: `Total users: ${allSignedUrlsData.length} (${uploadedCount} uploaded, ${pendingCount} pending)`,
            totalUsers: allSignedUrlsData.length,
            uploadedCount,
            pendingCount,
            data: allSignedUrlsData
        });
    } catch (error) {
        console.error("[ERROR] Admin Get All Signed URLs Failed:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get all signed URLs",
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
        });
    }
});

// Get multiple signed URLs with different expiration times
router.get("/signed-urls/:userId", verifyToken, async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        
        // Users can get signed URLs for their own images
        // Check if user has an uploaded image
        if (!userUploads.has(targetUserId)) {
            return res.status(404).json({
                success: false,
                message: "No image found for this user"
            });
        }

        const uploadInfo = userUploads.get(targetUserId);

        // Generate multiple signed URLs with different expiration times
        const urls = await getMultipleSignedUrls(
            "nfacialimagescollections",
            uploadInfo.s3Key,
            [15*60, 60*60, 24*60*60] // 15 minutes, 1 hour, 24 hours in seconds
        );

        if (!urls) {
            return res.status(500).json({
                success: false,
                message: "Failed to generate signed URLs"
            });
        }

        return res.status(200).json({
            success: true,
            urls: {
                short: {
                    url: urls[0],
                    expiresIn: "15 minutes"
                },
                medium: {
                    url: urls[1],
                    expiresIn: "1 hour"
                },
                long: {
                    url: urls[2],
                    expiresIn: "24 hours"
                }
            },
            imageInfo: {
                filename: uploadInfo.filename,
                userId: uploadInfo.userId,
                uploadedAt: uploadInfo.uploadedAt
            }
        });

    } catch (error) {
        console.error("[ERROR] Generating Multiple Signed URLs Failed:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate multiple signed URLs",
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
        });
    }
});

// Check AWS connection status
router.get("/aws-status", async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            aws: {
                s3Available: s3Available,
                bucketName: "nfacialimagescollections",
                hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
                hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
                region: process.env.AWS_REGION || "ap-south-1"
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to check AWS status",
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
        });
    }
});

// Test S3 connection by listing buckets
router.get("/test-s3-connection", async (req, res) => {
    try {
        if (!s3Available) {
            return res.status(503).json({
                success: false,
                message: "S3 client not initialized"
            });
        }

        const listBucketsResponse = await s3.send(new ListBucketsCommand({}));
        
        return res.status(200).json({
            success: true,
            message: "S3 connection successful",
            buckets: listBucketsResponse.Buckets?.map(bucket => bucket.Name) || [],
            bucketCount: listBucketsResponse.Buckets?.length || 0
        });
    } catch (error) {
        console.error("[ERROR] S3 Connection Test Failed:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to connect to S3",
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
        });
    }
});

// ADMIN ENDPOINTS

// List all uploads (admin endpoint)
router.get("/admin/uploads", async (req, res) => {
    try {
        // Convert the Map to an array
        const uploads = Array.from(userUploads.entries()).map(([userId, uploadInfo]) => ({
            userId,
            ...uploadInfo
        }));

        return res.status(200).json({
            success: true,
            totalUploads: uploads.length,
            uploads
        });
    } catch (error) {
        console.error("[ERROR] Admin List Uploads Failed:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to list uploads",
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
        });
    }
});

// Clear all uploads (admin endpoint - for testing)
router.delete("/admin/clear-all-uploads", async (req, res) => {
    try {
        const uploadCount = userUploads.size;
        userUploads.clear();

        return res.status(200).json({
            success: true,
            message: `All ${uploadCount} uploads have been cleared from memory`,
            clearedCount: uploadCount
        });
    } catch (error) {
        console.error("[ERROR] Admin Clear Uploads Failed:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to clear uploads",
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
        });
    }
});

module.exports = router;
