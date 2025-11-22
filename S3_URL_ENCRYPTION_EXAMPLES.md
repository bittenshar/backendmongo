# S3 URL Encryption - Implementation Examples

## Frontend Examples

### React Component
```jsx
import React, { useEffect, useState } from 'react';

function EventDetails({ eventId }) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch event');
        
        const { data } = await response.json();
        setEvent(data.event);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h2>{event.name}</h2>
      
      {/* Use encrypted image URL - no AWS details exposed */}
      {event.coverImageUrl && (
        <img 
          src={event.coverImageUrl}
          alt={event.name}
          style={{ maxWidth: '100%', borderRadius: '8px' }}
        />
      )}
      
      <p>{event.description}</p>
      <p>📅 {event.date} at {event.location}</p>
      <p>💰 ${event.ticketPrice}</p>
    </div>
  );
}

export default EventDetails;
```

### Vue Component
```vue
<template>
  <div class="event-card">
    <h2>{{ event.name }}</h2>
    
    <!-- Encrypted image URL used here -->
    <img 
      v-if="event.coverImageUrl"
      :src="event.coverImageUrl"
      :alt="event.name"
      class="event-image"
    />
    
    <p>{{ event.description }}</p>
    <p>📅 {{ event.date }} at {{ event.location }}</p>
    <p>💰 ${{ event.ticketPrice }}</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      event: null,
      loading: true
    };
  },
  props: {
    eventId: String
  },
  mounted() {
    this.fetchEvent();
  },
  methods: {
    async fetchEvent() {
      try {
        const response = await fetch(`/api/events/${this.eventId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const { data } = await response.json();
        this.event = data.event;
      } catch (error) {
        console.error('Error fetching event:', error);
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.event-image {
  max-width: 100%;
  border-radius: 8px;
  margin: 1rem 0;
}
</style>
```

### Angular Component
```typescript
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-event-details',
  template: `
    <div class="event-details">
      <h2>{{ event?.name }}</h2>
      
      <img 
        *ngIf="event?.coverImageUrl"
        [src]="event.coverImageUrl"
        [alt]="event.name"
        class="event-image"
      />
      
      <p>{{ event?.description }}</p>
      <p>📅 {{ event?.date }} at {{ event?.location }}</p>
      <p>💰 ${{ event?.ticketPrice }}</p>
    </div>
  `,
  styles: [`
    .event-image {
      max-width: 100%;
      border-radius: 8px;
      margin: 1rem 0;
    }
  `]
})
export class EventDetailsComponent implements OnInit {
  event: any;
  
  constructor(
    private http: HttpClient,
    private route: ActivatedRoute
  ) {}
  
  ngOnInit() {
    const eventId = this.route.snapshot.paramMap.get('id');
    this.fetchEvent(eventId);
  }
  
  fetchEvent(eventId: string) {
    this.http.get(`/api/events/${eventId}`).subscribe(
      (response: any) => {
        this.event = response.data.event;
        // event.coverImageUrl is already an encrypted proxy URL
      },
      error => console.error('Error fetching event:', error)
    );
  }
}
```

### Plain JavaScript
```javascript
// Fetch and display event
async function displayEvent(eventId) {
  try {
    const response = await fetch(`/api/events/${eventId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    const { data } = await response.json();
    const event = data.event;
    
    // Use encrypted image URL
    document.querySelector('.event-name').textContent = event.name;
    document.querySelector('.event-image').src = event.coverImageUrl;
    document.querySelector('.event-image').alt = event.name;
    document.querySelector('.event-description').textContent = event.description;
    
  } catch (error) {
    console.error('Error:', error);
  }
}
```

---

## Backend Examples

### Using URL Encryption Service
```javascript
const urlEncryption = require('./shared/services/urlEncryption.service');

// Example 1: Encrypt a URL
const s3Url = 'https://bucket.s3.region.amazonaws.com/path/to/image.jpg';
const encryptedToken = urlEncryption.encryptUrl(s3Url);
console.log('Token:', encryptedToken);
// Token: a1b2c3d4e5f6:encrypted_data_here

// Example 2: Decrypt a token
const decryptedUrl = urlEncryption.decryptUrl(encryptedToken);
console.log('URL:', decryptedUrl);
// URL: https://bucket.s3.region.amazonaws.com/path/to/image.jpg

// Example 3: Generate time-limited token
const token = urlEncryption.generateImageToken(s3Url, 24);
// Token with 24-hour expiry

// Example 4: Verify token
const result = urlEncryption.verifyImageToken(token);
if (result.valid) {
  console.log('URL from token:', result.url);
} else {
  console.log('Error:', result.message);
}

// Example 5: Hash URL
const hash = urlEncryption.hashUrl(s3Url);
// Use for quick comparisons
```

### Custom Controller with Encryption
```javascript
const Event = require('./event.model');
const urlEncryption = require('../../shared/services/urlEncryption.service');
const catchAsync = require('../../shared/utils/catchAsync');

// Transform event with encrypted URL
const transformEvent = (event) => {
  const eventData = event.toObject();
  
  if (eventData.coverImage) {
    // Generate token valid for 7 days
    const token = urlEncryption.generateImageToken(eventData.coverImage, 168);
    eventData.imageToken = token;
    eventData.imageUrl = `/api/images/proxy/${token}`;
    
    // Keep S3 URL internal only
    delete eventData.coverImage;
  }
  
  return eventData;
};

// Get event with encrypted image
exports.getEvent = catchAsync(async (req, res, next) => {
  const event = await Event.findById(req.params.id).populate('organizer');
  
  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }
  
  const transformedEvent = transformEvent(event);
  
  res.status(200).json({
    status: 'success',
    data: { event: transformedEvent }
  });
});
```

### Batch Encryption
```javascript
const Event = require('./event.model');
const urlEncryption = require('../../shared/services/urlEncryption.service');

// Encrypt all event URLs in response
async function encryptEventList(events) {
  return events.map(event => {
    const eventData = event.toObject();
    
    if (eventData.coverImage) {
      eventData.imageToken = urlEncryption.generateImageToken(
        eventData.coverImage,
        24
      );
      eventData.imageUrl = `/api/images/proxy/${eventData.imageToken}`;
      delete eventData.coverImage;
    }
    
    return eventData;
  });
}

// Usage in controller
exports.getAllEvents = catchAsync(async (req, res, next) => {
  const events = await Event.find()
    .populate('organizer')
    .limit(20);
  
  const encryptedEvents = await encryptEventList(events);
  
  res.status(200).json({
    status: 'success',
    results: encryptedEvents.length,
    data: { events: encryptedEvents }
  });
});
```

---

## Testing Examples

### cURL Tests
```bash
# 1. Create event with image
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer your_token" \
  -F "name=Tech Conference" \
  -F "description=A tech event" \
  -F "date=2025-12-01" \
  -F "startTime=09:00" \
  -F "endTime=18:00" \
  -F "location=New York" \
  -F "organizer=org_id" \
  -F "totalTickets=500" \
  -F "ticketPrice=99" \
  -F "coverImage=@/path/to/image.jpg"

# 2. Get event (check for encrypted URL)
curl http://localhost:3000/api/events/event_id \
  -H "Authorization: Bearer your_token"

# 3. Access image via encrypted proxy
curl http://localhost:3000/api/images/proxy/encrypted_token_here \
  -o downloaded_image.jpg

# 4. Encrypt a URL (admin)
curl -X POST http://localhost:3000/api/images/encrypt \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://bucket.s3.region.amazonaws.com/image.jpg",
    "expiryHours": 48
  }'

# 5. Check image service health
curl http://localhost:3000/api/images/health
```

### Node.js Test
```javascript
const axios = require('axios');

async function testEncryption() {
  const token = 'your_auth_token';
  
  try {
    // 1. Get event
    const eventRes = await axios.get('http://localhost:3000/api/events/event_id', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const event = eventRes.data.data.event;
    console.log('✅ Event URL (encrypted):', event.coverImageUrl);
    
    // 2. Fetch image via encrypted URL
    const imageRes = await axios.get(
      `http://localhost:3000${event.coverImageUrl}`,
      { responseType: 'arraybuffer' }
    );
    
    console.log('✅ Image fetched:', imageRes.status, imageRes.headers['content-type']);
    
    // 3. Test encryption endpoint
    const encryptRes = await axios.post(
      'http://localhost:3000/api/images/encrypt',
      {
        url: 'https://bucket.s3.region.amazonaws.com/test.jpg',
        expiryHours: 24
      }
    );
    
    console.log('✅ Token generated:', encryptRes.data.data.proxyUrl);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testEncryption();
```

---

## Real-World Scenarios

### Scenario 1: Public Event Gallery
```javascript
// Return encrypted URLs for public gallery
exports.getPublicEvents = async (req, res) => {
  const events = await Event.find({ isPublic: true });
  
  const publicEvents = events.map(event => ({
    id: event._id,
    name: event.name,
    imageUrl: event.coverImageUrl, // Already encrypted in response
    date: event.date
  }));
  
  res.json({ events: publicEvents });
};
```

### Scenario 2: Shareable Event Link
```javascript
const urlEncryption = require('./shared/services/urlEncryption.service');

// Generate 1-hour shareable link
function generateShareLink(event, baseUrl) {
  // Use shorter expiry for shares
  const token = urlEncryption.generateImageToken(
    event.coverImage,
    1 // 1 hour
  );
  
  return `${baseUrl}/events/${event._id}?image=${token}`;
}
```

### Scenario 3: Admin Dashboard
```javascript
// Admin can see both encrypted and decrypted
exports.getAdminEvent = async (req, res) => {
  const event = await Event.findById(req.params.id);
  
  res.json({
    ...event.toObject(),
    // Keep encrypted for display
    displayImageUrl: event.coverImageUrl,
    // Also provide raw for admin
    rawImageUrl: event.coverImage,
    // And token for sharing
    shareToken: urlEncryption.generateImageToken(event.coverImage, 24)
  });
};
```

---

## Performance Tips

### 1. Cache Tokens
```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache

function getCachedToken(url) {
  const cached = cache.get(url);
  if (cached) return cached;
  
  const token = urlEncryption.generateImageToken(url);
  cache.set(url, token);
  return token;
}
```

### 2. Batch Transform
```javascript
// Efficient for large datasets
const events = await Event.find().lean();
const transformed = events.map(event => ({
  ...event,
  imageUrl: event.coverImage 
    ? `/api/images/proxy/${urlEncryption.generateImageToken(event.coverImage)}` 
    : null
}));
```

### 3. Use CDN
```javascript
// Point proxy endpoint to CDN for caching
const cdnUrl = process.env.CDN_URL || '/api/images/proxy';
const imageUrl = `${cdnUrl}/${token}`;
```

---

## Error Handling Examples

```javascript
// Robust error handling
async function getEventSafely(eventId) {
  try {
    const event = await Event.findById(eventId);
    
    if (!event) {
      return { error: 'Event not found', status: 404 };
    }
    
    if (!event.coverImage) {
      return { 
        event: event.toObject(),
        warning: 'No image for this event'
      };
    }
    
    const token = urlEncryption.generateImageToken(event.coverImage);
    if (!token) {
      return { 
        error: 'Failed to generate image token', 
        status: 500 
      };
    }
    
    return {
      event: {
        ...event.toObject(),
        coverImage: undefined,
        imageUrl: `/api/images/proxy/${token}`
      }
    };
    
  } catch (error) {
    return { 
      error: 'Failed to fetch event',
      message: error.message,
      status: 500 
    };
  }
}
```
