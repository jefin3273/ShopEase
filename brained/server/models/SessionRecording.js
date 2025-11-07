const mongoose = require('mongoose');

const sessionRecordingSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: String,
    index: true,
  },
  projectId: {
    type: String,
    default: 'default',
    index: true,
  },
  
  // Recording metadata
  startTime: {
    type: Date,
    required: true,
    index: true,
  },
  endTime: Date,
  duration: Number, // seconds
  
  // Page info
  entryURL: String,
  exitURL: String,
  pagesVisited: [String],
  
  // Device info
  device: {
    deviceType: String, // Changed from 'type' to avoid Mongoose conflict
    browser: String,
    os: String,
    screen: String,
    screenResolution: String,
    viewport: String,
  },
  
  // Session metadata
  metadata: {
    url: String,
    title: String,
    device: {
      deviceType: String, // Changed from 'type' to avoid conflict
      browser: String,
      os: String,
      screen: String,
    },
  },
  
  // rrweb events - stored as compressed packed strings for efficiency
  // Each string is a compressed chunk of events created by rrweb's pack() function
  // These will be unpacked during playback using rrweb's unpack() function
  events: [String], // Array of compressed event strings
  
  // Console logs (optional)
  consoleLogs: [{
    timestamp: Number,
    level: String, // log, warn, error, info
    message: String,
  }],
  
  // Network requests (optional)
  networkRequests: [{
    timestamp: Number,
    method: String,
    url: String,
    status: Number,
    duration: Number,
    type: String, // fetch, xhr
    error: String,
  }],
  
  // Errors captured
  errors: [{
    timestamp: Number,
    message: String,
    stack: String,
    filename: String,
    line: Number,
    column: Number,
    type: String, // error, unhandledrejection
  }],
  
  // Statistics
  stats: {
    totalEvents: Number,
    totalClicks: Number,
    totalScrolls: Number,
    totalMoves: Number,
    avgMouseSpeed: Number,
  },
  
  // Flags
  hasErrors: {
    type: Boolean,
    default: false,
  },
  isComplete: {
    type: Boolean,
    default: false,
  },
  
  // Metadata for analysis
  tags: [String],
  notes: String,

  // Seed tracking
  isSeeded: {
    type: Boolean,
    default: false,
    index: true,
  },
  
}, {
  timestamps: true,
  // suppress the mongoose reserved-key warning for the 'errors' field used here
  suppressReservedKeysWarning: true,
});

// Indexes
sessionRecordingSchema.index({ projectId: 1, startTime: -1 });
sessionRecordingSchema.index({ userId: 1, startTime: -1 });
sessionRecordingSchema.index({ hasErrors: 1, startTime: -1 });

// Delete existing model to prevent schema caching issues
if (mongoose.models.SessionRecording) {
  delete mongoose.models.SessionRecording;
}

module.exports = mongoose.model('SessionRecording', sessionRecordingSchema);
