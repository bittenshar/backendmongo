/**
 * IMAGE RETRIEVAL - IMPLEMENTATION EXAMPLES
 * 
 * Real-world examples of how to get images by link
 * Copy & paste ready code for different scenarios
 */

const express = require('express');
const imageHelper = require('./imageHelper');
const catchAsync = require('./catchAsync');
const Event = require('./event.model');

// ============================================================================
// 🎯 EXAMPLE 1: Basic Express Route - Get Event with Image
// ============================================================================

const router = express.Router();

/**
 * GET /api/event-with-image/:eventId
 * Returns event data with public image URL
 * Usage: http://localhost:3000/api/event-with-image/694291bb1e613c43e1b18a76
 */
router.get('/event-with-image/:eventId', catchAsync(async (req, res, next) => {
  const result = await imageHelper.getEventImage(req.params.eventId);

  if (!result.success) {
    return res.status(404).json({
      status: 'error',
      message: result.error
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      event: result.event,
      imageUrl: result.imageUrl,
      fullEvent: result.event
    }
  });
}));

/**
 * GET /api/event-image-stream/:eventId
 * Stream image directly (no separate image request)
 * Usage: <img src="http://localhost:3000/api/event-image-stream/694291bb..." />
 */
router.get('/event-image-stream/:eventId', catchAsync(async (req, res, next) => {
  await imageHelper.streamEventImage(req, res, req.params.eventId, false);
}));

/**
 * GET /api/event-image-secure/:eventId
 * Stream encrypted image (most secure)
 */
router.get('/event-image-secure/:eventId', catchAsync(async (req, res, next) => {
  await imageHelper.streamEventImage(req, res, req.params.eventId, true);
}));

// ============================================================================
// 🎯 EXAMPLE 2: Batch Operations - Get Multiple Images
// ============================================================================

/**
 * POST /api/events/images/batch
 * Get images for multiple events at once
 * 
 * Request:
 * {
 *   "eventIds": [
 *     "694291bb1e613c43e1b18a76",
 *     "694291bb1e613c43e1b18a71"
 *   ]
 * }
 */
router.post('/events/images/batch', catchAsync(async (req, res, next) => {
  const { eventIds = [] } = req.body;

  if (!Array.isArray(eventIds) || eventIds.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'eventIds array is required'
    });
  }

  const results = await imageHelper.getMultipleEventImages(eventIds);

  res.status(200).json({
    status: 'success',
    results: results.length,
    data: {
      images: results
    }
  });
}));

// ============================================================================
// 🎯 EXAMPLE 3: Download Image - Get Image as Buffer
// ============================================================================

/**
 * POST /api/images/download
 * Download image and return as file
 * 
 * Request:
 * {
 *   "eventId": "694291bb1e613c43e1b18a76"
 * }
 */
router.post('/images/download', catchAsync(async (req, res, next) => {
  const { eventId } = req.body;

  // Get event and image URL
  const result = await imageHelper.getEventImage(eventId);
  if (!result.success) {
    return res.status(404).json({ error: result.error });
  }

  // Fetch image buffer
  const imageBuffer = await imageHelper.fetchImageBuffer(result.imageUrl);

  // Send as file
  res.set('Content-Type', 'image/jpeg');
  res.set('Content-Disposition', `attachment; filename="event-${eventId}.jpg"`);
  res.send(imageBuffer);
}));

// ============================================================================
// 🎯 EXAMPLE 4: Validate Image URL Before Use
// ============================================================================

/**
 * POST /api/images/validate
 * Check if image URL is valid/accessible
 * 
 * Request:
 * {
 *   "imageUrl": "http://localhost:3000/api/images/public/events/.../cover.jpeg"
 * }
 */
router.post('/images/validate', catchAsync(async (req, res, next) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: 'imageUrl is required' });
  }

  const check = await imageHelper.checkImageUrl(imageUrl);

  res.status(200).json({
    status: 'success',
    data: check
  });
}));

// ============================================================================
// 🎯 EXAMPLE 5: Encrypt S3 URL for Secure Transmission
// ============================================================================

/**
 * POST /api/images/secure-link
 * Generate encrypted image URL for backend-to-backend communication
 * 
 * Request:
 * {
 *   "s3Url": "https://event-images-collection.s3.ap-south-1.amazonaws.com/events/.../cover.jpeg"
 * }
 * 
 * Response:
 * {
 *   "secureUrl": "http://localhost:3000/api/images/secure/q0R7n1lK9n8v4Xc..."
 * }
 */
router.post('/images/secure-link', catchAsync(async (req, res, next) => {
  const { s3Url } = req.body;

  if (!s3Url) {
    return res.status(400).json({ error: 's3Url is required' });
  }

  if (!s3Url.includes('amazonaws.com')) {
    return res.status(400).json({ error: 'Invalid S3 URL' });
  }

  try {
    const secureUrl = await imageHelper.createSecureImageLink(s3Url);

    res.status(200).json({
      status: 'success',
      data: {
        secureUrl,
        message: '🔐 Use this URL instead of raw S3 URL'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
}));

// ============================================================================
// 🎯 EXAMPLE 6: Service-to-Service Proxy
// ============================================================================

/**
 * GET /api/proxy/event-image/:eventId
 * Proxy image from another service
 * Useful when external service needs event image
 */
router.get('/proxy/event-image/:eventId', catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const { secure = false } = req.query;

  try {
    let imageUrl;

    if (secure === 'true') {
      imageUrl = await imageHelper.getSecureImageUrl(eventId);
    } else {
      const result = await imageHelper.getEventImage(eventId);
      if (!result.success) {
        return res.status(404).json({ error: result.error });
      }
      imageUrl = result.imageUrl;
    }

    // Return URL instead of image
    res.status(200).json({
      status: 'success',
      data: {
        eventId,
        imageUrl,
        secure: secure === 'true'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
}));

// ============================================================================
// 🎯 EXAMPLE 7: Middleware - Auto-attach Image URLs
// ============================================================================

/**
 * Middleware to automatically add image URLs to event objects
 */
const attachImageUrls = (secure = false) => {
  return async (req, res, next) => {
    // Only process if response has event data
    const originalJson = res.json.bind(res);

    res.json = function(data) {
      if (data?.data?.event) {
        // Single event
        attachImageUrl(data.data.event, secure);
      } else if (data?.data?.events && Array.isArray(data.data.events)) {
        // Multiple events
        data.data.events.forEach(event => {
          attachImageUrl(event, secure);
        });
      }

      return originalJson(data);
    };

    next();
  };
};

async function attachImageUrl(event, secure = false) {
  try {
    if (event.s3ImageKey) {
      if (secure) {
        // Get encrypted URL
        const secureUrl = await imageHelper.getSecureImageUrl(event._id);
        event.secureImageUrl = secureUrl;
      } else {
        // Get public URL
        event.publicImageUrl = imageHelper.getPublicImageUrl(event.s3ImageKey);
      }
    }
  } catch (error) {
    console.error('Error attaching image URL:', error.message);
  }
}

/**
 * Usage in your Express app:
 * app.use('/api/events', attachImageUrls(false)); // Public URLs
 * app.use('/api/secure/events', attachImageUrls(true)); // Secured URLs
 */

// ============================================================================
// 🎯 EXAMPLE 8: Frontend Integration - React Hook
// ============================================================================

/**
 * React Hook to fetch event with image
 * 
 * Usage:
 * const { event, imageUrl, loading, error } = useEventImage('694291bb1e613c43e1b18a76');
 */
const useEventImage = (eventId) => {
  // const [event, setEvent] = React.useState(null);
  // const [imageUrl, setImageUrl] = React.useState('');
  // const [loading, setLoading] = React.useState(true);
  // const [error, setError] = React.useState(null);

  // React.useEffect(() => {
  //   const fetchEvent = async () => {
  //     try {
  //       const response = await fetch(`/api/events/${eventId}`);
  //       const data = await response.json();
  //       const evt = data.data.event;

  //       setEvent(evt);
  //       setImageUrl(evt.coverImageUrl);
  //     } catch (err) {
  //       setError(err.message);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   if (eventId) {
  //     fetchEvent();
  //   }
  // }, [eventId]);

  // return { event, imageUrl, loading, error };
};

// ============================================================================
// 🎯 EXAMPLE 9: Database Query - Get Events with Image URLs
// ============================================================================

/**
 * Helper function to enrich events from database with image URLs
 */
async function getEventsWithImages(filter = {}, options = {}) {
  try {
    const { secure = false, limit = 20, page = 1 } = options;

    // Query events from database
    const events = await Event.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('organizer');

    // Enrich with image URLs
    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
        const eventObj = event.toObject();
        
        if (eventObj.s3ImageKey) {
          if (secure) {
            try {
              eventObj.secureImageUrl = await imageHelper.getSecureImageUrl(eventObj._id);
            } catch (error) {
              console.warn('Failed to generate secure URL:', error.message);
              eventObj.publicImageUrl = imageHelper.getPublicImageUrl(eventObj.s3ImageKey);
            }
          } else {
            eventObj.publicImageUrl = imageHelper.getPublicImageUrl(eventObj.s3ImageKey);
          }
        }

        return eventObj;
      })
    );

    return enrichedEvents;
  } catch (error) {
    console.error('Error enriching events:', error.message);
    throw error;
  }
}

/**
 * Usage:
 * const upcomingEvents = await getEventsWithImages(
 *   { status: 'upcoming' },
 *   { secure: false, limit: 10, page: 1 }
 * );
 */

// ============================================================================
// 🎯 EXAMPLE 10: PDF Generation - Include Event Images
// ============================================================================

/**
 * Generate PDF with event image
 * Requires: npm install pdfkit
 */
async function generateEventPdf(eventId, outputPath) {
  try {
    const PDFDocument = require('pdfkit');
    const fs = require('fs');

    // Get event with image
    const result = await imageHelper.getEventImage(eventId);
    if (!result.success) {
      throw new Error(result.error);
    }

    // Fetch image buffer
    const imageBuffer = await imageHelper.fetchImageBuffer(result.imageUrl);

    // Create PDF
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Add content
    doc.fontSize(20).text(result.event.name, 100, 100);
    doc.fontSize(12).text(`Location: ${result.event.location}`, 100, 140);
    
    // Add image
    doc.image(imageBuffer, 100, 180, { width: 300 });

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    });
  } catch (error) {
    console.error('PDF generation error:', error.message);
    throw error;
  }
}

/**
 * Usage:
 * const pdfPath = await generateEventPdf('694291bb1e613c43e1b18a76', './event.pdf');
 */

// ============================================================================
// 🎯 EXAMPLE 11: HTML Response - Embed Image
// ============================================================================

/**
 * GET /api/event-html/:eventId
 * Return HTML page with embedded event image
 */
router.get('/event-html/:eventId', catchAsync(async (req, res, next) => {
  const result = await imageHelper.getEventImage(req.params.eventId);

  if (!result.success) {
    return res.status(404).send('<h1>Event not found</h1>');
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${result.event.name}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; }
        .event-card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; }
        img { max-width: 100%; height: auto; border-radius: 8px; }
      </style>
    </head>
    <body>
      <div class="event-card">
        <h1>${result.event.name}</h1>
        <p><strong>Location:</strong> ${result.event.location}</p>
        <img src="${result.imageUrl}" alt="${result.event.name}" />
      </div>
    </body>
    </html>
  `;

  res.set('Content-Type', 'text/html');
  res.send(html);
}));

// ============================================================================
// 🎯 EXAMPLE 12: CLI / Script - Get Images in Batch
// ============================================================================

/**
 * Command-line script to download all event images
 * 
 * Usage:
 * node downloadEventImages.js
 */
async function downloadAllEventImages() {
  try {
    console.log('📥 Starting event image download...\n');

    // Get all events
    const events = await Event.find({ s3ImageKey: { $exists: true } });
    console.log(`Found ${events.length} events with images\n`);

    // Download each image
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const filePath = `./images/${event._id}.jpg`;

      console.log(`[${i + 1}/${events.length}] Downloading: ${event.name}...`);

      const success = await imageHelper.downloadImage(
        imageHelper.getPublicImageUrl(event.s3ImageKey),
        filePath
      );

      if (success) {
        console.log(`✅ Saved to: ${filePath}\n`);
      } else {
        console.log(`❌ Failed to download\n`);
      }
    }

    console.log('✅ Download complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// ============================================================================
// Export Examples
// ============================================================================

module.exports = {
  // Routes
  router,
  
  // Helpers
  attachImageUrls,
  getEventsWithImages,
  generateEventPdf,
  useEventImage,
  
  // CLI
  downloadAllEventImages
};

/**
 * 📋 QUICK SUMMARY
 * 
 * ✅ Example 1:  Basic route to get event with image URL
 * ✅ Example 2:  Batch get multiple event images
 * ✅ Example 3:  Download image as file
 * ✅ Example 4:  Validate image URL exists
 * ✅ Example 5:  Create encrypted image link
 * ✅ Example 6:  Proxy image from another service
 * ✅ Example 7:  Middleware to auto-attach URLs
 * ✅ Example 8:  React hook integration
 * ✅ Example 9:  DB query with enriched image URLs
 * ✅ Example 10: PDF generation with images
 * ✅ Example 11: HTML response with embedded image
 * ✅ Example 12: CLI batch download script
 * 
 * All ready to use! Copy & adapt for your needs.
 */
