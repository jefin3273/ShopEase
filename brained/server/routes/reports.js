const express = require('express');
const router = express.Router();
const ScheduledReport = require('../models/ScheduledReport');
const { sendReport, sendTestEmail, isConfigured } = require('../services/emailService');
const { generateReportData } = require('../services/reportGenerator');

/**
 * GET /api/reports/scheduled
 * Get all scheduled reports
 */
router.get('/scheduled', async (req, res) => {
  try {
    const { projectId = 'default' } = req.query;
    const reports = await ScheduledReport.find({ projectId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, reports });
  } catch (error) {
    console.error('[Reports] Error fetching scheduled reports:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch scheduled reports' });
  }
});

/**
 * GET /api/reports/scheduled/:id
 * Get a specific scheduled report
 */
router.get('/scheduled/:id', async (req, res) => {
  try {
    const report = await ScheduledReport.findById(req.params.id).lean();

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    res.json({ success: true, report });
  } catch (error) {
    console.error('[Reports] Error fetching report:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch report' });
  }
});

/**
 * POST /api/reports/scheduled
 * Create a new scheduled report
 */
router.post('/scheduled', async (req, res) => {
  try {
    const reportData = req.body;

    // Validate recipients
    if (!reportData.recipients || reportData.recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one recipient is required' });
    }

    const report = new ScheduledReport(reportData);

    // Calculate initial next run date
    report.calculateNextRun();

    await report.save();

    res.status(201).json({
      success: true,
      message: 'Scheduled report created successfully',
      report
    });
  } catch (error) {
    console.error('[Reports] Error creating scheduled report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create scheduled report',
      error: error.message
    });
  }
});

/**
 * PUT /api/reports/scheduled/:id
 * Update a scheduled report
 */
router.put('/scheduled/:id', async (req, res) => {
  try {
    const report = await ScheduledReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    Object.assign(report, req.body);

    // Recalculate next run if schedule changed
    if (req.body.schedule) {
      report.calculateNextRun();
    }

    await report.save();

    res.json({
      success: true,
      message: 'Report updated successfully',
      report
    });
  } catch (error) {
    console.error('[Reports] Error updating report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update report',
      error: error.message
    });
  }
});

/**
 * DELETE /api/reports/scheduled/:id
 * Delete a scheduled report
 */
router.delete('/scheduled/:id', async (req, res) => {
  try {
    const report = await ScheduledReport.findByIdAndDelete(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('[Reports] Error deleting report:', error);
    res.status(500).json({ success: false, message: 'Failed to delete report' });
  }
});

/**
 * POST /api/reports/scheduled/:id/pause
 * Pause a scheduled report
 */
router.post('/scheduled/:id/pause', async (req, res) => {
  try {
    const report = await ScheduledReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    report.status = 'paused';
    await report.save();

    res.json({
      success: true,
      message: 'Report paused successfully',
      report
    });
  } catch (error) {
    console.error('[Reports] Error pausing report:', error);
    res.status(500).json({ success: false, message: 'Failed to pause report' });
  }
});

/**
 * POST /api/reports/scheduled/:id/resume
 * Resume a paused report
 */
router.post('/scheduled/:id/resume', async (req, res) => {
  try {
    const report = await ScheduledReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    report.status = 'active';
    report.calculateNextRun();
    await report.save();

    res.json({
      success: true,
      message: 'Report resumed successfully',
      report
    });
  } catch (error) {
    console.error('[Reports] Error resuming report:', error);
    res.status(500).json({ success: false, message: 'Failed to resume report' });
  }
});

/**
 * POST /api/reports/scheduled/:id/run-now
 * Manually trigger a report to run immediately
 */
router.post('/scheduled/:id/run-now', async (req, res) => {
  try {
    const report = await ScheduledReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Generate report data
    const { csvData, pdfBuffer } = await generateReportData(report);

    // Send to all recipients
    const sendPromises = report.recipients.map(recipient =>
      sendReport({
        to: recipient.email,
        reportName: report.name,
        description: report.description || `${report.reportType} report`,
        csvData,
        pdfBuffer,
      })
    );

    await Promise.all(sendPromises);

    // Update report stats
    await report.recordRun(true);

    res.json({
      success: true,
      message: 'Report sent successfully to all recipients',
      recipients: report.recipients.length
    });
  } catch (error) {
    console.error('[Reports] Error running report:', error);

    // Record failed run if report exists
    if (req.params.id) {
      try {
        const report = await ScheduledReport.findById(req.params.id);
        if (report) {
          await report.recordRun(false, error.message);
        }
      } catch (updateError) {
        console.error('[Reports] Error recording failed run:', updateError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to send report',
      error: error.message
    });
  }
});

/**
 * POST /api/reports/send-now
 * Send a one-time report without scheduling
 */
router.post('/send-now', async (req, res) => {
  try {
    const { reportType, config, recipients, pdfData, csvData, reportName } = req.body;

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one recipient is required' });
    }

    let finalPdfBuffer = null;
    let finalCsvData = csvData || null;

    // If PDF data is provided from frontend (base64), use it
    if (pdfData) {
      finalPdfBuffer = Buffer.from(pdfData, 'base64');
    } else {
      // Otherwise, generate report data from backend
      const tempReport = {
        reportType,
        config,
        name: reportName || `${reportType} Report - ${new Date().toLocaleDateString()}`,
      };

      const generated = await generateReportData(tempReport);
      finalCsvData = generated.csvData;
      finalPdfBuffer = generated.pdfBuffer;
    }

    const finalReportName = reportName || `${reportType} Report - ${new Date().toLocaleDateString()}`;

    // Send to all recipients
    const sendPromises = recipients.map(email =>
      sendReport({
        to: email,
        reportName: finalReportName,
        description: `One-time ${reportType} report`,
        csvData: finalCsvData,
        pdfBuffer: finalPdfBuffer,
      })
    );

    await Promise.all(sendPromises);

    res.json({
      success: true,
      message: 'Report sent successfully',
      recipients: recipients.length
    });
  } catch (error) {
    console.error('[Reports] Error sending one-time report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send report',
      error: error.message
    });
  }
});

/**
 * GET /api/reports/email-config
 * Check if email is configured
 */
router.get('/email-config', (req, res) => {
  res.json({
    configured: isConfigured(),
    message: isConfigured()
      ? 'Email service is configured and ready'
      : 'Email service not configured. Set SMTP environment variables.'
  });
});

/**
 * POST /api/reports/test-email
 * Send a test email
 */
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    await sendTestEmail(email);

    res.json({
      success: true,
      message: 'Test email sent successfully'
    });
  } catch (error) {
    console.error('[Reports] Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
});

module.exports = router;
