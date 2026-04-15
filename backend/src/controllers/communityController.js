const admin = require('../config/firebase');

exports.listCommunities = async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('communities').orderBy('name').get();
    const communities = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json(communities);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.createCommunity = async (req, res) => {
  try {
    const { name, address, city } = req.body;
    if (!name || !address || !city) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const community = {
      name,
      address,
      city,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await admin.firestore().collection('communities').add(community);
    return res.status(201).json({ id: docRef.id, ...community });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
