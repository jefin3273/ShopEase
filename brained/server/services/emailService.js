const nodemailer = require('nodemailer');

/**
 * Email Service for sending reports and notifications
 * Supports SMTP configuration via environment variables
 */

// Create transporter with SMTP configuration
const createTransport = () => {
    // Check if email is configured
    if (!process.env.SMTP_HOST) {
        console.warn('[EmailService] SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env');
        return null;
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

/**
 * Send an email with report attachment
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML email body
 * @param {Array} options.attachments - Array of attachments {filename, content}
 */
const sendEmail = async ({ to, subject, html, attachments = [] }) => {
    const transporter = createTransport();

    if (!transporter) {
        throw new Error('Email service not configured. Please set SMTP environment variables.');
    }

    const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        html,
        attachments,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('[EmailService] Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[EmailService] Failed to send email:', error);
        throw error;
    }
};

/**
 * Send a report email with CSV/PDF attachments
 */
const sendReport = async ({ to, reportName, description, csvData, pdfBuffer }) => {
    const attachments = [];

    if (csvData) {
        attachments.push({
            filename: `${reportName}.csv`,
            content: csvData,
            contentType: 'text/csv',
        });
    }

    if (pdfBuffer) {
        attachments.push({
            filename: `${reportName}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
        });
    }

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">📊 PagePulse Report</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">${reportName}</h2>
        <p style="color: #4b5563; line-height: 1.6;">${description}</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
          <p style="color: #6b7280; margin: 0; font-size: 14px;">
            <strong>Generated:</strong> ${new Date().toLocaleString()}<br>
            <strong>Attachments:</strong> ${attachments.length} file(s)
          </p>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated report from PagePulse Analytics. The attached files contain detailed data for the period specified.
        </p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} PagePulse Analytics. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;

    return sendEmail({
        to,
        subject: `PagePulse Report: ${reportName}`,
        html,
        attachments,
    });
};

/**
 * Send a test email to verify configuration
 */
const sendTestEmail = async (to) => {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #667eea;">✅ Email Configuration Test</h2>
      <p>If you're reading this, your PagePulse email service is configured correctly!</p>
      <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
        Sent at: ${new Date().toLocaleString()}
      </p>
    </div>
  `;

    return sendEmail({
        to,
        subject: 'PagePulse Email Test',
        html,
    });
};

/**
 * Check if email service is configured
 */
const isConfigured = () => {
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
};

module.exports = {
    sendEmail,
    sendReport,
    sendTestEmail,
    isConfigured,
};
