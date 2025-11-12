const Funnel = require('../models/Funnel');

// Sample funnels for analysis
const SAMPLE_FUNNELS = [
    {
        name: 'E-commerce Checkout Flow',
        description: 'Primary purchase funnel from product view to order completion',
        projectId: 'default',
        steps: [
            {
                order: 1,
                name: 'Product View',
                eventType: 'pageview',
                pageURL: '/products',
            },
            {
                order: 2,
                name: 'Add to Cart',
                eventType: 'click',
                element: '.add-to-cart-button',
            },
            {
                order: 3,
                name: 'View Cart',
                eventType: 'pageview',
                pageURL: '/cart',
            },
            {
                order: 4,
                name: 'Checkout',
                eventType: 'pageview',
                pageURL: '/checkout',
            },
            {
                order: 5,
                name: 'Order Complete',
                eventType: 'pageview',
                pageURL: '/thank-you',
            },
        ],
        stats: {
            totalEntered: 10000,
            completed: 1512,
            conversionRate: 15.12,
            avgTimeToComplete: 420, // 7 minutes
            dropoffByStep: [
                { step: 1, count: 0, dropoffRate: 0 },
                { step: 2, count: 6800, dropoffRate: 68 },
                { step: 3, count: 1100, dropoffRate: 34.4 },
                { step: 4, count: 420, dropoffRate: 20 },
                { step: 5, count: 168, dropoffRate: 10 },
            ],
        },
        timeWindow: {
            value: 30,
            unit: 'minutes',
        },
        isActive: true,
    },
    {
        name: 'Quick Purchase Flow',
        description: 'Shortened checkout for returning customers',
        projectId: 'default',
        steps: [
            {
                order: 1,
                name: 'Product Page',
                eventType: 'pageview',
                pageURL: '/products/',
            },
            {
                order: 2,
                name: 'Quick Buy',
                eventType: 'click',
                element: '.quick-buy-button',
            },
            {
                order: 3,
                name: 'Payment',
                eventType: 'pageview',
                pageURL: '/checkout/payment',
            },
            {
                order: 4,
                name: 'Order Complete',
                eventType: 'pageview',
                pageURL: '/thank-you',
            },
        ],
        stats: {
            totalEntered: 5000,
            completed: 1850,
            conversionRate: 37,
            avgTimeToComplete: 180, // 3 minutes
            dropoffByStep: [
                { step: 1, count: 0, dropoffRate: 0 },
                { step: 2, count: 1500, dropoffRate: 30 },
                { step: 3, count: 1200, dropoffRate: 34.3 },
                { step: 4, count: 450, dropoffRate: 19.6 },
            ],
        },
        timeWindow: {
            value: 15,
            unit: 'minutes',
        },
        isActive: true,
    },
    {
        name: 'Account Registration',
        description: 'User sign-up and onboarding flow',
        projectId: 'default',
        steps: [
            {
                order: 1,
                name: 'Landing Page',
                eventType: 'pageview',
                pageURL: '/',
            },
            {
                order: 2,
                name: 'Sign Up Click',
                eventType: 'click',
                element: '.signup-button',
            },
            {
                order: 3,
                name: 'Email Entered',
                eventType: 'custom',
                eventName: 'email_entered',
            },
            {
                order: 4,
                name: 'Password Created',
                eventType: 'custom',
                eventName: 'password_created',
            },
            {
                order: 5,
                name: 'Account Created',
                eventType: 'custom',
                eventName: 'account_created',
            },
        ],
        stats: {
            totalEntered: 8000,
            completed: 4800,
            conversionRate: 60,
            avgTimeToComplete: 120, // 2 minutes
            dropoffByStep: [
                { step: 1, count: 0, dropoffRate: 0 },
                { step: 2, count: 1600, dropoffRate: 20 },
                { step: 3, count: 800, dropoffRate: 13.3 },
                { step: 4, count: 480, dropoffRate: 9.1 },
                { step: 5, count: 320, dropoffRate: 6.3 },
            ],
        },
        timeWindow: {
            value: 10,
            unit: 'minutes',
        },
        isActive: true,
    },
    {
        name: 'Cart Recovery Flow',
        description: 'Abandoned cart to completed purchase journey',
        projectId: 'default',
        steps: [
            {
                order: 1,
                name: 'Cart Abandoned',
                eventType: 'custom',
                eventName: 'cart_abandoned',
            },
            {
                order: 2,
                name: 'Recovery Email Sent',
                eventType: 'custom',
                eventName: 'recovery_email_sent',
            },
            {
                order: 3,
                name: 'Email Clicked',
                eventType: 'custom',
                eventName: 'recovery_email_clicked',
            },
            {
                order: 4,
                name: 'Return to Cart',
                eventType: 'pageview',
                pageURL: '/cart',
            },
            {
                order: 5,
                name: 'Purchase Complete',
                eventType: 'pageview',
                pageURL: '/thank-you',
            },
        ],
        stats: {
            totalEntered: 3200,
            completed: 384,
            conversionRate: 12,
            avgTimeToComplete: 14400, // 4 hours
            dropoffByStep: [
                { step: 1, count: 0, dropoffRate: 0 },
                { step: 2, count: 320, dropoffRate: 10 },
                { step: 3, count: 1760, dropoffRate: 61.1 },
                { step: 4, count: 448, dropoffRate: 38.9 },
                { step: 5, count: 288, dropoffRate: 25 },
            ],
        },
        timeWindow: {
            value: 48,
            unit: 'hours',
        },
        isActive: true,
    },
    {
        name: 'Content to Product Flow',
        description: 'Blog readers converting to product pages',
        projectId: 'default',
        steps: [
            {
                order: 1,
                name: 'Blog Post',
                eventType: 'pageview',
                pageURL: '/blog',
            },
            {
                order: 2,
                name: 'CTA Click',
                eventType: 'click',
                element: '.blog-cta',
            },
            {
                order: 3,
                name: 'Product Page',
                eventType: 'pageview',
                pageURL: '/products',
            },
            {
                order: 4,
                name: 'Add to Cart',
                eventType: 'click',
                element: '.add-to-cart-button',
            },
        ],
        stats: {
            totalEntered: 6000,
            completed: 1800,
            conversionRate: 30,
            avgTimeToComplete: 300, // 5 minutes
            dropoffByStep: [
                { step: 1, count: 0, dropoffRate: 0 },
                { step: 2, count: 2400, dropoffRate: 40 },
                { step: 3, count: 1200, dropoffRate: 33.3 },
                { step: 4, count: 600, dropoffRate: 25 },
            ],
        },
        timeWindow: {
            value: 20,
            unit: 'minutes',
        },
        isActive: true,
    },
];

/**
 * Seed funnel configurations
 */
async function seedFunnels() {
    try {
        console.log('Seeding funnels...');

        // Mark as seeded
        const funnelsToInsert = SAMPLE_FUNNELS.map(funnel => ({
            ...funnel,
            isSeeded: true,
        }));

        const inserted = await Funnel.insertMany(funnelsToInsert);

        console.log(`✓ Seeded ${inserted.length} funnels`);
        return inserted;
    } catch (error) {
        console.error('Error seeding funnels:', error);
        throw error;
    }
}

/**
 * Clear seeded funnels
 */
async function clearSeededFunnels() {
    try {
        const result = await Funnel.deleteMany({ isSeeded: true });
        console.log(`✓ Cleared ${result.deletedCount} seeded funnels`);
        return result;
    } catch (error) {
        console.error('Error clearing seeded funnels:', error);
        throw error;
    }
}

module.exports = {
    seedFunnels,
    clearSeededFunnels,
};
