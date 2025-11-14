const express = require('express');
const ticketController = require('./ticket.controller');
const authMiddleware = require('../auth/auth.middleware');

const router = express.Router();

router.use(authMiddleware.protect);

router.route('/')
  .get(ticketController.getAllTickets)
  .post(ticketController.createTicket);

// Get tickets by user
router.get('/users/:userId', ticketController.getTicketsByUser);

router.route('/:id')
  .get(ticketController.getTicket)
  .patch(ticketController.updateTicket);

router.post('/verify', ticketController.verifyTicket);

// Issue ticket after successful payment
router.post('/issue-after-payment', ticketController.issueTicketAfterPayment);

module.exports = router;