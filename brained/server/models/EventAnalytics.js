const mongoose = require('mongoose');

const DeviceInfoSchema = new mongoose.Schema(
  {
    device: { type: String },
    browser: { type: String },
    os: { type: String }
  },
  { _id: false }
);

const EventAnalyticsSchema = new mongoose.Schema(
  {
    eventType: { 
      type: String, 
      enum: ['click', 'scroll', 'hover', 'custom', 'submit', 'pageview', 'form_submit', 'button_click', 'input', 'change', 'focus', 'blur'], 
      required: true 
    },
    element: { type: String },
    pageURL: { type: String },
    timestamp: { type: Date, default: Date.now },
    deviceInfo: { type: DeviceInfoSchema, default: {} },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { collection: 'event_analytics' }
);

module.exports = mongoose.model('EventAnalytics', EventAnalyticsSchema);
