const mongoose = require('mongoose');
const UserEvent = require('../models/UserEvent');

// Sample data pools
const locations = [
  { country: 'USA', city: 'New York', region: 'NY', ip: '192.168.1.1' },
  { country: 'USA', city: 'San Francisco', region: 'CA', ip: '192.168.1.2' },
  { country: 'UK', city: 'London', region: 'England', ip: '192.168.1.3' },
  { country: 'Germany', city: 'Berlin', region: 'Berlin', ip: '192.168.1.4' },
  { country: 'Japan', city: 'Tokyo', region: 'Kanto', ip: '192.168.1.5' },
  { country: 'Canada', city: 'Toronto', region: 'ON', ip: '192.168.1.6' },
  { country: 'Australia', city: 'Sydney', region: 'NSW', ip: '192.168.1.7' },
  { country: 'France', city: 'Paris', region: 'Île-de-France', ip: '192.168.1.8' },
];

const userSegments = ['free', 'pro', 'enterprise', 'trial'];
const cohorts = ['new_users', 'power_users', 'at_risk', 'churned', 'reactivated'];
const devices = [
  { device: 'desktop', browser: 'Chrome', os: 'Windows 11', screenResolution: '1920x1080', viewport: '1920x969', raw: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
  { device: 'mobile', browser: 'Safari', os: 'iOS 17', screenResolution: '390x844', viewport: '390x664', raw: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
  { device: 'tablet', browser: 'Safari', os: 'iPadOS 17', screenResolution: '1024x1366', viewport: '1024x1294', raw: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
  { device: 'desktop', browser: 'Firefox', os: 'macOS 14', screenResolution: '2560x1440', viewport: '2560x1328', raw: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0; rv:120.0) Gecko/20100101 Firefox/120.0' },
  { device: 'mobile', browser: 'Chrome', os: 'Android 14', screenResolution: '412x915', viewport: '412x753', raw: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' },
];

const pages = [
  { url: 'https://example.com/', title: 'Homepage' },
  { url: 'https://example.com/products', title: 'Products' },
  { url: 'https://example.com/products/laptop', title: 'Laptop - Product Details' },
  { url: 'https://example.com/cart', title: 'Shopping Cart' },
  { url: 'https://example.com/checkout', title: 'Checkout' },
  { url: 'https://example.com/login', title: 'Login' },
  { url: 'https://example.com/signup', title: 'Sign Up' },
  { url: 'https://example.com/account', title: 'My Account' },
];

const eventTypes = [
  { type: 'pageview', name: 'Page View' },
  { type: 'click', name: 'Button Click' },
  { type: 'click', name: 'Link Click' },
  { type: 'scroll', name: 'Scroll' },
  { type: 'form_submit', name: 'Form Submit' },
  { type: 'purchase', name: 'Purchase Complete' },
  { type: 'add_to_cart', name: 'Add to Cart' },
  { type: 'search', name: 'Search' },
];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateUserId() {
  return `user_${Math.random().toString(36).substr(2, 9)}`;
}

function generateSessionId() {
  return `session_${Math.random().toString(36).substr(2, 12)}`;
}

async function seedEnrichedUserEvents(count = 200) {
  try {
    console.log(`📊 Seeding ${count} Enriched User Events...`);

    const events = [];
    const now = Date.now();
    const sessionsCount = Math.floor(count / 5); // ~5 events per session

    for (let i = 0; i < sessionsCount; i++) {
      const userId = generateUserId();
      const sessionId = generateSessionId();
      const location = randomElement(locations);
      const device = randomElement(devices);
      const userPlan = randomElement(userSegments);
      const cohort = randomElement(cohorts);
      const eventsPerSession = 3 + Math.floor(Math.random() * 8); // 3-10 events
      const sessionStart = now - Math.random() * 7 * 24 * 60 * 60 * 1000; // last 7 days

      for (let j = 0; j < eventsPerSession; j++) {
        const page = randomElement(pages);
        const eventType = randomElement(eventTypes);
        const timestamp = new Date(sessionStart + j * (1000 * Math.random() * 120)); // events spread over time

        const event = {
          userId,
          sessionId,
          projectId: 'default',
          eventType: eventType.type,
          eventName: eventType.name,
          pageURL: page.url,
          pageTitle: page.title,
          referrer: j === 0 ? 'https://google.com' : pages[Math.max(0, j - 1)]?.url || '',
          metadata: {
            ...(eventType.type === 'purchase' && {
              value: Math.floor(Math.random() * 500) + 50,
              currency: 'USD',
              items: Math.floor(Math.random() * 3) + 1,
            }),
            ...(eventType.type === 'add_to_cart' && {
              productId: `prod_${Math.floor(Math.random() * 100)}`,
              quantity: Math.floor(Math.random() * 3) + 1,
            }),
            ...(eventType.type === 'search' && {
              query: randomElement(['laptop', 'headphones', 'mouse', 'keyboard', 'monitor']),
              resultsCount: Math.floor(Math.random() * 50),
            }),
          },
          device: {
            device: device.device,
            browser: device.browser,
            os: device.os,
            screenResolution: device.screenResolution,
            viewport: device.viewport,
            raw: device.raw,
          },
          location: {
            country: location.country,
            city: location.city,
            region: location.region,
            ip: location.ip,
          },
          superProperties: {
            userPlan,
            userSegment: userPlan,
            cohort,
            custom: {
              signupDate: new Date(now - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
              lifetimeValue: Math.floor(Math.random() * 2000),
            },
          },
          timestamp,
          isSeeded: true,
        };

        events.push(event);
      }
    }

    const result = await UserEvent.insertMany(events);
    console.log(`✅ Seeded ${result.length} Enriched User Events`);
    return result;
  } catch (error) {
    console.error('❌ Error seeding Enriched User Events:', error);
    throw error;
  }
}

async function clearSeededUserEvents() {
  try {
    console.log('🗑️  Clearing seeded User Events...');
    const result = await UserEvent.deleteMany({ isSeeded: true });
    console.log(`✅ Deleted ${result.deletedCount} seeded User Events`);
    return result;
  } catch (error) {
    console.error('❌ Error clearing seeded User Events:', error);
    throw error;
  }
}

module.exports = { seedEnrichedUserEvents, clearSeededUserEvents };
