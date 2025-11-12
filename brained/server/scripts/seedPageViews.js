const PageView = require('../models/PageView');
const { v4: uuidv4 } = require('uuid');

// Sample pages for path analysis
const SAMPLE_PAGES = [
    { url: '/', title: 'Home' },
    { url: '/products', title: 'Products' },
    { url: '/products/aurora-wireless-headphones', title: 'Aurora Wireless Headphones' },
    { url: '/products/nimbus-smartwatch', title: 'Nimbus Smartwatch Series 5' },
    { url: '/products/luma-cotton-tshirt', title: 'Luma Cotton T-Shirt' },
    { url: '/products/peak-running-shoes', title: 'Peak Performance Running Shoes' },
    { url: '/cart', title: 'Shopping Cart' },
    { url: '/checkout', title: 'Checkout' },
    { url: '/checkout/shipping', title: 'Checkout - Shipping' },
    { url: '/checkout/payment', title: 'Checkout - Payment' },
    { url: '/thank-you', title: 'Order Complete' },
    { url: '/about', title: 'About Us' },
    { url: '/contact', title: 'Contact Us' },
    { url: '/blog', title: 'Blog' },
    { url: '/blog/getting-started', title: 'Getting Started Guide' },
    { url: '/account', title: 'My Account' },
    { url: '/account/orders', title: 'Order History' },
    { url: '/account/settings', title: 'Account Settings' },
];

// Common user journey paths
const USER_JOURNEYS = [
    // Successful purchase path
    ['/', '/products', '/products/aurora-wireless-headphones', '/cart', '/checkout', '/checkout/shipping', '/checkout/payment', '/thank-you'],
    // Browse and abandon
    ['/', '/products', '/products/nimbus-smartwatch', '/cart', '/products'],
    // Quick purchase
    ['/products/luma-cotton-tshirt', '/cart', '/checkout', '/checkout/payment', '/thank-you'],
    // Exploration path
    ['/', '/about', '/products', '/products/peak-running-shoes', '/products/aurora-wireless-headphones', '/cart'],
    // Content to purchase
    ['/blog', '/blog/getting-started', '/products', '/products/nimbus-smartwatch', '/cart', '/checkout', '/thank-you'],
    // Account management
    ['/', '/account', '/account/orders', '/account/settings'],
    // Cart abandonment
    ['/', '/products', '/cart', '/'],
    // Long browse session
    ['/', '/products', '/products/aurora-wireless-headphones', '/products/nimbus-smartwatch', '/products/luma-cotton-tshirt', '/products/peak-running-shoes', '/cart'],
];

const DEVICES = ['desktop', 'mobile', 'tablet'];
const BROWSERS = ['Chrome', 'Safari', 'Firefox', 'Edge'];
const OS_TYPES = ['Windows', 'macOS', 'iOS', 'Android', 'Linux'];
const REFERRERS = [
    'https://www.google.com',
    'https://www.facebook.com',
    'https://twitter.com',
    'https://www.linkedin.com',
    '',
    'direct',
];

/**
 * Generate realistic page views based on user journeys
 */
async function seedPageViews(count = 500) {
    try {
        console.log(`Seeding ${count} page views...`);

        const pageViews = [];
        const sessionCount = Math.ceil(count / 5); // Average 5 page views per session

        for (let i = 0; i < sessionCount; i++) {
            // Create a session
            const sessionId = `session-${uuidv4()}`;
            const userId = Math.random() > 0.3 ? `user-${uuidv4()}` : null; // 70% have userId
            const device = DEVICES[Math.floor(Math.random() * DEVICES.length)];
            const browser = BROWSERS[Math.floor(Math.random() * BROWSERS.length)];
            const os = OS_TYPES[Math.floor(Math.random() * OS_TYPES.length)];
            const referrer = REFERRERS[Math.floor(Math.random() * REFERRERS.length)];

            // Pick a random journey or create a random path
            let journey;
            if (Math.random() > 0.3) {
                journey = USER_JOURNEYS[Math.floor(Math.random() * USER_JOURNEYS.length)];
            } else {
                // Random path
                const pathLength = Math.floor(Math.random() * 4) + 2;
                journey = [];
                for (let j = 0; j < pathLength; j++) {
                    journey.push(SAMPLE_PAGES[Math.floor(Math.random() * SAMPLE_PAGES.length)].url);
                }
            }

            // Create page views for this journey
            let sessionStart = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Last 7 days

            for (let j = 0; j < journey.length; j++) {
                const pageUrl = journey[j];
                const pageInfo = SAMPLE_PAGES.find(p => p.url === pageUrl) || { url: pageUrl, title: pageUrl };

                const timeOnPage = Math.floor(Math.random() * 180) + 10; // 10-190 seconds
                const scrollDepth = Math.floor(Math.random() * 100) + 1; // 1-100%

                pageViews.push({
                    sessionId,
                    userId,
                    projectId: 'default',
                    pageURL: pageInfo.url,
                    pageTitle: pageInfo.title,
                    referrer: j === 0 ? referrer : journey[j - 1],
                    timestamp: new Date(sessionStart),
                    timeOnPage,
                    scrollDepth,
                    exitPage: j === journey.length - 1,
                    device: {
                        type: device,
                        browser,
                        os,
                    },
                    isSeeded: true,
                });

                // Move time forward
                sessionStart = new Date(sessionStart.getTime() + timeOnPage * 1000 + Math.random() * 5000);

                if (pageViews.length >= count) break;
            }

            if (pageViews.length >= count) break;
        }

        // Insert page views
        const inserted = await PageView.insertMany(pageViews.slice(0, count));

        console.log(`✓ Seeded ${inserted.length} page views`);
        return inserted;
    } catch (error) {
        console.error('Error seeding page views:', error);
        throw error;
    }
}

/**
 * Clear seeded page views
 */
async function clearSeededPageViews() {
    try {
        const result = await PageView.deleteMany({ isSeeded: true });
        console.log(`✓ Cleared ${result.deletedCount} seeded page views`);
        return result;
    } catch (error) {
        console.error('Error clearing seeded page views:', error);
        throw error;
    }
}

module.exports = {
    seedPageViews,
    clearSeededPageViews,
};
