'use strict';

const { v4: uuidv4 } = require('uuid');

// ---------------------------------------------------------------------------
// In-memory store — dashboard widget configurations per user
// ---------------------------------------------------------------------------

/**
 * Default widget layout used when a user has no saved preferences.
 */
const DEFAULT_WIDGETS = [
  {
    widgetId: 'w-pipeline-summary',
    type: 'metric-card',
    title: 'Open Pipeline',
    dataKey: 'openPipelineValue',
    position: { row: 0, col: 0, width: 3, height: 1 },
  },
  {
    widgetId: 'w-won-revenue',
    type: 'metric-card',
    title: 'Won Revenue (MTD)',
    dataKey: 'wonRevenueMtd',
    position: { row: 0, col: 3, width: 3, height: 1 },
  },
  {
    widgetId: 'w-activities-week',
    type: 'metric-card',
    title: 'Activities This Week',
    dataKey: 'activitiesThisWeek',
    position: { row: 0, col: 6, width: 3, height: 1 },
  },
  {
    widgetId: 'w-win-rate',
    type: 'metric-card',
    title: 'Win Rate',
    dataKey: 'winRate',
    position: { row: 0, col: 9, width: 3, height: 1 },
  },
  {
    widgetId: 'w-pipeline-funnel',
    type: 'funnel-chart',
    title: 'Pipeline by Stage',
    dataKey: 'pipelineByStage',
    position: { row: 1, col: 0, width: 6, height: 3 },
  },
  {
    widgetId: 'w-activity-trend',
    type: 'line-chart',
    title: 'Activity Trend (30d)',
    dataKey: 'activityTrend30d',
    position: { row: 1, col: 6, width: 6, height: 3 },
  },
  {
    widgetId: 'w-top-opportunities',
    type: 'data-table',
    title: 'Top Open Opportunities',
    dataKey: 'topOpportunities',
    position: { row: 4, col: 0, width: 12, height: 3 },
  },
];

/**
 * Sample data payloads keyed by dataKey.
 */
const WIDGET_DATA = {
  openPipelineValue: { value: 1325000, currency: 'USD', changePercent: 4.2, trend: 'up' },
  wonRevenueMtd:     { value: 392000,  currency: 'USD', changePercent: 11.7, trend: 'up' },
  activitiesThisWeek:{ value: 74,                       changePercent: -3.1, trend: 'down' },
  winRate:           { value: 0.41,    formatted: '41%', changePercent: 2.0, trend: 'up' },
  pipelineByStage: [
    { stage: 'prospecting',   count: 14, value: 210000 },
    { stage: 'qualification', count: 9,  value: 315000 },
    { stage: 'proposal',      count: 6,  value: 480000 },
    { stage: 'negotiation',   count: 4,  value: 320000 },
  ],
  activityTrend30d: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10),
    count: Math.floor(8 + Math.random() * 14),
  })),
  topOpportunities: [
    { opportunityId: 'opp-001', name: 'Acme Corp — Platform Expansion',  stage: 'proposal',      value: 185000, closeDate: '2024-06-30', owner: 'Eva Patel' },
    { opportunityId: 'opp-002', name: 'Globex Inc — Annual Renewal',      stage: 'negotiation',   value: 142000, closeDate: '2024-06-15', owner: 'Alice Johnson' },
    { opportunityId: 'opp-003', name: 'Initech — New Seat Expansion',     stage: 'qualification', value: 98000,  closeDate: '2024-07-31', owner: 'Bob Martinez' },
    { opportunityId: 'opp-004', name: 'Umbrella LLC — Professional Svcs', stage: 'proposal',      value: 75000,  closeDate: '2024-07-15', owner: 'Carol Lee' },
  ],
};

/** Per-user saved widget preferences override */
const userDashboardPreferences = new Map();

// ---------------------------------------------------------------------------
// Exported service functions
// ---------------------------------------------------------------------------

/**
 * Get personalized dashboard data for a given userId.
 */
async function getDashboard(userId) {
  if (!userId || typeof userId !== 'string') {
    const err = new Error('userId is required');
    err.status = 400;
    throw err;
  }

  const preferences = userDashboardPreferences.get(userId);
  const widgetConfig = preferences ? preferences.widgets : DEFAULT_WIDGETS;

  // Build enriched widgets with resolved data payloads
  const widgets = widgetConfig.map((widget) => ({
    widgetId: widget.widgetId,
    type: widget.type,
    title: widget.title,
    position: widget.position,
    data: WIDGET_DATA[widget.dataKey] || null,
    lastRefreshedAt: new Date().toISOString(),
  }));

  return {
    dashboardId: uuidv4(),
    userId,
    generatedAt: new Date().toISOString(),
    layout: 'grid-12',
    widgets,
  };
}

/**
 * Save user dashboard preferences (for future use / upsert).
 */
async function saveDashboardPreferences(userId, widgets) {
  if (!userId) {
    const err = new Error('userId is required');
    err.status = 400;
    throw err;
  }
  userDashboardPreferences.set(userId, { userId, widgets, updatedAt: new Date().toISOString() });
  return userDashboardPreferences.get(userId);
}

/**
 * List all stored dashboard preferences (admin use).
 */
async function listDashboardPreferences() {
  return Array.from(userDashboardPreferences.values());
}

/**
 * Delete saved preferences for a user (resets to default layout).
 */
async function resetDashboard(userId) {
  const existed = userDashboardPreferences.has(userId);
  userDashboardPreferences.delete(userId);
  return { userId, reset: true, existed };
}

module.exports = {
  getDashboard,
  saveDashboardPreferences,
  listDashboardPreferences,
  resetDashboard,
};
