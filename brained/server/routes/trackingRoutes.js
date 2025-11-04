const express = require('express');
const router = express.Router();
const SessionRecording = require('../models/SessionRecording');
const HeatmapData = require('../models/HeatmapData');
const UserInteraction = require('../models/UserInteraction');
const User = require('../models/User');
const { enrichWithUserNames } = require('../utils/userEnricher');

// ===== SESSION RECORDING ENDPOINTS =====

// Create or update session recording with rrweb events
router.post('/session', async (req, res) => {
  try {
    const { sessionId, userId, events, consoleLogs, networkRequests, metadata } = req.body;

    if (!sessionId || !events || !Array.isArray(events)) {
      return res.status(400).json({ message: 'sessionId and events array are required' });
    }

    // Check if URL is an admin path and reject tracking
    if (metadata?.url) {
      const url = metadata.url.toLowerCase();
      if (url.includes('/admin') || url.includes('/login')) {
        return res.status(200).json({ message: 'Admin paths not tracked' });
      }
    }

    // If userId is provided, check if user is admin
    if (userId && userId !== 'anonymous') {
      const user = await User.findById(userId).select('role');
      if (user && user.role === 'admin') {
        return res.status(200).json({ message: 'Admin users not tracked' });
      }
    }

    let session = await SessionRecording.findOne({ sessionId });

    if (!session) {
      // Create new session
      session = new SessionRecording({
        sessionId,
        userId: userId || 'anonymous',
        projectId: req.body.projectId || 'default',
        startTime: new Date(),
        events: [],
        consoleLogs: [],
        networkRequests: [],
        device: metadata?.device || {},
        entryURL: metadata?.url || '',
        pagesVisited: metadata?.url ? [metadata?.url] : [],
      });
    }

    // Add events to session
    session.events.push(...events);

    // Add console logs
    if (consoleLogs && Array.isArray(consoleLogs)) {
      session.consoleLogs.push(...consoleLogs);
    }

    // Add network requests
    if (networkRequests && Array.isArray(networkRequests)) {
      session.networkRequests.push(...networkRequests);
    }

    // Update metadata
    if (metadata) {
      if (metadata.url && !session.pagesVisited.includes(metadata.url)) {
        session.pagesVisited.push(metadata.url);
        session.exitURL = metadata.url;
      }
      if (metadata.device) {
        session.device = { ...session.device, ...metadata.device };
      }
    }

    // Update stats
    const clickEvents = events.filter((e) => e.type === 'click' || e.type === 3).length;
    const scrollEvents = events.filter((e) => e.type === 'scroll').length;
    const inputEvents = events.filter((e) => e.type === 'input' || e.type === 5).length;

    session.stats = session.stats || {};
    session.stats.totalEvents = (session.stats.totalEvents || 0) + events.length;
    session.stats.totalClicks = (session.stats.totalClicks || 0) + clickEvents;
    session.stats.totalScrolls = (session.stats.totalScrolls || 0) + scrollEvents;

    await session.save();

    res.json({ message: 'Session events recorded', sessionId: session.sessionId });
  } catch (error) {
    console.error('Error recording session:', error);
    res.status(500).json({ message: 'Failed to record session', error: error.message });
  }
});

// Complete a session (mark as finished)
router.post('/session/:sessionId/complete', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await SessionRecording.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.isComplete = true;
    session.endTime = new Date();

    if (session.startTime) {
      session.duration = Math.floor((session.endTime - session.startTime) / 1000); // seconds
    }

    await session.save();

    res.json({ message: 'Session completed', session });
  } catch (error) {
    console.error('Error completing session:', error);
    res.status(500).json({ message: 'Failed to complete session', error: error.message });
  }
});

// Alias: support plural form as well
router.post('/sessions/:sessionId/complete', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await SessionRecording.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.isComplete = true;
    session.endTime = new Date();
    if (session.startTime) {
      session.duration = Math.floor((session.endTime - session.startTime) / 1000);
    }
    await session.save();

    res.json({ message: 'Session completed', session });
  } catch (error) {
    console.error('Error completing session (alias):', error);
    res.status(500).json({ message: 'Failed to complete session', error: error.message });
  }
});

// Get all sessions with pagination and filters
router.get('/sessions', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      userId,
      hasErrors,
      startDate,
      endDate,
      isComplete,
    } = req.query;

    const query = {};

    if (userId) query.userId = userId;
    if (hasErrors !== undefined) query.hasErrors = hasErrors === 'true';
    if (isComplete !== undefined) query.isComplete = isComplete === 'true';

    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }

    const sessions = await SessionRecording.find(query)
      .sort({ startTime: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-events') // Exclude large events array from list
      .lean();

    const total = await SessionRecording.countDocuments(query);

    // Enrich sessions with user names
    const enrichedSessions = await enrichWithUserNames(sessions);

    res.json({
      sessions: enrichedSessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ message: 'Failed to fetch sessions', error: error.message });
  }
});

// Get single session with full event data
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await SessionRecording.findOne({ sessionId }).lean();

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Enrich session with user name
    const enrichedSession = (await enrichWithUserNames([session]))[0];

    res.json({ session: enrichedSession });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ message: 'Failed to fetch session', error: error.message });
  }
});

// Delete a session
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await SessionRecording.deleteOne({ sessionId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ message: 'Failed to delete session', error: error.message });
  }
});

// ===== USER INTERACTION ENDPOINTS =====

// Record single user interaction (click, scroll, hover, etc.)
router.post('/interaction', async (req, res) => {
  try {
    const {
      sessionId,
      userId,
      eventType,
      eventName,
      pageURL,
      metadata,
    } = req.body;

    if (!sessionId || !eventType || !pageURL) {
      return res.status(400).json({
        message: 'sessionId, eventType, and pageURL are required',
      });
    }

    // Check if URL is an admin path and reject tracking
    const url = pageURL.toLowerCase();
    if (url.includes('/admin') || url.includes('/login')) {
      return res.status(200).json({ message: 'Admin paths not tracked' });
    }

    // If userId is provided, check if user is admin
    if (userId && userId !== 'anonymous') {
      const user = await User.findById(userId).select('role');
      if (user && user.role === 'admin') {
        return res.status(200).json({ message: 'Admin users not tracked' });
      }
    }

    const interaction = new UserInteraction({
      sessionId,
      userId: userId || 'anonymous',
      projectId: req.body.projectId || 'default',
      eventType,
      eventName: eventName || eventType,
      pageURL,
      pageTitle: metadata?.pageTitle,
      referrer: metadata?.referrer,
      metadata: metadata || {},
    });

    await interaction.save();

    // Emit real-time event via Socket.IO if available
    if (global.io) {
      global.io.to(`project-${interaction.projectId}`).emit('interaction', {
        eventType,
        pageURL,
        timestamp: interaction.timestamp,
      });
    }

    res.json({ message: 'Interaction recorded', id: interaction._id });
  } catch (error) {
    console.error('Error recording interaction:', error);
    res.status(500).json({ message: 'Failed to record interaction', error: error.message });
  }
});

// Record single interaction (alias for /interaction - supports plural form)
router.post('/interactions', async (req, res) => {
  try {
    const {
      sessionId,
      userId,
      eventType,
      eventName,
      pageURL,
      metadata,
    } = req.body;

    if (!sessionId || !eventType || !pageURL) {
      return res.status(400).json({
        message: 'sessionId, eventType, and pageURL are required',
      });
    }

    const interaction = new UserInteraction({
      sessionId,
      userId: userId || 'anonymous',
      projectId: req.body.projectId || 'default',
      eventType,
      eventName: eventName || eventType,
      pageURL,
      pageTitle: metadata?.pageTitle,
      referrer: metadata?.referrer,
      metadata: metadata || {},
    });

    await interaction.save();

    // Emit real-time event via Socket.IO if available
    if (global.io) {
      global.io.to(`project-${interaction.projectId}`).emit('interaction', {
        eventType,
        pageURL,
        timestamp: interaction.timestamp,
      });
    }

    res.json({ message: 'Interaction recorded', id: interaction._id });
  } catch (error) {
    console.error('Error recording interaction:', error);
    res.status(500).json({ message: 'Failed to record interaction', error: error.message });
  }
});

// Batch record interactions
router.post('/interactions/batch', async (req, res) => {
  try {
    const { interactions } = req.body;

    if (!interactions || !Array.isArray(interactions)) {
      return res.status(400).json({ message: 'interactions array is required' });
    }

    // Filter out admin paths and admin users
    const validInteractions = [];

    for (const i of interactions) {
      // Skip admin paths
      const url = (i.pageURL || '').toLowerCase();
      if (url.includes('/admin') || url.includes('/login')) {
        continue;
      }

      // Skip admin users
      if (i.userId && i.userId !== 'anonymous') {
        const user = await User.findById(i.userId).select('role');
        if (user && user.role === 'admin') {
          continue;
        }
      }

      validInteractions.push(i);
    }

    if (validInteractions.length === 0) {
      return res.status(200).json({ message: 'No valid interactions to record' });
    }

    const docs = validInteractions.map((i) => ({
      sessionId: i.sessionId,
      userId: i.userId || 'anonymous',
      projectId: i.projectId || 'default',
      eventType: i.eventType,
      eventName: i.eventName || i.eventType,
      pageURL: i.pageURL,
      pageTitle: i.metadata?.pageTitle,
      referrer: i.metadata?.referrer,
      metadata: i.metadata || {},
      timestamp: i.timestamp ? new Date(i.timestamp) : new Date(),
    }));

    await UserInteraction.insertMany(docs);

    res.json({ message: 'Interactions recorded', count: docs.length });
  } catch (error) {
    console.error('Error recording batch interactions:', error);
    res.status(500).json({ message: 'Failed to record interactions', error: error.message });
  }
});

// Get interaction summary
router.get('/interactions/summary', async (req, res) => {
  try {
    const { startDate, endDate, pageURL, eventType, groupBy = 'eventType' } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    if (pageURL) filter.pageURL = pageURL;
    if (eventType) filter.eventType = eventType;

    const summary = await UserInteraction.getSummary(filter, groupBy);

    res.json({ summary });
  } catch (error) {
    console.error('Error fetching interaction summary:', error);
    res.status(500).json({ message: 'Failed to fetch summary', error: error.message });
  }
});

// Get scroll depth distribution
router.get('/interactions/scroll-depth', async (req, res) => {
  try {
    const { pageURL, startDate, endDate } = req.query;

    if (!pageURL) {
      return res.status(400).json({ message: 'pageURL is required' });
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const distribution = await UserInteraction.getScrollDepthDistribution(pageURL, start, end);

    res.json({ distribution });
  } catch (error) {
    console.error('Error fetching scroll depth:', error);
    res.status(500).json({ message: 'Failed to fetch scroll depth', error: error.message });
  }
});

// Get top clicked elements
router.get('/interactions/top-clicks', async (req, res) => {
  try {
    const { pageURL, limit = 10 } = req.query;

    if (!pageURL) {
      return res.status(400).json({ message: 'pageURL is required' });
    }

    const topClicks = await UserInteraction.getTopClickedElements(pageURL, parseInt(limit));

    res.json({ topClicks });
  } catch (error) {
    console.error('Error fetching top clicks:', error);
    res.status(500).json({ message: 'Failed to fetch top clicks', error: error.message });
  }
});

// ===== HEATMAP ENDPOINTS =====

// Generate or retrieve heatmap data
router.get('/heatmap', async (req, res) => {
  try {
    const { pageURL, type = 'click', device, startDate, endDate, regenerate } = req.query;

    if (!pageURL) {
      return res.status(400).json({ message: 'pageURL is required' });
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Check if we need to regenerate or if cached version exists
    let heatmap = null;

    if (regenerate !== 'true') {
      heatmap = await HeatmapData.findOne({
        pageURL,
        type,
        device: device || 'unknown',
      }).sort({ createdAt: -1 });

      // Use cached if less than 1 hour old
      if (heatmap && (Date.now() - heatmap.createdAt) < 60 * 60 * 1000) {
        return res.json({ heatmapData: heatmap.points, metadata: heatmap.metadata });
      }
    }

    // Generate new heatmap from raw interactions
    heatmap = await HeatmapData.generateHeatmap(pageURL, type, start, end, device);

    res.json({ heatmapData: heatmap.points, metadata: heatmap.metadata });
  } catch (error) {
    console.error('Error generating heatmap:', error);
    res.status(500).json({ message: 'Failed to generate heatmap', error: error.message });
  }
});

// Get raw heatmap points (for custom visualization)
router.get('/heatmap/raw', async (req, res) => {
  try {
    const { pageURL, type = 'click', limit = 1000, startDate, endDate } = req.query;

    if (!pageURL) {
      return res.status(400).json({ message: 'pageURL is required' });
    }

    const filter = {
      pageURL,
      eventType: type,
    };

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const interactions = await UserInteraction.find(filter)
      .select('metadata.x metadata.y timestamp')
      .limit(parseInt(limit))
      .lean();

    const points = interactions
      .filter((i) => i.metadata && i.metadata.x !== undefined && i.metadata.y !== undefined)
      .map((i) => ({
        x: i.metadata.x,
        y: i.metadata.y,
        timestamp: i.timestamp,
      }));

    res.json({ points });
  } catch (error) {
    console.error('Error fetching raw heatmap data:', error);
    res.status(500).json({ message: 'Failed to fetch heatmap data', error: error.message });
  }
});

// ===== DATA MANAGEMENT ENDPOINTS =====

// Get analytics stats
router.get('/stats', async (req, res) => {
  try {
    const [sessionCount, interactionCount, heatmapCount] = await Promise.all([
      SessionRecording.countDocuments(),
      UserInteraction.countDocuments(),
      HeatmapData.countDocuments(),
    ]);

    res.json({
      sessions: sessionCount,
      interactions: interactionCount,
      heatmapData: heatmapCount,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
  }
});

// Get interactions with pagination
router.get('/interactions', async (req, res) => {
  try {
    const { limit = 100, skip = 0, userId } = req.query;

    const query = {};
    if (userId) query.userId = userId;

    const interactions = await UserInteraction.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    // Enrich interactions with user names
    const enrichedInteractions = await enrichWithUserNames(interactions);

    res.json(enrichedInteractions);
  } catch (error) {
    console.error('Error fetching interactions:', error);
    res.status(500).json({ message: 'Failed to fetch interactions', error: error.message });
  }
});

// Delete single interaction
router.delete('/interactions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await UserInteraction.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({ message: 'Interaction not found' });
    }

    res.json({ message: 'Interaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting interaction:', error);
    res.status(500).json({ message: 'Failed to delete interaction', error: error.message });
  }
});

// Delete single session
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await SessionRecording.findOneAndDelete({ sessionId });

    if (!result) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ message: 'Failed to delete session', error: error.message });
  }
});

// Flush all analytics data
router.delete('/flush-all', async (req, res) => {
  try {
    // Load all analytics models
    const Session = require('../models/Session');
    const PageView = require('../models/PageView');
    const UserEvent = require('../models/UserEvent');
    const EventAnalytics = require('../models/EventAnalytics');
    const PerformanceMetrics = require('../models/PerformanceMetrics');
    const Funnel = require('../models/Funnel');
    const Experiment = require('../models/Experiment');
    const Cohort = require('../models/Cohort');
    const FeatureFlag = require('../models/FeatureFlag');

    // Delete all analytics data from all models
    const results = await Promise.all([
      SessionRecording.deleteMany({}),
      UserInteraction.deleteMany({}),
      HeatmapData.deleteMany({}),
      Session.deleteMany({}),
      PageView.deleteMany({}),
      UserEvent.deleteMany({}),
      EventAnalytics.deleteMany({}),
      PerformanceMetrics.deleteMany({}),
      Funnel.deleteMany({}),
      Experiment.deleteMany({}),
      Cohort.deleteMany({}),
      FeatureFlag.deleteMany({}),
    ]);

    res.json({
      message: 'All analytics data has been deleted successfully',
      deleted: {
        sessionRecordings: results[0].deletedCount,
        interactions: results[1].deletedCount,
        heatmapData: results[2].deletedCount,
        sessions: results[3].deletedCount,
        pageViews: results[4].deletedCount,
        userEvents: results[5].deletedCount,
        eventAnalytics: results[6].deletedCount,
        performanceMetrics: results[7].deletedCount,
        funnels: results[8].deletedCount,
        experiments: results[9].deletedCount,
        cohorts: results[10].deletedCount,
        featureFlags: results[11].deletedCount,
      }
    });
  } catch (error) {
    console.error('Error flushing data:', error);
    res.status(500).json({ message: 'Failed to flush data', error: error.message });
  }
});

module.exports = router;

