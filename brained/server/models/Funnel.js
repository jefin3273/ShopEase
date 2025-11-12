const mongoose = require('mongoose');

const funnelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: String,
  projectId: {
    type: String,
    default: 'default',
    index: true,
  },

  // Funnel steps
  steps: [{
    order: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    eventType: String, // pageview, click, custom
    eventName: String,
    pageURL: String,
    element: String,
    conditions: mongoose.Schema.Types.Mixed,
  }],

  // Funnel stats
  stats: {
    totalEntered: Number,
    completed: Number,
    conversionRate: Number,
    avgTimeToComplete: Number, // seconds
    dropoffByStep: [{
      step: Number,
      count: Number,
      dropoffRate: Number,
    }],
  },

  // Time window
  timeWindow: {
    value: Number,
    unit: String, // minutes, hours, days
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  isSeeded: {
    type: Boolean,
    default: false,
  },

}, {
  timestamps: true,
});

funnelSchema.index({ projectId: 1, isActive: 1 });

module.exports = mongoose.model('Funnel', funnelSchema);
