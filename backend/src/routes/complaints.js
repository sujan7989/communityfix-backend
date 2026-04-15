const express = require('express');
const router = express.Router();
const { submitComplaint, getComplaints, getComplaintById, getAllComplaints, updateComplaint, uploadImage } = require('../controllers/complaintController');
const auth = require('../middleware/auth');

// Submit a new complaint
router.post('/', auth, submitComplaint);

// Upload image for complaint
router.post('/upload', auth, uploadImage);

// Get all complaints for current user
router.get('/user/list', auth, getComplaints);

// Get all complaints (admin only)
router.get('/admin/all', auth, getAllComplaints);

// Get a specific complaint by ID
router.get('/:id', auth, getComplaintById);

// Update complaint status and admin comments
router.put('/:id', auth, updateComplaint);

module.exports = router;
