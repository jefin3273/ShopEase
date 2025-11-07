const mongoose = require('mongoose');

// Supported metrics (MVP):
// - events_per_minute
// - lcp_p75
// - cls_p75
// - inp_p75
// - js_errors_per_minute
const AlertRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    projectId: { type: String, default: 'default', index: true },
    metric: { type: String, required: true },
    comparator: { type: String, enum: ['>', '>=', '<', '<=', '==', '!='], default: '>' },
    threshold: { type: Number, required: true },
    windowMinutes: { type: Number, default: 5 },
    channel: { type: String, enum: ['slack', 'webhook'], required: true },
    slackWebhook: { type: String },
    webhookUrl: { type: String },
    isActive: { type: Boolean, default: true },
    cooldownMs: { type: Number, default: 10 * 60 * 1000 }, // 10 minutes
    lastTriggeredAt: { type: Date },
    createdBy: { type: String }, // userId optional
    isSeeded: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

AlertRuleSchema.index({ projectId: 1, metric: 1, isActive: 1 });

module.exports = mongoose.model('AlertRule', AlertRuleSchema);
