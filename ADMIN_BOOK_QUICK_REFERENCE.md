# Quick Reference: Admin Book Without Payment API

## Endpoint
```
POST /api/booking/admin/book-without-payment
```

## Authentication
```
Header: Authorization: Bearer <ADMIN_JWT_TOKEN>
Role Required: admin
```

## Request (Minimal)
```json
{
  "userId": "user_id",
  "eventId": "event_id",
  "seatingId": "seating_id",
  "seatType": "Premium",
  "quantity": 2
}
```

## Request (Complete)
```json
{
  "userId": "user_id",
  "eventId": "event_id",
  "seatingId": "seating_id",
  "seatType": "Premium",
  "quantity": 2,
  "specialRequirements": "Wheelchair accessible",
  "adminNotes": "VIP booking"
}
```

## Success Response (201)
```json
{
  "status": "success",
  "message": "Ticket booked successfully for user without payment",
  "data": {
    "booking": {
      "_id": "booking_id",
      "status": "confirmed",
      "paymentStatus": "completed",
      "ticketNumbers": ["TKT-...", "TKT-..."],
      "totalPrice": 1000
    },
    "event": { "name": "Event Name", "date": "..." },
    "user": { "name": "User Name", "email": "..." }
  }
}
```

## Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 403 Not Authorized | Not admin | Use admin token |
| 400 Missing fields | Missing data | Add all required fields |
| 404 User not found | Invalid userId | Verify user exists |
| 404 Event not found | Invalid eventId | Verify event exists |
| 404 Seating not found | Invalid seatingId | Use _id from event.seatings |
| 400 Not enough seats | Insufficient inventory | Book fewer seats |

## cURL Example
```bash
curl -X POST http://localhost:3000/api/booking/admin/book-without-payment \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439010",
    "eventId": "507f1f77bcf86cd799439011",
    "seatingId": "507f1f77bcf86cd799439012",
    "seatType": "Premium",
    "quantity": 2,
    "adminNotes": "Test booking"
  }'
```

## JavaScript Example
```javascript
const bookTicket = async (token, data) => {
  const res = await fetch('/api/booking/admin/book-without-payment', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return res.json();
};

const result = await bookTicket(adminToken, {
  userId: userId,
  eventId: eventId,
  seatingId: seatingId,
  seatType: 'Premium',
  quantity: 2
});

console.log('Tickets:', result.data.booking.ticketNumbers);
```

## Key Points
✅ Admin only endpoint  
✅ No payment processing  
✅ Automatic confirmation  
✅ Instant ticket generation  
✅ Seat inventory updated  
✅ Admin audit trail recorded  

## Field Descriptions
- **userId**: MongoDB ObjectId of user to book for
- **eventId**: MongoDB ObjectId of event
- **seatingId**: _id from event.seatings array
- **seatType**: Name of seat type (e.g., "Premium")
- **quantity**: Number of tickets (min: 1)
- **specialRequirements**: Optional special needs
- **adminNotes**: Optional admin notes

## What Happens
1. Verify user is admin
2. Check user exists
3. Verify event & seating exist
4. Check seat availability
5. Create booking (confirmed)
6. Update inventory
7. Generate tickets
8. Return booking details

---

*Last Updated: 20 February 2026*
