require('dotenv').config();
const admin = require('./config/firebase');

const communities = [
  {
    id: 'sunrise',
    name: 'Sunrise Apartments',
    address: '123 Sunrise Road, Jubilee Hills',
    city: 'Hyderabad',
  },
  {
    id: 'greenvalley',
    name: 'Green Valley Gated Community',
    address: '456 Green Valley Road, Whitefield',
    city: 'Bangalore',
  },
];

const users = [
  {
    email: 'official1@sunrise.com',
    password: 'Official@123',
    name: 'Ravi Kumar',
    role: 'official',
    communityId: 'sunrise',
    flatNumber: null,
    phone: '9000000001',
  },
  {
    email: 'resident1@sunrise.com',
    password: 'Resident@123',
    name: 'Priya Sharma',
    role: 'resident',
    communityId: 'sunrise',
    flatNumber: 'A-101',
    phone: '9000000002',
  },
  {
    email: 'resident2@sunrise.com',
    password: 'Resident@123',
    name: 'Amit Patel',
    role: 'resident',
    communityId: 'sunrise',
    flatNumber: 'B-203',
    phone: '9000000003',
  },
  {
    email: 'official1@greenvalley.com',
    password: 'Official@123',
    name: 'Sunita Reddy',
    role: 'official',
    communityId: 'greenvalley',
    flatNumber: null,
    phone: '9000000004',
  },
  {
    email: 'resident1@greenvalley.com',
    password: 'Resident@123',
    name: 'Kiran Nair',
    role: 'resident',
    communityId: 'greenvalley',
    flatNumber: 'C-305',
    phone: '9000000005',
  },
  {
    email: 'resident2@greenvalley.com',
    password: 'Resident@123',
    name: 'Deepa Menon',
    role: 'resident',
    communityId: 'greenvalley',
    flatNumber: 'D-412',
    phone: '9000000006',
  },
];

const sampleTickets = (communityId, residents) => [
  {
    title: 'Garbage not collected for 3 days',
    description: 'The garbage near Block A has not been collected for 3 days. Causing bad smell.',
    category: 'Garbage',
    urgency: 'High',
    status: 'Open',
    communityId,
    raisedBy: { uid: residents[0].uid, name: residents[0].name, flatNumber: residents[0].flatNumber },
    imageUrl: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    title: 'Water leakage in basement',
    description: 'There is a water pipe leakage in the basement parking area.',
    category: 'Water',
    urgency: 'High',
    status: 'In Progress',
    communityId,
    raisedBy: { uid: residents[1].uid, name: residents[1].name, flatNumber: residents[1].flatNumber },
    imageUrl: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    title: 'Street light not working',
    description: 'The street light near the main gate has been non-functional for a week.',
    category: 'Electricity',
    urgency: 'Medium',
    status: 'Open',
    communityId,
    raisedBy: { uid: residents[0].uid, name: residents[0].name, flatNumber: residents[0].flatNumber },
    imageUrl: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    title: 'Suspicious activity near parking',
    description: 'Noticed some unknown people loitering near the parking area at night.',
    category: 'Security',
    urgency: 'High',
    status: 'Resolved',
    communityId,
    raisedBy: { uid: residents[1].uid, name: residents[1].name, flatNumber: residents[1].flatNumber },
    imageUrl: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    title: 'Elevator maintenance required',
    description: 'Block B elevator is making strange noises. Needs immediate inspection.',
    category: 'Maintenance',
    urgency: 'Low',
    status: 'Closed',
    communityId,
    raisedBy: { uid: residents[0].uid, name: residents[0].name, flatNumber: residents[0].flatNumber },
    imageUrl: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
];

async function seed() {
  const db = admin.firestore();
  console.log('Seeding communities...');
  for (const community of communities) {
    const { id, ...data } = community;
    await db.collection('communities').doc(id).set({ ...data, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    console.log(`Created community: ${data.name}`);
  }

  console.log('Seeding users...');
  const createdUsers = [];
  for (const user of users) {
    try {
      const { password, ...profileData } = user;
      let userRecord;
      try {
        userRecord = await admin.auth().getUserByEmail(user.email);
        console.log(`User already exists: ${user.email}`);
      } catch {
        userRecord = await admin.auth().createUser({ email: user.email, password, displayName: user.name });
        console.log(`Created user: ${user.email}`);
      }
      await db.collection('users').doc(userRecord.uid).set({
        ...profileData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      createdUsers.push({ ...user, uid: userRecord.uid });
    } catch (err) {
      console.error(`Error creating user ${user.email}:`, err.message);
    }
  }

  console.log('Seeding tickets...');
  const sunriseResidents = createdUsers.filter((u) => u.communityId === 'sunrise' && u.role === 'resident');
  const greenvalleyResidents = createdUsers.filter((u) => u.communityId === 'greenvalley' && u.role === 'resident');

  const allTickets = [
    ...sampleTickets('sunrise', sunriseResidents),
    ...sampleTickets('greenvalley', greenvalleyResidents),
  ];

  for (const ticket of allTickets) {
    const docRef = await db.collection('tickets').add(ticket);
    await db.collection('tickets').doc(docRef.id).collection('comments').add({
      text: 'We are looking into this issue.',
      authorName: 'Admin',
      authorUid: 'system',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Created ticket: ${ticket.title}`);
  }

  console.log('\nSeed complete!');
  console.log('\nDefault credentials:');
  console.log('Sunrise - Official: official1@sunrise.com / Official@123');
  console.log('Sunrise - Resident: resident1@sunrise.com / Resident@123');
  console.log('Green Valley - Official: official1@greenvalley.com / Official@123');
  console.log('Green Valley - Resident: resident1@greenvalley.com / Resident@123');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
