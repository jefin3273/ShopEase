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
// PDFs can be especially large, so we use 100mb limit
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cookieParser());

// Support a comma-separated list of allowed client origins via CLIENT_URLS
// Fallback to CLIENT_URL for single-value usage, then a default of localhost:3000
// Include common dev ports by default (3000 and 5173) so Vite/React dev servers work out of the box
const rawClientList = process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:3000,http://localhost:5173';
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

// Initialize global state for active recordings
global.activeRecording = null;

// Helper: enrich event metadata with classification tags
function enrichEventMetadata(event, metadata) {
  const enriched = { ...(metadata || {}) };

  // Classify based on event type and data
  if (event?.type === 3) { // IncrementalSnapshot
    const source = event?.data?.source;
    if (source === 0) enriched.classification = 'mutation';
    else if (source === 1) enriched.classification = 'mousemove';
    else if (source === 2) {
      const interactionType = event?.data?.type;
      if (interactionType === 0) enriched.classification = 'mouseup';
      else if (interactionType === 1) enriched.classification = 'mousedown';
      else if (interactionType === 2) enriched.classification = 'click';
      else enriched.classification = 'interaction';
    } else if (source === 3) enriched.classification = 'scroll';
    else if (source === 4) enriched.classification = 'viewport-resize';
    else if (source === 5) enriched.classification = 'input';
    else if (source === 6) enriched.classification = 'media-interaction';
  } else if (event?.type === 2) {
    enriched.classification = 'full-snapshot';
  } else if (event?.type === 4) {
    enriched.classification = 'meta';
  } else if (event?.type === 5) {
    enriched.classification = 'custom';
  }

  // Tag errors if present
  if (metadata?.error || event?.data?.tag === 'error') {
    enriched.hasError = true;
  }

  return enriched;
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('[Socket.IO] Client connected:', socket.id);

  // Support both 'join' and 'join-project' events for flexibility
  socket.on('join', (projectId) => {
    const room = `project-${projectId}`;
    socket.join(room);
    console.log(`[Socket.IO] ${socket.id} joined project ${projectId} (room: ${room})`);
  });

  socket.on('join-project', (projectId) => {
    const room = `project-${projectId}`;
    socket.join(room);
    console.log(`[Socket.IO] ${socket.id} joined project ${projectId} (room: ${room})`);
  });

  // Admin joins admin room for live recording
  socket.on('join-admin-room', ({ adminId }) => {
    socket.join('admin-room');
    console.log(`[Socket.IO] Admin ${adminId} joined admin room`);

    // Send active users count
    const userSockets = io.sockets.adapter.rooms.get('project-default');
    const activeUsers = userSockets ? userSockets.size : 0;
    socket.emit('active-users', activeUsers);
  });

  // Admin starts recording - broadcast to all user clients
  socket.on('admin-start-recording', ({ recordingId, projectId, adminId, timestamp }) => {
    console.log(`[Socket.IO] Admin ${adminId} started recording ${recordingId} for project ${projectId}`);

    // Store active recording state globally
    global.activeRecording = {
      recordingId,
      projectId: projectId || 'default',
      adminId,
      startTime: timestamp || Date.now(),
    };

    // Broadcast to all users in the project (include multiple event name variants for SDKs)
    const payload = {
      recordingId,
      startedBy: adminId,
      timestamp,
    };
    io.to(`project-${projectId}`).emit('recording-start', payload);
    io.to(`project-${projectId}`).emit('start-recording', payload);
    io.to(`project-${projectId}`).emit('recording:start', payload);
    io.to(`project-${projectId}`).emit('admin:recording:start', payload);

    // Join recording-specific room for this admin
    socket.join(`recording-admin-${recordingId}`);

    console.log(`[Socket.IO] Recording ${recordingId} started, waiting for user events...`);
  });

  // Admin stops recording
  socket.on('admin-stop-recording', ({ recordingId, timestamp }) => {
    console.log(`[Socket.IO] Stopping recording ${recordingId}`);

    // Clear active recording state
    if (global.activeRecording && global.activeRecording.recordingId === recordingId) {
      global.activeRecording = null;
    }

    // Broadcast to all users to stop recording (variants)
    const payload = { recordingId, timestamp };
    io.emit('recording-stop', payload);
    io.emit('stop-recording', payload);
    io.emit('recording:stop', payload);
    io.emit('admin:recording:stop', payload);

    // Leave recording room
    socket.leave(`recording-admin-${recordingId}`);
  });

  // User sends recording event to admin
  socket.on('recording-event', ({ recordingId, event, metadata }) => {
    console.log(`[Socket.IO] Received recording event for ${recordingId}, type: ${event?.type || 'unknown'}`);

    // Enrich event with classification tags
    const enrichedMetadata = enrichEventMetadata(event, metadata);

    // Forward to admin dashboard watching this recording
    io.to(`recording-admin-${recordingId}`).emit('live-event', {
      recordingId,
      event,
      metadata: enrichedMetadata,
      timestamp: Date.now(),
    });
  });

  // Alias for SDKs using colon event name
  socket.on('recording:event', (payload) => {
    try {
      const { projectId, sessionId, event, pageURL, timestamp } = payload || {};
      // If there's an active recording for this project, forward to its admin room
      if (global.activeRecording && (!projectId || global.activeRecording.projectId === projectId)) {
        const rid = global.activeRecording.recordingId;
        io.to(`recording-admin-${rid}`).emit('live-event', {
          recordingId: rid,
          event,
          metadata: { sessionId, pageURL },
          timestamp: timestamp || Date.now(),
        });
      }
    } catch (e) {
      console.error('[Socket.IO] Failed to handle recording:event alias', e);
    }
  });

  // SDK registration (joins project room)
  socket.on('sdk:register', ({ projectId, sessionId, userId, pageURL }) => {
    try {
      const pid = projectId || 'default';
      socket.join(`project-${pid}`);
      console.log(`[Socket.IO] SDK registered session ${sessionId} (${userId}) for project ${pid} @ ${pageURL}`);
    } catch (e) {
      console.error('[Socket.IO] sdk:register error', e);
    }
  });

  // Admin-triggered heatmap overlay
  socket.on('admin-show-heatmap', ({ projectId = 'default', options }) => {
    const room = `project-${projectId}`;
    io.to(room).emit('heatmap-show', options || {});
    io.to(room).emit('admin:heatmap:show', options || {});
  });
  socket.on('admin-hide-heatmap', ({ projectId = 'default' }) => {
    const room = `project-${projectId}`;
    io.to(room).emit('heatmap-hide');
    io.to(room).emit('admin:heatmap:hide');
  });

  // User joins and shares metadata
  socket.on('user-joined', ({ userId, metadata, projectId }) => {
    console.log(`[Socket.IO] User ${userId} joined project ${projectId}`);

    // Join project room
    socket.join(`project-${projectId}`);

    // Notify admin room
    io.to('admin-room').emit('user-joined', {
      userId,
      metadata,
      timestamp: Date.now(),
    });

    // Update active users count for admins
    const userSockets = io.sockets.adapter.rooms.get(`project-${projectId}`);
    const activeUsers = userSockets ? userSockets.size : 0;
    io.to('admin-room').emit('active-users', activeUsers);
  });

  socket.on('disconnect', () => {
    console.log('[Socket.IO] Client disconnected:', socket.id);

    // Update active users count
    const userSockets = io.sockets.adapter.rooms.get('project-default');
    const activeUsers = userSockets ? userSockets.size : 0;
    io.to('admin-room').emit('active-users', activeUsers);
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
const alertsRoutes = require('./routes/alerts');
const consentRoutes = require('./routes/consent');
const reportsRoutes = require('./routes/reports');
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
app.use('/api/alerts', alertsRoutes);
app.use('/api/consent', consentRoutes);

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

// paths API (Sankey)
const pathsRoutes = require('./routes/paths');
app.use('/api/paths', pathsRoutes);

// insights API
const insightsRoutes = require('./routes/insights');
app.use('/api/insights', insightsRoutes);

// trends API
const trendsRoutes = require('./routes/trends');
app.use('/api/trends', trendsRoutes);

// experiments API (A/B testing)
app.use('/api/experiments', experimentsRoutes);

// orders API
app.use('/api/orders', ordersRoutes);

// cart API
app.use('/api/cart', cartRoutes);

// reports API (scheduled reports and email exports)
app.use('/api/reports', reportsRoutes);

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
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('🔄 Server ready - trackingRoutes.js loaded with PACKED EVENT SUPPORT');
      console.log('📝 Restart timestamp:', new Date().toISOString());
      try {
        const alertsScheduler = require('./services/alertsScheduler');
        alertsScheduler.start();
      } catch (e) {
        console.error('Failed to start AlertsScheduler', e);
      }

      // Initialize report scheduler
      try {
        const reportScheduler = require('./services/reportScheduler');
        reportScheduler.initializeScheduler();
        console.log('📧 Report Scheduler initialized');
      } catch (e) {
        console.error('Failed to start ReportScheduler', e);
      }
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });
