const express = require('express');
const router = express.Router();
const { getAllTickets, updateTicketStatus, getStats } = require('../controllers/adminController');
const auth = require('../middleware/auth');
const { isOfficial } = require('../middleware/roleCheck');

router.use(auth, isOfficial);
router.get('/tickets', getAllTickets);
router.patch('/tickets/:id/status', updateTicketStatus);
router.get('/stats', getStats);

module.exports = router;
