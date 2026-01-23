# ✅ Android Bank Payment Integration - Complete Checklist

## 📋 Pre-Integration Requirements

- [ ] API Server Running on localhost:3000
- [ ] Razorpay Test Mode Credentials
  - Key ID: `rzp_test_S70BEK0R4wzs2b`
  - Key Secret: (available from dashboard)
- [ ] Postman for API testing
- [ ] Android Studio with latest SDK
- [ ] Minimum Android API Level: 21 (Android 5.0)

---

## 🔧 Step 1: Setup Android Project

### 1.1 Add Dependencies
```gradle
dependencies {
    // Razorpay Checkout
    implementation 'com.razorpay:checkout:1.6.33'
    
    // Networking
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    implementation 'com.squareup.okhttp3:okhttp:4.9.0'
    implementation 'com.squareup.okhttp3:logging-interceptor:4.9.0'
    
    // JSON Processing
    implementation 'com.google.code.gson:gson:2.8.9'
}
```

### 1.2 Sync Gradle
- Click **Sync Now** in Android Studio
- Wait for dependency download

### 1.3 Update AndroidManifest.xml
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Inside <application> tag -->
<activity
    android:name=".PaymentActivity"
    android:exported="true" />
```

---

## 📱 Step 2: Create Payment Models

### 2.1 Create Models Package
File: `app/src/main/java/com/yourapp/models/`

### 2.2 LoginRequest.java
```java
package com.yourapp.models;

public class LoginRequest {
    public String email;
    public String password;
    
    public LoginRequest(String email, String password) {
        this.email = email;
        this.password = password;
    }
}
```

### 2.3 LoginResponse.java
```java
package com.yourapp.models;

public class LoginResponse {
    public String token;
    public Data data;
    
    public class Data {
        public User user;
        
        public class User {
            public String _id;
            public String email;
            public String phone;
            public String name;
        }
    }
}
```

### 2.4 OrderRequest.java
```java
package com.yourapp.models;

public class OrderRequest {
    public String userId;
    public int amount;
    public String description;
    public String receipt;
    public Customer customer;
    
    public class Customer {
        public String email;
        public String phone;
        public String name;
    }
}
```

### 2.5 OrderResponse.java
```java
package com.yourapp.models;

public class OrderResponse {
    public boolean success;
    public String orderId;
    public String razorpayOrderId;
    public int amount;
    public String amountInRupees;
    public String currency;
    public String key;
}
```

### 2.6 VerifyRequest.java
```java
package com.yourapp.models;

public class VerifyRequest {
    public String orderId;
    public String paymentId;
    public String signature;
}
```

### 2.7 VerifyResponse.java
```java
package com.yourapp.models;

public class VerifyResponse {
    public String status;
    public String message;
    public Data data;
    
    public class Data {
        public String _id;
        public String status;
        public int amount;
        public String method;
    }
}
```

---

## 🌐 Step 3: Create API Service

### 3.1 Create ApiService.java
File: `app/src/main/java/com/yourapp/api/ApiService.java`

```java
package com.yourapp.api;

import com.yourapp.models.*;
import retrofit2.Call;
import retrofit2.http.*;

public interface ApiService {
    
    @POST("auth/login")
    Call<LoginResponse> login(@Body LoginRequest request);
    
    @POST("payments/create-order")
    Call<OrderResponse> createOrder(
        @Header("Authorization") String token,
        @Body OrderRequest request
    );
    
    @POST("payments/verify")
    Call<VerifyResponse> verifyPayment(
        @Header("Authorization") String token,
        @Body VerifyRequest request
    );
    
    @GET("payments")
    Call<PaymentListResponse> getPaymentHistory(
        @Header("Authorization") String token
    );
}
```

### 3.2 Create ApiClient.java
File: `app/src/main/java/com/yourapp/api/ApiClient.java`

```java
package com.yourapp.api;

import com.google.gson.Gson;
import okhttp3.OkHttpClient;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class ApiClient {
    private static final String BASE_URL = "http://10.0.2.2:3000/api/";
    // Use 10.0.2.2 for Android emulator (maps to localhost)
    // Use your actual IP for device testing
    
    private static Retrofit retrofit;
    
    public static Retrofit getRetrofit() {
        if (retrofit == null) {
            // Create logging interceptor for debugging
            HttpLoggingInterceptor logging = new HttpLoggingInterceptor();
            logging.setLevel(HttpLoggingInterceptor.Level.BODY);
            
            OkHttpClient client = new OkHttpClient.Builder()
                .addInterceptor(logging)
                .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                .writeTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                .build();
            
            retrofit = new Retrofit.Builder()
                .baseUrl(BASE_URL)
                .addConverterFactory(GsonConverterFactory.create())
                .client(client)
                .build();
        }
        return retrofit;
    }
    
    public static ApiService getApiService() {
        return getRetrofit().create(ApiService.class);
    }
}
```

---

## 💳 Step 4: Create Payment Activity

File: `app/src/main/java/com/yourapp/PaymentActivity.java`

```java
package com.yourapp;

import android.os.Bundle;
import android.util.Log;
import android.widget.*;
import androidx.appcompat.app.AppCompatActivity;
import com.razorpay.Checkout;
import com.razorpay.PaymentResultListener;
import com.razorpay.PaymentData;
import com.yourapp.api.ApiClient;
import com.yourapp.api.ApiService;
import com.yourapp.models.*;
import org.json.JSONException;
import org.json.JSONObject;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class PaymentActivity extends AppCompatActivity implements PaymentResultListener {
    
    private static final String TAG = "PaymentActivity";
    private ApiService apiService;
    private String userToken;
    private String userId;
    private String razorpayOrderId;
    private int paymentAmount;
    private Button btnCreateOrder, btnPay;
    private EditText etAmount;
    private TextView tvStatus;
    private ProgressBar progressBar;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_payment);
        
        // Initialize Razorpay
        Checkout.preload(getApplicationContext());
        
        // Initialize UI
        initializeUI();
        
        // Initialize API
        apiService = ApiClient.getApiService();
        
        // Setup listeners
        setupListeners();
        
        // Auto-login
        loginUser();
    }
    
    private void initializeUI() {
        btnCreateOrder = findViewById(R.id.btnCreateOrder);
        btnPay = findViewById(R.id.btnPay);
        etAmount = findViewById(R.id.etAmount);
        tvStatus = findViewById(R.id.tvStatus);
        progressBar = findViewById(R.id.progressBar);
        
        etAmount.setText("500");
        btnPay.setEnabled(false);
    }
    
    private void setupListeners() {
        btnCreateOrder.setOnClickListener(v -> createPaymentOrder());
        btnPay.setOnClickListener(v -> openRazorpayCheckout());
    }
    
    private void loginUser() {
        showStatus("🔐 Logging in...");
        
        LoginRequest request = new LoginRequest("test@example.com", "test123");
        
        apiService.login(request).enqueue(new Callback<LoginResponse>() {
            @Override
            public void onResponse(Call<LoginResponse> call, Response<LoginResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    LoginResponse loginResponse = response.body();
                    userToken = loginResponse.token;
                    userId = loginResponse.data.user._id;
                    showStatus("✅ Logged in successfully");
                    btnCreateOrder.setEnabled(true);
                } else {
                    showError("Login failed");
                }
            }
            
            @Override
            public void onFailure(Call<LoginResponse> call, Throwable t) {
                showError("Login error: " + t.getMessage());
                Log.e(TAG, "Login error", t);
            }
        });
    }
    
    private void createPaymentOrder() {
        if (userToken == null) {
            showError("Please login first");
            return;
        }
        
        showStatus("📝 Creating order...");
        showProgress(true);
        
        try {
            paymentAmount = Integer.parseInt(etAmount.getText().toString());
        } catch (NumberFormatException e) {
            showError("Invalid amount");
            showProgress(false);
            return;
        }
        
        OrderRequest request = new OrderRequest();
        request.userId = userId;
        request.amount = paymentAmount;
        request.description = "Test Payment";
        request.receipt = "receipt_" + System.currentTimeMillis();
        
        OrderRequest.Customer customer = request.new Customer();
        customer.email = "test@example.com";
        customer.phone = "9876543210";
        customer.name = "Test User";
        request.customer = customer;
        
        apiService.createOrder("Bearer " + userToken, request)
            .enqueue(new Callback<OrderResponse>() {
                @Override
                public void onResponse(Call<OrderResponse> call, Response<OrderResponse> response) {
                    showProgress(false);
                    if (response.isSuccessful() && response.body() != null) {
                        OrderResponse orderResponse = response.body();
                        razorpayOrderId = orderResponse.razorpayOrderId;
                        showStatus("✅ Order created: " + razorpayOrderId);
                        btnPay.setEnabled(true);
                    } else {
                        showError("Failed to create order");
                    }
                }
                
                @Override
                public void onFailure(Call<OrderResponse> call, Throwable t) {
                    showProgress(false);
                    showError("Order creation error: " + t.getMessage());
                    Log.e(TAG, "Order error", t);
                }
            });
    }
    
    private void openRazorpayCheckout() {
        if (razorpayOrderId == null) {
            showError("Please create order first");
            return;
        }
        
        showStatus("💳 Opening payment...");
        
        Checkout checkout = new Checkout();
        checkout.setKeyID("rzp_test_S70BEK0R4wzs2b");
        
        try {
            JSONObject options = new JSONObject();
            options.put("name", "Your App Name");
            options.put("description", "Payment");
            options.put("order_id", razorpayOrderId);
            options.put("amount", paymentAmount * 100); // in paise
            options.put("currency", "INR");
            options.put("image", "https://via.placeholder.com/200");
            
            JSONObject prefill = new JSONObject();
            prefill.put("email", "test@example.com");
            prefill.put("contact", "9876543210");
            options.put("prefill", prefill);
            
            JSONObject theme = new JSONObject();
            theme.put("color", "#667eea");
            options.put("theme", theme);
            
            checkout.open(this, options);
        } catch (JSONException e) {
            showError("Checkout error: " + e.getMessage());
            Log.e(TAG, "JSON error", e);
        }
    }
    
    @Override
    public void onPaymentSuccess(String paymentID, PaymentData paymentData) {
        showStatus("✅ Payment success! Verifying...");
        verifyPayment(paymentData);
    }
    
    @Override
    public void onPaymentError(int code, String response, PaymentData data) {
        showError("Payment failed: " + response);
        Log.e(TAG, "Payment error code: " + code + ", response: " + response);
    }
    
    private void verifyPayment(PaymentData paymentData) {
        showProgress(true);
        
        VerifyRequest request = new VerifyRequest();
        request.orderId = razorpayOrderId;
        request.paymentId = paymentData.getPaymentId();
        request.signature = paymentData.getSignature();
        
        apiService.verifyPayment("Bearer " + userToken, request)
            .enqueue(new Callback<VerifyResponse>() {
                @Override
                public void onResponse(Call<VerifyResponse> call, Response<VerifyResponse> response) {
                    showProgress(false);
                    if (response.isSuccessful() && response.body() != null) {
                        VerifyResponse verifyResponse = response.body();
                        if ("success".equals(verifyResponse.status)) {
                            showStatus("🎉 Payment verified! Status: " + verifyResponse.data.status);
                            btnCreateOrder.setEnabled(true);
                            btnPay.setEnabled(false);
                        } else {
                            showError("Verification failed: " + verifyResponse.message);
                        }
                    } else {
                        showError("Verification error");
                    }
                }
                
                @Override
                public void onFailure(Call<VerifyResponse> call, Throwable t) {
                    showProgress(false);
                    showError("Verification failed: " + t.getMessage());
                    Log.e(TAG, "Verify error", t);
                }
            });
    }
    
    private void showStatus(String message) {
        runOnUiThread(() -> {
            tvStatus.setText(message);
            Log.d(TAG, message);
        });
    }
    
    private void showError(String message) {
        runOnUiThread(() -> {
            tvStatus.setText("❌ " + message);
            Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
            Log.e(TAG, message);
        });
    }
    
    private void showProgress(boolean show) {
        runOnUiThread(() -> progressBar.setVisibility(show ? android.view.View.VISIBLE : android.view.View.GONE));
    }
}
```

---

## 🎨 Step 5: Create UI Layout

File: `app/src/main/res/layout/activity_payment.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="20dp">
    
    <TextView
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="💳 Bank Payment Test"
        android:textSize="24sp"
        android:textStyle="bold"
        android:gravity="center"
        android:layout_marginBottom="20dp" />
    
    <EditText
        android:id="@+id/etAmount"
        android:layout_width="match_parent"
        android:layout_height="50dp"
        android:hint="Enter amount (₹)"
        android:inputType="number"
        android:padding="15dp"
        android:layout_marginBottom="15dp" />
    
    <Button
        android:id="@+id/btnCreateOrder"
        android:layout_width="match_parent"
        android:layout_height="50dp"
        android:text="📝 Create Order"
        android:enabled="false"
        android:layout_marginBottom="10dp" />
    
    <Button
        android:id="@+id/btnPay"
        android:layout_width="match_parent"
        android:layout_height="50dp"
        android:text="💰 Pay Now"
        android:enabled="false"
        android:layout_marginBottom="20dp" />
    
    <ProgressBar
        android:id="@+id/progressBar"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:visibility="gone" />
    
    <TextView
        android:id="@+id/tvStatus"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Status: Ready"
        android:textSize="14sp"
        android:gravity="center"
        android:layout_marginTop="20dp" />
</LinearLayout>
```

---

## 🧪 Step 6: Test on Device/Emulator

### For Emulator:
1. Ensure API Server running on localhost:3000
2. In `ApiClient.java`, use `10.0.2.2` (emulator maps to localhost)
3. Run app: `Shift + F10` or green Run button

### For Physical Device:
1. Get your computer's local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Update BASE_URL to: `http://YOUR_IP:3000/api/`
3. Connect device via USB
4. Run app on device

### Test Flow:
- [ ] App opens
- [ ] Auto-login shows ✅
- [ ] Enter amount (500)
- [ ] Click "Create Order"
- [ ] Click "Pay Now"
- [ ] Select payment method:
  - Card: 4111111111111111
  - UPI: success@razorpay
  - Net Banking: Any bank
- [ ] Complete payment
- [ ] Verify shows ✅

---

## 🐛 Debugging Tips

### Enable Logging
```java
HttpLoggingInterceptor logging = new HttpLoggingInterceptor();
logging.setLevel(HttpLoggingInterceptor.Level.BODY); // Shows full request/response
```

### View Logs
```
// Android Studio > Logcat
// Search for "PaymentActivity" tag
```

### Common Issues

**"Unable to connect to localhost"**
- Emulator: Use `10.0.2.2` instead of `localhost`
- Device: Use your computer's IP address

**"Invalid token"**
- Auto-login failed
- Check credentials in code

**"Order not found"**
- Order creation failed
- Check network connection

**"Signature verification failed"**
- Payment IDs don't match
- Log response to verify values

---

## ✅ Final Checklist

- [ ] Dependencies added and synced
- [ ] AndroidManifest.xml updated
- [ ] Models created
- [ ] ApiService interface created
- [ ] ApiClient configured
- [ ] PaymentActivity created
- [ ] Layout XML created
- [ ] Activity registered in manifest
- [ ] Permissions added
- [ ] Tested on emulator
- [ ] Tested on real device
- [ ] All payment methods tested
- [ ] Error handling tested

**🎉 Ready for production!**
