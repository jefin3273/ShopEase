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
    const { sessionId, userId, packedEvents, consoleLogs, networkRequests, metadata } = req.body;

    console.log('[/session] Received request:', { sessionId, userId, hasPacked: !!packedEvents });

    if (!sessionId) {
      return res.status(400).json({ message: 'sessionId is required' });
    }

    if (!packedEvents || typeof packedEvents !== 'string' || packedEvents.length === 0) {
      return res.status(400).json({ message: 'packedEvents string is required and must not be empty' });
    }

    console.log('[/session] Packed events validated. Length:', packedEvents.length);

    // Note: We don't block admin paths for manual recordings
    // Admin users may want to record their own sessions for testing

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
        metadata: metadata || {},
        entryURL: metadata?.url || '',
        pagesVisited: metadata?.url ? [metadata?.url] : [],
      });
    }

    // Store packed events as a single compressed string
    // The events array will contain the packed string
    session.events.push(packedEvents);

    // Add console logs
    if (consoleLogs && Array.isArray(consoleLogs)) {
      session.consoleLogs.push(...consoleLogs);
    }

    // Add network requests
    if (networkRequests && Array.isArray(networkRequests)) {
      try {
        session.networkRequests.push(...networkRequests);
      } catch (err) {
        console.error('[/session] Error pushing network requests:', err.message);
        console.error('[/session] Sample request:', networkRequests[0]);
      }
    }

    // Update metadata
    if (metadata) {
      if (metadata.url && !session.pagesVisited.includes(metadata.url)) {
        session.pagesVisited.push(metadata.url);
        session.exitURL = metadata.url;
      }
      if (metadata.device) {
        session.device = { ...session.device, ...metadata.device };
        session.metadata = metadata;
      }
    }

    // Update stats - for packed events we just count the chunks
    session.stats = session.stats || {};
    session.stats.totalEvents = (session.stats.totalEvents || 0) + 1; // Count each packed chunk
    session.stats.lastUpdated = new Date();

    await session.save();

    res.json({
      message: 'Session events recorded',
      sessionId: session.sessionId,
      packedChunksAdded: 1,
      totalChunks: session.events.length
    });
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
      console.log('[/complete] Session not found, might have been a short recording:', sessionId);
      return res.status(200).json({ message: 'Session not found or already completed' });
    }

    session.isComplete = true;
    session.endTime = new Date();

    if (session.startTime) {
      session.duration = Math.floor((session.endTime - session.startTime) / 1000); // seconds
    }

    await session.save();

    console.log('[/complete] Session marked complete:', sessionId);
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
      urlContains,
      minDuration,
      device,
      hasRage, // expensive filter, optional
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

    if (urlContains) {
      query.pagesVisited = { $elemMatch: { $regex: urlContains, $options: 'i' } };
    }
    if (minDuration) {
      query.duration = { $gte: parseInt(minDuration, 10) };
    }
    if (device) {
      // device can be deviceType or browser/os; support deviceType primary
      query['device.deviceType'] = device;
    }

    let sessions = await SessionRecording.find(query)
      .sort({ startTime: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-events') // Exclude large events array from list
      .lean();

    let total = await SessionRecording.countDocuments(query);

    // Optional hasRage post-filter using UserInteraction heuristic
    if (hasRage !== undefined) {
      const desired = hasRage === 'true';
      if (sessions.length > 0) {
        const sessionIds = sessions.map(s => s.sessionId);
        const clicks = await UserInteraction.find({ sessionId: { $in: sessionIds }, eventType: 'click' })
          .select('sessionId timestamp metadata.element metadata.elementId metadata.className')
          .sort({ sessionId: 1, timestamp: 1 })
          .lean();
        // Group by session + selector sig
        const bySession = new Map();
        const sigFor = (m) => (
          (m?.elementId && `#${m.elementId}`) ||
          (typeof m?.className === 'string' && `.${m.className.split(' ').slice(0, 2).join('.')}`) ||
          (m?.element && String(m.element).toLowerCase()) ||
          'unknown'
        );
        for (const c of clicks) {
          const arr = bySession.get(c.sessionId) || [];
          arr.push(c);
          bySession.set(c.sessionId, arr);
        }
        const rageSessions = new Set();
        bySession.forEach((arr, sid) => {
          // sliding window within 3s with same selector count>=3
          let i = 0;
          for (let j = 0; j < arr.length; j++) {
            const tj = new Date(arr[j].timestamp).getTime();
            while (i < j && tj - new Date(arr[i].timestamp).getTime() > 3000) i++;
            // check selector uniformity in window
            const windowArr = arr.slice(i, j + 1);
            const bySel = new Map();
            windowArr.forEach(ev => {
              const s = sigFor(ev.metadata || {});
              bySel.set(s, (bySel.get(s) || 0) + 1);
            });
            if ([...bySel.values()].some(cnt => cnt >= 3)) {
              rageSessions.add(sid);
              break;
            }
          }
        });
        sessions = sessions.filter(s => desired ? rageSessions.has(s.sessionId) : !rageSessions.has(s.sessionId));
        total = sessions.length; // in-page total after filter
      }
    }

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

// Get available pages with session data
router.get('/sessions/pages/available', async (req, res) => {
  try {
    // Get distinct pages from sessions that have events
    const pages = await SessionRecording.distinct('entryURL', {
      events: { $exists: true, $ne: [] }
    });

    // Get session counts per page
    const pagesWithCounts = await Promise.all(
      pages.map(async (pageURL) => {
        const count = await SessionRecording.countDocuments({
          entryURL: pageURL,
          events: { $exists: true, $ne: [] }
        });

        // Get heatmap data counts
        const heatmapCounts = await HeatmapData.aggregate([
          { $match: { pageURL } },
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]);

        const heatmapTypes = {};
        heatmapCounts.forEach(item => {
          heatmapTypes[item._id] = item.count;
        });

        return {
          pageURL,
          sessionCount: count,
          heatmapTypes,
          hasData: count > 0
        };
      })
    );

    // Sort by session count descending
    pagesWithCounts.sort((a, b) => b.sessionCount - a.sessionCount);

    res.json({
      pages: pagesWithCounts,
      total: pagesWithCounts.length
    });
  } catch (error) {
    console.error('Error fetching available pages:', error);
    res.status(500).json({ message: 'Failed to fetch available pages', error: error.message });
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

// Attention map endpoint - aggregates attention by vertical viewport bands using scroll + click presence
// GET /api/tracking/interactions/attention?pageURL&startDate&endDate&bands=8
router.get('/interactions/attention', async (req, res) => {
  try {
    const { pageURL, startDate, endDate, bands = 8 } = req.query;
    if (!pageURL) {
      return res.status(400).json({ message: 'pageURL is required' });
    }
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Fetch relevant interactions (scroll + click) for the page
    const match = { pageURL, timestamp: { $gte: start, $lte: end }, eventType: { $in: ['scroll', 'click'] } };
    const docs = await UserInteraction.find(match)
      .select('eventType timestamp metadata.scrollDepth metadata.vh metadata.y')
      .lean();

    // If no viewport relative position recorded for clicks, try to derive bands from scroll depth only
    const totalBands = parseInt(bands, 10) || 8;
    const bandSize = 100 / totalBands; // each band covers this % of viewport height
    const bandStats = Array.from({ length: totalBands }, (_, i) => ({
      index: i,
      from: Math.round(i * bandSize),
      to: Math.round((i + 1) * bandSize),
      scrollHits: 0,
      clickHits: 0,
      sessions: new Set(),
      firstSeen: null,
      lastSeen: null,
    }));

    // Aggregate
    for (const d of docs) {
      let pct = null;
      if (d.eventType === 'scroll' && typeof d.metadata?.scrollDepth === 'number') {
        pct = d.metadata.scrollDepth; // scrollDepth already 0-100
      } else if (d.eventType === 'click') {
        // vh metadata: percent of viewport height where click occurred
        if (typeof d.metadata?.vh === 'number') pct = d.metadata.vh;
        else if (typeof d.metadata?.y === 'number' && typeof window === 'undefined') {
          // server side can't derive viewport percent without client height; ignore
        }
      }
      if (pct == null) continue;
      const bandIndex = Math.min(totalBands - 1, Math.max(0, Math.floor(pct / bandSize)));
      const band = bandStats[bandIndex];
      if (d.eventType === 'scroll') band.scrollHits += 1; else band.clickHits += 1;
      // Use timestamp window for attention timeframe
      if (!band.firstSeen || new Date(d.timestamp) < band.firstSeen) band.firstSeen = new Date(d.timestamp);
      if (!band.lastSeen || new Date(d.timestamp) > band.lastSeen) band.lastSeen = new Date(d.timestamp);
    }

    // Compute composite attention score (weight scroll + clicks)
    const maxScroll = Math.max(1, ...bandStats.map(b => b.scrollHits));
    const maxClicks = Math.max(1, ...bandStats.map(b => b.clickHits));
    const buckets = bandStats.map(b => {
      const score = (b.scrollHits / maxScroll) * 0.6 + (b.clickHits / maxClicks) * 0.4; // weighted formula
      return {
        label: `${b.from}-${b.to}%`,
        value: parseFloat(score.toFixed(3)),
        scrollHits: b.scrollHits,
        clickHits: b.clickHits,
        firstSeen: b.firstSeen,
        lastSeen: b.lastSeen,
      };
    });

    // Below-the-fold detection: percent of interactions occurring after 50%
    const belowFoldScroll = bandStats.filter(b => b.from >= 50).reduce((s, b) => s + b.scrollHits, 0);
    const totalScroll = bandStats.reduce((s, b) => s + b.scrollHits, 0);
    const belowFoldClicks = bandStats.filter(b => b.from >= 50).reduce((s, b) => s + b.clickHits, 0);
    const totalClicks = bandStats.reduce((s, b) => s + b.clickHits, 0);
    const belowTheFold = {
      scrollPercent: totalScroll ? parseFloat(((belowFoldScroll / totalScroll) * 100).toFixed(2)) : 0,
      clickPercent: totalClicks ? parseFloat(((belowFoldClicks / totalClicks) * 100).toFixed(2)) : 0,
    };

    res.json({ buckets, belowTheFold, totalScrollEvents: totalScroll, totalClickEvents: totalClicks });
  } catch (error) {
    console.error('Error computing attention map:', error);
    res.status(500).json({ message: 'Failed to compute attention map', error: error.message });
  }
});

// Detect rage clicks (rapid repeated clicks on the same element)
// GET /api/tracking/interactions/rage-clicks?startDate&endDate&pageURL&threshold=3&windowMs=3000&limit=50
router.get('/interactions/rage-clicks', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      pageURL,
      threshold = 3,
      windowMs = 3000,
      limit = 50,
    } = req.query;

    const match = { eventType: 'click' };
    if (pageURL) match.pageURL = pageURL;
    if (startDate || endDate) {
      match.timestamp = {};
      if (startDate) match.timestamp.$gte = new Date(startDate);
      if (endDate) match.timestamp.$lte = new Date(endDate);
    }

    const clicks = await UserInteraction.find(match)
      .select('sessionId pageURL timestamp metadata.element metadata.elementId metadata.className metadata.text metadata.x metadata.y')
      .sort({ sessionId: 1, pageURL: 1, 'metadata.elementId': 1, timestamp: 1 })
      .lean();

    const t = parseInt(threshold, 10) || 3;
    const w = parseInt(windowMs, 10) || 3000;
    const maxItems = parseInt(limit, 10) || 50;

    // Group by session + element signature
    const groups = new Map();
    const sigFor = (m) => {
      return (
        (m?.elementId && `#${m.elementId}`) ||
        (typeof m?.className === 'string' && `.${m.className.split(' ').slice(0, 2).join('.')}`) ||
        (m?.element && String(m.element).toLowerCase()) ||
        'unknown'
      );
    };

    for (const c of clicks) {
      const sig = sigFor(c.metadata || {});
      const key = `${c.sessionId}|${c.pageURL}|${sig}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }

    // Detect rapid sequences within window
    const incidents = [];
    groups.forEach((arr, key) => {
      let i = 0;
      for (let j = 0; j < arr.length; j++) {
        const tj = new Date(arr[j].timestamp).getTime();
        while (i < j && tj - new Date(arr[i].timestamp).getTime() > w) i++;
        const count = j - i + 1;
        if (count >= t) {
          const slice = arr.slice(i, j + 1);
          const avgX = Math.round(
            slice.reduce((s, it) => s + (it.metadata?.x ?? 0), 0) / slice.length
          );
          const avgY = Math.round(
            slice.reduce((s, it) => s + (it.metadata?.y ?? 0), 0) / slice.length
          );
          const [sessionId, pageURL, selector] = key.split('|');
          incidents.push({
            sessionId,
            pageURL,
            selector,
            count,
            firstTimestamp: slice[0].timestamp,
            lastTimestamp: slice[slice.length - 1].timestamp,
            position: { x: avgX, y: avgY },
            sampleText: slice.find(s => s.metadata?.text)?.metadata?.text?.slice(0, 60) || null,
          });
          // advance window to avoid duplicate overlapping detections
          i = j + 1;
        }
      }
    });

    // Aggregate by pageURL + selector
    const bySpot = new Map();
    for (const inc of incidents) {
      const k = `${inc.pageURL}|${inc.selector}`;
      const cur = bySpot.get(k) || {
        pageURL: inc.pageURL,
        selector: inc.selector,
        incidents: 0,
        totalClicksInIncidents: 0,
        sessions: new Set(),
        firstSeen: inc.firstTimestamp,
        lastSeen: inc.lastTimestamp,
        samplePosition: inc.position,
        sampleText: inc.sampleText,
      };
      cur.incidents += 1;
      cur.totalClicksInIncidents += inc.count;
      cur.sessions.add(inc.sessionId);
      cur.firstSeen = new Date(Math.min(new Date(cur.firstSeen).getTime(), new Date(inc.firstTimestamp).getTime()));
      cur.lastSeen = new Date(Math.max(new Date(cur.lastSeen).getTime(), new Date(inc.lastTimestamp).getTime()));
      bySpot.set(k, cur);
    }

    const items = Array.from(bySpot.values())
      .map(v => ({
        ...v,
        sessions: Array.from(v.sessions),
      }))
      .sort((a, b) => b.incidents - a.incidents || b.totalClicksInIncidents - a.totalClicksInIncidents)
      .slice(0, maxItems);

    res.json({ items, totalIncidents: incidents.length });
  } catch (error) {
    console.error('Error detecting rage clicks:', error);
    res.status(500).json({ message: 'Failed to detect rage clicks', error: error.message });
  }
});

// Detect dead clicks (clicks with no meaningful follow-up action within a short window)
// GET /api/tracking/interactions/dead-clicks?startDate&endDate&pageURL&idleMs=2000&limit=50
router.get('/interactions/dead-clicks', async (req, res) => {
  try {
    const { startDate, endDate, pageURL, idleMs = 2000, limit = 50 } = req.query;
    const w = parseInt(idleMs, 10) || 2000;
    const maxItems = parseInt(limit, 10) || 50;

    const match = {};
    if (startDate || endDate) {
      match.timestamp = {};
      if (startDate) match.timestamp.$gte = new Date(startDate);
      if (endDate) match.timestamp.$lte = new Date(endDate);
    }
    if (pageURL) match.pageURL = pageURL;

    const interactions = await UserInteraction.find(match)
      .select('sessionId pageURL eventType timestamp metadata.element metadata.elementId metadata.className metadata.text')
      .sort({ sessionId: 1, timestamp: 1 })
      .lean();

    // Group by session
    const bySession = new Map();
    for (const ev of interactions) {
      const arr = bySession.get(ev.sessionId) || [];
      arr.push(ev);
      bySession.set(ev.sessionId, arr);
    }

    const results = [];
    const selectorOf = (m) => (
      (m?.elementId && `#${m.elementId}`) ||
      (typeof m?.className === 'string' && `.${m.className.split(' ').slice(0, 2).join('.')}`) ||
      (m?.element && String(m.element).toLowerCase()) ||
      'unknown'
    );

    bySession.forEach((events) => {
      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        if (ev.eventType !== 'click') continue;
        const t0 = new Date(ev.timestamp).getTime();
        let meaningful = false;
        let j = i + 1;
        for (; j < events.length; j++) {
          const e = events[j];
          const tj = new Date(e.timestamp).getTime();
          if (tj - t0 > w) break;
          // Any navigation or submit within window marks as meaningful
          if (e.eventType === 'pageview' || e.eventType === 'submit') {
            meaningful = true; break;
          }
          // If user clicked a different element within window, consider not-dead (user progressed)
          if (e.eventType === 'click') {
            const s0 = selectorOf(ev.metadata || {});
            const s1 = selectorOf(e.metadata || {});
            if (s0 !== s1) { meaningful = true; break; }
          }
          // Custom metadata action markers
          if (e.metadata?.action && /navigate|open|success/i.test(String(e.metadata.action))) {
            meaningful = true; break;
          }
        }
        if (!meaningful) {
          results.push({
            sessionId: ev.sessionId,
            pageURL: ev.pageURL,
            selector: selectorOf(ev.metadata || {}),
            timestamp: ev.timestamp,
            sampleText: ev.metadata?.text?.slice(0, 60) || null,
          });
        }
      }
    });

    // Aggregate by pageURL + selector
    const bySpot = new Map();
    for (const r of results) {
      const k = `${r.pageURL}|${r.selector}`;
      const cur = bySpot.get(k) || {
        pageURL: r.pageURL,
        selector: r.selector,
        deadClicks: 0,
        sessions: new Set(),
        firstSeen: r.timestamp,
        lastSeen: r.timestamp,
        sampleText: r.sampleText,
      };
      cur.deadClicks += 1;
      cur.sessions.add(r.sessionId);
      cur.firstSeen = new Date(Math.min(new Date(cur.firstSeen).getTime(), new Date(r.timestamp).getTime()));
      cur.lastSeen = new Date(Math.max(new Date(cur.lastSeen).getTime(), new Date(r.timestamp).getTime()));
      bySpot.set(k, cur);
    }

    const items = Array.from(bySpot.values())
      .map(v => ({ ...v, sessions: Array.from(v.sessions) }))
      .sort((a, b) => b.deadClicks - a.deadClicks)
      .slice(0, maxItems);

    res.json({ items, totalDeadClicks: results.length });
  } catch (error) {
    console.error('Error detecting dead clicks:', error);
    res.status(500).json({ message: 'Failed to detect dead clicks', error: error.message });
  }
});

// ===== HEATMAP ENDPOINTS =====

// Generate or retrieve heatmap data
router.get('/heatmap', async (req, res) => {
  try {
    const { pageURL, type = 'click', device, startDate, endDate, regenerate, pattern } = req.query;

    if (!pageURL) {
      return res.status(400).json({ message: 'pageURL is required' });
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Check if this is a pattern match (e.g., /products/* for all product pages)
    const isPattern = pattern === 'true' || pageURL.includes('*') || pageURL.includes(':id');
    
    // Normalize pageURL for pattern matching
    let urlPattern = pageURL;
    if (isPattern) {
      // Convert dynamic segments like /products/:id to regex pattern
      urlPattern = pageURL
        .replace(/\/:\w+/g, '/[^/]+')  // /products/:id -> /products/[^/]+
        .replace(/\*/g, '.*');           // /products/* -> /products/.*
    }

    // Check if we need to regenerate or if cached version exists
    let heatmap = null;

    if (regenerate !== 'true' && !isPattern) {
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
    if (isPattern) {
      // For pattern matching, aggregate data from multiple pages
      heatmap = await HeatmapData.generatePatternHeatmap(urlPattern, type, start, end, device);
    } else {
      heatmap = await HeatmapData.generateHeatmap(pageURL, type, start, end, device);
    }

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

// Get recording status (for reconnect support)
// NOTE: This supersedes the outdated snippet in NOTES_RECORDING_STATUS.txt (now removed).
// We track an in-memory active recording (global.activeRecording) initiated via Socket.IO
// admin-start-recording events, rather than persisting an arbitrary Recording model. This
// endpoint is queried by LiveRecordingDashboard on mount to offer a resume option.
router.get('/recording-status', async (req, res) => {
  try {
    // Check if there's an active recording in progress
    // This is stored in memory via Socket.IO, so we query global state
    const activeRecording = global.activeRecording || null;

    if (activeRecording) {
      res.json({
        isRecording: true,
        recordingId: activeRecording.recordingId,
        startTime: activeRecording.startTime,
        projectId: activeRecording.projectId || 'default',
      });
    } else {
      res.json({
        isRecording: false,
        recordingId: null,
      });
    }
  } catch (error) {
    console.error('[RecordingStatus] Error checking status:', error);
    res.status(500).json({
      message: 'Failed to check recording status',
      error: error.message
    });
  }
});

// Save live recording from admin dashboard
router.post('/save-recording', async (req, res) => {
  try {
    const { sessionId, projectId, events, metadata, startTime, endTime, duration } = req.body;

    console.log(`[SaveRecording] Saving recording ${sessionId} with ${events?.length || 0} events`);

    // Validate required fields
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: sessionId',
      });
    }

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        message: 'Events must be a non-empty array',
      });
    }

    // Process events - remove __userId internal field and ensure proper format
    // The model expects events as strings (for compression), but live recording sends objects
    const processedEvents = events.map(event => {
      const { __userId, ...cleanEvent } = event;

      // If event is already a string, return as-is
      if (typeof cleanEvent === 'string') {
        return cleanEvent;
      }

      // Convert object to JSON string for storage
      // (Live recordings send raw event objects, not compressed strings)
      return JSON.stringify(cleanEvent);
    });

    // Calculate stats from events
    let totalEvents = 0;
    let totalClicks = 0;
    let totalScrolls = 0;
    let totalMoves = 0;

    events.forEach(event => {
      totalEvents++;

      // Handle both object and string event formats
      let eventData = event;
      if (typeof event === 'string') {
        try {
          eventData = JSON.parse(event);
        } catch (e) {
          return;
        }
      }

      // Count by event type (rrweb event types)
      // Type 3 = IncrementalSnapshot (contains user interactions)
      if (eventData.type === 3 && eventData.data) {
        const source = eventData.data.source;

        // Source 2 = MouseInteraction (includes clicks)
        if (source === 2) {
          const interactionType = eventData.data.type;
          // Type 2 = MouseUp (click completion)
          if (interactionType === 2) {
            totalClicks++;
          }
        }

        // Source 3 = Scroll
        if (source === 3) {
          totalScrolls++;
        }

        // Source 1 = MouseMove
        if (source === 1) {
          totalMoves++;
        }
      }
    });

    // Create session recording
    const sessionRecording = new SessionRecording({
      sessionId,
      projectId: projectId || 'default',
      userId: metadata?.userId || 'anonymous',
      events: processedEvents,
      metadata: {
        ...metadata,
        recordingType: 'admin-triggered',
        url: metadata?.url || 'unknown',
        title: metadata?.title || 'Live Recording',
        device: {
          deviceType: metadata?.deviceType || 'unknown',
          browser: metadata?.browser || 'unknown',
          os: metadata?.os || 'unknown',
          screen: metadata?.screen || 'unknown',
        },
      },
      stats: {
        totalEvents,
        totalClicks,
        totalScrolls,
        totalMoves,
      },
      startTime: startTime || new Date(),
      endTime: endTime || new Date(),
      duration: duration || 0,
      createdAt: new Date(),
    });

    await sessionRecording.save();

    console.log(`[SaveRecording] Recording ${sessionId} saved successfully`);

    // Emit event for Phase 3 - notify analytics pages
    if (global.io) {
      global.io.emit('session-recorded', {
        sessionId,
        pageURL: metadata?.url,
        duration,
        timestamp: Date.now(),
      });
      console.log(`[SaveRecording] Emitted session-recorded event for ${sessionId}`);
    }

    // Trigger heatmap regeneration (Phase 3)
    if (metadata?.url) {
      try {
        const { regenerateHeatmapsForPage } = require('../services/heatmapAggregation');

        // Trigger regeneration using the aggregation service
        const results = await regenerateHeatmapsForPage(metadata.url);

        console.log(`[SaveRecording] Heatmap regeneration results:`, results);
      } catch (heatmapErr) {
        console.error('[SaveRecording] Error regenerating heatmaps:', heatmapErr);
        // Don't fail the request if heatmap regeneration fails
      }
    }

    res.json({
      success: true,
      message: 'Recording saved successfully',
      sessionId,
      eventsCount: events?.length || 0,
    });
  } catch (error) {
    console.error('[SaveRecording] Error saving recording:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save recording',
      error: error.message,
    });
  }
});

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

