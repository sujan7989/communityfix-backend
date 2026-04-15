const express = require('express');
const router = express.Router();
const { getTickets, createTicket, getTicketById, addComment } = require('../controllers/ticketController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/', getTickets);
router.post('/', createTicket);
router.get('/:id', getTicketById);
router.post('/:id/comments', addComment);

module.exports = router;
