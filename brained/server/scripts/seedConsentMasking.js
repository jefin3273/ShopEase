const mongoose = require('mongoose');
const ConsentMaskingRule = require('../models/ConsentMaskingRule');

async function seedConsentMaskingRules() {
  try {
    console.log('🔒 Seeding Consent & Masking Rules...');

    const rules = [
      {
        projectId: 'default',
        name: 'Mask Social Security Numbers',
        type: 'mask',
        selectors: ['.ssn-field', 'input[name="ssn"]', '#social-security'],
        isActive: true,
        priority: 100,
        description: 'Masks all SSN input fields for privacy compliance',
        createdBy: 'seed-system',
        isSeeded: true,
      },
      {
        projectId: 'default',
        name: 'Mask Credit Card Inputs',
        type: 'mask',
        selectors: [
          'input[name="cardNumber"]',
          'input[name="cvv"]',
          '.credit-card-field',
          '[data-sensitive="card"]',
        ],
        isActive: true,
        priority: 100,
        description: 'Masks credit card and CVV fields in session recordings',
        createdBy: 'seed-system',
        isSeeded: true,
      },
      {
        projectId: 'default',
        name: 'Mask Password Fields',
        type: 'mask',
        selectors: ['input[type="password"]', '.password-field'],
        isActive: true,
        priority: 90,
        description: 'Ensures all password fields are masked',
        createdBy: 'seed-system',
        isSeeded: true,
      },
      {
        projectId: 'default',
        name: 'Block Analytics Scripts',
        type: 'block',
        selectors: [
          '.tracking-pixel',
          'img[src*="analytics"]',
          'script[src*="google-analytics"]',
        ],
        isActive: false,
        priority: 50,
        description: 'Blocks third-party analytics elements from recordings',
        createdBy: 'seed-system',
        isSeeded: true,
      },
      {
        projectId: 'default',
        name: 'Mask Email Addresses',
        type: 'mask',
        selectors: ['input[type="email"]', 'input[name="email"]', '.email-field'],
        isActive: true,
        priority: 80,
        description: 'Masks email input fields for user privacy',
        createdBy: 'seed-system',
        isSeeded: true,
      },
      {
        projectId: 'default',
        name: 'Mask Phone Numbers',
        type: 'mask',
        selectors: ['input[type="tel"]', 'input[name="phone"]', '.phone-field'],
        isActive: true,
        priority: 80,
        description: 'Masks phone number inputs',
        createdBy: 'seed-system',
        isSeeded: true,
      },
      {
        projectId: 'default',
        name: 'Block Chat Widgets',
        type: 'block',
        selectors: [
          '#intercom-container',
          '.drift-widget',
          '.zendesk-chat',
          '[data-widget="chat"]',
        ],
        isActive: false,
        priority: 30,
        description: 'Removes chat widgets from session recordings to reduce noise',
        createdBy: 'seed-system',
        isSeeded: true,
      },
      {
        projectId: 'default',
        name: 'Mask Address Fields',
        type: 'mask',
        selectors: [
          'input[name*="address"]',
          '.address-field',
          'textarea[name="address"]',
        ],
        isActive: true,
        priority: 70,
        description: 'Masks physical address inputs',
        createdBy: 'seed-system',
        isSeeded: true,
      },
    ];

    const result = await ConsentMaskingRule.insertMany(rules);
    console.log(`✅ Seeded ${result.length} Consent & Masking Rules`);
    return result;
  } catch (error) {
    console.error('❌ Error seeding Consent & Masking Rules:', error);
    throw error;
  }
}

async function clearSeededConsentMaskingRules() {
  try {
    console.log('🗑️  Clearing seeded Consent & Masking Rules...');
    const result = await ConsentMaskingRule.deleteMany({ isSeeded: true });
    console.log(`✅ Deleted ${result.deletedCount} seeded Consent & Masking Rules`);
    return result;
  } catch (error) {
    console.error('❌ Error clearing seeded Consent & Masking Rules:', error);
    throw error;
  }
}

module.exports = { seedConsentMaskingRules, clearSeededConsentMaskingRules };
