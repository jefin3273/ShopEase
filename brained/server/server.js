require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
// Increase header size limit to prevent 431 errors
const server = http.createServer({ maxHeaderSize: 65536 }, app);

// middleware - increase payload limit for image uploads (base64 encoded images can be large)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Support a comma-separated list of allowed client origins via CLIENT_URLS
// Fallback to CLIENT_URL for single-value usage, then a default of localhost:3000
const rawClientList = process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:3000';
const CLIENT_ORIGINS = rawClientList.split(',').map((u) => u.trim()).filter(Boolean);

// Optional: allow domain suffixes for preview environments (e.g., *.vercel.app)
// Set CLIENT_URL_SUFFIXES="vercel.app,example.dev" to allow any origin whose hostname ends with one of these.
const rawSuffixList = process.env.CLIENT_URL_SUFFIXES || '';
const CLIENT_ORIGIN_SUFFIXES = rawSuffixList
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const CORS_DEBUG = /^(1|true|yes)$/i.test(process.env.CORS_DEBUG || '');

function isAllowedOrigin(origin) {
  try {
    // Allow non-browser requests like curl/postman (no origin)
    if (!origin) return true;

    if (CLIENT_ORIGINS.includes(origin)) return true;

    if (CLIENT_ORIGIN_SUFFIXES.length > 0) {
      const { hostname } = new URL(origin);
      for (const suffix of CLIENT_ORIGIN_SUFFIXES) {
        if (hostname === suffix || hostname.endsWith('.' + suffix)) {
          return true;
        }
      }
    }

    return false;
  } catch (e) {
    // If origin can't be parsed, deny
    return false;
  }
}

// Allow credentials so refresh token cookie (httpOnly) is accepted by browser
const corsOptions = {
  origin: function (origin, callback) {
    const allowed = isAllowedOrigin(origin);
    if (CORS_DEBUG) {
      console.log(`[CORS] origin=${origin || 'null'} allowed=${allowed}`);
    }
    return allowed ? callback(null, true) : callback(new Error('CORS: Origin not allowed'));
  },
  credentials: true,
};

app.use(cors(corsOptions));

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      const allowed = isAllowedOrigin(origin);
      if (CORS_DEBUG) {
        console.log(`[Socket.IO CORS] origin=${origin || 'null'} allowed=${allowed}`);
      }
      return allowed ? callback(null, true) : callback(new Error('CORS: Origin not allowed'));
    },
    credentials: true,
  },
});

// Make io accessible in routes and globally for analytics service
app.set('io', io);
global.io = io;

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Support both 'join' and 'join-project' events for flexibility
  socket.on('join', (projectId) => {
    const room = `project-${projectId}`;
    socket.join(room);
    console.log(`Socket ${socket.id} joined project ${projectId} (room: ${room})`);
  });

  socket.on('join-project', (projectId) => {
    const room = `project-${projectId}`;
    socket.join(room);
    console.log(`Socket ${socket.id} joined project ${projectId} (room: ${room})`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// routes
const authRoutes = require('./routes/auth');
const analyticsRoutes = require('./routes/analytics');
const featureFlagsRoutes = require('./routes/featureFlags');
const trackingRoutes = require('./routes/trackingRoutes');
const productsRoutes = require('./routes/products');
const sessionsRoutes = require('./routes/sessions');
const dashboardRoutes = require('./routes/dashboard');
const funnelsRoutes = require('./routes/funnels');
const cohortsRoutes = require('./routes/cohorts');
const experimentsRoutes = require('./routes/experiments');
const ordersRoutes = require('./routes/orders');
const cartRoutes = require('./routes/cart');
const analyticsAdminRoutes = require('./routes/analyticsAdmin');
const rateLimiter = require('./middleware/rateLimiter');
const deviceInfo = require('./middleware/deviceInfo');

// Apply rate limiter globally (you can scope it to /api if preferred)
// app.use(rateLimiter); // Disabled rate limiting

app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server running' });
});

// Mount analytics routes with deviceInfo middleware to capture UA data
app.use('/api/analytics', deviceInfo, analyticsRoutes);
app.use('/api/analytics/flags', featureFlagsRoutes);
app.use('/api/analytics/admin', analyticsAdminRoutes);

// tracking routes for session recording, heatmaps, and interactions
app.use('/api/tracking', deviceInfo, trackingRoutes);

// sessions API
app.use('/api/sessions', sessionsRoutes);

// dashboard API
app.use('/api/dashboard', dashboardRoutes);

// products API
app.use('/api/products', productsRoutes);

// funnels API
app.use('/api/funnels', funnelsRoutes);

// cohorts API
app.use('/api/cohorts', cohortsRoutes);

// experiments API (A/B testing)
app.use('/api/experiments', experimentsRoutes);

// orders API
app.use('/api/orders', ordersRoutes);

// cart API
app.use('/api/cart', cartRoutes);

// seeding API
const seedRoutes = require('./routes/seed');
app.use('/api/seed', seedRoutes);

// health
app.get('/', (req, res) => res.json({ message: 'Brained API' }));

// Serve tracking script
app.get('/pagepulse.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const fs = require('fs');
  const path = require('path');
  const scriptPath = path.join(__dirname, '../public/pagepulse.js');

  if (fs.existsSync(scriptPath)) {
    res.sendFile(scriptPath);
  } else {
    res.status(404).send('// Tracking script not found');
  }
});

// connect to MongoDB
const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('MONGO_URI not defined. Set it in .env');
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

mongoose
  .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });
