const cron = require('node-cron');
const ScheduledReport = require('../models/ScheduledReport');
const { sendReport } = require('./emailService');
const { generateReportData } = require('./reportGenerator');

/**
 * Report Scheduler Service
 * Handles scheduled report execution using cron
 */

let scheduledTasks = new Map();

/**
 * Initialize the report scheduler
 * Loads all active scheduled reports and sets up cron jobs
 */
const initializeScheduler = async () => {
  try {
    console.log('[ReportScheduler] Initializing scheduler...');
    
    // Clear existing tasks
    scheduledTasks.forEach(task => task.stop());
    scheduledTasks.clear();

    // Load all active reports
    const reports = await ScheduledReport.find({ 
      status: { $in: ['active'] },
      'schedule.enabled': true 
    });

    console.log(`[ReportScheduler] Found ${reports.length} active scheduled reports`);

    // Schedule each report
    for (const report of reports) {
      scheduleReport(report);
    }

    // Run every minute to check for reports that need to run
    cron.schedule('* * * * *', async () => {
      await checkAndRunDueReports();
    });

    console.log('[ReportScheduler] Scheduler initialized successfully');
  } catch (error) {
    console.error('[ReportScheduler] Error initializing scheduler:', error);
  }
};

/**
 * Schedule a specific report
 */
const scheduleReport = (report) => {
  try {
    const cronExpression = getCronExpression(report.schedule);
    
    if (!cronExpression) {
      console.error(`[ReportScheduler] Invalid schedule for report ${report._id}`);
      return;
    }

    // Remove existing task if any
    if (scheduledTasks.has(report._id.toString())) {
      scheduledTasks.get(report._id.toString()).stop();
    }

    // Create new cron task
    const task = cron.schedule(cronExpression, async () => {
      await runReport(report._id);
    });

    scheduledTasks.set(report._id.toString(), task);
    
    console.log(`[ReportScheduler] Scheduled report ${report._id} with cron: ${cronExpression}`);
    console.log(`[ReportScheduler] Next run: ${report.nextRun}`);
  } catch (error) {
    console.error(`[ReportScheduler] Error scheduling report ${report._id}:`, error);
  }
};

/**
 * Convert schedule config to cron expression
 */
const getCronExpression = (schedule) => {
  const [hours, minutes] = (schedule.time || '09:00').split(':').map(Number);

  switch (schedule.frequency) {
    case 'daily':
      // Every day at specified time
      return `${minutes} ${hours} * * *`;

    case 'weekly':
      // Weekly on specified day
      const dayOfWeek = schedule.dayOfWeek || 1; // Default Monday
      return `${minutes} ${hours} * * ${dayOfWeek}`;

    case 'monthly':
      // Monthly on specified day
      const dayOfMonth = schedule.dayOfMonth || 1;
      return `${minutes} ${hours} ${dayOfMonth} * *`;

    case 'custom':
      // Custom cron expression
      return schedule.cronExpression || null;

    default:
      return null;
  }
};

/**
 * Check for reports that are due to run
 * This provides a backup mechanism in addition to cron scheduling
 */
const checkAndRunDueReports = async () => {
  try {
    const now = new Date();
    
    const dueReports = await ScheduledReport.find({
      status: 'active',
      'schedule.enabled': true,
      nextRun: { $lte: now },
    });

    for (const report of dueReports) {
      console.log(`[ReportScheduler] Running due report: ${report.name} (${report._id})`);
      await runReport(report._id);
    }
  } catch (error) {
    console.error('[ReportScheduler] Error checking due reports:', error);
  }
};

/**
 * Run a scheduled report
 */
const runReport = async (reportId) => {
  let report;
  
  try {
    report = await ScheduledReport.findById(reportId);
    
    if (!report) {
      console.error(`[ReportScheduler] Report ${reportId} not found`);
      return;
    }

    if (report.status !== 'active' || !report.schedule.enabled) {
      console.log(`[ReportScheduler] Skipping inactive report ${reportId}`);
      return;
    }

    console.log(`[ReportScheduler] Running report: ${report.name} (${reportId})`);

    // Generate report data
    const { csvData, pdfBuffer } = await generateReportData(report);

    // Prepare attachments based on format preference
    const formats = report.config.formats || ['both'];
    const shouldIncludeCSV = formats.includes('csv') || formats.includes('both');
    const shouldIncludePDF = formats.includes('pdf') || formats.includes('both');

    // Send to all recipients
    const sendPromises = report.recipients.map(recipient =>
      sendReport({
        to: recipient.email,
        reportName: report.name,
        description: report.description || `Scheduled ${report.reportType} report`,
        csvData: shouldIncludeCSV ? csvData : null,
        pdfBuffer: shouldIncludePDF ? pdfBuffer : null,
      })
    );

    await Promise.all(sendPromises);

    console.log(`[ReportScheduler] Report sent to ${report.recipients.length} recipients`);

    // Update report statistics
    await report.recordRun(true);

    console.log(`[ReportScheduler] Report completed successfully. Next run: ${report.nextRun}`);
  } catch (error) {
    console.error(`[ReportScheduler] Error running report ${reportId}:`, error);
    
    // Record failed run
    if (report) {
      try {
        await report.recordRun(false, error.message);
      } catch (updateError) {
        console.error('[ReportScheduler] Error recording failed run:', updateError);
      }
    }
  }
};

/**
 * Add a new report to the scheduler
 */
const addReport = (report) => {
  if (report.status === 'active' && report.schedule.enabled) {
    scheduleReport(report);
  }
};

/**
 * Remove a report from the scheduler
 */
const removeReport = (reportId) => {
  const taskId = reportId.toString();
  
  if (scheduledTasks.has(taskId)) {
    scheduledTasks.get(taskId).stop();
    scheduledTasks.delete(taskId);
    console.log(`[ReportScheduler] Removed report ${reportId} from scheduler`);
  }
};

/**
 * Update a report in the scheduler
 */
const updateReport = async (reportId) => {
  removeReport(reportId);
  
  const report = await ScheduledReport.findById(reportId);
  if (report) {
    addReport(report);
  }
};

/**
 * Get scheduler status
 */
const getStatus = () => {
  return {
    activeSchedules: scheduledTasks.size,
    scheduledReports: Array.from(scheduledTasks.keys()),
  };
};

module.exports = {
  initializeScheduler,
  scheduleReport,
  runReport,
  addReport,
  removeReport,
  updateReport,
  getStatus,
};
