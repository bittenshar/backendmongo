const express = require('express');
const organizerAuthController = require('./organizer.auth.controller');

const router = express.Router();

/**
 * ==========================================
 * PUBLIC ROUTES (No authentication required)
 * ==========================================
 */

/**
 * POST /api/organizers/auth/login
 * Organizer login with email and password
 * 
 * Request body:
 * {
 *   "email": "organizer@example.com",
 *   "password": "securePassword123"
 * }
 * 
 * Response:
 * {
 *   "status": "success",
 *   "token": "jwt-token",
 *   "data": {
 *     "organizer": { ... }
 *   }
 * }
 */
router.post('/login', organizerAuthController.login);

/**
 * POST /api/organizers/auth/register
 * Create a new organizer account
 * 
 * Request body (required):
 * {
 *   "email": "neworganizer@example.com",
 *   "password": "securePassword123",
 *   "confirmPassword": "securePassword123",
 *   "name": "Event Company Name",
 *   "phone": "+1234567890",
 *   "contactPerson": "John Doe"
 * }
 * 
 * Request body (optional):
 * {
 *   "address": "123 Main Street, City, Country",
 *   "website": "https://example.com",
 *   "description": "Company description",
 *   "logo": "https://example.com/logo.png"
 * }
 * 
 * Response:
 * {
 *   "status": "success",
 *   "token": "jwt-token",
 *   "data": {
 *     "organizer": { ... }
 *   }
 * }
 * 
 * Validation:
 * - Email must be valid and unique
 * - Password must be at least 8 characters
 * - All required fields must be provided
 */
router.post('/register', organizerAuthController.register);

/**
 * ==========================================
 * PROTECTED ROUTES (Requires JWT token)
 * Add token in header: Authorization: Bearer <token>
 * ==========================================
 */

// Apply protection middleware to all routes below
router.use(organizerAuthController.protect);

/**
 * GET /api/organizers/auth/profile
 * Get organizer profile with optional event data
 * 
 * Query parameters:
 *   - include=events    (returns profile + event list + summary)
 *   - include=summary   (returns profile + event summary only)
 *   - none              (returns profile only)
 * 
 * Examples:
 *   GET /api/organizers/auth/profile
 *   GET /api/organizers/auth/profile?include=events
 *   GET /api/organizers/auth/profile?include=summary
 * 
 * Response:
 * {
 *   "status": "success",
 *   "data": {
 *     "organizer": { ... },
 *     "events": {                    // only if include=events or include=summary
 *       "summary": { total, active, upcoming, past },
 *       "list": [ ... ]              // only if include=events
 *     }
 *   }
 * }
 */
router.get('/profile', organizerAuthController.getProfile);

/**
 * PATCH /api/organizers/auth/profile
 * Update organizer profile (name, phone, address, etc.)
 * 
 * Request body:
 * {
 *   "name": "Updated Name",
 *   "phone": "9876543210",
 *   "address": "New Address"
 * }
 */
router.patch('/profile', organizerAuthController.updateProfile);

/**
 * PATCH /api/organizers/auth/change-password
 * Change organizer password
 * 
 * Request body:
 * {
 *   "currentPassword": "oldPassword123",
 *   "newPassword": "newPassword123",
 *   "confirmPassword": "newPassword123"
 * }
 */
router.patch('/change-password', organizerAuthController.changePassword);

/**
 * GET /api/organizers/auth/logout
 * Logout organizer
 */
router.get('/logout', organizerAuthController.logout);

module.exports = router;
