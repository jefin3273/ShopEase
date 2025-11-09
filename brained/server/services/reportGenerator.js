const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const EventAnalytics = require('../models/EventAnalytics');
const PerformanceMetrics = require('../models/PerformanceMetrics');
const UserInteraction = require('../models/UserInteraction');
const Funnel = require('../models/Funnel');
const Cohort = require('../models/Cohort');

/**
 * Generate report data based on report configuration
 * Returns CSV data and PDF buffer
 */
const generateReportData = async (report) => {
  const { reportType, config } = report;

  // Build date range filter
  const dateFilter = buildDateFilter(config);

  // Build query filter
  const baseFilter = { ...dateFilter };
  if (config.pageURL) baseFilter.pageURL = config.pageURL;
  if (config.device) baseFilter['deviceInfo.device'] = config.device;

  let csvData = '';
  let pdfBuffer = null;

  switch (reportType) {
    case 'analytics':
      ({ csvData, pdfBuffer } = await generateAnalyticsReport(baseFilter, config));
      break;
    case 'performance':
      ({ csvData, pdfBuffer } = await generatePerformanceReport(baseFilter, config));
      break;
    case 'funnel':
      ({ csvData, pdfBuffer } = await generateFunnelReport(config));
      break;
    case 'cohort':
      ({ csvData, pdfBuffer } = await generateCohortReport(config));
      break;
    case 'behavior':
      ({ csvData, pdfBuffer } = await generateBehaviorReport(baseFilter, config));
      break;
    case 'errors':
      ({ csvData, pdfBuffer } = await generateErrorsReport(baseFilter, config));
      break;
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }

  return { csvData, pdfBuffer };
};

/**
 * Build date filter from config
 */
const buildDateFilter = (config) => {
  const filter = {};
  
  if (config.dateRange === 'custom' && config.customDateRange) {
    filter.timestamp = {};
    if (config.customDateRange.from) {
      filter.timestamp.$gte = new Date(config.customDateRange.from);
    }
    if (config.customDateRange.to) {
      filter.timestamp.$lte = new Date(config.customDateRange.to);
    }
  } else {
    // Use preset date ranges
    const now = new Date();
    const ranges = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
    };
    
    const days = ranges[config.dateRange] || 7;
    filter.timestamp = {
      $gte: new Date(now - days * 24 * 60 * 60 * 1000),
      $lte: now,
    };
  }
  
  return filter;
};

/**
 * Generate Analytics Report
 */
const generateAnalyticsReport = async (filter, config) => {
  // Fetch events data
  const events = await EventAnalytics.find(filter)
    .sort({ timestamp: -1 })
    .limit(10000)
    .lean();

  // Get summary stats
  const eventSummary = await EventAnalytics.aggregate([
    { $match: filter },
    { $group: { _id: '$eventType', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // CSV data
  const csvRows = events.map(e => ({
    timestamp: e.timestamp,
    eventType: e.eventType,
    element: e.element,
    pageURL: e.pageURL,
    device: e.deviceInfo?.device || 'unknown',
    browser: e.deviceInfo?.browser || 'unknown',
    os: e.deviceInfo?.os || 'unknown',
  }));

  const parser = new Parser();
  const csvData = parser.parse(csvRows);

  // PDF (simplified - basic stats)
  const pdfBuffer = await generateBasicPDF({
    title: 'Analytics Report',
    summary: eventSummary,
    data: csvRows.slice(0, 100), // First 100 rows
  });

  return { csvData, pdfBuffer };
};

/**
 * Generate Performance Report
 */
const generatePerformanceReport = async (filter, config) => {
  const metrics = await PerformanceMetrics.find(filter)
    .sort({ timestamp: -1 })
    .limit(10000)
    .lean();

  // Calculate averages
  const avgMetrics = {
    TTFB: metrics.reduce((sum, m) => sum + (m.TTFB || 0), 0) / metrics.length || 0,
    LCP: metrics.reduce((sum, m) => sum + (m.LCP || 0), 0) / metrics.length || 0,
    FCP: metrics.reduce((sum, m) => sum + (m.FCP || 0), 0) / metrics.length || 0,
    CLS: metrics.reduce((sum, m) => sum + (m.CLS || 0), 0) / metrics.length || 0,
    loadTime: metrics.reduce((sum, m) => sum + (m.loadTime || 0), 0) / metrics.length || 0,
  };

  const csvRows = metrics.map(m => ({
    timestamp: m.timestamp,
    pageURL: m.pageURL,
    TTFB: m.TTFB,
    LCP: m.LCP,
    FCP: m.FCP,
    CLS: m.CLS,
    INP: m.INP,
    FID: m.FID,
    loadTime: m.loadTime,
    device: m.deviceInfo?.device || 'unknown',
    browser: m.deviceInfo?.browser || 'unknown',
  }));

  const parser = new Parser();
  const csvData = parser.parse(csvRows);

  const pdfBuffer = await generateBasicPDF({
    title: 'Performance Report',
    summary: [avgMetrics],
    data: csvRows.slice(0, 50),
  });

  return { csvData, pdfBuffer };
};

/**
 * Generate Behavior Report (Rage/Dead clicks)
 */
const generateBehaviorReport = async (filter, config) => {
  // This would include rage clicks, dead clicks analysis
  const interactions = await UserInteraction.find(filter)
    .sort({ timestamp: -1 })
    .limit(5000)
    .lean();

  const csvRows = interactions.map(i => ({
    timestamp: i.timestamp,
    sessionId: i.sessionId,
    eventType: i.eventType,
    pageURL: i.pageURL,
    element: i.metadata?.element || '',
    elementId: i.metadata?.elementId || '',
  }));

  const parser = new Parser();
  const csvData = parser.parse(csvRows);

  const pdfBuffer = await generateBasicPDF({
    title: 'Behavior Report',
    data: csvRows.slice(0, 100),
  });

  return { csvData, pdfBuffer };
};

/**
 * Generate Errors Report
 */
const generateErrorsReport = async (filter, config) => {
  const docs = await PerformanceMetrics.find(filter)
    .select('sessionId pageURL jsErrors timestamp deviceInfo')
    .sort({ timestamp: -1 })
    .lean();

  const errorRows = [];
  docs.forEach(doc => {
    const errors = Array.isArray(doc.jsErrors) ? doc.jsErrors : [];
    errors.forEach(err => {
      errorRows.push({
        timestamp: doc.timestamp,
        pageURL: doc.pageURL,
        sessionId: doc.sessionId,
        errorName: err?.name || 'Error',
        errorMessage: err?.message || 'Unknown error',
        device: doc.deviceInfo?.device || 'unknown',
        browser: doc.deviceInfo?.browser || 'unknown',
      });
    });
  });

  const parser = new Parser();
  const csvData = parser.parse(errorRows.slice(0, 5000));

  const pdfBuffer = await generateBasicPDF({
    title: 'Errors Report',
    data: errorRows.slice(0, 100),
  });

  return { csvData, pdfBuffer };
};

/**
 * Generate Funnel Report (placeholder)
 */
const generateFunnelReport = async (config) => {
  // Simplified - would need funnel ID from config
  return {
    csvData: 'Funnel,Step,Conversions\nCheckout,Step1,100',
    pdfBuffer: await generateBasicPDF({ title: 'Funnel Report', data: [] }),
  };
};

/**
 * Generate Cohort Report (placeholder)
 */
const generateCohortReport = async (config) => {
  return {
    csvData: 'Cohort,Users,RetentionRate\nAll Users,1000,75%',
    pdfBuffer: await generateBasicPDF({ title: 'Cohort Report', data: [] }),
  };
};

/**
 * Generate basic PDF document
 */
const generateBasicPDF = async ({ title, summary, data }) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(24).text(title, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);

      // Summary section
      if (summary && summary.length > 0) {
        doc.fontSize(16).text('Summary', { underline: true });
        doc.moveDown();
        doc.fontSize(10).text(JSON.stringify(summary, null, 2));
        doc.moveDown(2);
      }

      // Data preview
      if (data && data.length > 0) {
        doc.fontSize(16).text('Data Preview (first 20 rows)', { underline: true });
        doc.moveDown();
        
        const preview = data.slice(0, 20);
        doc.fontSize(8).text(JSON.stringify(preview, null, 2));
      }

      // Footer
      doc.fontSize(8).text(
        'PagePulse Analytics - Detailed data available in CSV attachment',
        50,
        doc.page.height - 50,
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateReportData,
};
