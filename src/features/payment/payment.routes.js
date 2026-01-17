const express = require('express');
const paymentController = require('./payment.controller');
const authMiddleware = require('../auth/auth.middleware');

const router = express.Router();

// Public webhook endpoint (no auth required)
router.post('/webhook', paymentController.handleWebhook);

// Protected routes
router.use(authMiddleware.protect);

// Create payment order
router.post('/create-order', paymentController.createOrder);

// Verify payment
router.post('/verify', paymentController.verifyPayment);

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
