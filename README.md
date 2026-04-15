# CommunityFix 🏘️

A community complaint management app that allows residents to report and track issues in their community, and officials to manage and resolve them.

---

## 📱 Download APK

**Latest APK (Android):**
👉 [Download CommunityFix APK](https://expo.dev/artifacts/eas/nVseb78zMSLpWvuJ6i92BJ.apk)

**How to install:**
1. Open the link above on your Android phone's Chrome browser
2. Download the APK file
3. Tap the downloaded file to install
4. If prompted "Install from unknown sources" → go to Settings → allow it
5. Install and open CommunityFix

> ⚠️ Android only. Requires Android 8.0+

---

## � Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin/Official | admin@communityfix.com | Admin@123 |
| Resident | Register via Sign Up screen | — |

---

## 🌐 Live Backend

**API URL:** `https://communityfix-backend-ibxq.onrender.com`

**Health Check:** https://communityfix-backend-ibxq.onrender.com/api/health

> Note: Free tier — first request after inactivity may take 30-50 seconds to wake up.

---

## ✨ Features

### For Residents
- 📝 Submit complaints with title, description, location, category, urgency & photo
- 📊 Dashboard with activity stats (Total, Pending, Active, Resolved)
- 🔍 Tap any stat to view filtered complaints with full details
- 📋 Track complaint status with visual timeline
- ⭐ Rate & review resolved complaints
- ✏️ Edit complaints within 1 hour of submission
- 🔄 Pull to refresh on all screens
- � Attach photos from camera or gallery
- 🏷️ 8 complaint categories with emoji icons

### For Admin/Officials
- 🏛️ Admin panel with all complaints
- 📊 Analytics dashboard — resolution rate, avg days open, category/urgency charts
- 🔴 Priority queue sorting (by urgency, SLA, date)
- ✅ Bulk actions — select multiple complaints and update status at once
- 📝 Response templates — 6 pre-written responses
- ⏱️ SLA tracking — overdue complaints highlighted in red
- 🔍 Search across title, location, user, category
- � Add official responses to complaints

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native (Expo SDK 51) |
| Backend | Node.js + Express |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Storage | Firebase Storage |
| Hosting | Render (Free tier) |
| Build | EAS Build (Expo) |

---

## 🚀 Backend Deployment

Backend is deployed on Render and auto-deploys from GitHub:
- **Repo:** https://github.com/sujan7989/communityfix-backend
- **Service:** communityfix-backend-ibxq.onrender.com

### Environment Variables (set in Render dashboard)
```
NODE_ENV=production
PORT=10000
FIREBASE_PROJECT_ID=community-complaint-ef00-262a1
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@community-complaint-ef00-262a1.iam.gserviceaccount.com
FIREBASE_API_KEY=AIzaSyBJAhIT0hP7TSZZArT48Gzfc588ep7pt44
FIREBASE_STORAGE_BUCKET=community-complaint-ef00-262a1.firebasestorage.app
FIREBASE_PRIVATE_KEY=<your private key>
```

---

## 📁 Project Structure

```
community-fix/
├── backend/          # Node.js Express API
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── config/
│   └── package.json
└── frontend/         # React Native Expo app
    ├── src/
    │   ├── screens/
    │   ├── context/
    │   ├── navigation/
    │   └── config/
    ├── App.js
    └── package.json
```

---

## 👨‍� Developer

- **GitHub:** sujan7989
- **Expo Account:** reddy7989
- **Built with:** Kiro AI + React Native + Firebase
