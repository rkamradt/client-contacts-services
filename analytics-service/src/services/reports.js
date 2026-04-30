'use strict';

const { v4: uuidv4 } = require('uuid');

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------

/** Aggregated pipeline metrics updated by event consumers */
const pipelineMetrics = {
  stages: {
    prospecting:    { count: 14, totalValue: 210000 },
    qualification:  { count: 9,  totalValue: 315000 },
    proposal:       { count: 6,  totalValue: 480000 },
    negotiation:    { count: 4,  totalValue: 320000 },
    'closed-won':   { count: 22, totalValue: 1540000 },
    'closed-lost':  { count: 11, totalValue: 0 },
  },
  stageProbabilities: {
    prospecting:   0.10,
    qualification: 0.25,
    proposal:      0.50,
    negotiation:   0.75,
    'closed-won':  1.00,
    'closed-lost': 0.00,
  },
};

/** Aggregated activity metrics */
const activityMetrics = {
  totalActivities: 342,
  byType: { calls: 120, emails: 145, meetings: 52, notes: 25 },
  byUser: [
    { userId: 'user-001', name: 'Alice Johnson', count: 87 },
    { userId: 'user-002', name: 'Bob Martinez',  count: 74 },
    { userId: 'user-003', name: 'Carol Lee',     count: 63 },
    { userId: 'user-004', name: 'David Kim',     count: 58 },
    { userId: 'user-005', name: 'Eva Patel',     count: 60 },
  ],
  completedActivities: 298,
};

/** Aggregated campaign performance data */
const campaignMetrics = [
  {
    campaignId: 'camp-001',
    name: 'Q1 Product Launch',
    sent: 4500,
    delivered: 4423,
    opens: 1593,
    clicks: 442,
    conversions: 38,
    costUsd: 2200,
    revenueAttributed: 19000,
  },
  {
    campaignId: 'camp-002',
    name: 'Mid-Market Nurture Sequence',
    sent: 2100,
    delivered: 2067,
    opens: 641,
    clicks: 189,
    conversions: 14,
    costUsd: 800,
    revenueAttributed: 7400,
  },
  {
    campaignId: 'camp-003',
    name: 'Renewal Reminder — Enterprise',
    sent: 320,
    delivered: 318,
    opens: 211,
    clicks: 98,
    conversions: 29,
    costUsd: 150,
    revenueAttributed: 87000,
  },
];

/** Aggregated user performance data */
const userPerformanceMetrics = [
  { userId: 'user-001', name: 'Alice Johnson', territory: 'Northeast', activitiesLogged: 87, opportunitiesCreated: 12, revenueWon: 185000, dealsWon: 5, dealsLost: 2 },
  { userId: 'user-002', name: 'Bob Martinez',  territory: 'Southwest', activitiesLogged: 74, opportunitiesCreated: 9,  revenueWon: 142000, dealsWon: 4, dealsLost: 3 },
  { userId: 'user-003', name: 'Carol Lee',     territory: 'Midwest',   activitiesLogged: 63, opportunitiesCreated: 8,  revenueWon: 98000,  dealsWon: 3, dealsLost: 2 },
  { userId: 'user-004', name: 'David Kim',     territory: 'Southeast', activitiesLogged: 58, opportunitiesCreated: 7,  revenueWon: 75000,  dealsWon: 2, dealsLost: 4 },
  { userId: 'user-005', name: 'Eva Patel',     territory: 'West',      activitiesLogged: 60, opportunitiesCreated: 10, revenueWon: 220000, dealsWon: 7, dealsLost: 1 },
];

/** Revenue forecast data keyed by territory + period */
const forecastData = [
  { period: '2024-Q2', territory: 'Northeast', openDeals: 8,  weightedRevenue: 195000, bestCase: 340000, worstCase: 95000 },
  { period: '2024-Q2', territory: 'Southwest', openDeals: 6,  weightedRevenue: 148000, bestCase: 260000, worstCase: 72000 },
  { period: '2024-Q2', territory: 'Midwest',   openDeals: 5,  weightedRevenue: 112000, bestCase: 190000, worstCase: 55000 },
  { period: '2024-Q2', territory: 'Southeast', openDeals: 4,  weightedRevenue: 87000,  bestCase: 155000, worstCase: 42000 },
  { period: '2024-Q2', territory: 'West',      openDeals: 9,  weightedRevenue: 231000, bestCase: 410000, worstCase: 110000 },
  { period: '2024-Q3', territory: 'Northeast', openDeals: 11, weightedRevenue: 278000, bestCase: 490000, worstCase: 130000 },
  { period: '2024-Q3', territory: 'West',      openDeals: 12, weightedRevenue: 315000, bestCase: 540000, worstCase: 150000 },
];

/** Scheduled report store */
const scheduledReports = [];

/** Generated custom report store (for export look-up) */
const generatedReports = new Map();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nowIso() {
  return new Date().toISOString();
}

function filterByDate(collection, startDate, endDate, dateField = 'period') {
  if (!startDate && !endDate) return collection;
  return collection.filter((item) => {
    const val = item[dateField];
    if (!val) return true;
    if (startDate && val < startDate) return false;
    if (endDate && val > endDate) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Exported service functions
// ---------------------------------------------------------------------------

/**
 * Generate sales pipeline report.
 */
async function getSalesPipelineReport({ ownerId, territory, startDate, endDate } = {}) {
  const reportId = uuidv4();
  const stages = Object.entries(pipelineMetrics.stages)
    .filter(([stage]) => stage !== 'closed-won' && stage !== 'closed-lost')
    .map(([stage, data]) => {
      const probability = pipelineMetrics.stageProbabilities[stage] || 0;
      return {
        stage,
        count: data.count,
        totalValue: data.totalValue,
        probability,
        weightedValue: Math.round(data.totalValue * probability),
      };
    });

  const totalOpenValue = stages.reduce((sum, s) => sum + s.totalValue, 0);
  const forecastedRevenue = stages.reduce((sum, s) => sum + s.weightedValue, 0);

  const report = {
    reportId,
    reportType: 'sales-pipeline',
    generatedAt: nowIso(),
    filters: { ownerId: ownerId || null, territory: territory || null, startDate: startDate || null, endDate: endDate || null },
    pipeline: {
      stages,
      totalOpenValue,
      forecastedRevenue,
      closedWonCount: pipelineMetrics.stages['closed-won'].count,
      closedWonValue: pipelineMetrics.stages['closed-won'].totalValue,
      closedLostCount: pipelineMetrics.stages['closed-lost'].count,
    },
  };

  generatedReports.set(reportId, report);
  return report;
}

/**
 * Generate activity summary report.
 */
async function getActivitySummaryReport({ userId, teamId, startDate, endDate, type } = {}) {
  const reportId = uuidv4();

  let byUserFiltered = activityMetrics.byUser;
  if (userId) {
    byUserFiltered = activityMetrics.byUser.filter((u) => u.userId === userId);
  }

  let byTypeFiltered = { ...activityMetrics.byType };
  if (type) {
    byTypeFiltered = { [type]: activityMetrics.byType[type] || 0 };
  }

  const totalFiltered = byUserFiltered.reduce((sum, u) => sum + u.count, 0);
  const completionRate = activityMetrics.totalActivities > 0
    ? parseFloat((activityMetrics.completedActivities / activityMetrics.totalActivities).toFixed(4))
    : 0;

  const report = {
    reportId,
    reportType: 'activity-summary',
    generatedAt: nowIso(),
    filters: { userId: userId || null, teamId: teamId || null, startDate: startDate || null, endDate: endDate || null, type: type || null },
    summary: {
      totalActivities: userId ? totalFiltered : activityMetrics.totalActivities,
      byType: byTypeFiltered,
      byUser: byUserFiltered,
      completionRate,
    },
  };

  generatedReports.set(reportId, report);
  return report;
}

/**
 * Generate campaign performance report.
 */
async function getCampaignPerformanceReport({ campaignId, startDate, endDate } = {}) {
  const reportId = uuidv4();

  let campaigns = campaignMetrics;
  if (campaignId) {
    campaigns = campaigns.filter((c) => c.campaignId === campaignId);
  }

  const enriched = campaigns.map((c) => ({
    campaignId: c.campaignId,
    name: c.name,
    sent: c.sent,
    delivered: c.delivered,
    deliveryRate: c.sent > 0 ? parseFloat((c.delivered / c.sent).toFixed(4)) : 0,
    openRate: c.delivered > 0 ? parseFloat((c.opens / c.delivered).toFixed(4)) : 0,
    clickRate: c.opens > 0 ? parseFloat((c.clicks / c.opens).toFixed(4)) : 0,
    conversionRate: c.delivered > 0 ? parseFloat((c.conversions / c.delivered).toFixed(4)) : 0,
    conversions: c.conversions,
    costUsd: c.costUsd,
    revenueAttributed: c.revenueAttributed,
    roi: c.costUsd > 0 ? parseFloat(((c.revenueAttributed - c.costUsd) / c.costUsd).toFixed(4)) : 0,
  }));

  const report = {
    reportId,
    reportType: 'campaign-performance',
    generatedAt: nowIso(),
    filters: { campaignId: campaignId || null, startDate: startDate || null, endDate: endDate || null },
    campaigns: enriched,
  };

  generatedReports.set(reportId, report);
  return report;
}

/**
 * Generate user performance report.
 */
async function getUserPerformanceReport({ userId, teamId, startDate, endDate } = {}) {
  const reportId = uuidv4();

  let users = userPerformanceMetrics;
  if (userId) {
    users = users.filter((u) => u.userId === userId);
  }

  const enriched = users.map((u) => ({
    userId: u.userId,
    name: u.name,
    territory: u.territory,
    activitiesLogged: u.activitiesLogged,
    opportunitiesCreated: u.opportunitiesCreated,
    revenueWon: u.revenueWon,
    dealsWon: u.dealsWon,
    dealsLost: u.dealsLost,
    winRate: (u.dealsWon + u.dealsLost) > 0
      ? parseFloat((u.dealsWon / (u.dealsWon + u.dealsLost)).toFixed(4))
      : 0,
    avgDealSize: u.dealsWon > 0 ? Math.round(u.revenueWon / u.dealsWon) : 0,
  }));

  const report = {
    reportId,
    reportType: 'user-performance',
    generatedAt: nowIso(),
    filters: { userId: userId || null, teamId: teamId || null, startDate: startDate || null, endDate: endDate || null },
    performance: enriched,
  };

  generatedReports.set(reportId, report);
  return report;
}

/**
 * Execute a custom report with dynamic filters and grouping.
 */
async function createCustomReport({ name, entity, filters = [], groupBy, metrics = [], startDate, endDate }) {
  const reportId = uuidv4();

  // Build a representative synthetic result based on the requested entity and metrics
  const columns = [groupBy || entity, ...metrics];

  const sampleRows = buildCustomReportRows(entity, groupBy, metrics, filters);

  const report = {
    reportId,
    name,
    reportType: 'custom',
    generatedAt: nowIso(),
    entity,
    filters,
    groupBy: groupBy || null,
    metrics,
    dateRange: { startDate: startDate || null, endDate: endDate || null },
    columns,
    rows: sampleRows,
    rowCount: sampleRows.length,
  };

  generatedReports.set(reportId, report);
  return report;
}

function buildCustomReportRows(entity, groupBy, metrics, filters) {
  const entityData = {
    opportunity: [
      { owner: 'Alice Johnson', territory: 'Northeast', stage: 'proposal',      count: 3, totalValue: 240000, weightedValue: 120000 },
      { owner: 'Bob Martinez',  territory: 'Southwest', stage: 'qualification', count: 4, totalValue: 180000, weightedValue: 45000  },
      { owner: 'Eva Patel',     territory: 'West',      stage: 'negotiation',   count: 2, totalValue: 310000, weightedValue: 232500 },
    ],
    activity: [
      { owner: 'Alice Johnson', type: 'call',    count: 32, completionRate: 0.94 },
      { owner: 'Bob Martinez',  type: 'email',   count: 45, completionRate: 1.00 },
      { owner: 'Carol Lee',     type: 'meeting', count: 18, completionRate: 0.89 },
    ],
    contact: [
      { source: 'inbound',  territory: 'Northeast', count: 24, convertedToOpportunity: 8  },
      { source: 'campaign', territory: 'West',       count: 41, convertedToOpportunity: 15 },
      { source: 'referral', territory: 'Midwest',    count: 12, convertedToOpportunity: 5  },
    ],
  };

  const rows = (entityData[entity] || entityData.opportunity).map((row) => {
    const values = [];
    if (groupBy && row[groupBy] !== undefined) values.push(row[groupBy]);
    metrics.forEach((m) => {
      values.push(row[m] !== undefined ? row[m] : null);
    });
    if (values.length === 0) {
      values.push(...Object.values(row));
    }
    return values;
  });

  return rows;
}

/**
 * Export a previously generated report by ID.
 */
async function exportReport(id, format = 'csv') {
  const validFormats = ['csv', 'pdf', 'excel'];
  if (!validFormats.includes(format)) {
    const err = new Error(`Invalid export format "${format}". Allowed: csv, pdf, excel`);
    err.status = 400;
    throw err;
  }

  const report = generatedReports.get(id);
  if (!report) {
    const err = new Error(`Report "${id}" not found`);
    err.status = 404;
    throw err;
  }

  // In production this would generate a real file; here we return a download descriptor
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  return {
    reportId: id,
    reportType: report.reportType,
    format,
    downloadUrl: `/reports/${id}/export/download?format=${format}&token=${uuidv4()}`,
    expiresAt,
    generatedAt: nowIso(),
  };
}

/**
 * Generate weighted revenue forecast.
 */
async function getRevenueForecast({ territory, startDate, endDate, groupBy } = {}) {
  const reportId = uuidv4();

  let data = forecastData;
  if (territory) {
    data = data.filter((d) => d.territory.toLowerCase() === territory.toLowerCase());
  }
  data = filterByDate(data, startDate, endDate, 'period');

  const report = {
    reportId,
    reportType: 'revenue-forecast',
    generatedAt: nowIso(),
    filters: { territory: territory || null, startDate: startDate || null, endDate: endDate || null, groupBy: groupBy || 'territory' },
    forecast: data.map((d) => ({
      period: d.period,
      territory: d.territory,
      openDeals: d.openDeals,
      weightedRevenue: d.weightedRevenue,
      bestCase: d.bestCase,
      worstCase: d.worstCase,
    })),
    totals: {
      weightedRevenue: data.reduce((s, d) => s + d.weightedRevenue, 0),
      bestCase: data.reduce((s, d) => s + d.bestCase, 0),
      worstCase: data.reduce((s, d) => s + d.worstCase, 0),
    },
  };

  generatedReports.set(reportId, report);
  return report;
}

/**
 * Schedule a recurring report delivery.
 */
async function scheduleReport({ reportType, frequency, recipients, filters, format, startDate }) {
  const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly'];
  if (!validFrequencies.includes(frequency)) {
    const err = new Error(`Invalid frequency "${frequency}". Allowed: ${validFrequencies.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const scheduleId = uuidv4();
  const createdAt = nowIso();
  const nextRunAt = computeNextRun(frequency, startDate);

  const schedule = {
    scheduleId,
    reportType,
    frequency,
    recipients: recipients || [],
    filters: filters || {},
    format: format || 'pdf',
    startDate: startDate || createdAt,
    nextRunAt,
    active: true,
    createdAt,
  };

  scheduledReports.push(schedule);
  return schedule;
}

function computeNextRun(frequency, startDate) {
  const base = startDate ? new Date(startDate) : new Date();
  switch (frequency) {
    case 'daily':   base.setDate(base.getDate() + 1); break;
    case 'weekly':  base.setDate(base.getDate() + 7); break;
    case 'monthly': base.setMonth(base.getMonth() + 1); break;
    case 'quarterly': base.setMonth(base.getMonth() + 3); break;
    default: base.setDate(base.getDate() + 7);
  }
  return base.toISOString();
}

// ---------------------------------------------------------------------------
// Event consumer hooks (called by message consumer layer)
// ---------------------------------------------------------------------------

/** Update pipeline metrics when a new opportunity is created */
function onOpportunityCreated({ stage = 'prospecting', value = 0 }) {
  if (pipelineMetrics.stages[stage]) {
    pipelineMetrics.stages[stage].count += 1;
    pipelineMetrics.stages[stage].totalValue += value;
  }
}

/** Track stage transitions */
function onOpportunityStageChanged({ previousStage, newStage, value = 0 }) {
  if (previousStage && pipelineMetrics.stages[previousStage]) {
    pipelineMetrics.stages[previousStage].count = Math.max(0, pipelineMetrics.stages[previousStage].count - 1);
    pipelineMetrics.stages[previousStage].totalValue = Math.max(0, pipelineMetrics.stages[previousStage].totalValue - value);
  }
  if (newStage && pipelineMetrics.stages[newStage]) {
    pipelineMetrics.stages[newStage].count += 1;
    pipelineMetrics.stages[newStage].totalValue += value;
  }
}

/** Record won deal */
function onOpportunityWon({ value = 0, ownerId }) {
  pipelineMetrics.stages['closed-won'].count += 1;
  pipelineMetrics.stages['closed-won'].totalValue += value;

  const user = userPerformanceMetrics.find((u) => u.userId === ownerId);
  if (user) {
    user.revenueWon += value;
    user.dealsWon += 1;
  }
}

/** Record lost deal */
function onOpportunityLost({ ownerId }) {
  pipelineMetrics.stages['closed-lost'].count += 1;
  const user = userPerformanceMetrics.find((u) => u.userId === ownerId);
  if (user) {
    user.dealsLost += 1;
  }
}

/** Update activity metrics */
function onActivityLogged({ type = 'note', userId }) {
  activityMetrics.totalActivities += 1;
  if (activityMetrics.byType[type] !== undefined) {
    activityMetrics.byType[type] += 1;
  }
  const user = activityMetrics.byUser.find((u) => u.userId === userId);
  if (user) {
    user.count += 1;
  }

  const perfUser = userPerformanceMetrics.find((u) => u.userId === userId);
  if (perfUser) {
    perfUser.activitiesLogged += 1;
  }
}

/** Update campaign sent metrics */
function onCampaignSent({ campaignId, recipientCount = 0 }) {
  const existing = campaignMetrics.find((c) => c.campaignId === campaignId);
  if (existing) {
    existing.sent += recipientCount;
    existing.delivered += Math.round(recipientCount * 0.98);
  }
}

/** Update campaign engagement metrics */
function onCampaignContactEngaged({ campaignId, engagementType = 'open' }) {
  const existing = campaignMetrics.find((c) => c.campaignId === campaignId);
  if (existing) {
    if (engagementType === 'open') existing.opens += 1;
    else if (engagementType === 'click') existing.clicks += 1;
    else if (engagementType === 'conversion') existing.conversions += 1;
  }
}

/** Track new contact / lead source */
function onContactCreated({ source, territory }) {
  // In a real implementation this would update lead-gen attribution counters
  // Here we simply log the event for demonstration
  console.info(`[analytics] contact.created source=${source} territory=${territory}`);
}

/** Recalculate territory metrics when user territory changes */
function onUserTerritoryChanged({ userId, previousTerritory, newTerritory }) {
  const user = userPerformanceMetrics.find((u) => u.userId === userId);
  if (user) {
    user.territory = newTerritory;
  }
  console.info(`[analytics] user.territory-changed userId=${userId} ${previousTerritory} → ${newTerritory}`);
}

module.exports = {
  getSalesPipelineReport,
  getActivitySummaryReport,
  getCampaignPerformanceReport,
  getUserPerformanceReport,
  createCustomReport,
  exportReport,
  getRevenueForecast,
  scheduleReport,
  // event hooks
  onOpportunityCreated,
  onOpportunityStageChanged,
  onOpportunityWon,
  onOpportunityLost,
  onActivityLogged,
  onCampaignSent,
  onCampaignContactEngaged,
  onContactCreated,
  onUserTerritoryChanged,
};
