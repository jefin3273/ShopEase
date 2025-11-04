const mongoose = require('mongoose');

const heatmapDataSchema = new mongoose.Schema(
  {
    pageURL: {
      type: String,
      required: true,
      index: true,
    },
    projectId: {
      type: String,
      default: 'default',
      index: true,
    },
    // Type of heatmap data
    type: {
      type: String,
      enum: ['click', 'move', 'scroll', 'hover'],
      required: true,
      index: true,
    },
    // Aggregated data points
    points: [
      {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        value: { type: Number, default: 1 }, // intensity/count
        timestamp: Date,
      },
    ],
    // Viewport dimensions for normalization
    viewport: {
      width: Number,
      height: Number,
    },
    // Device type for segmentation
    device: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown',
    },
    // Date range for this aggregation
    dateRange: {
      start: Date,
      end: Date,
    },
    // Metadata
    metadata: {
      totalInteractions: { type: Number, default: 0 },
      uniqueUsers: { type: Number, default: 0 },
      avgTimeOnPage: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
heatmapDataSchema.index({ pageURL: 1, type: 1, device: 1 });
heatmapDataSchema.index({ projectId: 1, pageURL: 1, type: 1 });
heatmapDataSchema.index({ createdAt: -1 });

// Static method to aggregate raw interaction data into heatmap
heatmapDataSchema.statics.generateHeatmap = async function (
  pageURL,
  type,
  startDate,
  endDate,
  device = null
) {
  const UserInteraction = mongoose.model('UserInteraction');
  
  const matchQuery = {
    pageURL,
    eventType: type,
    timestamp: {
      $gte: startDate,
      $lte: endDate,
    },
  };

  if (device) {
    matchQuery['metadata.device'] = device;
  }

  const aggregated = await UserInteraction.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          x: { $round: ['$metadata.x', 0] },
          y: { $round: ['$metadata.y', 0] },
        },
        value: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        x: '$_id.x',
        y: '$_id.y',
        value: 1,
      },
    },
  ]);

  // Get unique users
  const uniqueUsers = await UserInteraction.distinct('userId', matchQuery);

  const heatmapDoc = await this.findOneAndUpdate(
    { pageURL, type, device: device || 'unknown' },
    {
      $set: {
        points: aggregated,
        dateRange: { start: startDate, end: endDate },
        'metadata.totalInteractions': aggregated.reduce((sum, p) => sum + p.value, 0),
        'metadata.uniqueUsers': uniqueUsers.length,
      },
    },
    { upsert: true, new: true }
  );

  return heatmapDoc;
};

module.exports = mongoose.model('HeatmapData', heatmapDataSchema);
