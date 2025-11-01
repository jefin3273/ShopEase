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
    type: String,
    browser: String,
    os: String,
    screenResolution: String,
    viewport: String,
  },
  
  // Recording events (cursor movements, clicks, scrolls, etc.)
  events: [{
    type: {
      type: String,
      required: true,
      // mousemove, click, scroll, resize, input, etc.
    },
    timestamp: {
      type: Number, // milliseconds from start
      required: true,
    },
    data: {
      // For mousemove: x, y
      x: Number,
      y: Number,
      
      // For click: x, y, element
      element: String,
      target: String,
      
      // For scroll: x, y, scrollTop, scrollLeft
      scrollTop: Number,
      scrollLeft: Number,
      
      // For resize: width, height
      width: Number,
      height: Number,
      
      // For input: value (masked for security)
      value: String,
      inputType: String,
      
      // For page change: url, title
      url: String,
      title: String,
    },
  }],
  
  // DOM snapshots (initial and mutations)
  snapshots: [{
    timestamp: Number,
    type: String, // full, incremental
    html: String, // stored as compressed/sanitized HTML
    mutations: mongoose.Schema.Types.Mixed,
  }],
  
  // Console logs (optional)
  consoleLogs: [{
    timestamp: Number,
    level: String, // log, warn, error
    message: String,
    args: [mongoose.Schema.Types.Mixed],
  }],
  
  // Network requests (optional)
  networkRequests: [{
    timestamp: Number,
    method: String,
    url: String,
    status: Number,
    duration: Number,
    size: Number,
  }],
  
  // Errors captured
  errors: [{
    timestamp: Number,
    message: String,
    stack: String,
    type: String,
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
  
}, {
  timestamps: true,
  // suppress the mongoose reserved-key warning for the 'errors' field used here
  suppressReservedKeysWarning: true,
});

// Indexes
sessionRecordingSchema.index({ projectId: 1, startTime: -1 });
sessionRecordingSchema.index({ userId: 1, startTime: -1 });
sessionRecordingSchema.index({ hasErrors: 1, startTime: -1 });

module.exports = mongoose.model('SessionRecording', sessionRecordingSchema);
