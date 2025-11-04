const express = require('express');
const router = express.Router();
const { enrichWithUserNames } = require('../utils/userEnricher');

// Models
const SessionRecording = require('../models/SessionRecording');
const Session = require('../models/Session');
const UserInteraction = require('../models/UserInteraction');
const PageView = require('../models/PageView');
const UserEvent = require('../models/UserEvent');
const HeatmapData = require('../models/HeatmapData');
const EventAnalytics = require('../models/EventAnalytics');
const PerformanceMetrics = require('../models/PerformanceMetrics');
const Funnel = require('../models/Funnel');
const Experiment = require('../models/Experiment');
const Cohort = require('../models/Cohort');
const FeatureFlag = require('../models/FeatureFlag');

// Category map: define which model handles which category
const CATEGORY_MAP = {
  sessionRecordings: { model: SessionRecording, listFields: ['sessionId', 'startedAt', 'completedAt', 'events'] },
  sessions: { model: Session, listFields: ['sessionId', 'userId', 'startedAt', 'completedAt'] },
  interactions: { model: UserInteraction, listFields: ['eventType', 'eventName', 'pageURL', 'timestamp'] },
  pageViews: { model: PageView, listFields: ['url', 'title', 'timestamp', 'referrer'] },
  userEvents: { model: UserEvent, listFields: ['name', 'properties', 'timestamp'] },
  heatmaps: { model: HeatmapData, listFields: ['pageURL', 'x', 'y', 'timestamp'] },
  eventAnalytics: { model: EventAnalytics },
  performanceMetrics: { model: PerformanceMetrics },
  funnels: { model: Funnel },
  experiments: { model: Experiment },
  cohorts: { model: Cohort },
  featureFlags: { model: FeatureFlag },
};

function getCategoryDef(category) {
  const def = CATEGORY_MAP[category];
  if (!def) {
    const err = new Error(`Unknown analytics category: ${category}`);
    err.status = 400;
    throw err;
  }
  return def;
}

// GET /api/analytics/admin/:category - list items (paginated)
router.get('/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const { model } = getCategoryDef(category);

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      model.find({}).sort({ _id: -1 }).skip(skip).limit(parseInt(limit)),
      model.countDocuments({}),
    ]);

    // Enrich items with user names if they have userId field
    const enrichedItems = await enrichWithUserNames(items);

    res.json({ items: enrichedItems, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('List analytics admin error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to list analytics items' });
  }
});

// DELETE /api/analytics/admin/:category/:id - delete single item
router.delete('/:category/:id', async (req, res) => {
  try {
    const { category, id } = req.params;
    const { model } = getCategoryDef(category);
    const result = await model.deleteOne({ _id: id });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Delete analytics item error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to delete item' });
  }
});

// DELETE /api/analytics/admin/:category - delete all items in category
router.delete('/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { model } = getCategoryDef(category);
    const result = await model.deleteMany({});
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Delete analytics category error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to delete category items' });
  }
});

module.exports = router;
