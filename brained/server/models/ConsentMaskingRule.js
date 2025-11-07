const mongoose = require('mongoose');

const ConsentMaskingRuleSchema = new mongoose.Schema(
  {
    projectId: { type: String, default: 'default', index: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['mask', 'block'], required: true },
    selectors: [{ type: String }], // CSS selectors
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 }, // Higher priority rules override
    description: { type: String },
    createdBy: { type: String },
    isSeeded: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

ConsentMaskingRuleSchema.index({ projectId: 1, isActive: 1, priority: -1 });

module.exports = mongoose.model('ConsentMaskingRule', ConsentMaskingRuleSchema);
