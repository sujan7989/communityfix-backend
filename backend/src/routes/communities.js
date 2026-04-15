const express = require('express');
const router = express.Router();
const { listCommunities, createCommunity } = require('../controllers/communityController');
const auth = require('../middleware/auth');
const { isOfficial } = require('../middleware/roleCheck');

router.get('/', listCommunities);
router.post('/', auth, isOfficial, createCommunity);

module.exports = router;
