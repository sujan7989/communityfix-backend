const admin = require('../config/firebase');

exports.getAllTickets = async (req, res) => {
  try {
    let query = admin
      .firestore()
      .collection('tickets')
      .where('communityId', '==', req.user.communityId);

    if (req.query.urgency) query = query.where('urgency', '==', req.query.urgency);
    if (req.query.status) query = query.where('status', '==', req.query.status);
    if (req.query.category) query = query.where('category', '==', req.query.category);

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const tickets = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json(tickets);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    await admin
      .firestore()
      .collection('tickets')
      .doc(req.params.id)
      .update({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

    return res.status(200).json({ message: 'Status updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const snapshot = await admin
      .firestore()
      .collection('tickets')
      .where('communityId', '==', req.user.communityId)
      .get();

    const tickets = snapshot.docs.map((doc) => doc.data());

    const byStatus = { Open: 0, 'In Progress': 0, Resolved: 0, Closed: 0 };
    const byUrgency = { Low: 0, Medium: 0, High: 0 };
    const byCategory = {
      Garbage: 0,
      Water: 0,
      Fire: 0,
      Electricity: 0,
      Security: 0,
      Maintenance: 0,
      Other: 0,
    };

    tickets.forEach((ticket) => {
      if (byStatus[ticket.status] !== undefined) byStatus[ticket.status]++;
      if (byUrgency[ticket.urgency] !== undefined) byUrgency[ticket.urgency]++;
      if (byCategory[ticket.category] !== undefined) byCategory[ticket.category]++;
    });

    return res.status(200).json({ total: tickets.length, byStatus, byUrgency, byCategory });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
