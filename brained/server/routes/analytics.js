const express = require('express');
const router = express.Router();
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const EventAnalytics = require('../models/EventAnalytics');
const PerformanceMetrics = require('../models/PerformanceMetrics');
const SessionRecording = require('../models/SessionRecording');
const UserInteraction = require('../models/UserInteraction');
const analyticsService = require('../services/analyticsService');
const AppSettings = require('../models/AppSettings');
const { authenticate, authorize } = require('../controllers/authController');
const { enrichWithUserNames } = require('../utils/userEnricher');

// sanitize incoming metadata to avoid storing sensitive info
function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const SENSITIVE_KEYS = ['password', 'pwd', 'creditcard', 'cc', 'ssn', 'token', 'auth', 'authorization', 'value'];
  const out = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    if (SENSITIVE_KEYS.includes(k.toLowerCase())) continue;
    const v = obj[k];
    out[k] = typeof v === 'object' ? sanitize(v) : v;
  }
  return out;
}

// POST /api/analytics/events
router.post('/events', async (req, res) => {
  try {
    const { eventType, element, pageURL, timestamp, metadata, sessionId, userId } = req.body;
    // prefer deviceInfo from middleware (parsed UA) but allow client-supplied deviceInfo
    const deviceInfo = req.deviceInfo || req.body.deviceInfo;
    const cleanMeta = sanitize(metadata || {});

    // Save to EventAnalytics (legacy model)
    const doc = await EventAnalytics.create({ eventType, element, pageURL, timestamp, deviceInfo, metadata: cleanMeta });

    // Also capture to our custom analytics service
    const distinctId = userId || req.userId || req.ip || 'anonymous';
    analyticsService.captureEvent(distinctId, sessionId, {
      eventType,
      eventName: eventType,
      pageURL,
      metadata: cleanMeta,
      device: deviceInfo,
      projectId: 'default',
    }).catch(e => console.error('Analytics service error:', e));

    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to save event' });
  }
});

// GET /api/analytics/seed
// Creates sample documents for testing DB connectivity and data flow
router.get('/seed', async (req, res) => {
  try {
    // sample event documents
    const sampleEvents = [
      {
        eventType: 'click',
        element: '#signup',
        pageURL: 'https://example.com/signup',
        metadata: { source: 'test-seed' },
        deviceInfo: req.deviceInfo || { device: 'desktop', browser: 'Chrome', os: 'Windows' }
      },
      {
        eventType: 'scroll',
        element: 'body',
        pageURL: 'https://example.com',
        metadata: { percent: 75 },
        deviceInfo: req.deviceInfo || { device: 'mobile', browser: 'Safari', os: 'iOS' }
      }
    ];

    const createdEvents = await EventAnalytics.insertMany(sampleEvents);

    // sample performance documents
    const samplePerfs = [
      {
        pageURL: 'https://example.com',
        TTFB: 120,
        LCP: 1500,
        FCP: 600,
        CLS: 0.02,
        jsErrors: [],
        deviceInfo: req.deviceInfo || { device: 'desktop', browser: 'Chrome', os: 'Windows' }
      },
      {
        pageURL: 'https://example.com/signup',
        TTFB: 140,
        LCP: 1800,
        FCP: 700,
        CLS: 0.01,
        jsErrors: [{ message: 'TestError', stack: 'seed' }],
        deviceInfo: req.deviceInfo || { device: 'mobile', browser: 'Safari', os: 'iOS' }
      }
    ];

    const createdPerfs = await PerformanceMetrics.insertMany(samplePerfs);

    res.json({ createdEventsCount: createdEvents.length, createdPerfsCount: createdPerfs.length, createdEvents, createdPerfs });
  } catch (err) {
    console.error('Seed error', err);
    res.status(500).json({ message: 'Failed to seed sample data', error: err.message });
  }
});

// POST /api/analytics/performance
router.post('/performance', async (req, res) => {
  try {
    const { pageURL, TTFB, LCP, FCP, CLS, jsErrors, timestamp, sessionId } = req.body;
    const deviceInfo = req.deviceInfo || req.body.deviceInfo;
    const doc = await PerformanceMetrics.create({ pageURL, TTFB, LCP, FCP, CLS, jsErrors, timestamp, deviceInfo });

    // Track performance metrics with custom analytics
    const userId = req.userId || req.body.userId || 'anonymous';
    await analyticsService.captureEvent(userId, sessionId, {
      eventType: 'performance',
      eventName: 'performance_metrics',
      pageURL,
      metadata: {
        TTFB,
        LCP,
        FCP,
        CLS,
        jsErrors,
        timestamp
      }
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to save performance metrics' });
  }
});

// POST /api/analytics/track
// Accepts either a single event or { events: [...] } and stores in UserInteraction
router.post('/track', async (req, res) => {
  try {
    const payload = req.body?.events && Array.isArray(req.body.events) ? req.body.events : [req.body];

    const docs = payload
      .filter(Boolean)
      .map((i) => ({
        sessionId: i.sessionId,
        userId: i.userId || 'anonymous',
        projectId: i.projectId || 'default',
        eventType: i.eventType || i.event || 'custom',
        eventName: i.eventName || i.eventType || i.event || 'custom',
        pageURL: i.pageURL || i.url,
        pageTitle: i.metadata?.pageTitle,
        referrer: i.metadata?.referrer,
        metadata: sanitize(i.metadata || i.properties || {}),
        timestamp: i.timestamp ? new Date(i.timestamp) : new Date(),
      }));

    if (docs.length === 0) {
      return res.status(400).json({ message: 'No events to track' });
    }

    await UserInteraction.insertMany(docs);
    res.json({ message: 'Tracked', count: docs.length });
  } catch (err) {
    console.error('Error in /analytics/track:', err);
    res.status(500).json({ message: 'Failed to track events' });
  }
});

// POST /api/analytics/session
// Alias for recording rrweb session chunks
router.post('/session', async (req, res) => {
  try {
    const { sessionId, userId, events, consoleLogs, networkRequests, metadata, projectId } = req.body;

    if (!sessionId || !events || !Array.isArray(events)) {
      return res.status(400).json({ message: 'sessionId and events array are required' });
    }

    let session = await SessionRecording.findOne({ sessionId });
    if (!session) {
      session = new SessionRecording({
        sessionId,
        userId: userId || 'anonymous',
        projectId: projectId || 'default',
        startTime: new Date(),
        events: [],
        consoleLogs: [],
        networkRequests: [],
        device: metadata?.device || {},
        entryURL: metadata?.url || '',
        pagesVisited: metadata?.url ? [metadata?.url] : [],
      });
    }

    session.events.push(...events);
    if (consoleLogs && Array.isArray(consoleLogs)) session.consoleLogs.push(...consoleLogs);
    if (networkRequests && Array.isArray(networkRequests)) session.networkRequests.push(...networkRequests);

    if (metadata) {
      if (metadata.url && !session.pagesVisited.includes(metadata.url)) {
        session.pagesVisited.push(metadata.url);
        session.exitURL = metadata.url;
      }
      if (metadata.device) session.device = { ...session.device, ...metadata.device };
    }

    // Update basic stats
    session.stats = session.stats || {};
    session.stats.totalEvents = (session.stats.totalEvents || 0) + events.length;

    await session.save();
    res.json({ message: 'Session events recorded', sessionId: session.sessionId });
  } catch (err) {
    console.error('Error in /analytics/session:', err);
    res.status(500).json({ message: 'Failed to record session' });
  }
});

// GET /api/analytics/dashboard
// Returns aggregated stats for admin
router.get('/dashboard', async (req, res) => {
  try {
    const [sessions, interactions, heatmapData] = await Promise.all([
      SessionRecording.countDocuments(),
      UserInteraction.countDocuments(),
      require('../models/HeatmapData').countDocuments(),
    ]);

    // Events by type (last 7 days)
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const byType = await UserInteraction.aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $project: { _id: 0, eventType: '$_id', count: 1 } },
      { $sort: { count: -1 } },
    ]);

    res.json({ stats: { sessions, interactions, heatmapData }, byType });
  } catch (err) {
    console.error('Error in /analytics/dashboard:', err);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
});

// GET /api/analytics/events (supports ?from=ISO&to=ISO&pageURL=/path)
router.get('/events', async (req, res) => {
  try {
    const { from, to, pageURL } = req.query;
    const query = {};
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }
    if (pageURL) query.pageURL = pageURL;
    const items = await EventAnalytics.find(query).sort({ timestamp: -1 }).lean();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});

// GET /api/analytics/events/summary
router.get('/events/summary', async (req, res) => {
  try {
    const { from, to, pageURL } = req.query;
    const match = {};
    if (from || to) {
      match.timestamp = {};
      if (from) match.timestamp.$gte = new Date(from);
      if (to) match.timestamp.$lte = new Date(to);
    }
    if (pageURL) match.pageURL = pageURL;
    // counts by event type
    const byType = await EventAnalytics.aggregate([
      { $match: match },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $project: { _id: 0, eventType: '$_id', count: 1 } }
    ]);

    // counts by pageURL and eventType
    const byPageAndType = await EventAnalytics.aggregate([
      { $match: match },
      { $group: { _id: { pageURL: '$pageURL', eventType: '$eventType' }, count: { $sum: 1 } } },
      { $project: { _id: 0, pageURL: '$_id.pageURL', eventType: '$_id.eventType', count: 1 } }
    ]);

    res.json({ byType, byPageAndType });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to compute event summaries' });
  }
});

// GET /api/analytics/performance
router.get('/performance', async (req, res) => {
  try {
    const { from, to, pageURL } = req.query;
    const query = {};
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }
    if (pageURL) query.pageURL = pageURL;
    const items = await PerformanceMetrics.find(query).sort({ timestamp: -1 }).lean();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch performance metrics' });
  }
});

// GET /api/analytics/performance/summary
router.get('/performance/summary', async (req, res) => {
  try {
    const { from, to, pageURL } = req.query;
    const match = {};
    if (from || to) {
      match.timestamp = {};
      if (from) match.timestamp.$gte = new Date(from);
      if (to) match.timestamp.$lte = new Date(to);
    }
    if (pageURL) match.pageURL = pageURL;
    // average metrics grouped by pageURL
    const agg = await PerformanceMetrics.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$pageURL',
          avgTTFB: { $avg: '$TTFB' },
          avgLCP: { $avg: '$LCP' },
          avgFCP: { $avg: '$FCP' },
          avgCLS: { $avg: '$CLS' },
          count: { $sum: 1 }
        }
      },
      { $project: { _id: 0, pageURL: '$_id', avgTTFB: 1, avgLCP: 1, avgFCP: 1, avgCLS: 1, count: 1 } },
      { $sort: { count: -1 } }
    ]);

    res.json(agg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to compute performance summaries' });
  }
});

// GET /api/analytics/export/csv
router.get('/export/csv', async (req, res) => {
  try {
    // Combine both collections into one CSV with a type column
    const events = await EventAnalytics.find().lean();
    const perfs = await PerformanceMetrics.find().lean();

    const normalizedEvents = events.map((e) => ({
      type: 'event',
      eventType: e.eventType,
      element: e.element,
      pageURL: e.pageURL,
      timestamp: e.timestamp,
      deviceInfo: JSON.stringify(e.deviceInfo || {}),
      metadata: JSON.stringify(e.metadata || {})
    }));

    const normalizedPerfs = perfs.map((p) => ({
      type: 'performance',
      pageURL: p.pageURL,
      TTFB: p.TTFB,
      LCP: p.LCP,
      FCP: p.FCP,
      CLS: p.CLS,
      jsErrors: JSON.stringify(p.jsErrors || []),
      timestamp: p.timestamp,
      deviceInfo: JSON.stringify(p.deviceInfo || {})
    }));

    const all = [...normalizedEvents, ...normalizedPerfs];

    const fields = Object.keys(all[0] || {});
    const parser = new Parser({ fields });
    const csv = parser.parse(all);

    res.header('Content-Type', 'text/csv');
    res.attachment('analytics.csv');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to export CSV' });
  }
});

// GET /api/analytics/export/pdf
router.get('/export/pdf', async (req, res) => {
  try {
    const events = await EventAnalytics.find().limit(500).sort({ timestamp: -1 }).lean();
    const perfs = await PerformanceMetrics.find().limit(500).sort({ timestamp: -1 }).lean();

    const doc = new PDFDocument({ autoFirstPage: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=analytics.pdf');
    doc.pipe(res);

    doc.fontSize(18).text('Analytics Export', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text('Events', { underline: true });
    doc.moveDown(0.5);
    events.forEach((e) => {
      doc.fontSize(10).text(`Type: ${e.eventType} | Element: ${e.element || '-'} | Page: ${e.pageURL || '-'} | Time: ${e.timestamp}`);
      doc.fontSize(9).text(`Device: ${JSON.stringify(e.deviceInfo || {})}`);
      if (e.metadata) doc.fontSize(9).text(`Metadata: ${JSON.stringify(e.metadata)}`);
      doc.moveDown(0.5);
    });

    doc.addPage();
    doc.fontSize(14).text('Performance Metrics', { underline: true });
    doc.moveDown(0.5);
    perfs.forEach((p) => {
      doc.fontSize(10).text(`Page: ${p.pageURL} | TTFB: ${p.TTFB} | LCP: ${p.LCP} | FCP: ${p.FCP} | CLS: ${p.CLS} | Time: ${p.timestamp}`);
      doc.fontSize(9).text(`Device: ${JSON.stringify(p.deviceInfo || {})}`);
      if (p.jsErrors && p.jsErrors.length) doc.fontSize(9).text(`JS Errors: ${JSON.stringify(p.jsErrors)}`);
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to export PDF' });
  }
});

// POST /api/analytics/recording-events - Capture recording events
router.post('/recording-events', async (req, res) => {
  try {
    const { sessionId, events } = req.body;
    if (!sessionId || !events || !Array.isArray(events)) {
      return res.status(400).json({ message: 'sessionId and events array required' });
    }

    // Add events to session recording
    for (const event of events) {
      await analyticsService.captureRecordingEvent(sessionId, event);
    }

    res.json({ success: true, eventsProcessed: events.length });
  } catch (err) {
    console.error('Failed to capture recording events', err);
    res.status(500).json({ message: 'Failed to capture recording events' });
  }
});

// POST /api/analytics/snapshot - Capture DOM snapshot
router.post('/snapshot', async (req, res) => {
  try {
    const { sessionId, snapshot } = req.body;
    if (!sessionId || !snapshot) {
      return res.status(400).json({ message: 'sessionId and snapshot required' });
    }

    await analyticsService.addSnapshot(sessionId, snapshot);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to capture snapshot', err);
    res.status(500).json({ message: 'Failed to capture snapshot' });
  }
});

// POST /api/analytics/console - Capture console log
router.post('/console', async (req, res) => {
  try {
    const { sessionId, log } = req.body;
    if (!sessionId || !log) {
      return res.status(400).json({ message: 'sessionId and log required' });
    }

    await analyticsService.addConsoleLog(sessionId, log);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to capture console log', err);
    res.status(500).json({ message: 'Failed to capture console log' });
  }
});

// POST /api/analytics/identify - Identify user
router.post('/identify', async (req, res) => {
  try {
    const { userId, properties } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'userId required' });
    }

    await analyticsService.identifyUser(userId, properties);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to identify user', err);
    res.status(500).json({ message: 'Failed to identify user' });
  }
});

// GET /api/analytics/recordings - List session recordings
router.get('/recordings', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { projectId = 'default', limit = 50, hasErrors, userId } = req.query;

    const options = {
      limit: parseInt(limit),
      hasErrors: hasErrors === 'true',
      userId: userId || undefined
    };

    const recordings = await analyticsService.listRecordings(projectId, options);

    // Enrich recordings with user names
    const enrichedRecordings = await enrichWithUserNames(recordings);

    res.json({ recordings: enrichedRecordings });
  } catch (err) {
    console.error('Failed to list recordings', err);
    res.status(500).json({ message: 'Failed to list recordings' });
  }
});

// GET /api/analytics/recordings/:sessionId - Get session recording
router.get('/recordings/:sessionId', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const recording = await analyticsService.getSessionRecording(sessionId);

    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }

    // Enrich recording with user name
    const enrichedRecording = (await enrichWithUserNames([recording]))[0];

    res.json({ recording: enrichedRecording });
  } catch (err) {
    console.error('Failed to get recording', err);
    res.status(500).json({ message: 'Failed to get recording' });
  }
});

// GET /api/analytics/heatmap - Get heatmap data
router.get('/heatmap', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { projectId = 'default', pageURL, eventType = 'click' } = req.query;

    if (!pageURL) {
      return res.status(400).json({ message: 'pageURL required' });
    }

    const heatmapData = await analyticsService.getHeatmapData(projectId, pageURL, eventType);
    res.json({ heatmapData });
  } catch (err) {
    console.error('Failed to get heatmap data', err);
    res.status(500).json({ message: 'Failed to get heatmap data' });
  }
});

module.exports = router;

// Integration endpoints (stubs) for external analytics tools
// POST /api/analytics/integrations/hotjar
router.post('/integrations/hotjar', async (req, res) => {
  // In a real integration you'd forward events to Hotjar API or trigger a script.
  console.log('Hotjar integration stub received', req.body);
  res.json({ message: 'Hotjar stub received' });
});

// POST /api/analytics/integrations/mixpanel
router.post('/integrations/mixpanel', async (req, res) => {
  console.log('Mixpanel integration stub received', req.body);
  res.json({ message: 'Mixpanel stub received' });
});

// POST /api/analytics/integrations/custom
router.post('/integrations/custom', async (req, res) => {
  // Allow consumers to register or forward events to custom listeners.
  console.log('Custom integration stub received', req.body);
  res.json({ message: 'Custom integration stub received' });
});

// Global recording toggle
router.get('/recording', async (req, res) => {
  try {
    const doc = await AppSettings.findOne({ key: 'global' });
    res.json({ enabled: !!(doc && doc.recordingEnabled) });
  } catch (e) {
    res.status(500).json({ message: 'Failed to get recording flag' });
  }
});

router.post('/recording', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { enabled } = req.body;
    const doc = await AppSettings.findOneAndUpdate(
      { key: 'global' },
      { $set: { recordingEnabled: !!enabled } },
      { upsert: true, new: true }
    );
    res.json({ enabled: doc.recordingEnabled });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to set recording flag' });
  }
});
