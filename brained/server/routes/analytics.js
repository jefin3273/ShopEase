const express = require('express');
const router = express.Router();
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const EventAnalytics = require('../models/EventAnalytics');
const PerformanceMetrics = require('../models/PerformanceMetrics');
const posthog = require('../services/posthogClient');

// POST /api/analytics/events
router.post('/events', async (req, res) => {
  try {
    const { eventType, element, pageURL, timestamp, metadata } = req.body;
    // prefer deviceInfo from middleware (parsed UA) but allow client-supplied deviceInfo
    const deviceInfo = req.deviceInfo || req.body.deviceInfo;
    const doc = await EventAnalytics.create({ eventType, element, pageURL, timestamp, deviceInfo, metadata });
    // capture to PostHog (best-effort)
    try {
      const distinctId = req.userId || req.body.userId || req.ip || 'anonymous';
      posthog.capture(distinctId, eventType || 'event', { element, pageURL, timestamp, metadata, deviceInfo });
    } catch (e) {
      // swallow
    }
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
    const { pageURL, TTFB, LCP, FCP, CLS, jsErrors, timestamp } = req.body;
    const deviceInfo = req.deviceInfo || req.body.deviceInfo;
    const doc = await PerformanceMetrics.create({ pageURL, TTFB, LCP, FCP, CLS, jsErrors, timestamp, deviceInfo });
    try {
      const distinctId = req.userId || req.body.userId || req.ip || 'anonymous';
      posthog.capture(distinctId, 'performance', { pageURL, TTFB, LCP, FCP, CLS, jsErrors, timestamp, deviceInfo });
    } catch (e) {}
    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to save performance metrics' });
  }
});

// GET /api/analytics/events
router.get('/events', async (req, res) => {
  try {
    const items = await EventAnalytics.find().sort({ timestamp: -1 }).lean();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});

// GET /api/analytics/events/summary
router.get('/events/summary', async (req, res) => {
  try {
    // counts by event type
    const byType = await EventAnalytics.aggregate([
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $project: { _id: 0, eventType: '$_id', count: 1 } }
    ]);

    // counts by pageURL and eventType
    const byPageAndType = await EventAnalytics.aggregate([
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
    const items = await PerformanceMetrics.find().sort({ timestamp: -1 }).lean();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch performance metrics' });
  }
});

// GET /api/analytics/performance/summary
router.get('/performance/summary', async (req, res) => {
  try {
    // average metrics grouped by pageURL
    const agg = await PerformanceMetrics.aggregate([
      { $group: {
          _id: '$pageURL',
          avgTTFB: { $avg: '$TTFB' },
          avgLCP: { $avg: '$LCP' },
          avgFCP: { $avg: '$FCP' },
          avgCLS: { $avg: '$CLS' },
          count: { $sum: 1 }
      } },
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
