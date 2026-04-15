const admin = require('../config/firebase');

exports.getTickets = async (req, res) => {
  try {
    const snapshot = await admin
      .firestore()
      .collection('tickets')
      .where('communityId', '==', req.user.communityId)
      .orderBy('createdAt', 'desc')
      .get();

    const tickets = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json(tickets);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.createTicket = async (req, res) => {
  try {
    const { title, description, category, urgency, imageUrl } = req.body;
    if (!title || !description || !category || !urgency) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const ticket = {
      title,
      description,
      category,
      urgency,
      status: 'Open',
      communityId: req.user.communityId,
      raisedBy: {
        uid: req.user.uid,
        name: req.user.name,
        flatNumber: req.user.flatNumber || null,
      },
      imageUrl: imageUrl || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await admin.firestore().collection('tickets').add(ticket);
    return res.status(201).json({ id: docRef.id, ...ticket });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getTicketById = async (req, res) => {
  try {
    const doc = await admin.firestore().collection('tickets').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    return res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const comment = {
      text,
      authorName: req.user.name,
      authorUid: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await admin
      .firestore()
      .collection('tickets')
      .doc(req.params.id)
      .collection('comments')
      .add(comment);

    return res.status(201).json({ id: docRef.id, ...comment });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
