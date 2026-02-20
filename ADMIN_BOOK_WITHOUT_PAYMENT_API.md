# Admin: Book Event Ticket Without Payment API

## Overview
This API allows **admin users only** to book event tickets for specific users **without requiring payment**. The booking is automatically confirmed and tickets are generated.

**Endpoint:** `POST /api/booking/admin/book-without-payment`

---

## Authentication Requirements
- ✅ User must be authenticated
- ✅ User must have `role: 'admin'` in their user profile
- ❌ Regular users cannot access this endpoint

---

## Request Details

### Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Request Body
```json
{
  "userId": "user_object_id",
  "eventId": "event_object_id",
  "seatingId": "seating_id_from_event_seatings_array",
  "seatType": "seat_type_name",
  "quantity": 2,
  "specialRequirements": "Optional wheelchair accessible seating",
  "adminNotes": "Optional admin notes for record"
}
```

### Required Fields
| Field | Type | Description |
|-------|------|-------------|
| `userId` | String (ObjectId) | ID of user to book for |
| `eventId` | String (ObjectId) | ID of event |
| `seatingId` | String (ObjectId) | ID of seating type from event.seatings array |
| `seatType` | String | Name of seat type (e.g., "Premium", "Standard") |
| `quantity` | Number | Number of tickets to book (minimum: 1) |

### Optional Fields
| Field | Type | Description |
|-------|------|-------------|
| `specialRequirements` | String | Special booking requirements |
| `adminNotes` | String | Admin notes about the booking |

---

## Success Response (201 Created)

```json
{
  "status": "success",
  "message": "Ticket booked successfully for user without payment",
  "data": {
    "booking": {
      "_id": "booking_id",
      "bookingId": "booking_id",
      "status": "confirmed",
      "paymentStatus": "completed",
      "userId": "user_id",
      "eventId": "event_id",
      "seatType": "Premium",
      "quantity": 2,
      "pricePerSeat": 500,
      "totalPrice": 1000,
      "ticketNumbers": [
        "TKT-event_id-user_id-1-1708123456789",
        "TKT-event_id-user_id-2-1708123456789"
      ],
      "bookedAt": "2026-02-20T10:30:00.000Z",
      "confirmedAt": "2026-02-20T10:30:00.000Z",
      "specialRequirements": "wheelchair accessible",
      "notes": "Admin booking by admin_id"
    },
    "event": {
      "_id": "event_id",
      "name": "Concert 2026",
      "date": "2026-03-15T18:00:00.000Z",
      "location": "New Delhi",
      "status": "upcoming"
    },
    "user": {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+919876543210"
    },
    "adminAction": {
      "adminId": "admin_user_id",
      "actionTime": "2026-02-20T10:30:00.000Z",
      "paymentBypassed": true
    }
  }
}
```

---

## Error Responses

### 403 - Admin Access Required
```json
{
  "status": "error",
  "message": "Only admins can use this endpoint"
}
```

### 400 - Missing Required Fields
```json
{
  "status": "error",
  "message": "Missing required fields: userId, eventId, seatingId, seatType, quantity"
}
```

### 404 - User Not Found
```json
{
  "status": "error",
  "message": "User not found"
}
```

### 404 - Event Not Found
```json
{
  "status": "error",
  "message": "Event not found"
}
```

### 404 - Seating Not Found
```json
{
  "status": "error",
  "message": "Seating type not found for this event"
}
```

### 400 - Insufficient Seats
```json
{
  "status": "error",
  "message": "Only 5 seats available, but 10 requested"
}
```

### 401 - Not Authenticated
```json
{
  "status": "error",
  "message": "Not authenticated. Please log in."
}
```

---

## How It Works

### Step-by-Step Process
1. **Admin Authentication** - Verify user has admin role
2. **User Verification** - Confirm the target user exists
3. **Event Verification** - Verify event and seating configuration
4. **Availability Check** - Confirm enough seats are available
5. **Booking Creation** - Create booking with "confirmed" status (skips payment)
6. **Seat Inventory Update** - Mark seats as sold (decreases available seats)
7. **Ticket Generation** - Auto-create unique ticket numbers
8. **Response** - Return booking details with ticket numbers

---

## Example Usage

### Using cURL
```bash
curl -X POST http://localhost:3000/api/booking/admin/book-without-payment \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439010",
    "eventId": "507f1f77bcf86cd799439011",
    "seatingId": "507f1f77bcf86cd799439012",
    "seatType": "Premium",
    "quantity": 2,
    "specialRequirements": "Wheelchair accessible",
    "adminNotes": "VIP booking from admin dashboard"
  }'
```

### Using JavaScript/Fetch
```javascript
const bookTicketForUser = async (adminToken, bookingData) => {
  const response = await fetch(
    'http://localhost:3000/api/booking/admin/book-without-payment',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookingData)
    }
  );

  if (!response.ok) {
    throw new Error(`Booking failed: ${response.statusText}`);
  }

  return await response.json();
};

// Usage
const bookingData = {
  userId: '507f1f77bcf86cd799439010',
  eventId: '507f1f77bcf86cd799439011',
  seatingId: '507f1f77bcf86cd799439012',
  seatType: 'Premium',
  quantity: 2,
  specialRequirements: 'Wheelchair accessible',
  adminNotes: 'VIP booking'
};

try {
  const result = await bookTicketForUser(adminToken, bookingData);
  console.log('Booking successful:', result.data.booking.ticketNumbers);
} catch (error) {
  console.error('Booking failed:', error);
}
```

### Using Postman
1. **Method:** POST
2. **URL:** `{{base_url}}/api/booking/admin/book-without-payment`
3. **Headers:**
   - `Authorization: Bearer {{admin_token}}`
   - `Content-Type: application/json`
4. **Body (Raw JSON):**
```json
{
  "userId": "507f1f77bcf86cd799439010",
  "eventId": "507f1f77bcf86cd799439011",
  "seatingId": "507f1f77bcf86cd799439012",
  "seatType": "Premium",
  "quantity": 2,
  "specialRequirements": "Wheelchair accessible",
  "adminNotes": "VIP customer"
}
```

---

## What Gets Automatically Done

When you use this API, the system **automatically**:

✅ Creates a booking record in the database  
✅ Sets booking status to `confirmed` (no payment required)  
✅ Marks payment status as `completed` (no payment processed)  
✅ Updates event seat inventory (moves seats to "sold")  
✅ Generates unique ticket numbers for each seat  
✅ Records the admin who made the booking  
✅ Sets booking confirmation time  
✅ Sends response with all ticket details  

---

## Booking Data Structure

The created booking will have:

```javascript
{
  userId: "the_user_id",
  eventId: "the_event_id",
  seatingId: "the_seating_id",
  seatType: "Premium",
  quantity: 2,
  pricePerSeat: 500,
  totalPrice: 1000,
  
  // Automatic confirmations (no payment required)
  status: "confirmed",
  paymentStatus: "completed",
  paymentMethod: "admin_direct_booking",
  paymentId: "ADMIN_1708123456789",
  
  // Timestamps
  bookedAt: new Date(),
  confirmedAt: new Date(),
  
  // Tickets generated
  ticketNumbers: [
    "TKT-event_id-user_id-1-1708123456789",
    "TKT-event_id-user_id-2-1708123456789"
  ],
  
  // Optional fields
  specialRequirements: "wheelchair accessible",
  notes: "Admin booking by admin_id"
}
```

---

## Security Features

1. **Admin Role Check** - Only users with `role: 'admin'` can access
2. **Audit Trail** - Records admin ID and timestamp of booking
3. **Input Validation** - All fields are validated before processing
4. **Existence Verification** - Confirms user and event exist before booking
5. **Availability Check** - Prevents overbooking

---

## Important Notes

⚠️ **No Payment Processing**
- This API **bypasses payment completely**
- No payment gateway integration
- No refund processing available for these bookings

⚠️ **Immediate Confirmation**
- Booking is instantly confirmed
- No pending state
- Tickets generated immediately

⚠️ **Seat Inventory**
- Seats are deducted from available inventory
- Cannot book if insufficient seats remain
- Lock mechanism is bypassed

⚠️ **Admin Accountability**
- Admin ID is recorded with each booking
- Timestamp recorded for audit purposes
- Notes can document booking reason

---

## Common Use Cases

### 1. Complimentary/Courtesy Tickets
```json
{
  "userId": "influencer_user_id",
  "eventId": "concert_event_id",
  "seatingId": "vip_seating_id",
  "seatType": "VIP",
  "quantity": 4,
  "adminNotes": "Courtesy pass for influencer"
}
```

### 2. Staff/Employee Passes
```json
{
  "userId": "staff_member_id",
  "eventId": "concert_event_id",
  "seatingId": "standard_seating_id",
  "seatType": "Standard",
  "quantity": 1,
  "adminNotes": "Staff pass - free admission"
}
```

### 3. Accessibility Accommodations
```json
{
  "userId": "customer_user_id",
  "eventId": "concert_event_id",
  "seatingId": "premium_seating_id",
  "seatType": "Premium",
  "quantity": 2,
  "specialRequirements": "Wheelchair accessible, companion required",
  "adminNotes": "Accessibility accommodation"
}
```

### 4. Bulk Admin Booking
```json
{
  "userId": "corporate_client_id",
  "eventId": "concert_event_id",
  "seatingId": "premium_seating_id",
  "seatType": "Premium",
  "quantity": 50,
  "adminNotes": "Corporate bulk booking"
}
```

---

## Troubleshooting

### Issue: "Only admins can use this endpoint"
**Solution:** Ensure your user account has `role: 'admin'` in the database

### Issue: "User not found"
**Solution:** Verify the userId is a valid MongoDB ObjectID of an existing user

### Issue: "Event not found"
**Solution:** Check the eventId is correct and event exists in the database

### Issue: "Seating type not found"
**Solution:** Use the actual `_id` from the `event.seatings` array, not the seatType name

### Issue: "Only X seats available"
**Solution:** Request fewer tickets or wait for other bookings to be cancelled

---

## Testing the API

### Step 1: Get Admin Token
First, log in as an admin user to get JWT token:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "password": "admin_password"
  }'
```

### Step 2: Copy the Token
Use the returned token in Authorization header

### Step 3: Get Valid IDs
```bash
# Get an event
curl http://localhost:3000/api/events

# Get a user
curl http://localhost:3000/api/users/list

# View seating IDs from event
curl http://localhost:3000/api/events/{eventId}
```

### Step 4: Make Booking Request
Use the IDs from step 3 in your booking request

---

## Integration with Frontend

```javascript
// Admin booking form handler
async function submitAdminBooking(formData) {
  const token = localStorage.getItem('adminToken');
  
  try {
    const response = await fetch('/api/booking/admin/book-without-payment', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (result.status === 'success') {
      // Show success message with ticket numbers
      alert(`✅ Booking successful!\nTicket Numbers: ${result.data.booking.ticketNumbers.join(', ')}`);
      
      // Optionally download ticket or send to user
      sendTicketToUser(result.data.user.email, result.data.booking.ticketNumbers);
    } else {
      alert(`❌ Booking failed: ${result.message}`);
    }
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  }
}
```

---

## API Endpoint Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/booking/admin/book-without-payment` | ✅ Admin Only | Book ticket for user without payment |
| GET | `/api/booking/admin/:eventId/stats` | ✅ Admin Only | Get event booking statistics |
| POST | `/api/booking/admin/cleanup-expired` | ✅ Admin Only | Clean up expired temporary bookings |

---

## Related APIs

- **User Booking API** - `/api/booking/book` (with payment)
- **Seat Availability** - `/api/booking/:eventId/seats` (public)
- **Booking Details** - `/api/booking/:bookingId` (authenticated)
- **User Bookings List** - `/api/booking/user/:userId` (authenticated)

---

## Support & Debugging

If you encounter issues:

1. **Check Admin Status:** Verify `user.role === 'admin'`
2. **Validate IDs:** Ensure all ObjectIDs are valid format
3. **Check Dates:** Verify event date is in the future
4. **Check Seats:** Verify seating configuration in event
5. **Review Logs:** Check server console for detailed error messages

---

*Last Updated: 20 February 2026*
