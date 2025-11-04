const express = require('express');
const router = express.Router();
const SessionRecording = require('../models/SessionRecording');
const HeatmapData = require('../models/HeatmapData');
const UserInteraction = require('../models/UserInteraction');

// ===== SESSION RECORDING ENDPOINTS =====

// Create or update session recording with rrweb events
router.post('/session', async (req, res) => {
  try {
    const { sessionId, userId, events, metadata } = req.body;

    if (!sessionId || !events || !Array.isArray(events)) {
      return res.status(400).json({ message: 'sessionId and events array are required' });
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
        device: metadata?.device || {},
        entryURL: metadata?.url || '',
        pagesVisited: metadata?.url ? [metadata?.url] : [],
      });
    }

    // Add events to session
    session.events.push(...events);

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
    const clickEvents = events.filter((e) => e.type === 'click').length;
    const scrollEvents = events.filter((e) => e.type === 'scroll').length;
    const inputEvents = events.filter((e) => e.type === 'input').length;

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

    res.json({
      sessions,
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

    res.json({ session });
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

    const docs = interactions.map((i) => ({
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

module.exports = router;
