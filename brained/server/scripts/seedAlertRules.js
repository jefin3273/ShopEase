const mongoose = require('mongoose');
const AlertRule = require('../models/AlertRule');

async function seedAlertRules() {
  try {
    console.log('🔔 Seeding Alert Rules...');

    const alertRules = [
      {
        name: 'High LCP Alert',
        projectId: 'default',
        metric: 'lcp_p75',
        comparator: '>',
        threshold: 2500,
        windowMinutes: 5,
        channel: 'slack',
        slackWebhook: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
        isActive: true,
        cooldownMs: 10 * 60 * 1000,
        createdBy: 'seed-system',
        isSeeded: true,
      },
      {
        name: 'Poor CLS Score',
        projectId: 'default',
        metric: 'cls_p75',
        comparator: '>',
        threshold: 0.25,
        windowMinutes: 5,
        channel: 'webhook',
        webhookUrl: 'https://example.com/webhooks/alerts',
        isActive: true,
        cooldownMs: 15 * 60 * 1000,
        createdBy: 'seed-system',
        isSeeded: true,
      },
      {
        name: 'High Error Rate',
        projectId: 'default',
        metric: 'js_errors_per_minute',
        comparator: '>',
        threshold: 5,
        windowMinutes: 3,
        channel: 'slack',
        slackWebhook: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
        isActive: true,
        cooldownMs: 5 * 60 * 1000,
        createdBy: 'seed-system',
        isSeeded: true,
      },
      {
        name: 'Low Event Volume',
        projectId: 'default',
        metric: 'events_per_minute',
        comparator: '<',
        threshold: 10,
        windowMinutes: 10,
        channel: 'webhook',
        webhookUrl: 'https://example.com/webhooks/low-traffic',
        isActive: false,
        cooldownMs: 30 * 60 * 1000,
        createdBy: 'seed-system',
        isSeeded: true,
      },
      {
        name: 'Slow INP Detection',
        projectId: 'default',
        metric: 'inp_p75',
        comparator: '>',
        threshold: 500,
        windowMinutes: 5,
        channel: 'slack',
        slackWebhook: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
        isActive: true,
        cooldownMs: 10 * 60 * 1000,
        createdBy: 'seed-system',
        isSeeded: true,
      },
      {
        name: 'Event Spike Alert',
        projectId: 'default',
        metric: 'events_per_minute',
        comparator: '>',
        threshold: 1000,
        windowMinutes: 1,
        channel: 'webhook',
        webhookUrl: 'https://example.com/webhooks/spike',
        isActive: true,
        cooldownMs: 5 * 60 * 1000,
        createdBy: 'seed-system',
        isSeeded: true,
      },
    ];

    const result = await AlertRule.insertMany(alertRules);
    console.log(`✅ Seeded ${result.length} Alert Rules`);
    return result;
  } catch (error) {
    console.error('❌ Error seeding Alert Rules:', error);
    throw error;
  }
}

async function clearSeededAlertRules() {
  try {
    console.log('🗑️  Clearing seeded Alert Rules...');
    const result = await AlertRule.deleteMany({ isSeeded: true });
    console.log(`✅ Deleted ${result.deletedCount} seeded Alert Rules`);
    return result;
  } catch (error) {
    console.error('❌ Error clearing seeded Alert Rules:', error);
    throw error;
  }
}

module.exports = { seedAlertRules, clearSeededAlertRules };
