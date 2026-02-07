const express = require('express');
const paymentController = require('./payment.controller');
const authMiddleware = require('../auth/auth.middleware');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // per user/IP
});

// Public webhook endpoint (no auth required)
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.handleWebhook
);

// Public convenience fee endpoint (no auth required)
router.get('/convenience-fee', paymentController.getConvenienceFee);

// DEVELOPMENT ONLY: Test signature generation (for Postman testing)
router.post('/test-generate-signature', paymentController.generateTestSignature);

// Protected routes
router.use(authMiddleware.protect);

// Create payment order
router.post('/create-order', paymentController.createOrder);

// Fetch payment details from Razorpay
router.post('/fetch-razorpay-payment', paymentController.fetchRazorpayPayment);

// Verify payment
router.post('/verify', verifyLimiter, paymentController.verifyPayment);

// Get payment details
router.get('/:paymentId', paymentController.getPaymentDetails);

// Get order details
router.get('/order/:orderId', paymentController.getOrderDetails);

// Get payment by local orderId
router.get('/lookup/:orderId', paymentController.getPaymentByOrderId);

// Refund payment
router.post('/:paymentId/refund', paymentController.refundPayment);

// Get payment history
router.get('/', paymentController.getPaymentHistory);

module.exports = router;