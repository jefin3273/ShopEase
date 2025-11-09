/**
 * Quick Email Test Script
 * Run this to test if your email configuration is working
 * 
 * Usage:
 *   node server/testEmail.js
 */

require('dotenv').config();
const { sendTestEmail, isConfigured } = require('./services/emailService');

async function testEmail() {
    console.log('🧪 Testing PagePulse Email Configuration...\n');

    // Check if configured
    if (!isConfigured()) {
        console.error('❌ Email service is NOT configured!');
        console.error('Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in your .env file');
        process.exit(1);
    }

    console.log('✅ Email service is configured');
    console.log('📧 SMTP Host:', process.env.SMTP_HOST);
    console.log('📧 SMTP User:', process.env.SMTP_USER);
    console.log('📧 SMTP Port:', process.env.SMTP_PORT);
    console.log('\n📤 Sending test email...\n');

    try {
        const testEmailAddress = process.env.SMTP_USER; // Send to yourself
        await sendTestEmail(testEmailAddress);
        console.log('✅ Test email sent successfully!');
        console.log(`📬 Check your inbox at: ${testEmailAddress}`);
    } catch (error) {
        console.error('❌ Failed to send test email:');
        console.error(error.message);
        console.error('\nCommon issues:');
        console.error('1. Make sure you\'re using an App Password for Gmail (not regular password)');
        console.error('2. Check that SMTP credentials are correct');
        console.error('3. Ensure your firewall allows SMTP connections');
        process.exit(1);
    }
}

testEmail();
