require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
// Increase header size limit to prevent 431 errors
const server = http.createServer({ maxHeaderSize: 16384 }, app);

// middleware - increase payload limit for image uploads (base64 encoded images can be large)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Support a comma-separated list of allowed client origins via CLIENT_URLS
// Fallback to CLIENT_URL for single-value usage, then a default of localhost:3000
const rawClientList = process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:3000';
const CLIENT_ORIGINS = rawClientList.split(',').map((u) => u.trim());

// Allow credentials so refresh token cookie (httpOnly) is accepted by browser
const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser requests like curl/postman (no origin)
    if (!origin) return callback(null, true);
    if (CLIENT_ORIGINS.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(new Error('CORS: Origin not allowed'));
  },
  credentials: true,
};

app.use(cors(corsOptions));

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGINS,
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
const productsRoutes = require('./routes/products');
const sessionsRoutes = require('./routes/sessions');
const dashboardRoutes = require('./routes/dashboard');
const funnelsRoutes = require('./routes/funnels');
const cohortsRoutes = require('./routes/cohorts');
const experimentsRoutes = require('./routes/experiments');
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
