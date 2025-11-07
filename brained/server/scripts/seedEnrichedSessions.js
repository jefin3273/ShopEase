const mongoose = require('mongoose');
const SessionRecording = require('../models/SessionRecording');

const pages = [
  'https://example.com/',
  'https://example.com/products',
  'https://example.com/products/laptop',
  'https://example.com/cart',
  'https://example.com/checkout',
  'https://example.com/login',
];

const devices = [
  { deviceType: 'desktop', browser: 'Chrome', os: 'Windows 11', screen: '1920x1080', screenResolution: '1920x1080', viewport: '1920x969' },
  { deviceType: 'mobile', browser: 'Safari', os: 'iOS 17', screen: '390x844', screenResolution: '390x844', viewport: '390x664' },
  { deviceType: 'tablet', browser: 'Safari', os: 'iPadOS 17', screen: '1024x1366', screenResolution: '1024x1366', viewport: '1024x1294' },
  { deviceType: 'desktop', browser: 'Firefox', os: 'macOS 14', screen: '2560x1440', screenResolution: '2560x1440', viewport: '2560x1328' },
];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSessionId() {
  return `session_${Math.random().toString(36).substr(2, 12)}`;
}

function generateUserId() {
  return `user_${Math.random().toString(36).substr(2, 9)}`;
}

// Generate simplified rrweb-like event strings (compressed)
function generateMockRRWebEvents(pageURL, duration, hasErrors = false, hasRage = false) {
  const events = [];
  const baseTime = Date.now();
  
  // Full snapshot (initial page load)
  events.push(`{"type":2,"data":{"node":{"type":0,"childNodes":[{"type":1,"name":"html"}]},"initialOffset":{"left":0,"top":0}},"timestamp":${baseTime}}`);
  
  // Meta event
  events.push(`{"type":4,"data":{"href":"${pageURL}","width":1920,"height":1080},"timestamp":${baseTime + 100}}`);
  
  // Mouse movements
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(Math.random() * 1920);
    const y = Math.floor(Math.random() * 1080);
    events.push(`{"type":3,"data":{"source":1,"positions":[{"x":${x},"y":${y},"timeOffset":0}]},"timestamp":${baseTime + i * 500}}`);
  }
  
  // Clicks
  const clickCount = hasRage ? 8 : Math.floor(Math.random() * 5) + 2;
  for (let i = 0; i < clickCount; i++) {
    const x = hasRage ? 500 + Math.random() * 20 : Math.floor(Math.random() * 1920); // Rage clicks in same area
    const y = hasRage ? 300 + Math.random() * 20 : Math.floor(Math.random() * 1080);
    const timeDelta = hasRage ? 200 : 1000 + Math.random() * 2000; // Rage clicks are rapid
    events.push(`{"type":3,"data":{"source":2,"type":2,"id":${Math.floor(Math.random() * 100)},"x":${x},"y":${y}},"timestamp":${baseTime + 5000 + i * timeDelta}}`);
  }
  
  // Scrolls
  for (let i = 0; i < 5; i++) {
    events.push(`{"type":3,"data":{"source":3,"id":0,"x":0,"y":${Math.floor(Math.random() * 2000)}},"timestamp":${baseTime + 10000 + i * 1000}}`);
  }
  
  // Input events
  events.push(`{"type":3,"data":{"source":5,"text":"*","isChecked":false,"id":${Math.floor(Math.random() * 100)}},"timestamp":${baseTime + 15000}}`);
  
  return events;
}

async function seedEnrichedSessionRecordings(count = 50) {
  try {
    console.log(`🎥 Seeding ${count} Enriched Session Recordings...`);

    const recordings = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const sessionId = generateSessionId();
      const userId = generateUserId();
      const device = randomElement(devices);
      const entryURL = randomElement(pages);
      const visitedPages = [entryURL];
      const pageCount = Math.floor(Math.random() * 4) + 1; // 1-4 pages
      
      for (let j = 1; j < pageCount; j++) {
        const nextPage = randomElement(pages.filter(p => !visitedPages.includes(p)));
        if (nextPage) visitedPages.push(nextPage);
      }

      const startTime = new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000); // last 7 days
      const duration = 30 + Math.random() * 300; // 30s - 5.5min
      const endTime = new Date(startTime.getTime() + duration * 1000);

      const hasErrors = Math.random() > 0.8; // 20% have errors
      const hasRage = Math.random() > 0.85; // 15% have rage clicks

      // Generate events for this session
      const events = generateMockRRWebEvents(entryURL, duration, hasErrors, hasRage);

      // Generate console logs
      const consoleLogs = Array.from({ length: Math.floor(Math.random() * 5) }, (_, idx) => ({
        timestamp: startTime.getTime() + idx * 5000,
        level: randomElement(['log', 'info', 'warn', 'error']),
        message: randomElement([
          'User action tracked',
          'API call successful',
          hasErrors ? 'Error: Failed to load resource' : 'Component mounted',
          'State updated',
        ]),
      }));

      // Network requests
      const networkRequests = Array.from({ length: Math.floor(Math.random() * 10) + 3 }, (_, idx) => ({
        timestamp: startTime.getTime() + idx * 2000,
        method: randomElement(['GET', 'POST', 'PUT']),
        url: `/api/${randomElement(['products', 'users', 'analytics', 'cart'])}`,
        status: Math.random() > 0.9 ? randomElement([404, 500]) : 200,
        duration: 50 + Math.random() * 500,
        type: randomElement(['fetch', 'xhr']),
        error: hasErrors && idx === 0 ? 'Network timeout' : undefined,
      }));

      // Errors
      const errors = hasErrors ? [
        {
          timestamp: startTime.getTime() + 10000,
          message: randomElement([
            'TypeError: Cannot read property \'map\' of undefined',
            'ReferenceError: analytics is not defined',
            'Uncaught NetworkError: Failed to fetch',
          ]),
          stack: 'at Component.render (Component.tsx:45:12)',
          filename: 'Component.tsx',
          line: 45,
          column: 12,
          type: 'error',
        },
      ] : [];

      // Stats
      const totalEvents = events.length;
      const totalClicks = events.filter(e => e.includes('"type":2')).length;
      const totalScrolls = events.filter(e => e.includes('"source":3')).length;
      const totalMoves = events.filter(e => e.includes('"source":1')).length;

      const recording = {
        sessionId,
        userId,
        projectId: 'default',
        startTime,
        endTime,
        duration,
        entryURL,
        exitURL: visitedPages[visitedPages.length - 1],
        pagesVisited: visitedPages,
        device,
        metadata: {
          url: entryURL,
          title: entryURL.split('/').pop() || 'Homepage',
          device,
        },
        events,
        consoleLogs,
        networkRequests,
        errors,
        stats: {
          totalEvents,
          totalClicks,
          totalScrolls,
          totalMoves,
          avgMouseSpeed: 100 + Math.random() * 400,
        },
        hasErrors,
        isComplete: true,
        tags: [
          ...(hasErrors ? ['has-errors'] : []),
          ...(hasRage ? ['rage-clicks'] : []),
          device.deviceType,
        ],
        isSeeded: true,
      };

      recordings.push(recording);
    }

    const result = await SessionRecording.insertMany(recordings);
    console.log(`✅ Seeded ${result.length} Enriched Session Recordings`);
    return result;
  } catch (error) {
    console.error('❌ Error seeding Enriched Session Recordings:', error);
    throw error;
  }
}

async function clearSeededSessionRecordings() {
  try {
    console.log('🗑️  Clearing seeded Session Recordings...');
    const result = await SessionRecording.deleteMany({ isSeeded: true });
    console.log(`✅ Deleted ${result.deletedCount} seeded Session Recordings`);
    return result;
  } catch (error) {
    console.error('❌ Error clearing seeded Session Recordings:', error);
    throw error;
  }
}

module.exports = { seedEnrichedSessionRecordings, clearSeededSessionRecordings };
