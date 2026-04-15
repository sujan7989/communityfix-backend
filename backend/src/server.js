require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Startup verification
console.log('[Server] Starting up...');
console.log('[Server] FIREBASE_API_KEY loaded:', process.env.FIREBASE_API_KEY ? 'YES (length: ' + process.env.FIREBASE_API_KEY.length + ')' : 'NO - MISSING');
console.log('[Server] PORT:', process.env.PORT);
console.log('[Server] NODE_ENV:', process.env.NODE_ENV || 'development');

const app = express();

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log('[Server] Incoming request:', req.method, req.path);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('[Server] Request body:', JSON.stringify(req.body).substring(0, 100));
  }
  next();
});

// Security: Rate Limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const path = require('path');

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'CommunityFix API running' });
});

app.get('/api', (req, res) => {
  res.json({ message: 'CommunityFix API running' });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'CommunityFix API running',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authLimiter, require(path.join(__dirname, 'routes', 'auth.js')));
app.use('/api/complaints', apiLimiter, require(path.join(__dirname, 'routes', 'complaints.js')));

// Optional routes - comment out if issues
try {
  app.use('/api/tickets', apiLimiter, require(path.join(__dirname, 'routes', 'tickets.js')));
} catch (err) {
  console.warn('[Server] Warning: Tickets route failed to load:', err.message);
}

try {
  app.use('/api/admin', apiLimiter, require(path.join(__dirname, 'routes', 'admin.js')));
} catch (err) {
  console.warn('[Server] Warning: Admin route failed to load:', err.message);
}

try {
  app.use('/api/communities', apiLimiter, require(path.join(__dirname, 'routes', 'communities.js')));
} catch (err) {
  console.warn('[Server] Warning: Communities route failed to load:', err.message);
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
  });
});

const PORT = process.env.PORT || 5000;
// Listen on 0.0.0.0 to allow connections from Android device via USB/LAN
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on 0.0.0.0:${PORT}`);
  console.log(`Android device can reach at: http://10.240.135.246:${PORT}`);
});

module.exports = app;
