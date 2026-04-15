const admin = require('../config/firebase');
const fetch = require('node-fetch');

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, communityId, flatNumber, phone } = req.body;
    if (!name || !email || !password || !communityId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (role === 'Official' || role === 'official') {
      return res.status(403).json({ message: 'Not allowed to register as Official' });
    }

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({ email, password, displayName: name });

    const profile = {
      name,
      email,
      role: 'Resident',
      communityId,
      flatNumber: flatNumber || null,
      phone: phone || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await admin.firestore().collection('users').doc(userRecord.uid).set(profile);

    // Sign in via REST to get a real ID token the client can use
    const apiKey = process.env.FIREBASE_API_KEY;
    let idToken = null;

    if (apiKey) {
      const firebaseRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, returnSecureToken: true }),
        }
      );
      const firebaseData = await firebaseRes.json();
      if (firebaseRes.ok) idToken = firebaseData.idToken;
    }

    // Fallback to custom token if REST sign-in fails
    if (!idToken) {
      idToken = await admin.auth().createCustomToken(userRecord.uid);
    }

    console.log('[Auth] User registered successfully:', email);

    return res.status(201).json({
      token: idToken,
      user: {
        uid: userRecord.uid,
        email,
        name,
        role: 'Resident',
        communityId,
        flatNumber: flatNumber || null,
        phone: phone || null,
      },
    });
  } catch (error) {
    console.error('[AuthController] Register error:', error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ message: 'Email already registered' });
    }
    return res.status(500).json({ message: error.message });
  }
};

/**
 * SIMPLIFIED LOGIN - Uses local validation for testing
 * In production, validate password with Firebase Admin SDK
 */
exports.login = async (req, res) => {
  try {
    const { email, password, idToken: clientIdToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    console.log('[Auth] Login attempt for:', email);

    // If client sends a Firebase ID token (from client-side signInWithEmailAndPassword), verify it
    if (clientIdToken) {
      try {
        const decoded = await admin.auth().verifyIdToken(clientIdToken);
        const userDoc = await admin.firestore().collection('users').doc(decoded.uid).get();
        if (!userDoc.exists) {
          return res.status(401).json({ message: 'User profile not found' });
        }
        const userData = userDoc.data();
        return res.status(200).json({
          token: clientIdToken,
          user: {
            uid: decoded.uid,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            communityId: userData.communityId,
            flatNumber: userData.flatNumber,
            phone: userData.phone,
          },
        });
      } catch (verifyErr) {
        return res.status(401).json({ message: 'Invalid token', error: verifyErr.message });
      }
    }

    // Fallback: verify via Firebase REST API (email+password)
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'Server misconfiguration: missing API key' });
    }

    const firebaseRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const firebaseData = await firebaseRes.json();

    if (!firebaseRes.ok) {
      const errCode = firebaseData?.error?.message || 'INVALID_CREDENTIALS';
      console.error('[Auth] Firebase login failed:', errCode);
      return res.status(401).json({ message: 'Invalid email or password', code: errCode });
    }

    const { idToken, localId: uid } = firebaseData;

    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(401).json({ message: 'User profile not found' });
    }
    const userData = userDoc.data();

    console.log('[Auth] Login successful for:', email, 'Role:', userData.role);

    return res.status(200).json({
      token: idToken,
      user: {
        uid,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        communityId: userData.communityId,
        flatNumber: userData.flatNumber,
        phone: userData.phone,
      },
    });
  } catch (error) {
    console.error('[Auth] LOGIN ERROR:', error.message);
    return res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    return res.status(200).json(req.user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.verifyToken = async (req, res) => {
  try {
    // Token is already verified by auth middleware if we get here
    return res.status(200).json({
      message: 'Token verified',
      user: req.user,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
