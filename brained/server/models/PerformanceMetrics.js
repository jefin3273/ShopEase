const mongoose = require('mongoose');

const DeviceInfoSchema = new mongoose.Schema(
  {
    device: { type: String },
    browser: { type: String },
    os: { type: String }
  },
  { _id: false }
);

const APICallSchema = new mongoose.Schema(
  {
    url: { type: String },
    method: { type: String },
    status: { type: Number },
    duration: { type: Number },
    error: { type: String },
    timestamp: { type: Date }
  },
  { _id: false }
);

const PerformanceMetricsSchema = new mongoose.Schema(
  {
    sessionId: { type: String },
    userId: { type: String },
    projectId: { type: String, default: 'default' },
    pageURL: { type: String, required: true },

    // Core Web Vitals
    TTFB: { type: Number }, // Time to First Byte
    FCP: { type: Number },  // First Contentful Paint
    LCP: { type: Number },  // Largest Contentful Paint
    CLS: { type: Number },  // Cumulative Layout Shift
    INP: { type: Number },  // Interaction to Next Paint (modern)
    FID: { type: Number },  // First Input Delay (fallback)

    // Additional Performance Metrics
    loadTime: { type: Number },
    domReadyTime: { type: Number },
    dnsTime: { type: Number },

    // Error Tracking
    jsErrors: { type: [mongoose.Schema.Types.Mixed], default: [] },

    // API Monitoring
    apiCalls: { type: [APICallSchema], default: [] },

    // Metadata
    timestamp: { type: Date, default: Date.now },
    deviceInfo: { type: DeviceInfoSchema, default: {} },

    // Seed tracking
    isSeeded: { type: Boolean, default: false, index: true }
  },
  { collection: 'performance_metrics' }
);

// Indexes for efficient queries
PerformanceMetricsSchema.index({ pageURL: 1, timestamp: -1 });
PerformanceMetricsSchema.index({ sessionId: 1 });
PerformanceMetricsSchema.index({ projectId: 1, timestamp: -1 });
PerformanceMetricsSchema.index({ timestamp: -1 });

module.exports = mongoose.model('PerformanceMetrics', PerformanceMetricsSchema);
