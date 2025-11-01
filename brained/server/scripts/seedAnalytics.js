/*
 Seed Funnels, Cohorts, Experiments (and optional sample UserEvents)

 Usage (from server/):
   node scripts/seedAnalytics.js                 # upsert definitions, no deletes
   node scripts/seedAnalytics.js --reset         # delete Funnels/Cohorts/Experiments then insert
   node scripts/seedAnalytics.js --with-events   # also seed a small set of sample UserEvents
   node scripts/seedAnalytics.js --reset --with-events

 Options:
   --project=<id>  # set projectId (default: 'default')

 Requires MONGO_URI in server/.env
*/

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const Funnel = require('../models/Funnel');
const Cohort = require('../models/Cohort');
const Experiment = require('../models/Experiment');
const UserEvent = require('../models/UserEvent');

const log = (...args) => console.log('[seed:analytics]', ...args);

function getArgFlag(name, defaultValue = false) {
  return process.argv.includes(name) ? true : defaultValue;
}
function getArgValue(prefix, defaultValue) {
  const arg = process.argv.find((a) => a.startsWith(prefix + '='));
  return arg ? arg.split('=')[1] : defaultValue;
}

const PROJECT_ID = getArgValue('--project', 'default');
const DO_RESET = getArgFlag('--reset');
const WITH_EVENTS = getArgFlag('--with-events');

// Sample pages used for events
const PAGES = {
  home: 'https://localhost:5173/',
  product: 'https://localhost:5173/products/aurora-wireless-headphones',
  signup: 'https://localhost:5173/signup',
  checkout: 'https://localhost:5173/checkout',
  cart: 'https://localhost:5173/cart',
};

const funnels = [
  {
    name: 'Checkout Conversion',
    description: 'From landing to purchase across product/cart/checkout',
    projectId: PROJECT_ID,
    steps: [
      { order: 1, name: 'Landing', eventType: 'pageview', eventName: 'page_view', pageURL: PAGES.home },
      { order: 2, name: 'View Product', eventType: 'pageview', eventName: 'page_view', pageURL: PAGES.product },
      { order: 3, name: 'Add to Cart', eventType: 'button_click', eventName: 'add_to_cart', pageURL: PAGES.product, element: '#add-to-cart' },
      { order: 4, name: 'Visit Checkout', eventType: 'pageview', eventName: 'page_view', pageURL: PAGES.checkout },
      { order: 5, name: 'Purchase', eventType: 'purchase', eventName: 'purchase', pageURL: PAGES.checkout },
    ],
    timeWindow: { value: 30, unit: 'days' },
    isActive: true,
  },
  {
    name: 'Signup Funnel',
    description: 'From homepage CTA to account created',
    projectId: PROJECT_ID,
    steps: [
      { order: 1, name: 'Homepage', eventType: 'pageview', eventName: 'page_view', pageURL: PAGES.home },
      { order: 2, name: 'CTA Click', eventType: 'button_click', eventName: 'signup_cta_click', pageURL: PAGES.home, element: '#cta-signup' },
      { order: 3, name: 'Signup Page', eventType: 'pageview', eventName: 'page_view', pageURL: PAGES.signup },
      { order: 4, name: 'Form Submit', eventType: 'form_submit', eventName: 'signup_form_submit', pageURL: PAGES.signup, element: '#signup-form' },
      { order: 5, name: 'Account Created', eventType: 'custom', eventName: 'account_created', pageURL: PAGES.signup },
    ],
    timeWindow: { value: 30, unit: 'days' },
    isActive: true,
  },
];

const cohorts = [
  {
    name: 'High-Intent Visitors',
    description: 'Visited 5+ pages and segment contains "high"',
    projectId: PROJECT_ID,
    conditions: {
      events: [
        { eventType: 'pageview', eventName: 'page_view', operator: 'count_gt', value: 5 },
      ],
      properties: [
        { key: 'superProperties.userSegment', operator: 'contains', value: 'high' },
      ],
      timeRange: { relative: 'last_30_days' },
    },
    isActive: true,
  },
  {
    name: 'Mobile Users - Last 30d',
    description: 'Users on mobile devices in the last 30 days',
    projectId: PROJECT_ID,
    conditions: {
      events: [],
      properties: [
        { key: 'device.device', operator: 'equals', value: 'mobile' },
      ],
      timeRange: { relative: 'last_30_days' },
    },
    isActive: true,
  },
  {
    name: 'Cart Abandoners',
    description: 'Users who added to cart but did not purchase',
    projectId: PROJECT_ID,
    conditions: {
      events: [
        { eventType: 'button_click', eventName: 'add_to_cart', operator: 'has_done', value: true },
        { eventType: 'purchase', eventName: 'purchase', operator: 'has_not_done', value: true },
      ],
      properties: [],
      timeRange: { relative: 'last_30_days' },
    },
    isActive: true,
  },
];

const experiments = [
  {
    name: 'Homepage Hero Variant Test',
    description: 'Test hero copy/cta for signup engagement',
    projectId: PROJECT_ID,
    type: 'ab_test',
    variants: [
      { key: 'A', name: 'Control', weight: 50, config: { ctaText: 'Get Started' } },
      { key: 'B', name: 'Variant', weight: 50, config: { ctaText: 'Start Free' } },
    ],
    targeting: { enabled: true, conditions: { percentage: 100 } },
    metrics: [
      { name: 'CTA Clicks', eventType: 'button_click', eventName: 'signup_cta_click', aggregation: 'count' },
      { name: 'Signups', eventType: 'custom', eventName: 'account_created', aggregation: 'count' },
    ],
    status: 'draft',
  },
  {
    name: 'Checkout Button Color',
    description: 'Button color impact on conversions',
    projectId: PROJECT_ID,
    type: 'ab_test',
    variants: [
      { key: 'blue', name: 'Blue CTA', weight: 50, config: { color: '#2563eb' } },
      { key: 'green', name: 'Green CTA', weight: 50, config: { color: '#16a34a' } },
    ],
    targeting: { enabled: true, conditions: { percentage: 100 } },
    metrics: [
      { name: 'Purchases', eventType: 'purchase', eventName: 'purchase', aggregation: 'count' },
    ],
    status: 'draft',
  },
  {
    name: 'Price Banner Feature Flag',
    description: 'Show price-savings banner to a subset of free users',
    projectId: PROJECT_ID,
    type: 'feature_flag',
    variants: [
      { key: 'off', name: 'Off', weight: 50 },
      { key: 'on', name: 'On', weight: 50, config: { banner: true } },
    ],
    targeting: { enabled: true, conditions: { userProperties: { 'superProperties.userPlan': 'free' }, percentage: 50 } },
    metrics: [
      { name: 'CTA Clicks', eventType: 'button_click', eventName: 'signup_cta_click', aggregation: 'count' },
    ],
    status: 'draft',
  },
];

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(n) { return Math.floor(Math.random() * n); }

async function seedEventsSmallSample() {
  // Creates ~60-180 events across 30 sessions for a small, realistic dataset
  const users = Array.from({ length: 20 }, (_, i) => `user_${i + 1}`);
  const sessions = Array.from({ length: 30 }, () => uuidv4());
  const now = Date.now();

  const docs = [];

  for (const sessionId of sessions) {
    const userId = randomFrom(users);
    let t = new Date(now - randInt(1000 * 60 * 60 * 24 * 14)); // last 14 days

    // Landing pageview
    docs.push({
      userId, sessionId, projectId: PROJECT_ID,
      eventType: 'pageview', eventName: 'page_view', pageURL: PAGES.home,
      pageTitle: 'Home', timestamp: new Date(t),
      device: { device: randomFrom(['desktop', 'mobile']), browser: randomFrom(['Chrome', 'Safari', 'Firefox']), os: randomFrom(['Windows', 'macOS', 'iOS', 'Android']) },
      superProperties: { userSegment: randomFrom(['high', 'medium', 'low']), userPlan: randomFrom(['free', 'pro']) },
    });

    // Some will view product
    if (Math.random() < 0.8) {
      t = new Date(t.getTime() + randInt(3 * 60 * 1000));
      docs.push({
        userId, sessionId, projectId: PROJECT_ID,
        eventType: 'pageview', eventName: 'page_view', pageURL: PAGES.product,
        pageTitle: 'Aurora Headphones', timestamp: new Date(t),
      });

      // Some add to cart
      if (Math.random() < 0.6) {
        t = new Date(t.getTime() + randInt(2 * 60 * 1000));
        docs.push({
          userId, sessionId, projectId: PROJECT_ID,
          eventType: 'button_click', eventName: 'add_to_cart', pageURL: PAGES.product,
          metadata: { element: '#add-to-cart' }, timestamp: new Date(t),
        });

        // Some visit checkout
        if (Math.random() < 0.7) {
          t = new Date(t.getTime() + randInt(2 * 60 * 1000));
          docs.push({
            userId, sessionId, projectId: PROJECT_ID,
            eventType: 'pageview', eventName: 'page_view', pageURL: PAGES.checkout,
            pageTitle: 'Checkout', timestamp: new Date(t),
          });

          // Some purchase
          if (Math.random() < 0.5) {
            t = new Date(t.getTime() + randInt(2 * 60 * 1000));
            docs.push({
              userId, sessionId, projectId: PROJECT_ID,
              eventType: 'purchase', eventName: 'purchase', pageURL: PAGES.checkout,
              metadata: { amount: randomFrom([59, 79, 99, 129, 249]) }, timestamp: new Date(t),
            });
          }
        }
      }
    }

    // Some signup funnel events
    if (Math.random() < 0.4) {
      t = new Date(t.getTime() + randInt(5 * 60 * 1000));
      docs.push({ userId, sessionId, projectId: PROJECT_ID, eventType: 'button_click', eventName: 'signup_cta_click', pageURL: PAGES.home, timestamp: new Date(t) });
      t = new Date(t.getTime() + randInt(2 * 60 * 1000));
      docs.push({ userId, sessionId, projectId: PROJECT_ID, eventType: 'pageview', eventName: 'page_view', pageURL: PAGES.signup, timestamp: new Date(t) });
      if (Math.random() < 0.5) {
        t = new Date(t.getTime() + randInt(2 * 60 * 1000));
        docs.push({ userId, sessionId, projectId: PROJECT_ID, eventType: 'form_submit', eventName: 'signup_form_submit', pageURL: PAGES.signup, timestamp: new Date(t) });
        t = new Date(t.getTime() + randInt(1 * 60 * 1000));
        docs.push({ userId, sessionId, projectId: PROJECT_ID, eventType: 'custom', eventName: 'account_created', pageURL: PAGES.signup, timestamp: new Date(t) });
      }
    }
  }

  if (docs.length) {
    await UserEvent.insertMany(docs);
    log(`Seeded ${docs.length} sample UserEvent documents`);
  }
}

async function upsertMany(Model, docs, keyFields) {
  for (const d of docs) {
    const filter = keyFields.reduce((acc, k) => { acc[k] = d[k]; return acc; }, {});
    await Model.findOneAndUpdate(filter, { $set: d }, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
}

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not defined. Create server/.env with MONGO_URI');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    log('Connected to MongoDB');

    if (DO_RESET) {
      await Promise.all([
        Funnel.deleteMany({ projectId: PROJECT_ID }),
        Cohort.deleteMany({ projectId: PROJECT_ID }),
        Experiment.deleteMany({ projectId: PROJECT_ID }),
      ]);
      log(`Cleared Funnels, Cohorts, Experiments for projectId="${PROJECT_ID}"`);
    }

    await upsertMany(Funnel, funnels, ['projectId', 'name']);
    await upsertMany(Cohort, cohorts, ['projectId', 'name']);
    await upsertMany(Experiment, experiments, ['projectId', 'name']);

    log(`Upserted definitions for projectId="${PROJECT_ID}" (Funnels: ${funnels.length}, Cohorts: ${cohorts.length}, Experiments: ${experiments.length})`);

    if (WITH_EVENTS) {
      if (DO_RESET) {
        await UserEvent.deleteMany({ projectId: PROJECT_ID });
        log('Cleared existing UserEvents for this project');
      }
      await seedEventsSmallSample();
    }

    await mongoose.disconnect();
    log('Done');
    process.exit(0);
  } catch (err) {
    console.error(err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  }
}

run();
