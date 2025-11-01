/**
 * Lightweight PostHog client wrapper for server-side event capture.
 * It is intentionally tolerant: if POSTHOG_API_KEY or POSTHOG_HOST
 * are not present the functions become no-ops so this integration is
 * safe to keep in code without requiring PostHog to be running.
 */
const PostHog = require('posthog-node');

let client = null;
if (process.env.POSTHOG_API_KEY && process.env.POSTHOG_HOST) {
  try {
    client = new PostHog(process.env.POSTHOG_API_KEY, { host: process.env.POSTHOG_HOST });
    console.log('PostHog client initialized');
  } catch (err) {
    console.warn('Failed to initialize PostHog client', err.message || err);
    client = null;
  }
} else {
  console.log('PostHog not configured (POSTHOG_API_KEY or POSTHOG_HOST missing)');
}

const capture = async (distinctId, event, properties = {}) => {
  if (!client) return;
  try {
    client.capture({ distinctId: distinctId || 'anonymous', event, properties });
  } catch (err) {
    // don't let analytics failures crash the API
    console.warn('PostHog capture error', err && err.message ? err.message : err);
  }
};

const shutdown = async () => {
  if (!client) return;
  try {
    await client.shutdown();
  } catch (err) {
    // ignore
  }
};

module.exports = { capture, shutdown };
