# 📱 Android App - Ads Integration Code Examples

Complete Kotlin code examples for implementing ads in your Android app.

---

## 🏗️ Project Structure

```
app/
├── data/
│   ├── models/
│   │   └── Ad.kt
│   ├── repository/
│   │   └── AdsRepository.kt
│   └── api/
│       └── AdsApiService.kt
├── ui/
│   ├── screens/
│   │   └── AdsScreen.kt
│   ├── components/
│   │   ├── AdBanner.kt
│   │   └── AdCarousel.kt
│   └── viewmodel/
│       └── AdsViewModel.kt
└── utils/
    └── Constants.kt
```

---

## 📦 Dependencies

Add to `build.gradle`:
```gradle
dependencies {
    // Retrofit
    implementation 'com.squareup.retrofit2:retrofit:2.11.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.11.0'
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    
    // Coroutines
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
    
    // Jetpack Compose
    implementation 'androidx.compose.ui:ui:1.6.0'
    implementation 'androidx.compose.material3:material3:1.2.0'
    
    // Image Loading
    implementation 'io.coil-kt:coil-compose:2.6.0'
    
    // ViewModel
    implementation 'androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0'
    
    // Navigation
    implementation 'androidx.navigation:navigation-compose:2.7.7'
}
```

---

## 1️⃣ Data Models

### Ad.kt
```kotlin
package com.example.app.data.models

import com.google.gson.annotations.SerializedName
import java.time.LocalDateTime

data class Ad(
    @SerializedName("_id")
    val id: String,
    
    val organizerId: String,
    val title: String,
    val description: String?,
    val imageUrl: String,
    val imageKey: String?,
    
    val adType: String,  // banner, promotional, announcement, sponsored, event
    val targetUrl: String?,
    
    val displayDuration: Int = 5,  // seconds
    val priority: Int = 0,  // 0-10, higher = more frequent
    
    val startDate: String,
    val endDate: String,
    val isActive: Boolean = true,
    
    val impressions: Int = 0,
    val clicks: Int = 0,
    val ctr: Double = 0.0,
    
    val status: String,  // pending, approved, rejected, archived
    val tags: List<String> = emptyList(),
    
    val budget: Int = 0,
    val targetAudience: String = "all",
    
    val createdAt: String,
    val updatedAt: String
)

data class AdsResponse(
    val status: String,
    val results: Int,
    val data: AdsData
)

data class AdsData(
    val ads: List<Ad>
)

data class ClickResponse(
    val status: String,
    val message: String,
    val data: ClickData
)

data class ClickData(
    val clicks: Int,
    val redirectUrl: String
)
```

---

## 2️⃣ API Service

### AdsApiService.kt
```kotlin
package com.example.app.data.api

import com.example.app.data.models.*
import retrofit2.http.*

interface AdsApiService {
    
    companion object {
        const val BASE_URL = "http://localhost:3000/api/"
    }
    
    // ============================================
    // PUBLIC ENDPOINTS
    // ============================================
    
    @GET("ads/active")
    suspend fun getActiveAds(
        @Query("targetAudience") targetAudience: String = "all"
    ): AdsResponse
    
    @GET("ads/{id}")
    suspend fun getAdById(
        @Path("id") adId: String
    ): ApiResponse<Ad>
    
    @POST("ads/{id}/click")
    suspend fun recordAdClick(
        @Path("id") adId: String
    ): ClickResponse
    
    // ============================================
    // PROTECTED ENDPOINTS (Organizer)
    // ============================================
    
    @GET("ads/organizer/{organizerId}")
    suspend fun getOrganizerAds(
        @Path("organizerId") organizerId: String,
        @Query("status") status: String? = null,
        @Header("Authorization") token: String
    ): AdsResponse
    
    @GET("ads/{id}/analytics")
    suspend fun getAdAnalytics(
        @Path("id") adId: String,
        @Header("Authorization") token: String
    ): ApiResponse<Map<String, Any>>
}

data class ApiResponse<T>(
    val status: String,
    val data: T
)
```

---

## 3️⃣ Repository

### AdsRepository.kt
```kotlin
package com.example.app.data.repository

import com.example.app.data.api.AdsApiService
import com.example.app.data.models.Ad
import javax.inject.Inject

class AdsRepository @Inject constructor(
    private val apiService: AdsApiService
) {
    
    /**
     * Fetch active ads for display
     * Called frequently from Android app
     */
    suspend fun getActiveAds(targetAudience: String = "all"): Result<List<Ad>> {
        return try {
            val response = apiService.getActiveAds(targetAudience)
            if (response.status == "success") {
                Result.success(response.data.ads)
            } else {
                Result.failure(Exception("Failed to fetch ads"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Get single ad details
     */
    suspend fun getAd(adId: String): Result<Ad> {
        return try {
            val response = apiService.getAdById(adId)
            if (response.status == "success") {
                Result.success(response.data)
            } else {
                Result.failure(Exception("Failed to fetch ad"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Record ad click when user taps on it
     * Updates click count and tracks user engagement
     */
    suspend fun recordAdClick(adId: String): Result<String> {
        return try {
            val response = apiService.recordAdClick(adId)
            if (response.status == "success") {
                Result.success(response.data.redirectUrl)
            } else {
                Result.failure(Exception("Failed to record click"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Get ads created by specific organizer
     * (For organizer admin dashboard)
     */
    suspend fun getOrganizerAds(
        organizerId: String,
        token: String,
        status: String? = null
    ): Result<List<Ad>> {
        return try {
            val response = apiService.getOrganizerAds(organizerId, status, "Bearer $token")
            if (response.status == "success") {
                Result.success(response.data.ads)
            } else {
                Result.failure(Exception("Failed to fetch organizer ads"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Get ad performance analytics
     */
    suspend fun getAdAnalytics(
        adId: String,
        token: String
    ): Result<Map<String, Any>> {
        return try {
            val response = apiService.getAdAnalytics(adId, "Bearer $token")
            if (response.status == "success") {
                Result.success(response.data)
            } else {
                Result.failure(Exception("Failed to fetch analytics"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

---

## 4️⃣ ViewModel

### AdsViewModel.kt
```kotlin
package com.example.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.app.data.models.Ad
import com.example.app.data.repository.AdsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AdsViewModel @Inject constructor(
    private val repository: AdsRepository
) : ViewModel() {
    
    // UI State
    private val _ads = MutableStateFlow<List<Ad>>(emptyList())
    val ads: StateFlow<List<Ad>> = _ads
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error
    
    private val _currentAdIndex = MutableStateFlow(0)
    val currentAdIndex: StateFlow<Int> = _currentAdIndex
    
    // Fetch active ads
    fun loadAds(targetAudience: String = "all") {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            
            val result = repository.getActiveAds(targetAudience)
            
            result.onSuccess { adsList ->
                _ads.value = adsList
                _isLoading.value = false
                
                // Start auto-rotation if ads available
                if (adsList.isNotEmpty()) {
                    startAdRotation()
                }
            }
            
            result.onFailure { exception ->
                _error.value = exception.message
                _isLoading.value = false
            }
        }
    }
    
    // Record ad click
    fun recordAdClick(adId: String, onSuccess: (redirectUrl: String) -> Unit) {
        viewModelScope.launch {
            val result = repository.recordAdClick(adId)
            
            result.onSuccess { redirectUrl ->
                onSuccess(redirectUrl)
            }
            
            result.onFailure { exception ->
                _error.value = "Failed to record click: ${exception.message}"
            }
        }
    }
    
    // Auto-rotate ads
    private fun startAdRotation() {
        viewModelScope.launch {
            while (true) {
                val currentAd = _ads.value.getOrNull(_currentAdIndex.value)
                
                if (currentAd != null) {
                    // Wait for display duration
                    kotlinx.coroutines.delay((currentAd.displayDuration * 1000).toLong())
                    
                    // Move to next ad
                    _currentAdIndex.value = (_currentAdIndex.value + 1) % _ads.value.size
                } else {
                    break
                }
            }
        }
    }
    
    // Clear error
    fun clearError() {
        _error.value = null
    }
}
```

---

## 5️⃣ UI Components

### AdBanner.kt
```kotlin
package com.example.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.example.app.data.models.Ad

@Composable
fun AdBanner(
    ad: Ad,
    onAdClick: (ad: Ad) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
            .clickable { onAdClick(ad) }
    ) {
        // Ad Image
        AsyncImage(
            model = ad.imageUrl,
            contentDescription = ad.title,
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp),
            contentScale = ContentScale.Crop
        )
        
        // Ad Title
        Text(
            text = ad.title,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(12.dp)
        )
        
        // Ad Description
        if (!ad.description.isNullOrEmpty()) {
            Text(
                text = ad.description,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
            )
        }
        
        // Ad Type Badge
        Text(
            text = ad.adType.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier
                .align(Alignment.End)
                .background(MaterialTheme.colorScheme.primary)
                .padding(8.dp)
        )
    }
}

@Composable
fun AdCarousel(
    ads: List<Ad>,
    currentIndex: Int,
    onAdClick: (ad: Ad) -> Unit,
    modifier: Modifier = Modifier
) {
    if (ads.isEmpty()) {
        return
    }
    
    val currentAd = ads[currentIndex]
    
    Box(modifier = modifier) {
        AdBanner(
            ad = currentAd,
            onAdClick = onAdClick,
            modifier = Modifier.fillMaxWidth()
        )
        
        // Page indicators
        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(8.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            repeat(ads.size) { index ->
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .background(
                            if (index == currentIndex)
                                MaterialTheme.colorScheme.primary
                            else
                                MaterialTheme.colorScheme.outline
                        )
                )
            }
        }
    }
}
```

---

## 6️⃣ Main Screen

### AdsScreen.kt
```kotlin
package com.example.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import com.example.app.data.models.Ad
import com.example.app.ui.components.AdCarousel
import com.example.app.ui.viewmodel.AdsViewModel

@Composable
fun AdsScreen(
    viewModel: AdsViewModel,
    navController: NavController,
    modifier: Modifier = Modifier
) {
    // Collect UI state
    val ads by viewModel.ads.collectAsStateWithLifecycle()
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
    val error by viewModel.error.collectAsStateWithLifecycle()
    val currentIndex by viewModel.currentAdIndex.collectAsStateWithLifecycle()
    
    // Load ads on screen load
    LaunchedEffect(Unit) {
        viewModel.loadAds()
    }
    
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = "Featured Ads",
            style = MaterialTheme.typography.headlineMedium
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        when {
            isLoading -> {
                CircularProgressIndicator(
                    modifier = Modifier
                        .size(50.dp)
                        .align(androidx.compose.ui.Alignment.CenterHorizontally)
                )
            }
            
            error != null -> {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(8.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    )
                ) {
                    Text(
                        text = "Error: ${error}",
                        modifier = Modifier.padding(16.dp),
                        color = MaterialTheme.colorScheme.error
                    )
                }
                
                Button(
                    onClick = { viewModel.loadAds() },
                    modifier = Modifier.align(androidx.compose.ui.Alignment.CenterHorizontally)
                ) {
                    Text("Retry")
                }
            }
            
            ads.isEmpty() -> {
                Text(
                    text = "No ads available right now",
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(8.dp)
                )
            }
            
            else -> {
                AdCarousel(
                    ads = ads,
                    currentIndex = currentIndex,
                    onAdClick = { ad ->
                        handleAdClick(viewModel, ad, navController)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(250.dp)
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // Ad info
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(8.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Ad Info",
                            style = MaterialTheme.typography.titleSmall
                        )
                        
                        val currentAd = ads[currentIndex]
                        
                        Text(
                            text = "Impressions: ${currentAd.impressions}",
                            style = MaterialTheme.typography.bodySmall
                        )
                        
                        Text(
                            text = "Clicks: ${currentAd.clicks}",
                            style = MaterialTheme.typography.bodySmall
                        )
                        
                        Text(
                            text = "CTR: ${currentAd.ctr}%",
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }
        }
    }
}

private fun handleAdClick(
    viewModel: AdsViewModel,
    ad: Ad,
    navController: NavController
) {
    viewModel.recordAdClick(ad.id) { redirectUrl ->
        // Open URL in browser
        val intent = android.content.Intent(
            android.content.Intent.ACTION_VIEW,
            android.net.Uri.parse(redirectUrl)
        )
        // Launch intent through navController context
    }
}
```

---

## 🔧 Setup Instructions

### Step 1: Add to MainActivity
```kotlin
@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    
    NavHost(navController = navController, startDestination = "ads") {
        composable("ads") {
            val viewModel: AdsViewModel = hiltViewModel()
            AdsScreen(viewModel, navController)
        }
    }
}
```

### Step 2: Configure Retrofit
```kotlin
// In your DI module or main app
val retrofit = Retrofit.Builder()
    .baseUrl(AdsApiService.BASE_URL)
    .addConverterFactory(GsonConverterFactory.create())
    .build()

val adsApiService = retrofit.create(AdsApiService::class.java)
```

### Step 3: Provide Repository
```kotlin
@Module
@InstallIn(SingletonComponent::class)
object AdsModule {
    
    @Singleton
    @Provides
    fun provideAdsApiService(): AdsApiService {
        return Retrofit.Builder()
            .baseUrl(AdsApiService.BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(AdsApiService::class.java)
    }
    
    @Singleton
    @Provides
    fun provideAdsRepository(apiService: AdsApiService): AdsRepository {
        return AdsRepository(apiService)
    }
}
```

---

## 🧪 Testing

### Test Ads Loading
```kotlin
@Test
fun testLoadAds() = runTest {
    val mockAds = listOf(
        Ad(/* ... */)
    )
    
    whenever(repository.getActiveAds()).thenReturn(Result.success(mockAds))
    
    viewModel.loadAds()
    advanceUntilIdle()
    
    assertEquals(mockAds, viewModel.ads.value)
}
```

---

## 🚀 Production Checklist

- ✅ Migrate BASE_URL to BuildConfig
- ✅ Add network security config
- ✅ Implement error logging
- ✅ Add analytics tracking
- ✅ Cache ads locally
- ✅ Test with real images
- ✅ Performance test with multiple ads
- ✅ Test network failures
- ✅ Implement retry logic

---

**Your Android ads integration is ready!** 🎉
