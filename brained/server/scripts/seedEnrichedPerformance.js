const mongoose = require('mongoose');
const PerformanceMetrics = require('../models/PerformanceMetrics');

const pages = [
  'https://example.com/',
  'https://example.com/products',
  'https://example.com/products/laptop',
  'https://example.com/cart',
  'https://example.com/checkout',
  'https://example.com/login',
  'https://example.com/signup',
  'https://example.com/account',
];

const devices = [
  { device: 'desktop', browser: 'Chrome', os: 'Windows 11' },
  { device: 'mobile', browser: 'Safari', os: 'iOS 17' },
  { device: 'tablet', browser: 'Safari', os: 'iPadOS 17' },
  { device: 'desktop', browser: 'Firefox', os: 'macOS 14' },
  { device: 'mobile', browser: 'Chrome', os: 'Android 14' },
];

const errorTypes = [
  { message: 'TypeError: Cannot read property \'map\' of undefined', stack: 'at ProductList.render (ProductList.tsx:45:12)', filename: 'ProductList.tsx', line: 45, column: 12 },
  { message: 'ReferenceError: analytics is not defined', stack: 'at trackEvent (analytics.js:12:5)', filename: 'analytics.js', line: 12, column: 5 },
  { message: 'Uncaught NetworkError: Failed to fetch', stack: 'at fetch (api.js:23:10)', filename: 'api.js', line: 23, column: 10 },
  { message: 'TypeError: undefined is not a function', stack: 'at onClick (Button.tsx:18:7)', filename: 'Button.tsx', line: 18, column: 7 },
  { message: 'ChunkLoadError: Loading chunk 2 failed', stack: 'at webpack (webpack.js:89:15)', filename: 'webpack.js', line: 89, column: 15 },
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

// Generate realistic performance metrics with occasional errors
async function seedEnrichedPerformanceMetrics(count = 300) {
  try {
    console.log(`⚡ Seeding ${count} Enriched Performance Metrics...`);

    const metrics = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const sessionId = generateSessionId();
      const userId = generateUserId();
      const pageURL = randomElement(pages);
      const deviceInfo = randomElement(devices);
      const timestamp = new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000); // last 7 days

      // Generate realistic Core Web Vitals
      const isGoodPerformance = Math.random() > 0.3; // 70% good performance
      const hasErrors = Math.random() > 0.85; // 15% have errors
      
      const metric = {
        sessionId,
        userId,
        projectId: 'default',
        pageURL,
        
        // Core Web Vitals - realistic distributions
        TTFB: isGoodPerformance 
          ? 100 + Math.random() * 400 
          : 500 + Math.random() * 1500,
        FCP: isGoodPerformance 
          ? 800 + Math.random() * 1000 
          : 2000 + Math.random() * 2000,
        LCP: isGoodPerformance 
          ? 1200 + Math.random() * 1300 
          : 2500 + Math.random() * 3000,
        CLS: isGoodPerformance 
          ? Math.random() * 0.1 
          : 0.1 + Math.random() * 0.3,
        INP: isGoodPerformance 
          ? 50 + Math.random() * 150 
          : 200 + Math.random() * 400,
        FID: isGoodPerformance 
          ? 10 + Math.random() * 90 
          : 100 + Math.random() * 200,

        loadTime: isGoodPerformance 
          ? 1500 + Math.random() * 2000 
          : 3500 + Math.random() * 4000,
        domReadyTime: isGoodPerformance 
          ? 800 + Math.random() * 1200 
          : 2000 + Math.random() * 2500,
        dnsTime: 20 + Math.random() * 100,

        // Add JS errors for some metrics
        jsErrors: hasErrors ? [
          {
            ...randomElement(errorTypes),
            timestamp: timestamp.getTime(),
            url: pageURL,
          },
          // Sometimes multiple errors
          ...(Math.random() > 0.7 ? [{
            ...randomElement(errorTypes),
            timestamp: timestamp.getTime() + Math.random() * 5000,
            url: pageURL,
          }] : [])
        ] : [],

        // API calls monitoring
        apiCalls: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, idx) => ({
          url: `/api/${randomElement(['products', 'users', 'cart', 'checkout', 'analytics'])}`,
          method: randomElement(['GET', 'POST', 'PUT']),
          status: Math.random() > 0.9 ? randomElement([400, 404, 500, 503]) : 200,
          duration: 50 + Math.random() * 500,
          error: Math.random() > 0.95 ? 'Network timeout' : undefined,
          timestamp: new Date(timestamp.getTime() + idx * 200),
        })),

        timestamp,
        deviceInfo,
        isSeeded: true,
      };

      metrics.push(metric);
    }

    const result = await PerformanceMetrics.insertMany(metrics);
    console.log(`✅ Seeded ${result.length} Enriched Performance Metrics`);
    return result;
  } catch (error) {
    console.error('❌ Error seeding Enriched Performance Metrics:', error);
    throw error;
  }
}

async function clearSeededPerformanceMetrics() {
  try {
    console.log('🗑️  Clearing seeded Performance Metrics...');
    const result = await PerformanceMetrics.deleteMany({ isSeeded: true });
    console.log(`✅ Deleted ${result.deletedCount} seeded Performance Metrics`);
    return result;
  } catch (error) {
    console.error('❌ Error clearing seeded Performance Metrics:', error);
    throw error;
  }
}

module.exports = { seedEnrichedPerformanceMetrics, clearSeededPerformanceMetrics };
