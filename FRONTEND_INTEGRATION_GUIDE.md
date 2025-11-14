# Frontend Integration Guide - Registration & Ticket System

## 📱 Complete User Journey

```
1. User Registration (Create Account)
   ↓
2. User Login (Get hasFaceRecord status)
   ↓
3. Browse Events
   ↓
4. Create Event Registration (Auto status calculated)
   ↓
5. Initiate Payment
   ↓
6. Payment Success → Issue Ticket
   ↓
7. Show Ticket to User
```

---

## 🔑 Key API Endpoints for Frontend

### Base URL
```
http://localhost:3000/api
```

### Authentication
All endpoints (except login/signup) require:
```javascript
headers: {
  'Authorization': 'Bearer ' + token,
  'Content-Type': 'application/json'
}
```

---

## 1️⃣ USER AUTHENTICATION

### Sign Up (Create Account)
```javascript
const signup = async (userData) => {
  const response = await fetch(`/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      phone: '+919999999999'
    })
  });
  
  const data = await response.json();
  return {
    token: data.data.token,
    user: data.data.user
  };
};
```

### Login
```javascript
const login = async (email, password) => {
  const response = await fetch(`/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  // ⭐ IMPORTANT: Response includes hasFaceRecord and faceId
  return {
    token: data.data.token,
    user: {
      _id: data.data.user._id,
      email: data.data.user.email,
      name: data.data.user.name,
      verificationStatus: data.data.user.verificationStatus,
      hasFaceRecord: data.data.user.hasFaceRecord,      // ✅ Boolean
      faceId: data.data.user.faceId,                   // ✅ Unique ID
      uploadedPhoto: data.data.user.uploadedPhoto
    }
  };
};
```

**Login Response Sample:**
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "6915c1ce111e057ff7b315bc",
      "email": "d@example.com",
      "name": "daksh",
      "verificationStatus": "verified",
      "hasFaceRecord": true,           ✅ KEY FIELD
      "faceId": "130401df-6537-4918..."
    }
  }
}
```

---

## 2️⃣ EVENT REGISTRATION

### Get All Events
```javascript
const getEvents = async (token) => {
  const response = await fetch(`/api/events`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  return data.data.events.map(event => ({
    _id: event._id,
    name: event.name,
    date: event.date,
    location: event.location,
    totalTickets: event.totalTickets,
    ticketsSold: event.ticketsSold,
    ticketsAvailable: event.totalTickets - event.ticketsSold,
    price: event.price
  }));
};
```

### Create Registration (Auto Status)
```javascript
const createRegistration = async (userId, eventId, token) => {
  const response = await fetch(`/api/registrations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: userId,
      eventId: eventId
    })
  });
  
  const data = await response.json();
  
  // ⭐ IMPORTANT: Automatic calculation happens here
  const registration = data.data.registration;
  
  return {
    registrationId: registration._id,
    faceVerificationStatus: registration.faceVerificationStatus,  // ✅ Boolean
    ticketAvailabilityStatus: registration.ticketAvailabilityStatus, // ✅ String
    status: registration.status,
    ticketIssued: registration.ticketIssued,
    eventId: registration.eventId,
    event: {
      name: registration.eventId.name,
      date: registration.eventId.date,
      location: registration.eventId.location
    }
  };
};
```

### Check Registration Status
```javascript
const getUserRegistrations = async (userId, token) => {
  const response = await fetch(`/api/registrations/users/${userId}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  
  return data.data.registrations.map(reg => ({
    _id: reg._id,
    eventId: reg.eventId._id,
    eventName: reg.eventId.name,
    faceVerificationStatus: reg.faceVerificationStatus,    // ✅ Boolean
    ticketAvailabilityStatus: reg.ticketAvailabilityStatus, // ✅ String
    ticketIssued: reg.ticketIssued,
    status: reg.status,
    registrationDate: reg.registrationDate
  }));
};
```

---

## 3️⃣ PAYMENT INTEGRATION

### Payment Flow Pattern

```javascript
const handleEventRegistration = async (userId, eventId, token, hasFaceRecord) => {
  try {
    // Step 1: Create registration
    console.log('Creating registration...');
    const registration = await createRegistration(userId, eventId, token);
    
    // Step 2: Check conditions
    if (!registration.faceVerificationStatus) {
      showError('Face verification required. Please upload your photo.');
      return;
    }
    
    if (registration.ticketAvailabilityStatus !== 'available') {
      showInfo('No tickets available. You have been added to waiting list.');
      // User cannot proceed to payment
      return;
    }
    
    // Step 3: Show payment UI
    console.log('Initiating payment...');
    const paymentResult = await initiatePayment({
      amount: 500,  // In paise (₹5 = 500 paise)
      registrationId: registration.registrationId,
      eventName: registration.event.name,
      userName: currentUser.name,
      userEmail: currentUser.email
    });
    
    // Step 4: After payment success
    if (paymentResult.success) {
      console.log('Payment successful! Issuing ticket...');
      const ticket = await issueTicket(
        registration.registrationId,
        paymentResult.paymentId,
        500,
        token
      );
      
      // Step 5: Show success
      showSuccess('Ticket issued successfully!');
      showTicket(ticket);
      
      return ticket;
    }
    
  } catch (error) {
    showError('Registration failed: ' + error.message);
  }
};
```

### Razorpay Payment Implementation
```javascript
const initiatePayment = async (paymentData) => {
  // Initialize Razorpay
  const options = {
    key: 'rzp_test_XXXXXXX',  // Your Razorpay Key ID
    amount: paymentData.amount,
    currency: 'INR',
    name: 'Event Registration',
    description: `Ticket for ${paymentData.eventName}`,
    order_id: '', // Generate from backend if needed
    prefill: {
      name: paymentData.userName,
      email: paymentData.userEmail
    },
    handler: function(response) {
      // Called on successful payment
      return {
        success: true,
        paymentId: response.razorpay_payment_id,
        amount: paymentData.amount
      };
    },
    modal: {
      ondismiss: function() {
        console.log('Payment cancelled');
        return { success: false };
      }
    }
  };
  
  const rzp = new Razorpay(options);
  
  return new Promise((resolve) => {
    // Override handlers to return promises
    options.handler = (response) => {
      resolve({
        success: true,
        paymentId: response.razorpay_payment_id,
        amount: paymentData.amount
      });
    };
    options.modal.ondismiss = () => {
      resolve({ success: false });
    };
    
    rzp.open();
  });
};
```

### Stripe Payment Implementation
```javascript
const initiatePaymentStripe = async (paymentData, token) => {
  // Create payment intent via your backend
  const response = await fetch('/api/payments/create-intent', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: paymentData.amount,
      registrationId: paymentData.registrationId
    })
  });
  
  const { clientSecret } = await response.json();
  
  // Confirm payment with Stripe
  const stripe = window.Stripe('pk_test_XXXXXXX');
  const result = await stripe.confirmCardPayment(clientSecret, {
    payment_method: {
      card: {
        number: '4242424242424242',
        exp_month: 12,
        exp_year: 2025,
        cvc: '123'
      }
    }
  });
  
  if (result.paymentIntent.status === 'succeeded') {
    return {
      success: true,
      paymentId: result.paymentIntent.id,
      amount: paymentData.amount
    };
  }
  
  return { success: false };
};
```

---

## 4️⃣ TICKET ISSUANCE

### Issue Ticket After Payment
```javascript
const issueTicket = async (registrationId, paymentId, amount, token) => {
  const response = await fetch(`/api/tickets/issue-after-payment`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      registrationId: registrationId,
      paymentId: paymentId,
      amount: amount,
      price: amount
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to issue ticket');
  }
  
  const data = await response.json();
  
  return {
    ticketId: data.data.ticket.ticketId,
    _id: data.data.ticket._id,
    eventName: data.data.ticket.eventName,
    userName: data.data.ticket.userName,
    userEmail: data.data.ticket.userEmail,
    price: data.data.ticket.price,
    status: data.data.ticket.status,
    purchaseDate: data.data.ticket.purchaseDate,
    paymentId: data.data.ticket.paymentId
  };
};
```

---

## 5️⃣ TICKET DISPLAY

### Show Ticket to User
```javascript
const TicketComponent = ({ ticket, qrCodeUrl }) => {
  return (
    <div className="ticket-container">
      <h1>✅ Ticket Confirmed!</h1>
      
      <div className="ticket-info">
        <div className="field">
          <label>Ticket ID:</label>
          <span className="value">{ticket.ticketId}</span>
        </div>
        
        <div className="field">
          <label>Event:</label>
          <span className="value">{ticket.eventName}</span>
        </div>
        
        <div className="field">
          <label>Name:</label>
          <span className="value">{ticket.userName}</span>
        </div>
        
        <div className="field">
          <label>Email:</label>
          <span className="value">{ticket.userEmail}</span>
        </div>
        
        <div className="field">
          <label>Amount Paid:</label>
          <span className="value">₹{ticket.price}</span>
        </div>
        
        <div className="field">
          <label>Purchase Date:</label>
          <span className="value">
            {new Date(ticket.purchaseDate).toLocaleString()}
          </span>
        </div>
        
        <div className="field">
          <label>Payment ID:</label>
          <span className="value">{ticket.paymentId}</span>
        </div>
      </div>
      
      {/* QR Code for Check-in */}
      <div className="qr-section">
        <h3>Scan for Check-in</h3>
        <img src={qrCodeUrl} alt="QR Code" />
      </div>
      
      <button onClick={() => downloadTicket(ticket)}>
        Download Ticket
      </button>
    </div>
  );
};
```

---

## ⚠️ ERROR HANDLING

```javascript
const handleRegistrationError = (error, registration) => {
  if (error.message.includes('No face verification')) {
    return {
      status: 'error',
      title: '📸 Face Verification Required',
      message: 'Please upload your photo for face verification',
      action: 'GO_TO_UPLOAD'
    };
  }
  
  if (error.message.includes('No tickets available')) {
    return {
      status: 'waiting_list',
      title: '⏳ Waiting List',
      message: 'All tickets sold out. You have been added to waiting list.',
      action: 'NONE'
    };
  }
  
  if (error.message.includes('Ticket already issued')) {
    return {
      status: 'duplicate',
      title: '🎫 Ticket Already Issued',
      message: 'You already have a ticket for this event',
      action: 'SHOW_TICKET'
    };
  }
  
  return {
    status: 'error',
    title: '❌ Error',
    message: error.message,
    action: 'RETRY'
  };
};
```

---

## 📊 State Management (React Example)

```javascript
import { useState, useContext } from 'react';

const EventRegistrationFlow = () => {
  const { user, token } = useContext(AuthContext);
  const [registration, setRegistration] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Step 1: Create Registration
  const handleRegisterEvent = async (eventId) => {
    setLoading(true);
    setError(null);
    
    try {
      const reg = await createRegistration(user._id, eventId, token);
      setRegistration(reg);
      
      // Auto-check conditions
      if (!reg.faceVerificationStatus) {
        setError('Face verification required');
        return;
      }
      
      if (reg.ticketAvailabilityStatus !== 'available') {
        setError('No tickets available');
        return;
      }
      
      // Proceed to payment
      handlePayment(reg);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Step 2: Handle Payment
  const handlePayment = async (registration) => {
    try {
      const paymentResult = await initiatePayment({
        amount: 500,
        registrationId: registration.registrationId,
        eventName: registration.event.name,
        userName: user.name,
        userEmail: user.email
      });
      
      if (paymentResult.success) {
        // Step 3: Issue Ticket
        const issuedTicket = await issueTicket(
          registration.registrationId,
          paymentResult.paymentId,
          500,
          token
        );
        setTicket(issuedTicket);
      }
    } catch (err) {
      setError(err.message);
    }
  };
  
  return (
    <div>
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      {ticket && <TicketComponent ticket={ticket} />}
      {registration && !ticket && (
        <RegistrationSummary registration={registration} />
      )}
    </div>
  );
};
```

---

## 🔄 Complete React Hook

```javascript
const useEventRegistration = () => {
  const [state, setState] = useState({
    step: 'idle', // idle, registering, payment, success, error
    registration: null,
    ticket: null,
    error: null
  });
  
  const registerForEvent = async (userId, eventId, token) => {
    setState(s => ({ ...s, step: 'registering', error: null }));
    
    try {
      // Create registration
      const registration = await createRegistration(userId, eventId, token);
      
      // Validate conditions
      if (!registration.faceVerificationStatus) {
        throw new Error('Face verification required');
      }
      
      if (registration.ticketAvailabilityStatus !== 'available') {
        throw new Error('No tickets available');
      }
      
      setState(s => ({ ...s, registration, step: 'payment' }));
      
      return registration;
    } catch (error) {
      setState(s => ({ ...s, error: error.message, step: 'error' }));
      throw error;
    }
  };
  
  const processPayment = async (registrationId, paymentId, amount, token) => {
    setState(s => ({ ...s, step: 'payment', error: null }));
    
    try {
      const ticket = await issueTicket(registrationId, paymentId, amount, token);
      
      setState(s => ({ ...s, ticket, step: 'success' }));
      
      return ticket;
    } catch (error) {
      setState(s => ({ ...s, error: error.message, step: 'error' }));
      throw error;
    }
  };
  
  return {
    state,
    registerForEvent,
    processPayment
  };
};

// Usage
const MyComponent = () => {
  const { state, registerForEvent, processPayment } = useEventRegistration();
  
  return (
    <>
      {state.step === 'success' && (
        <TicketComponent ticket={state.ticket} />
      )}
    </>
  );
};
```

---

## 📋 Complete Registration Form

```jsx
const EventRegistrationForm = ({ event, token, user }) => {
  const [loading, setLoading] = useState(false);
  const [registration, setRegistration] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Create registration
      const reg = await createRegistration(user._id, event._id, token);
      setRegistration(reg);
      
      // Validate
      if (!reg.faceVerificationStatus) {
        alert('Face verification required');
        return;
      }
      
      if (reg.ticketAvailabilityStatus !== 'available') {
        alert('No tickets available');
        return;
      }
      
      // Proceed to payment
      const payment = await initPayment({
        amount: event.price,
        registrationId: reg.registrationId
      });
      
      if (payment.success) {
        const ticket = await issueTicket(
          reg.registrationId,
          payment.paymentId,
          event.price,
          token
        );
        
        // Show success
        showTicket(ticket);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <h2>Register for {event.name}</h2>
      <p>Price: ₹{event.price}</p>
      <p>Available Tickets: {event.ticketsAvailable}</p>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Processing...' : 'Register & Pay'}
      </button>
    </form>
  );
};
```

---

## ✅ Frontend Checklist

- ✅ Get user token from login
- ✅ Check `hasFaceRecord` status
- ✅ Create registration (auto status calculated)
- ✅ Validate `faceVerificationStatus: true`
- ✅ Validate `ticketAvailabilityStatus: "available"`
- ✅ Initiate payment via Razorpay/Stripe
- ✅ Call `/api/tickets/issue-after-payment` on success
- ✅ Display ticket details to user
- ✅ Generate QR code for check-in
- ✅ Handle all error scenarios

---

## 🚀 Live Test URLs

```
Frontend:     http://localhost:3000
API:          http://localhost:3000/api
API Docs:     Check Postman collection
WebSocket:    ws://localhost:3000 (if real-time updates needed)
```

All endpoints tested and working! ✅
