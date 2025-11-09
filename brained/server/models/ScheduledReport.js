const mongoose = require('mongoose');

const scheduledReportSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  reportType: {
    type: String,
    required: true,
    enum: ['analytics', 'performance', 'funnel', 'cohort', 'behavior', 'errors', 'custom'],
  },
  // Report configuration
  config: {
    // Date range
    dateRange: {
      type: String,
      enum: ['24h', '7d', '30d', '90d', 'custom'],
      default: '7d',
    },
    customDateRange: {
      from: Date,
      to: Date,
    },
    // Filters
    pageURL: String,
    device: String,
    cohortId: mongoose.Schema.Types.ObjectId,
    variantId: String,
    // Export format
    formats: [{
      type: String,
      enum: ['csv', 'pdf', 'both'],
      default: 'both',
    }],
    // Include options
    includeCharts: {
      type: Boolean,
      default: true,
    },
    includeBehavior: {
      type: Boolean,
      default: false,
    },
    includeErrors: {
      type: Boolean,
      default: false,
    },
  },
  // Schedule configuration
  schedule: {
    enabled: {
      type: Boolean,
      default: true,
    },
    frequency: {
      type: String,
      required: true,
      enum: ['daily', 'weekly', 'monthly', 'custom'],
    },
    // For custom frequency (cron format)
    cronExpression: String,
    // Day of week for weekly (0-6, 0 = Sunday)
    dayOfWeek: Number,
    // Day of month for monthly (1-31)
    dayOfMonth: Number,
    // Time (24h format)
    time: {
      type: String,
      default: '09:00',
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
  },
  // Recipients
  recipients: [{
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    name: String,
  }],
  // Status tracking
  status: {
    type: String,
    enum: ['active', 'paused', 'error'],
    default: 'active',
  },
  lastRun: {
    date: Date,
    success: Boolean,
    error: String,
  },
  nextRun: Date,
  runCount: {
    type: Number,
    default: 0,
  },
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  projectId: {
    type: String,
    default: 'default',
  },
}, {
  timestamps: true,
});

// Index for querying scheduled reports
scheduledReportSchema.index({ projectId: 1, status: 1 });
scheduledReportSchema.index({ nextRun: 1, status: 1 });

// Calculate next run date based on schedule
scheduledReportSchema.methods.calculateNextRun = function() {
  const now = new Date();
  const [hours, minutes] = (this.schedule.time || '09:00').split(':').map(Number);
  
  let nextRun = new Date();
  nextRun.setHours(hours, minutes, 0, 0);

  switch (this.schedule.frequency) {
    case 'daily':
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;

    case 'weekly':
      const targetDay = this.schedule.dayOfWeek || 1; // Default Monday
      const currentDay = nextRun.getDay();
      let daysUntilTarget = targetDay - currentDay;
      
      if (daysUntilTarget <= 0 || (daysUntilTarget === 0 && nextRun <= now)) {
        daysUntilTarget += 7;
      }
      
      nextRun.setDate(nextRun.getDate() + daysUntilTarget);
      break;

    case 'monthly':
      const targetDate = this.schedule.dayOfMonth || 1;
      nextRun.setDate(targetDate);
      
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      break;

    case 'custom':
      // For custom cron, this would require a cron parser library
      // Fallback to next day for now
      nextRun.setDate(nextRun.getDate() + 1);
      break;
  }

  this.nextRun = nextRun;
  return nextRun;
};

// Update run statistics
scheduledReportSchema.methods.recordRun = async function(success, error = null) {
  this.lastRun = {
    date: new Date(),
    success,
    error,
  };
  this.runCount += 1;
  
  if (success) {
    this.calculateNextRun();
    this.status = 'active';
  } else {
    this.status = 'error';
  }
  
  await this.save();
};

module.exports = mongoose.model('ScheduledReport', scheduledReportSchema);
