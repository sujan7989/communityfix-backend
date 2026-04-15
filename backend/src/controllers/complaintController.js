const admin = require('../config/firebase');

exports.submitComplaint = async (req, res) => {
  try {
    console.log('[Complaint API] Received complaint submission request');

    const { title, description, location, category, urgency, imageUrl } = req.body;

    // Validation
    if (!title || !description || !location || !category || !urgency) {
      console.log('[Complaint API] Missing required fields');
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: title, description, location, category, urgency are required'
      });
    }

    console.log('[Complaint API] Validation passed, creating complaint document');

    const complaintData = {
      userId: req.user?.uid || 'UnknownUser',
      userEmail: req.user?.email || 'unknown@email.com',
      userName: req.user?.name || 'Anonymous',
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      category,
      urgency,
      imageUrl: imageUrl || null,
      status: 'Pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      adminComments: '',
      comments: []
    };

    console.log('[Complaint API] Saving complaint to Firestore collection: complaints');
    const docRef = await admin.firestore().collection('complaints').add(complaintData);

    console.log('[Complaint API] Complaint saved successfully with ID:', docRef.id);

    return res.status(201).json({
      status: 'success',
      message: 'Complaint submitted successfully',
      id: docRef.id,
      data: complaintData
    });
  } catch (error) {
    console.error('[Complaint API] ERROR:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to submit complaint'
    });
  }
};

exports.getComplaints = async (req, res) => {
  try {
    console.log('[Complaint API] Fetching complaints for user:', req.user?.uid);

    const uid = req.user?.uid || 'UnknownUser';

    // Use simple query first (no composite index needed)
    const snapshot = await admin
      .firestore()
      .collection('complaints')
      .where('userId', '==', uid)
      .get();

    // Sort in memory to avoid needing a composite index
    const complaints = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const aTime = a.createdAt?._seconds || 0;
        const bTime = b.createdAt?._seconds || 0;
        return bTime - aTime;
      });

    console.log('[Complaint API] Found', complaints.length, 'complaints');

    return res.status(200).json({
      status: 'success',
      data: complaints
    });
  } catch (error) {
    console.error('[Complaint API] ERROR:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch complaints'
    });
  }
};

exports.getComplaintById = async (req, res) => {
  try {
    console.log('[Complaint API] Fetching complaint:', req.params.id);

    const doc = await admin.firestore().collection('complaints').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Complaint not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { id: doc.id, ...doc.data() }
    });
  } catch (error) {
    console.error('[Complaint API] ERROR:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get all complaints (for admin/official users)
 * If user is official, returns all complaints in the system
 * Otherwise, returns user's own complaints (filtered above)
 */
exports.getAllComplaints = async (req, res) => {
  try {
    console.log('[Complaint API] Fetching all complaints for admin user:', req.user?.uid);

    // Check if user is official
    if (req.user?.role !== 'official' && req.user?.role !== 'Official') {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Only officials can view all complaints.'
      });
    }

    const { status, category, urgency } = req.query;

    // Fetch all complaints ordered by createdAt (no composite index needed)
    const snapshot = await admin
      .firestore()
      .collection('complaints')
      .orderBy('createdAt', 'desc')
      .get();

    let complaints = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    // Apply filters in memory to avoid Firestore composite index requirements
    if (status) {
      complaints = complaints.filter((c) => c.status === status);
    }
    if (category) {
      complaints = complaints.filter((c) => c.category === category);
    }
    if (urgency) {
      complaints = complaints.filter((c) => c.urgency === urgency);
    }

    console.log('[Complaint API] Found', complaints.length, 'total complaints for admin');

    return res.status(200).json({
      status: 'success',
      data: complaints
    });
  } catch (error) {
    console.error('[Complaint API] ERROR:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch complaints'
    });
  }
};

/**
 * Update complaint status and admin comments
 */
exports.updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminComments, updatedAt } = req.body;

    console.log('[Complaint API] Updating complaint:', id);

    // Check if user is official OR if resident is updating their own complaint (rating/feedback/edit)
    const isOfficial = req.user?.role === 'official' || req.user?.role === 'Official';
    const isOwner = doc.data().userId === req.user?.uid;
    const isRatingUpdate = req.body.rating !== undefined || req.body.feedback !== undefined;
    const isEditUpdate = req.body.title || req.body.description;

    if (!isOfficial && !isOwner) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied.'
      });
    }

    // Residents can only update rating/feedback or edit their own pending complaints
    if (!isOfficial && isOwner && status && status !== doc.data().status) {
      return res.status(403).json({
        status: 'error',
        message: 'Only officials can change complaint status.'
      });
    }

    const complaintRef = admin.firestore().collection('complaints').doc(id);
    const doc = await complaintRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Complaint not found'
      });
    }

    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (status) updateData.status = status;
    if (adminComments !== undefined) updateData.adminComments = adminComments;

    // Support rating and feedback from residents
    if (req.body.rating !== undefined) updateData.rating = req.body.rating;
    if (req.body.feedback !== undefined) updateData.feedback = req.body.feedback;

    // Support title/description edits from residents (only if Pending)
    if (req.body.title && doc.data().status === 'Pending' && doc.data().userId === req.user.uid) {
      updateData.title = req.body.title;
    }
    if (req.body.description && doc.data().status === 'Pending' && doc.data().userId === req.user.uid) {
      updateData.description = req.body.description;
    }

    // Only officials can update status and adminComments
    if (req.user?.role === 'official' || req.user?.role === 'Official') {
      updateData.updatedBy = req.user.uid;
    }

    await complaintRef.update(updateData);

    console.log('[Complaint API] Complaint updated successfully:', id);

    return res.status(200).json({
      status: 'success',
      message: 'Complaint updated successfully',
      data: { id, ...updateData }
    });
  } catch (error) {
    console.error('[Complaint API] Update ERROR:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update complaint'
    });
  }
};

/**
 * Upload complaint image (via base64 data URL)
 */
exports.uploadImage = async (req, res) => {
  try {
    const { base64Data, complaintId } = req.body;

    if (!base64Data) {
      return res.status(400).json({
        status: 'error',
        message: 'No image data provided'
      });
    }

    console.log('[Upload API] Processing image upload for complaint:', complaintId);

    // Check if storage bucket is configured
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      return res.status(503).json({
        status: 'error',
        message: 'Image storage is not configured on this server'
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `complaint-${complaintId || 'temp'}-${timestamp}.jpg`;

    // Decode base64 to buffer
    const base64Result = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const imageBuffer = Buffer.from(base64Result, 'base64');

    // Upload to Firebase Storage
    const bucket = admin.storage().bucket();
    const file = bucket.file(`complaints/${filename}`);

    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/jpeg',
      },
    });

    // Make file publicly accessible
    await file.makePublic();

    // Get download URL
    const downloadUrl = `https://storage.googleapis.com/${bucket.name}/complaints/${encodeURIComponent(filename)}`;

    console.log('[Upload API] Image uploaded successfully:', downloadUrl);

    return res.status(200).json({
      status: 'success',
      message: 'Image uploaded successfully',
      imageUrl: downloadUrl,
      filename
    });
  } catch (error) {
    console.error('[Upload API] ERROR:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to upload image'
    });
  }
};
