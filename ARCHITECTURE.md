# CommunityFix — Architecture & Workflow

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MOBILE APP (Android)                      │
│                   React Native + Expo SDK 51                     │
│                                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  Auth       │  │  Resident    │  │  Admin / Official      │  │
│  │  Screens    │  │  Screens     │  │  Screens               │  │
│  │  - Login    │  │  - Dashboard │  │  - Admin Panel         │  │
│  │  - Signup   │  │  - Submit    │  │  - Analytics           │  │
│  │             │  │  - My List   │  │  - Manage Complaint    │  │
│  │             │  │  - Detail    │  │  - Bulk Update         │  │
│  │             │  │  - Profile   │  │                        │  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Navigation (React Navigation)                   │ │
│  │   Auth Stack → Resident Tabs → Admin Stack                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Auth Context (Global State)                     │ │
│  │   user | token | login | logout | refreshToken              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Axios API Client                                │ │
│  │   Base URL: communityfix-backend-ibxq.onrender.com          │ │
│  │   Auto token attach + Auto token refresh on 401             │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js + Express)                   │
│              Hosted on Render (Free Tier)                        │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Express Server                         │   │
│  │   Port: 10000 | CORS: * | Helmet | Rate Limiting         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  /api/auth   │  │ /api/        │  │  /api/communities    │  │
│  │  - POST login│  │ complaints   │  │  - GET list          │  │
│  │  - POST reg  │  │ - POST /     │  └──────────────────────┘  │
│  │  - GET /me   │  │ - GET /user  │                             │
│  │  - GET verify│  │ - GET /admin │  ┌──────────────────────┐  │
│  └──────────────┘  │ - GET /:id  │  │  /api/admin          │  │
│                    │ - PUT /:id  │  │  - GET /stats        │  │
│                    │ - POST /    │  │  - GET /tickets      │  │
│                    │   upload    │  └──────────────────────┘  │
│                    └──────────────┘                             │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Middleware                                   │   │
│  │   auth.js → verify Firebase JWT token                    │   │
│  │   roleCheck.js → check if user is Official               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Firebase Admin SDK
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FIREBASE (Google Cloud)                        │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │  Authentication  │  │    Firestore DB   │  │    Storage    │ │
│  │                  │  │                   │  │               │ │
│  │  - Email/Pass    │  │  Collections:     │  │  complaint    │ │
│  │  - JWT Tokens    │  │  - users          │  │  images       │ │
│  │  - Token Verify  │  │  - complaints     │  │  (JPG/PNG)    │ │
│  │                  │  │  - communities    │  │               │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema (Firestore)

### Collection: `users`
```
users/{uid}
├── name: string
├── email: string
├── role: "Resident" | "Official"
├── communityId: string
├── flatNumber: string | null
├── phone: string | null
└── createdAt: timestamp
```

### Collection: `complaints`
```
complaints/{complaintId}
├── userId: string
├── userEmail: string
├── userName: string
├── title: string
├── description: string
├── location: string
├── category: "Garbage"|"Water"|"Electricity"|"Fire"|"Road"|"Security"|"Maintenance"|"Other"
├── urgency: "Low" | "Medium" | "High"
├── status: "Pending" | "In Progress" | "Resolved"
├── imageUrl: string | null
├── adminComments: string
├── rating: number (1-5) | null
├── feedback: string | null
├── createdAt: timestamp
└── updatedAt: timestamp
```

### Collection: `communities`
```
communities/{communityId}
├── name: string
└── createdAt: timestamp
```

---

## 3. Application Workflow

### 3.1 User Registration Flow
```
User opens app
    │
    ▼
Login Screen
    │
    ├── New User → Sign Up Screen
    │       │
    │       ├── Fill: Name, Email, Password, Community, Flat No.
    │       │
    │       ▼
    │   POST /api/auth/register
    │       │
    │       ├── Firebase creates user account
    │       ├── User profile saved to Firestore
    │       ├── JWT token returned
    │       └── Token saved to SecureStore
    │
    └── Existing User → Login Screen
            │
            ├── Enter Email + Password
            │
            ▼
        POST /api/auth/login
            │
            ├── Firebase verifies credentials
            ├── JWT token returned
            ├── User profile fetched from Firestore
            └── Token + User saved to SecureStore
```

### 3.2 Complaint Submission Flow (Resident)
```
Resident Dashboard
    │
    ▼
Tap "Submit Complaint"
    │
    ▼
Submit Complaint Screen
    │
    ├── Fill: Title, Description, Location
    ├── Select: Category (emoji buttons)
    ├── Select: Urgency (Low/Medium/High)
    └── Optional: Add Photo (Camera/Gallery)
            │
            ▼
        [If photo selected]
        POST /api/complaints/upload
            │
            └── Image uploaded to Firebase Storage
                Returns imageUrl
            │
            ▼
        POST /api/complaints
            │
            ├── Complaint saved to Firestore
            ├── Status set to "Pending"
            └── Success alert shown
```

### 3.3 Complaint Management Flow (Admin)
```
Admin Panel
    │
    ├── View all complaints (sorted by date/urgency/SLA)
    ├── Search by title/location/user/category
    ├── Filter by status tabs
    ├── View analytics (📊 button)
    │       ├── Resolution rate
    │       ├── Avg days open
    │       ├── Category breakdown
    │       └── Urgency breakdown
    │
    ├── Single complaint update:
    │       ├── Tap complaint card
    │       ├── Change status (Pending/In Progress/Resolved)
    │       ├── Add official response (or use template)
    │       └── PUT /api/complaints/:id
    │
    └── Bulk update:
            ├── Long press to enter bulk mode
            ├── Select multiple complaints
            ├── Choose new status
            └── PUT /api/complaints/:id (for each)
```

### 3.4 Token Refresh Flow
```
API Request made
    │
    ▼
401 Unauthorized received
    │
    ▼
Auto-refresh triggered
    │
    ├── Read stored email/password from SecureStore
    ├── POST /api/auth/login (re-login)
    ├── New token saved to SecureStore
    └── Original request retried with new token
```

---

## 4. Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Mobile App | React Native 0.74 + Expo SDK 51 | Cross-platform Android app |
| Navigation | React Navigation 6 | Screen routing |
| State Management | React Context API | Global auth state |
| HTTP Client | Axios | API calls with interceptors |
| Secure Storage | expo-secure-store | Token & credential storage |
| UI Components | Custom StyleSheet | All UI components |
| Gradients | expo-linear-gradient | Background gradients |
| Image Picker | expo-image-picker | Camera & gallery access |
| Backend | Node.js + Express.js | REST API server |
| Authentication | Firebase Auth | User login/register |
| Database | Firebase Firestore | NoSQL document database |
| File Storage | Firebase Storage | Complaint images |
| Hosting | Render (Free) | Backend deployment |
| Build | EAS Build (Expo) | APK generation |
| Version Control | GitHub | Code repository |

---

## 5. Folder Structure

```
CommunityFixApp/
│
├── backend/                    # Node.js Express API
│   ├── src/
│   │   ├── config/
│   │   │   └── firebase.js     # Firebase Admin SDK init
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── complaintController.js
│   │   │   ├── adminController.js
│   │   │   └── communityController.js
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT verification
│   │   │   └── roleCheck.js    # Role-based access
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── complaints.js
│   │   │   ├── admin.js
│   │   │   └── communities.js
│   │   └── server.js           # Express app entry point
│   ├── .env                    # Environment variables
│   ├── render.yaml             # Render deployment config
│   └── package.json
│
├── frontend/                   # React Native Expo App
│   ├── src/
│   │   ├── config/
│   │   │   └── api.js          # Axios client + interceptors
│   │   ├── context/
│   │   │   └── AuthContext.js  # Global auth state
│   │   ├── navigation/
│   │   │   └── AppNavigator.js # All navigation stacks
│   │   └── screens/
│   │       ├── auth/
│   │       │   ├── LoginScreen.js
│   │       │   └── SignupScreen.js
│   │       ├── resident/
│   │       │   ├── DashboardScreen.js
│   │       │   ├── SubmitComplaintScreen.js
│   │       │   ├── MyComplaintsScreen.js
│   │       │   ├── ComplaintDetailScreen.js
│   │       │   └── ProfileScreen.js
│   │       └── official/
│   │           ├── AdminPanelScreen.js
│   │           └── ComplaintManageScreen.js
│   ├── App.js                  # Root component
│   ├── index.js                # App registry entry
│   ├── app.json                # Expo config
│   ├── eas.json                # EAS Build config
│   └── package.json
│
├── README.md                   # Project documentation
├── ARCHITECTURE.md             # This file
└── APK_DOWNLOAD_URL.txt        # APK download link
```

---

## 6. Security

- All API routes protected by Firebase JWT verification
- Role-based access control (Resident vs Official)
- Rate limiting on all API endpoints
- Helmet.js for HTTP security headers
- CORS configured
- Sensitive data stored in SecureStore (not AsyncStorage)
- Environment variables never committed to GitHub (.env in .gitignore)

---

## 7. Deployment

```
Developer pushes code to GitHub
        │
        ▼
Render detects new commit
        │
        ▼
Auto-deploys backend
        │
        ▼
Backend live at:
communityfix-backend-ibxq.onrender.com
        │
        ▼
EAS Build triggered manually
        │
        ▼
APK built on Expo servers
        │
        ▼
APK available for download
        │
        ▼
User installs APK on Android phone
        │
        ▼
App connects to live backend
```
