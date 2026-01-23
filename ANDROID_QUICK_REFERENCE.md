# Bank Payment API - Android Quick Reference

## 🚀 Quick Start for Android Developers

### API Base URL
```
http://localhost:3000/api     (Development)
https://your-api.com/api      (Production)
```

### Razorpay Credentials (Test Mode)
```
Key ID: rzp_test_S70BEK0R4wzs2b
Key Secret: (Server-side only)
```

---

## 📝 Complete Payment Flow

### 1. **User Login** ➜ Get Token
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response: {
  "token": "eyJhbGc...",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "user@example.com"
    }
  }
}

Save: userToken, userId
```

---

### 2. **Create Order** ➜ Get Order ID
```
POST /api/payments/create-order
Content-Type: application/json
Authorization: Bearer {userToken}

{
  "userId": "507f1f77bcf86cd799439011",
  "amount": 500,
  "description": "Ticket Booking",
  "receipt": "receipt_" + timestamp,
  "customer": {
    "email": "user@example.com",
    "phone": "9876543210",
    "name": "User Name"
  }
}

Response: {
  "razorpayOrderId": "order_S75pW1dAg2QbBz",
  "amount": 50000,
  "key": "rzp_test_S70BEK0R4wzs2b"
}

Save: razorpayOrderId
```

---

### 3. **Open Razorpay Checkout** ➜ Process Payment
```java
// Using Razorpay Android SDK
Checkout checkout = new Checkout();
checkout.setKeyID("rzp_test_S70BEK0R4wzs2b");

JSONObject options = new JSONObject();
options.put("name", "Your App Name");
options.put("description", "Payment");
options.put("image", "https://your-logo.png");
options.put("order_id", razorpayOrderId);
options.put("amount", 50000); // in paise
options.put("currency", "INR");

JSONObject preFill = new JSONObject();
preFill.put("email", "user@example.com");
preFill.put("contact", "9876543210");
options.put("prefill", preFill);

checkout.open(this, options);
```

**Payment Response Callback:**
```java
@Override
public void onPaymentSuccess(String paymentID, PaymentData paymentData) {
  // Get response from callback
  String paymentId = paymentData.getPaymentId();    // pay_XXXXX
  String orderId = paymentData.getOrderId();        // order_XXXXX
  String signature = paymentData.getSignature();    // signature_hash
  
  // Send to server for verification
  verifyPayment(orderId, paymentId, signature);
}

@Override
public void onPaymentError(int code, String response, PaymentData data) {
  // Handle error
  Log.e("Payment Error", response);
}
```

---

### 4. **Verify Payment** ➜ Confirm Payment
```
POST /api/payments/verify
Content-Type: application/json
Authorization: Bearer {userToken}

{
  "orderId": "order_S75pW1dAg2QbBz",
  "paymentId": "pay_S5lnxH5mInz355",
  "signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
}

Response: {
  "status": "success",
  "data": {
    "status": "verified",
    "amount": 500,
    "method": "card"
  }
}
```

---

## 💳 Test Payment Methods

### Debit/Credit Card
- **Card Number:** 4111111111111111
- **Expiry:** 12/25 (any future date)
- **CVV:** 123
- **OTP:** 123456
- **Result:** ✅ SUCCESS

### UPI
- **UPI ID:** success@razorpay
- **Result:** ✅ SUCCESS

### Net Banking (All Banks)
- **Select:** Any bank
- **Login:** Any credentials
- **Result:** ✅ SUCCESS (in test mode)

---

## 📱 Android SDK Integration

### Add Dependency
```gradle
dependencies {
    implementation 'com.razorpay:checkout:1.6.33'
}
```

### Initialize
```java
import com.razorpay.Checkout;

public class PaymentActivity extends AppCompatActivity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Checkout.preload(getApplicationContext());
    }
}
```

### Retrofit Integration Example
```java
// API Interface
public interface PaymentAPI {
    @POST("/api/payments/create-order")
    Call<OrderResponse> createOrder(
        @Header("Authorization") String token,
        @Body OrderRequest request
    );
    
    @POST("/api/payments/verify")
    Call<VerifyResponse> verifyPayment(
        @Header("Authorization") String token,
        @Body VerifyRequest request
    );
}

// Models
public class OrderRequest {
    public String userId;
    public int amount;
    public String description;
    public Customer customer;
}

public class OrderResponse {
    public String razorpayOrderId;
    public int amount;
    public String key;
}

public class VerifyRequest {
    public String orderId;
    public String paymentId;
    public String signature;
}

public class VerifyResponse {
    public String status;
    public PaymentData data;
}
```

### Complete Flow Example
```java
public class PaymentController {
    
    private PaymentAPI api;
    private String userToken;
    
    // Step 1: Create Order
    public void createPaymentOrder(String userId, int amount) {
        OrderRequest request = new OrderRequest();
        request.userId = userId;
        request.amount = amount;
        request.description = "Ticket Booking";
        request.customer = new Customer();
        request.customer.email = "user@example.com";
        request.customer.phone = "9876543210";
        
        api.createOrder("Bearer " + userToken, request)
            .enqueue(new Callback<OrderResponse>() {
                @Override
                public void onResponse(Call<OrderResponse> call, Response<OrderResponse> response) {
                    if (response.isSuccessful()) {
                        openRazorpayCheckout(response.body());
                    }
                }
                
                @Override
                public void onFailure(Call<OrderResponse> call, Throwable t) {
                    showError("Failed to create order: " + t.getMessage());
                }
            });
    }
    
    // Step 2: Open Checkout
    private void openRazorpayCheckout(OrderResponse orderResponse) {
        Checkout checkout = new Checkout();
        checkout.setKeyID("rzp_test_S70BEK0R4wzs2b");
        
        try {
            JSONObject options = new JSONObject();
            options.put("name", "YourApp");
            options.put("order_id", orderResponse.razorpayOrderId);
            options.put("amount", orderResponse.amount);
            options.put("currency", "INR");
            options.put("description", "Payment");
            
            JSONObject prefill = new JSONObject();
            prefill.put("email", "user@example.com");
            prefill.put("contact", "9876543210");
            options.put("prefill", prefill);
            
            checkout.open(this, options);
        } catch (JSONException e) {
            showError("Checkout error: " + e.getMessage());
        }
    }
    
    // Step 3: Handle Payment Success
    @Override
    public void onPaymentSuccess(String paymentID, PaymentData paymentData) {
        verifyPayment(paymentData);
    }
    
    // Step 4: Verify Payment
    private void verifyPayment(PaymentData paymentData) {
        VerifyRequest request = new VerifyRequest();
        request.orderId = paymentData.getOrderId();
        request.paymentId = paymentData.getPaymentId();
        request.signature = paymentData.getSignature();
        
        api.verifyPayment("Bearer " + userToken, request)
            .enqueue(new Callback<VerifyResponse>() {
                @Override
                public void onResponse(Call<VerifyResponse> call, Response<VerifyResponse> response) {
                    if (response.isSuccessful() && 
                        "success".equals(response.body().status)) {
                        showSuccess("Payment verified!");
                    } else {
                        showError("Payment verification failed");
                    }
                }
                
                @Override
                public void onFailure(Call<VerifyResponse> call, Throwable t) {
                    showError("Verification failed: " + t.getMessage());
                }
            });
    }
    
    @Override
    public void onPaymentError(int code, String response, PaymentData data) {
        showError("Payment failed: " + response);
    }
}
```

---

## ⚠️ Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 401 | "Invalid token" | Login again, get new token |
| 400 | "Invalid amount" | Amount must be > 0 |
| 402 | "Order not found" | Create new order |
| 403 | "Unauthorized" | Check token, userId |
| 409 | "Signature verification failed" | Check paymentId, orderId, signature |
| 500 | "Server error" | Contact support |

---

## 🔐 Security Best Practices

1. **Never store credentials in app**
   - Always fetch token from secure server
   - Don't hardcode API keys

2. **Always verify on backend**
   - Never trust client-side verification
   - Signature verification must happen server-side

3. **Use HTTPS in production**
   - All API calls over HTTPS
   - Never send tokens over HTTP

4. **Handle network timeouts**
   - Set reasonable timeouts (30-60 seconds)
   - Implement retry logic with exponential backoff

5. **Don't expose error details**
   - Show generic errors to users
   - Log detailed errors server-side

---

## 📊 Response Codes

```
200 - OK (Success)
201 - Created (Order created)
400 - Bad Request (Invalid input)
401 - Unauthorized (Invalid token)
402 - Payment required (Insufficient funds)
403 - Forbidden (Access denied)
404 - Not Found (Resource not found)
409 - Conflict (Duplicate/already processed)
500 - Server Error (Internal error)
```

---

## 🧪 Testing Checklist

- [ ] Login and get token
- [ ] Create order with ₹500
- [ ] Create order with ₹1000
- [ ] Create order with ₹2500
- [ ] Test card payment (4111111111111111)
- [ ] Test UPI payment (success@razorpay)
- [ ] Test Net Banking payment
- [ ] Verify payment signature
- [ ] Check payment history
- [ ] Test error cases
- [ ] Check timeout handling
- [ ] Test on real device

---

## 📞 Support

- **API Base URL:** http://localhost:3000/api
- **Razorpay Docs:** https://razorpay.com/docs/
- **Test Mode:** Always enabled
- **Production Key:** Get from admin dashboard

Ready to integrate? 🚀
