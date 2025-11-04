const mongoose = require('mongoose');

const userInteractionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      default: 'anonymous',
      index: true,
    },
    projectId: {
      type: String,
      default: 'default',
      index: true,
    },
    // Event type
    eventType: {
      type: String,
      required: true,
      enum: ['click', 'hover', 'scroll', 'mousemove', 'input', 'submit', 'pageview', 'custom'],
      index: true,
    },
    eventName: {
      type: String,
      required: true,
    },
    // Page context
    pageURL: {
      type: String,
      required: true,
      index: true,
    },
    pageTitle: String,
    referrer: String,
    // Timestamp
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // Interaction metadata
    metadata: {
      // Element info
      element: String,
      elementId: String,
      className: String,
      text: String,
      
      // Position data
      x: Number,
      y: Number,
      vw: Number, // viewport width %
      vh: Number, // viewport height %
      
      // Scroll data
      scrollDepth: Number, // percentage
      scrollTop: Number,
      scrollLeft: Number,
      
      // Hover data
      hoverDuration: Number, // milliseconds
      
      // Form data (sanitized)
      formData: mongoose.Schema.Types.Mixed,
      
      // Custom properties
      customProps: mongoose.Schema.Types.Mixed,
      
      // Device/browser info
      device: String,
      browser: String,
      os: String,
      screenWidth: Number,
      screenHeight: Number,
      viewportWidth: Number,
      viewportHeight: Number,
      
      // Performance
      loadTime: Number,
      timeOnPage: Number, // seconds
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for analytics queries
userInteractionSchema.index({ pageURL: 1, eventType: 1, timestamp: -1 });
userInteractionSchema.index({ sessionId: 1, timestamp: 1 });
userInteractionSchema.index({ userId: 1, timestamp: -1 });
userInteractionSchema.index({ projectId: 1, timestamp: -1 });
userInteractionSchema.index({ eventType: 1, timestamp: -1 });

// Static method to get interaction summary
userInteractionSchema.statics.getSummary = async function (filter = {}, groupBy = 'eventType') {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: `$${groupBy}`,
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        avgTimeOnPage: { $avg: '$metadata.timeOnPage' },
      },
    },
    {
      $project: {
        _id: 0,
        [groupBy]: '$_id',
        count: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        avgTimeOnPage: { $round: ['$avgTimeOnPage', 2] },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

// Static method to get scroll depth distribution
userInteractionSchema.statics.getScrollDepthDistribution = async function (pageURL, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        pageURL,
        eventType: 'scroll',
        timestamp: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $bucket: {
        groupBy: '$metadata.scrollDepth',
        boundaries: [0, 25, 50, 75, 100],
        default: 'Other',
        output: {
          count: { $sum: 1 },
          users: { $addToSet: '$userId' },
        },
      },
    },
    {
      $project: {
        _id: 0,
        range: '$_id',
        count: 1,
        uniqueUsers: { $size: '$users' },
      },
    },
  ]);
};

// Static method to get top clicked elements
userInteractionSchema.statics.getTopClickedElements = async function (pageURL, limit = 10) {
  return this.aggregate([
    {
      $match: {
        pageURL,
        eventType: 'click',
      },
    },
    {
      $group: {
        _id: {
          element: '$metadata.element',
          elementId: '$metadata.elementId',
          className: '$metadata.className',
          text: { $substr: ['$metadata.text', 0, 50] },
        },
        clicks: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
      },
    },
    {
      $project: {
        _id: 0,
        element: '$_id.element',
        elementId: '$_id.elementId',
        className: '$_id.className',
        text: '$_id.text',
        clicks: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
      },
    },
    { $sort: { clicks: -1 } },
    { $limit: limit },
  ]);
};

module.exports = mongoose.model('UserInteraction', userInteractionSchema);
