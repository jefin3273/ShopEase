const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const { v4: uuidv4 } = require('uuid');

// Import new seed functions
const { seedAlertRules, clearSeededAlertRules } = require('../scripts/seedAlertRules');
const { seedConsentMaskingRules, clearSeededConsentMaskingRules } = require('../scripts/seedConsentMasking');
const { seedEnrichedUserEvents, clearSeededUserEvents } = require('../scripts/seedEnrichedEvents');
const { seedEnrichedPerformanceMetrics, clearSeededPerformanceMetrics } = require('../scripts/seedEnrichedPerformance');
const { seedEnrichedSessionRecordings, clearSeededSessionRecordings } = require('../scripts/seedEnrichedSessions');
const { seedAllHeatmapData, clearSeededHeatmapData } = require('../scripts/seedHeatmapData');
const { seedPageViews, clearSeededPageViews } = require('../scripts/seedPageViews');
const { seedFunnels, clearSeededFunnels } = require('../scripts/seedFunnels');

// Import models for seed status
const AlertRule = require('../models/AlertRule');
const ConsentMaskingRule = require('../models/ConsentMaskingRule');
const PageView = require('../models/PageView');
const Funnel = require('../models/Funnel');

// Helper to generate seeded UUIDs (with SEED prefix)
const generateSeededId = () => `SEED-${uuidv4()}`;

// Unsplash images
const U = {
  headphones: 'https://images.unsplash.com/photo-1518444028785-8fbcd101ebb9?q=80&w=1600&auto=format&fit=crop',
  smartwatch: 'https://images.unsplash.com/photo-1516264666780-84c3f03b4ed8?q=80&w=1600&auto=format&fit=crop',
  tshirt: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=1600&auto=format&fit=crop',
  mug: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?q=80&w=1600&auto=format&fit=crop',
  shoes: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1600&auto=format&fit=crop',
  serum: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?q=80&w=1600&auto=format&fit=crop',
  lamp: 'https://images.unsplash.com/photo-1507473885765-e6ed57cca1c7?q=80&w=1600&auto=format&fit=crop',
  backpack: 'https://images.unsplash.com/photo-1514477917009-389c76a86b68?q=80&w=1600&auto=format&fit=crop',
  coffee: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?q=80&w=1600&auto=format&fit=crop',
  monitor: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1600&auto=format&fit=crop',
  duvet: 'https://images.unsplash.com/photo-1505693314120-0d443867891c?q=80&w=1600&auto=format&fit=crop',
  speaker: 'https://images.unsplash.com/photo-1518443895914-6f8e1b87c2d3?q=80&w=1600&auto=format&fit=crop',
};

const seedProducts = [
  {
    title: 'Aurora Wireless Headphones',
    description: 'Immersive over-ear wireless headphones with active noise cancellation, 30h battery life, and plush comfort for all-day listening.',
    price: 129.99,
    originalPrice: 179.99,
    category: 'Electronics',
    featured: true,
    image: U.headphones,
    images: [U.headphones],
    colors: [{ id: 'blk', name: 'Black', class: 'bg-gray-900' }, { id: 'sil', name: 'Silver', class: 'bg-gray-300' }],
    sizes: [],
    highlights: ['Active Noise Cancellation', 'Bluetooth 5.3', '30h Battery', 'USB-C Fast Charge'],
    details: 'Engineered with dual-chamber drivers for rich bass and crisp highs.',
    stock: 120,
    rating: 4.7,
    reviewCount: 128,
    badge: 'Best Seller',
  },
  {
    title: 'Nimbus Smartwatch Series 5',
    description: 'Track your fitness, receive notifications, and personalize your style.',
    price: 249.99,
    originalPrice: 299.99,
    category: 'Wearables',
    featured: true,
    image: U.smartwatch,
    images: [U.smartwatch],
    colors: [{ id: 'grf', name: 'Graphite', class: 'bg-gray-800' }],
    sizes: [{ name: '40mm', inStock: true }, { name: '44mm', inStock: true }],
    highlights: ['Heart-rate + SpO2', 'GPS + NFC', '7-day battery'],
    details: 'Lightweight aluminum case with sapphire glass.',
    stock: 80,
    rating: 4.5,
    reviewCount: 92,
    badge: 'New',
  },
  {
    title: 'Luma Cotton T-Shirt',
    description: 'Ultra-soft 100% combed cotton tee with a modern relaxed fit.',
    price: 24.0,
    originalPrice: 29.0,
    category: 'Apparel',
    image: U.tshirt,
    images: [U.tshirt],
    colors: [{ id: 'blk', name: 'Black', class: 'bg-black' }, { id: 'wht', name: 'White', class: 'bg-white' }],
    sizes: [{ name: 'S', inStock: true }, { name: 'M', inStock: true }, { name: 'L', inStock: true }],
    highlights: ['100% cotton', 'Pre-shrunk', 'Relaxed fit'],
    details: 'Responsibly made with long-staple cotton.',
    stock: 400,
    rating: 4.6,
    reviewCount: 310,
    badge: 'Best Seller',
  },
  {
    title: 'Peak Performance Running Shoes',
    description: 'Supportive daily trainers with responsive cushioning.',
    price: 99.0,
    originalPrice: 129.0,
    category: 'Footwear',
    featured: true,
    image: U.shoes,
    images: [U.shoes],
    colors: [{ id: 'blk', name: 'Black', class: 'bg-gray-900' }],
    sizes: [{ name: '8', inStock: true }, { name: '9', inStock: true }, { name: '10', inStock: true }],
    highlights: ['Responsive foam', 'Breathable upper'],
    details: 'Rockered geometry promotes smooth transition.',
    stock: 140,
    rating: 4.3,
    reviewCount: 204,
    badge: 'Sale',
  },
  {
    title: 'Atlas Ultra 27" 4K Monitor',
    description: 'Stunning 4K IPS panel with 99% sRGB and HDR10.',
    price: 399.0,
    originalPrice: 499.0,
    category: 'Electronics',
    featured: true,
    image: U.monitor,
    images: [U.monitor],
    colors: [{ id: 'blk', name: 'Black', class: 'bg-gray-900' }],
    sizes: [],
    highlights: ['4K IPS', 'HDR10', 'USB-C 65W'],
    details: 'Factory-calibrated color accuracy.',
    stock: 60,
    rating: 4.6,
    reviewCount: 87,
    badge: 'Editor\'s Pick',
  },
];

// POST /api/seed/products - Seed products with SEED prefix
router.post('/products', async (req, res) => {
  try {
    const { categories } = req.body; // Accept array of categories to seed

    // Delete existing seeded products (those with seededId starting with SEED-)
    await Product.deleteMany({ seededId: { $regex: /^SEED-/ } });

    // Filter products by selected categories if provided
    let productsToSeed = seedProducts;
    if (categories && Array.isArray(categories) && categories.length > 0) {
      productsToSeed = seedProducts.filter(p => categories.includes(p.category));
    }

    if (productsToSeed.length === 0) {
      return res.status(400).json({ success: false, message: 'No products match the selected categories' });
    }

    const productsWithSeededId = productsToSeed.map(p => ({
      ...p,
      seededId: generateSeededId(),
    }));

    const inserted = await Product.insertMany(productsWithSeededId);

    res.json({
      success: true,
      message: `Seeded ${inserted.length} products`,
      count: inserted.length,
      categories: categories || 'all',
    });
  } catch (error) {
    console.error('Error seeding products:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/seed/reset - Remove all data except admin user
router.post('/reset', async (req, res) => {
  try {
    // Delete all products (both seeded and user-created)
    const productsDeleted = await Product.deleteMany({});

    // Delete all non-admin users
    const usersDeleted = await User.deleteMany({ role: { $ne: 'admin' } });

    // Delete all orders
    const ordersDeleted = await Order.deleteMany({});

    // Clear ALL analytics data models
    const SessionRecording = require('../models/SessionRecording');
    const UserInteraction = require('../models/UserInteraction');
    const HeatmapData = require('../models/HeatmapData');
    const Session = require('../models/Session');
    const PageView = require('../models/PageView');
    const UserEvent = require('../models/UserEvent');
    const EventAnalytics = require('../models/EventAnalytics');
    const PerformanceMetrics = require('../models/PerformanceMetrics');
    const Funnel = require('../models/Funnel');
    const Experiment = require('../models/Experiment');
    const Cohort = require('../models/Cohort');
    const FeatureFlag = require('../models/FeatureFlag');

    const sessionsDeleted = await SessionRecording.deleteMany({});
    const interactionsDeleted = await UserInteraction.deleteMany({});
    const heatmapDeleted = await HeatmapData.deleteMany({});
    const sessionsAnalyticsDeleted = await Session.deleteMany({});
    const pageViewsDeleted = await PageView.deleteMany({});
    const userEventsDeleted = await UserEvent.deleteMany({});
    const eventAnalyticsDeleted = await EventAnalytics.deleteMany({});
    const performanceMetricsDeleted = await PerformanceMetrics.deleteMany({});
    const funnelsDeleted = await Funnel.deleteMany({});
    const experimentsDeleted = await Experiment.deleteMany({});
    const cohortsDeleted = await Cohort.deleteMany({});
    const featureFlagsDeleted = await FeatureFlag.deleteMany({});

    res.json({
      success: true,
      message: 'Database reset complete (admin preserved)',
      deleted: {
        products: productsDeleted.deletedCount,
        users: usersDeleted.deletedCount,
        orders: ordersDeleted.deletedCount,
        sessionRecordings: sessionsDeleted.deletedCount,
        interactions: interactionsDeleted.deletedCount,
        heatmaps: heatmapDeleted.deletedCount,
        sessions: sessionsAnalyticsDeleted.deletedCount,
        pageViews: pageViewsDeleted.deletedCount,
        userEvents: userEventsDeleted.deletedCount,
        eventAnalytics: eventAnalyticsDeleted.deletedCount,
        performanceMetrics: performanceMetricsDeleted.deletedCount,
        funnels: funnelsDeleted.deletedCount,
        experiments: experimentsDeleted.deletedCount,
        cohorts: cohortsDeleted.deletedCount,
        featureFlags: featureFlagsDeleted.deletedCount,
      },
    });
  } catch (error) {
    console.error('Error resetting database:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/seed/stats - Get seeded data counts
router.get('/stats', async (req, res) => {
  try {
    const seededProducts = await Product.countDocuments({ seededId: { $regex: /^SEED-/ } });
    const totalProducts = await Product.countDocuments();
    const totalUsers = await User.countDocuments();
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const totalOrders = await Order.countDocuments();

    // Get all analytics counts
    const SessionRecording = require('../models/SessionRecording');
    const UserInteraction = require('../models/UserInteraction');
    const HeatmapData = require('../models/HeatmapData');
    const Session = require('../models/Session');
    const PageView = require('../models/PageView');
    const UserEvent = require('../models/UserEvent');
    const EventAnalytics = require('../models/EventAnalytics');
    const PerformanceMetrics = require('../models/PerformanceMetrics');
    const Funnel = require('../models/Funnel');
    const Experiment = require('../models/Experiment');
    const Cohort = require('../models/Cohort');
    const FeatureFlag = require('../models/FeatureFlag');

    const sessionRecordings = await SessionRecording.countDocuments();
    const interactions = await UserInteraction.countDocuments();
    const heatmaps = await HeatmapData.countDocuments();
    const sessions = await Session.countDocuments();
    const pageViews = await PageView.countDocuments();
    const userEvents = await UserEvent.countDocuments();
    const eventAnalytics = await EventAnalytics.countDocuments();
    const performanceMetrics = await PerformanceMetrics.countDocuments();
    const funnels = await Funnel.countDocuments();
    const experiments = await Experiment.countDocuments();
    const cohorts = await Cohort.countDocuments();
    const featureFlags = await FeatureFlag.countDocuments();

    res.json({
      seeded: {
        products: seededProducts,
      },
      totals: {
        products: totalProducts,
        users: totalUsers,
        admins: adminUsers,
        orders: totalOrders,
      },
      analytics: {
        sessionRecordings,
        interactions,
        heatmaps,
        sessions,
        pageViews,
        userEvents,
        eventAnalytics,
        performanceMetrics,
        funnels,
        experiments,
        cohorts,
        featureFlags,
      },
    });
  } catch (error) {
    console.error('Error fetching seed stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/seed/status
 * Get counts of seeded vs manual data for all collections
 */
router.get('/status', async (req, res) => {
  try {
    const SessionRecording = require('../models/SessionRecording');
    const UserEvent = require('../models/UserEvent');
    const PerformanceMetrics = require('../models/PerformanceMetrics');

    const status = {
      alertRules: {
        seeded: await AlertRule.countDocuments({ isSeeded: true }),
        manual: await AlertRule.countDocuments({ isSeeded: { $ne: true } }),
        total: await AlertRule.countDocuments(),
      },
      consentMaskingRules: {
        seeded: await ConsentMaskingRule.countDocuments({ isSeeded: true }),
        manual: await ConsentMaskingRule.countDocuments({ isSeeded: { $ne: true } }),
        total: await ConsentMaskingRule.countDocuments(),
      },
      userEvents: {
        seeded: await UserEvent.countDocuments({ isSeeded: true }),
        manual: await UserEvent.countDocuments({ isSeeded: { $ne: true } }),
        total: await UserEvent.countDocuments(),
      },
      performanceMetrics: {
        seeded: await PerformanceMetrics.countDocuments({ isSeeded: true }),
        manual: await PerformanceMetrics.countDocuments({ isSeeded: { $ne: true } }),
        total: await PerformanceMetrics.countDocuments(),
      },
      sessionRecordings: {
        seeded: await SessionRecording.countDocuments({ isSeeded: true }),
        manual: await SessionRecording.countDocuments({ isSeeded: { $ne: true } }),
        total: await SessionRecording.countDocuments(),
      },
      products: {
        seeded: await Product.countDocuments({ seededId: { $regex: /^SEED-/ } }),
        manual: await Product.countDocuments({ seededId: { $not: { $regex: /^SEED-/ } } }),
        total: await Product.countDocuments(),
      },
      pageViews: {
        seeded: await PageView.countDocuments({ isSeeded: true }),
        manual: await PageView.countDocuments({ isSeeded: { $ne: true } }),
        total: await PageView.countDocuments(),
      },
      funnels: {
        seeded: await Funnel.countDocuments({ isSeeded: true }),
        manual: await Funnel.countDocuments({ isSeeded: { $ne: true } }),
        total: await Funnel.countDocuments(),
      },
    };

    res.json(status);
  } catch (error) {
    console.error('Error fetching seed status:', error);
    res.status(500).json({ error: 'Failed to fetch seed status' });
  }
});

/**
 * POST /api/seed/data/:type
 * Seed data for a specific type
 */
router.post('/data/:type', async (req, res) => {
  const { type } = req.params;
  const { count } = req.body; // Optional count parameter

  try {
    let result;

    switch (type) {
      case 'alert-rules':
        result = await seedAlertRules();
        break;

      case 'consent-masking':
        result = await seedConsentMaskingRules();
        break;

      case 'user-events':
        result = await seedEnrichedUserEvents(count || 200);
        break;

      case 'performance-metrics':
        result = await seedEnrichedPerformanceMetrics(count || 300);
        break;

      case 'session-recordings':
        result = await seedEnrichedSessionRecordings(count || 50);
        break;

      case 'heatmap-data':
        result = await seedAllHeatmapData();
        break;

      case 'page-views':
        result = await seedPageViews(count || 500);
        break;

      case 'funnels':
        result = await seedFunnels();
        break;

      default:
        return res.status(400).json({ error: `Unknown seed type: ${type}` });
    }

    res.json({
      success: true,
      type,
      count: Array.isArray(result) ? result.length : 1,
      message: `Successfully seeded ${type}`
    });
  } catch (error) {
    console.error(`Error seeding ${type}:`, error);
    res.status(500).json({ error: `Failed to seed ${type}`, details: error.message });
  }
});

/**
 * DELETE /api/seed/data/:type
 * Clear seeded data for a specific type
 */
router.delete('/data/:type', async (req, res) => {
  const { type } = req.params;

  try {
    let result;

    switch (type) {
      case 'alert-rules':
        result = await clearSeededAlertRules();
        break;

      case 'consent-masking':
        result = await clearSeededConsentMaskingRules();
        break;

      case 'user-events':
        result = await clearSeededUserEvents();
        break;

      case 'performance-metrics':
        result = await clearSeededPerformanceMetrics();
        break;

      case 'session-recordings':
        result = await clearSeededSessionRecordings();
        break;

      case 'products':
        result = await Product.deleteMany({ seededId: { $regex: /^SEED-/ } });
        break;

      case 'heatmap-data':
        result = await clearSeededHeatmapData();
        break;

      case 'page-views':
        result = await clearSeededPageViews();
        break;

      case 'funnels':
        result = await clearSeededFunnels();
        break;

      default:
        return res.status(400).json({ error: `Unknown seed type: ${type}` });
    }

    res.json({
      success: true,
      type,
      deletedCount: result.deletedCount || 0,
      message: `Successfully cleared seeded ${type}`
    });
  } catch (error) {
    console.error(`Error clearing ${type}:`, error);
    res.status(500).json({ error: `Failed to clear ${type}`, details: error.message });
  }
});

module.exports = router;
