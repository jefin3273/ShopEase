const mongoose = require('mongoose');

const pageViewSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: String,
    index: true,
  },
  projectId: {
    type: String,
    index: true,
  },
  pageURL: {
    type: String,
    required: true,
    index: true,
  },
  pageTitle: {
    type: String,
  },
  referrer: {
    type: String,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
  timeOnPage: {
    type: Number, // seconds
  },
  scrollDepth: {
    type: Number, // percentage (0-100)
  },
  exitPage: {
    type: Boolean,
    default: false,
  },
  device: {
    type: {
      type: String,
    },
    browser: String,
    os: String,
  },
  isSeeded: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes for efficient analytics queries
pageViewSchema.index({ projectId: 1, timestamp: -1 });
pageViewSchema.index({ pageURL: 1, timestamp: -1 });
pageViewSchema.index({ sessionId: 1, timestamp: 1 });

module.exports = mongoose.model('PageView', pageViewSchema);
