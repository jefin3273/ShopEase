const Funnel = require('../models/Funnel');
const UserEvent = require('../models/UserEvent');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

// Create a new funnel
exports.createFunnel = async (req, res) => {
  try {
    const { name, description, steps, projectId } = req.body;
    const { dateRange, device, country, utmSource, referrerContains, pathPrefix } = req.query;
    if (!name || !steps || steps.length < 2) {
      return res.status(400).json({ error: 'Funnel name and at least 2 steps are required' });
    }

    const funnel = new Funnel({
      name,
      description,
      steps,
      projectId: projectId || 'default',
    });

    await funnel.save();

    res.status(201).json({ success: true, funnel });
  } catch (error) {
    console.error('Error creating funnel:', error);
    res.status(500).json({ error: 'Failed to create funnel' });
  }
};

// Get all funnels
exports.getFunnels = async (req, res) => {
  try {
    const { projectId } = req.query;

    const query = {};
    if (projectId) query.projectId = projectId;

    const funnels = await Funnel.find(query).sort({ createdAt: -1 });

    res.json({ success: true, funnels });
  } catch (error) {
    console.error('Error fetching funnels:', error);
    res.status(500).json({ error: 'Failed to fetch funnels' });
  }
};

// Get funnel by ID
exports.getFunnelById = async (req, res) => {
  try {
    const { id } = req.params;

    const funnel = await Funnel.findById(id);

    if (!funnel) {
      return res.status(404).json({ error: 'Funnel not found' });
    }

    res.json({ success: true, funnel });
  } catch (error) {
    console.error('Error fetching funnel:', error);
    res.status(500).json({ error: 'Failed to fetch funnel' });
  }
};

// Update funnel
exports.updateFunnel = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, steps } = req.body;

    const funnel = await Funnel.findByIdAndUpdate(
      id,
      { name, description, steps, updatedAt: new Date() },
      { new: true }
    );

    if (!funnel) {
      return res.status(404).json({ error: 'Funnel not found' });
    }

    res.json({ success: true, funnel });
  } catch (error) {
    console.error('Error updating funnel:', error);
    res.status(500).json({ error: 'Failed to update funnel' });
  }
};

// Delete funnel
exports.deleteFunnel = async (req, res) => {
  try {
    const { id } = req.params;

    const funnel = await Funnel.findByIdAndDelete(id);

    if (!funnel) {
      return res.status(404).json({ error: 'Funnel not found' });
    }

    res.json({ success: true, message: 'Funnel deleted successfully' });
  } catch (error) {
    console.error('Error deleting funnel:', error);
    res.status(500).json({ error: 'Failed to delete funnel' });
  }
};

// Analyze funnel with optional segment filters and conversion lift
exports.analyzeFunnel = async (req, res) => {
  try {
    const { id } = req.params;
    const { dateRange, device, country, utmSource, referrerContains, pathPrefix } = req.query;

    const funnel = await Funnel.findById(id);
    if (!funnel) return res.status(404).json({ error: 'Funnel not found' });

    // Calculate date filter
    let startDate = new Date();
    if (dateRange === '24h') startDate.setHours(startDate.getHours() - 24);
    else if (dateRange === '7d') startDate.setDate(startDate.getDate() - 7);
    else if (dateRange === '30d') startDate.setDate(startDate.getDate() - 30);
    else if (dateRange === '90d') startDate.setDate(startDate.getDate() - 90);

    const hasFilters = !!(device || country || utmSource || referrerContains || pathPrefix);

    // Helper: build base query for a step (supports optional filters)
    const buildQuery = (step, includeFilters = true) => {
      const q = {
        projectId: funnel.projectId,
        timestamp: { $gte: startDate },
        eventType: step.eventType,
      };
      if (step.pageURL) q.pageURL = step.pageURL;
      if (step.elementSelector) {
        q.$or = [
          { elementClass: { $regex: step.elementSelector.replace('.', ''), $options: 'i' } },
          { elementId: { $regex: step.elementSelector.replace('#', ''), $options: 'i' } },
        ];
      }
      if (includeFilters && hasFilters) {
        if (device) q['device.device'] = device; // assumes nested device info recorded
        if (country) q['location.country'] = country;
        if (referrerContains) q.referrer = { $regex: referrerContains, $options: 'i' };
        if (pathPrefix && !step.pageURL) q.pageURL = { $regex: `^${pathPrefix}`, $options: 'i' };
        // UTM source may live in metadata or eventName; support both heuristically
        if (utmSource) {
          q.$or = q.$or || [];
          q.$or.push(
            { 'metadata.utm.source': { $regex: `^${utmSource}$`, $options: 'i' } },
            { 'metadata.utmSource': { $regex: `^${utmSource}$`, $options: 'i' } },
            { eventName: { $regex: utmSource, $options: 'i' } }
          );
        }
      }
      return q;
    };

    // Compute baseline (no segment filters) always for lift comparison
    const baselineAnalysis = [];
    let baselinePrev = null;
    for (let i = 0; i < funnel.steps.length; i++) {
      const step = funnel.steps[i];
      const query = buildQuery(step, false); // exclude filters
      const users = await UserEvent.distinct('userId', query);
      const userCount = users.length;
      let conversionRate = 100;
      let dropoffRate = 0;
      if (i === 0) baselinePrev = userCount; else {
        conversionRate = baselinePrev > 0 ? (userCount / baselinePrev) * 100 : 0;
        dropoffRate = 100 - conversionRate;
        baselinePrev = userCount;
      }
      baselineAnalysis.push({
        stepName: step.name,
        users: userCount,
        conversionRate: Math.round(conversionRate * 10) / 10,
        dropoffRate: Math.round(dropoffRate * 10) / 10,
      });
    }

    // Compute filtered analysis (if filters supplied) else reuse baseline
    const analysis = [];
    let previousStepUsers = null;
    for (let i = 0; i < funnel.steps.length; i++) {
      const step = funnel.steps[i];
      const query = buildQuery(step, true);
      const users = await UserEvent.distinct('userId', query);
      const userCount = users.length;
      let conversionRate = 100;
      let dropoffRate = 0;
      if (i === 0) previousStepUsers = userCount; else {
        conversionRate = previousStepUsers > 0 ? (userCount / previousStepUsers) * 100 : 0;
        dropoffRate = 100 - conversionRate;
        previousStepUsers = userCount;
      }

      // Average time to next step (filtered)
      let avgTimeToNext = null;
      if (i < funnel.steps.length - 1) {
        const nextStep = funnel.steps[i + 1];
        const currentStepEvents = await UserEvent.find(query)
          .select('userId timestamp')
          .sort({ timestamp: 1 });
        const nextQuery = buildQuery(nextStep, true);
        const nextEvents = await UserEvent.find(nextQuery)
          .select('userId timestamp')
          .sort({ timestamp: 1 });
        const timeDiffs = [];
        currentStepEvents.forEach(ev => {
          const nxt = nextEvents.find(ne => ne.userId === ev.userId && ne.timestamp > ev.timestamp);
          if (nxt) timeDiffs.push((nxt.timestamp - ev.timestamp) / 1000);
        });
        if (timeDiffs.length) avgTimeToNext = Math.round(timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length);
      }

      analysis.push({
        stepName: step.name,
        users: userCount,
        conversionRate: Math.round(conversionRate * 10) / 10,
        dropoffRate: Math.round(dropoffRate * 10) / 10,
        avgTimeToNext: avgTimeToNext || null,
      });
    }

    const baselineEntries = baselineAnalysis[0]?.users || 0;
    const baselineCompleted = baselineAnalysis[baselineAnalysis.length - 1]?.users || 0;
    const baselineRate = baselineEntries ? (baselineCompleted / baselineEntries) * 100 : 0;
    const filteredEntries = analysis[0]?.users || 0;
    const filteredCompleted = analysis[analysis.length - 1]?.users || 0;
    const filteredRate = filteredEntries ? (filteredCompleted / filteredEntries) * 100 : 0;
    const conversionLiftPct = hasFilters && baselineRate ? (((filteredRate - baselineRate) / baselineRate) * 100) : 0;

    res.json({
      success: true,
      analysis,
      baseline: {
        entries: baselineEntries,
        completed: baselineCompleted,
        rate: parseFloat(baselineRate.toFixed(2)),
      },
      filtered: {
        entries: filteredEntries,
        completed: filteredCompleted,
        rate: parseFloat(filteredRate.toFixed(2)),
      },
      filtersApplied: hasFilters,
      conversionLiftPct: parseFloat(conversionLiftPct.toFixed(2)),
      filterSummary: hasFilters ? { device, country, utmSource, referrerContains, pathPrefix } : null,
    });
  } catch (error) {
    console.error('Error analyzing funnel:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to analyze funnel',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Export funnel analysis as CSV
exports.exportFunnelCSV = async (req, res) => {
  try {
    const { id } = req.params;
    const { dateRange, device, country, utmSource, referrerContains, pathPrefix } = req.query;

    // Reuse analysis logic
    req.query.dateRange = dateRange;
    const funnel = await Funnel.findById(id);
    if (!funnel) {
      return res.status(404).json({ error: 'Funnel not found' });
    }

    // Calculate date filter
    let startDate = new Date();
    if (dateRange === '24h') {
      startDate.setHours(startDate.getHours() - 24);
    } else if (dateRange === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (dateRange === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (dateRange === '90d') {
      startDate.setDate(startDate.getDate() - 90);
    }

    const hasFilters = !!(device || country || utmSource || referrerContains || pathPrefix);
    const buildQuery = (step, includeFilters = true) => {
      const q = {
        projectId: funnel.projectId,
        timestamp: { $gte: startDate },
        eventType: step.eventType,
      };
      if (step.pageURL) q.pageURL = step.pageURL;
      if (step.elementSelector) {
        q.$or = [
          { elementClass: { $regex: step.elementSelector.replace('.', ''), $options: 'i' } },
          { elementId: { $regex: step.elementSelector.replace('#', ''), $options: 'i' } },
        ];
      }
      if (includeFilters && hasFilters) {
        if (device) q['device.device'] = device;
        if (country) q['location.country'] = country;
        if (referrerContains) q.referrer = { $regex: referrerContains, $options: 'i' };
        if (pathPrefix && !step.pageURL) q.pageURL = { $regex: `^${pathPrefix}`, $options: 'i' };
        if (utmSource) {
          q.$or = q.$or || [];
          q.$or.push(
            { 'metadata.utm.source': { $regex: `^${utmSource}$`, $options: 'i' } },
            { 'metadata.utmSource': { $regex: `^${utmSource}$`, $options: 'i' } },
            { eventName: { $regex: utmSource, $options: 'i' } }
          );
        }
      }
      return q;
    };

    // Baseline
    const baselineAnalysis = [];
    let baselinePrev = null;
    for (let i = 0; i < funnel.steps.length; i++) {
      const step = funnel.steps[i];
      const query = buildQuery(step, false);
      const users = await UserEvent.distinct('userId', query);
      const userCount = users.length;
      let conversionRate = 100; let dropoffRate = 0;
      if (i === 0) baselinePrev = userCount; else {
        conversionRate = baselinePrev > 0 ? (userCount / baselinePrev) * 100 : 0;
        dropoffRate = 100 - conversionRate; baselinePrev = userCount;
      }
      baselineAnalysis.push({ stepName: step.name, users: userCount, conversionRate: Math.round(conversionRate * 10) / 10, dropoffRate: Math.round(dropoffRate * 10) / 10 });
    }

    // Filtered
    const analysis = [];
    let previousStepUsers = null;
    for (let i = 0; i < funnel.steps.length; i++) {
      const step = funnel.steps[i];
      const query = buildQuery(step, true);
      const users = await UserEvent.distinct('userId', query);
      const userCount = users.length;
      let conversionRate = 100; let dropoffRate = 0;
      if (i === 0) previousStepUsers = userCount; else {
        conversionRate = previousStepUsers > 0 ? (userCount / previousStepUsers) * 100 : 0;
        dropoffRate = 100 - conversionRate; previousStepUsers = userCount;
      }
      analysis.push({ stepName: step.name, users: userCount, conversionRate: Math.round(conversionRate * 10) / 10, dropoffRate: Math.round(dropoffRate * 10) / 10 });
    }

    const baselineEntries = baselineAnalysis[0]?.users || 0;
    const baselineCompleted = baselineAnalysis[baselineAnalysis.length - 1]?.users || 0;
    const baselineRate = baselineEntries ? (baselineCompleted / baselineEntries) * 100 : 0;
    const filteredEntries = analysis[0]?.users || 0;
    const filteredCompleted = analysis[analysis.length - 1]?.users || 0;
    const filteredRate = filteredEntries ? (filteredCompleted / filteredEntries) * 100 : 0;
    const conversionLiftPct = hasFilters && baselineRate ? (((filteredRate - baselineRate) / baselineRate) * 100) : 0;

    // Add meta fields to each row for convenience
    const rows = analysis.map(r => ({
      ...r,
      baselineRate: parseFloat(baselineRate.toFixed(2)),
      filteredRate: parseFloat(filteredRate.toFixed(2)),
      conversionLiftPct: parseFloat(conversionLiftPct.toFixed(2)),
    }));

    const fields = ['stepName', 'users', 'conversionRate', 'dropoffRate', 'baselineRate', 'filteredRate', 'conversionLiftPct'];
    const parser = new Parser({ fields });
    const csv = parser.parse(rows);

    res.header('Content-Type', 'text/csv');
    res.attachment(`funnel_${funnel.name.replace(/[^a-z0-9_-]+/gi, '_')}.csv`);
    if (hasFilters) {
      res.setHeader('X-Filters-Applied', 'true');
      res.setHeader('X-Filter-Summary', JSON.stringify({ device, country, utmSource, referrerContains, pathPrefix }));
      res.setHeader('X-Baseline-Rate', baselineRate.toFixed(2));
      res.setHeader('X-Filtered-Rate', filteredRate.toFixed(2));
      res.setHeader('X-Conversion-Lift', conversionLiftPct.toFixed(2));
    }
    res.send(csv);
  } catch (error) {
    console.error('Error exporting funnel CSV:', error);
    res.status(500).json({ error: 'Failed to export funnel CSV' });
  }
};

// Export funnel analysis as a creative PDF
exports.exportFunnelPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const { dateRange, device, country, utmSource, referrerContains, pathPrefix } = req.query;
    const funnel = await Funnel.findById(id);
    if (!funnel) {
      return res.status(404).json({ error: 'Funnel not found' });
    }

    // Calculate date filter
    let startDate = new Date();
    if (dateRange === '24h') {
      startDate.setHours(startDate.getHours() - 24);
    } else if (dateRange === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (dateRange === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (dateRange === '90d') {
      startDate.setDate(startDate.getDate() - 90);
    }

    // Build analysis data with filters + baseline
    const hasFilters = !!(device || country || utmSource || referrerContains || pathPrefix);
    const buildQuery = (step, includeFilters = true) => {
      const q = {
        projectId: funnel.projectId,
        timestamp: { $gte: startDate },
        eventType: step.eventType,
      };
      if (step.pageURL) q.pageURL = step.pageURL;
      if (step.elementSelector) {
        q.$or = [
          { elementClass: { $regex: step.elementSelector.replace('.', ''), $options: 'i' } },
          { elementId: { $regex: step.elementSelector.replace('#', ''), $options: 'i' } },
        ];
      }
      if (includeFilters && hasFilters) {
        if (device) q['device.device'] = device;
        if (country) q['location.country'] = country;
        if (referrerContains) q.referrer = { $regex: referrerContains, $options: 'i' };
        if (pathPrefix && !step.pageURL) q.pageURL = { $regex: `^${pathPrefix}`, $options: 'i' };
        if (utmSource) {
          q.$or = q.$or || [];
          q.$or.push(
            { 'metadata.utm.source': { $regex: `^${utmSource}$`, $options: 'i' } },
            { 'metadata.utmSource': { $regex: `^${utmSource}$`, $options: 'i' } },
            { eventName: { $regex: utmSource, $options: 'i' } }
          );
        }
      }
      return q;
    };

    const baselineAnalysis = [];
    let baselinePrev = null;
    for (let i = 0; i < funnel.steps.length; i++) {
      const step = funnel.steps[i];
      const query = buildQuery(step, false);
      const users = await UserEvent.distinct('userId', query);
      const userCount = users.length;
      let conversionRate = 100; let dropoffRate = 0;
      if (i === 0) baselinePrev = userCount; else {
        conversionRate = baselinePrev > 0 ? (userCount / baselinePrev) * 100 : 0;
        dropoffRate = 100 - conversionRate; baselinePrev = userCount;
      }
      baselineAnalysis.push({ stepName: step.name, users: userCount, conversionRate: Math.round(conversionRate * 10) / 10, dropoffRate: Math.round(dropoffRate * 10) / 10 });
    }

    const analysis = [];
    let previousStepUsers = null;
    for (let i = 0; i < funnel.steps.length; i++) {
      const step = funnel.steps[i];
      const query = buildQuery(step, true);
      const users = await UserEvent.distinct('userId', query);
      const userCount = users.length;
      let conversionRate = 100; let dropoffRate = 0;
      if (i === 0) previousStepUsers = userCount; else {
        conversionRate = previousStepUsers > 0 ? (userCount / previousStepUsers) * 100 : 0;
        dropoffRate = 100 - conversionRate; previousStepUsers = userCount;
      }
      analysis.push({ stepName: step.name, users: userCount, conversionRate: Math.round(conversionRate * 10) / 10, dropoffRate: Math.round(dropoffRate * 10) / 10 });
    }

    const baselineEntries = baselineAnalysis[0]?.users || 0;
    const baselineCompleted = baselineAnalysis[baselineAnalysis.length - 1]?.users || 0;
    const baselineRate = baselineEntries ? (baselineCompleted / baselineEntries) * 100 : 0;
    const filteredEntries = analysis[0]?.users || 0;
    const filteredCompleted = analysis[analysis.length - 1]?.users || 0;
    const filteredRate = filteredEntries ? (filteredCompleted / filteredEntries) * 100 : 0;
    const conversionLiftPct = hasFilters && baselineRate ? (((filteredRate - baselineRate) / baselineRate) * 100) : 0;

    const doc = new PDFDocument({ autoFirstPage: false, margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=funnel-${funnel.name.replace(/[^a-z0-9_-]+/gi, '_')}.pdf`);
    doc.pipe(res);

    // Cover
    doc.addPage();
    doc.rect(0, 0, doc.page.width, 120).fill('#111827');
    doc.rect(0, 120, doc.page.width, 6).fill('#2563EB');
    doc.fillColor('#FFFFFF').fontSize(26).text('Funnel Report', 40, 40);
    doc.fillColor('#D1D5DB').fontSize(12).text(funnel.name, 40, 80);
    doc.fillColor('#111827');
    doc.moveDown(10);

    const addHeader = (title) => {
      doc.fillColor('#111827').fontSize(18).text(title, { align: 'left' });
      doc.moveDown(0.3);
      doc.rect(doc.x, doc.y, doc.page.width - doc.page.margins.left - doc.page.margins.right, 2).fill('#2563EB');
      doc.moveDown(0.8);
      doc.fillColor('#111827');
    };

    const addFooter = () => {
      const y = doc.page.height - doc.page.margins.bottom + 10;
      doc.fillColor('#9CA3AF').fontSize(9)
        .text(`Generated: ${new Date().toLocaleString()}`, doc.page.margins.left, y, {
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
          align: 'right'
        });
    };

    // Summary
    doc.addPage();
    addHeader('Summary');
    const entries = analysis[0]?.users || 0;
    const completed = analysis[analysis.length - 1]?.users || 0;
    const rate = entries > 0 ? Math.round((completed / entries) * 1000) / 10 : 0;
    const summary = [
      { label: 'Total Entries', value: entries },
      { label: 'Completed', value: completed },
      { label: 'Conversion Rate', value: rate + '%' },
    ];
    summary.forEach((s, idx) => {
      const col = 0; const by = doc.y + idx * 44;
      doc.roundedRect(doc.x, by, 280, 36, 6).fill('#F3F4F6');
      doc.fillColor('#6B7280').fontSize(10).text(s.label, doc.x + 12, by + 8);
      doc.fillColor('#111827').fontSize(16).text(String(s.value), doc.x + 12, by + 18);
      doc.fillColor('#111827');
    });
    doc.moveDown(5);
    // Segment filters summary and lift (if any)
    if (hasFilters) {
      addHeader('Segment Filters & Lift');
      const filterLines = [];
      if (device) filterLines.push(`Device: ${device}`);
      if (country) filterLines.push(`Country: ${country}`);
      if (utmSource) filterLines.push(`UTM Source: ${utmSource}`);
      if (referrerContains) filterLines.push(`Referrer contains: ${referrerContains}`);
      if (pathPrefix) filterLines.push(`Path prefix: ${pathPrefix}`);
      doc.fillColor('#374151').fontSize(11).text(filterLines.join('  •  ') || 'None');
      doc.moveDown(0.5);
      doc.fillColor('#6B7280').fontSize(10).text(`Baseline Rate: ${baselineRate.toFixed(2)}%   |   Filtered Rate: ${filteredRate.toFixed(2)}%   |   Lift: ${conversionLiftPct.toFixed(2)}%`);
      doc.moveDown(1.2);
    }
    addFooter();

    // Steps and bar chart
    doc.addPage();
    addHeader('Steps');
    analysis.forEach((a, i) => {
      const y = doc.y + i * 30;
      doc.fontSize(12).fillColor('#111827').text(`${i + 1}. ${a.stepName}`, doc.x, y);
      doc.fontSize(10).fillColor('#374151').text(`Users: ${a.users}  •  Conversion: ${a.conversionRate}%  •  Dropoff: ${a.dropoffRate}%`, doc.x + 220, y);
    });
    doc.moveDown(2);

    addHeader('Users by Step');
    const chartData = analysis.map((a) => ({ label: a.stepName, value: a.users }));
    const barChart = (x, y, width, height, data, color = '#2563EB') => {
      const max = Math.max(1, ...data.map(d => d.value));
      const barH = Math.min(22, Math.floor((height - 20) / data.length));
      const gap = 6;
      doc.save();
      doc.fontSize(10).fillColor('#374151');
      data.forEach((d, i) => {
        const barWidth = (d.value / max) * (width - 120);
        const by = y + i * (barH + gap);
        doc.fillColor('#6B7280').text(d.label, x, by + 2, { width: 100, ellipsis: true });
        doc.fillColor(color).rect(x + 110, by, barWidth, barH).fill();
        doc.fillColor('#1F2937').text(String(d.value), x + 115 + barWidth, by + 2, { width: 60 });
      });
      doc.restore();
    };
    barChart(doc.x, doc.y, doc.page.width - doc.page.margins.left - doc.page.margins.right - 20, 260, chartData);
    addFooter();

    doc.end();
  } catch (error) {
    console.error('Error exporting funnel PDF:', error);
    res.status(500).json({ error: 'Failed to export funnel PDF' });
  }
};
