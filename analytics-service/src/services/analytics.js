'use strict';

const { v4: uuidv4 } = require('uuid');

// ---------------------------------------------------------------------------
// In-memory trend & insight store
// ---------------------------------------------------------------------------

/**
 * Pre-seeded trend data series for different domain metrics.
 * In production this would be computed from a time-series database.
 */
const TREND_SERIES = {
  opportunity: {
    created: generateDailySeries(90, 2, 6),
    won:     generateDailySeries(90, 0, 3),
    lost:    generateDailySeries(90, 0, 2),
    value:   generateDailySeries(90, 5000, 40000),
  },
  activity: {
    logged:    generateDailySeries(90, 5, 20),
    completed: generateDailySeries(90, 4, 18),
    calls:     generateDailySeries(90, 2, 8),
    emails:    generateDailySeries(90, 3, 10),
    meetings:  generateDailySeries(90, 0, 4),
  },
  campaign: {
    sent:     generateDailySeries(90, 0, 500),
    engaged:  generateDailySeries(90, 0, 150),
    openRate: generateDailySeries(90, 0.20, 0.45, true),
    clickRate:generateDailySeries(90, 0.05, 0.20, true),
  },
  contact: {
    created:   generateDailySeries(90, 1, 8),
    converted: generateDailySeries(90, 0, 3),
  },
  revenue: {
    won:       generateDailySeries(90, 0, 75000),
    forecast:  generateDailySeries(90, 80000, 180000),
  },
};

/** Discovered insights store */
const discoveredInsights = [
  {
    insightId: uuidv4(),
    domain: 'opportunity',
    metric: 'stage-velocity',
    description: 'Average time in "qualification" stage has increased by 23% over the past 30 days, suggesting qualification criteria may need review.',
    severity: 'warning',
    discoveredAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    dataPoints: [
      { label: 'Avg days in qualification (prev 30d)', value: 8.2 },
      { label: 'Avg days in qualification (curr 30d)', value: 10.1 },
    ],
  },
  {
    insightId: uuidv4(),
    domain: 'campaign',
    metric: 'engagement-rate',
    description: 'Campaign "Mid-Market Nurture Sequence" is underperforming relative to benchmark — open rate is 31% below the fleet average.',
    severity: 'warning',
    discoveredAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    dataPoints: [
      { label: 'Campaign open rate',    value: 0.31 },
      { label: 'Fleet average open rate', value: 0.45 },
    ],
  },
  {
    insightId: uuidv4(),
    domain: 'revenue',
    metric: 'win-rate',
    description: 'West territory win rate has risen to 58% this quarter — 17 points above the company average. Sharing best practices could benefit other territories.',
    severity: 'positive',
    discoveredAt: new Date().toISOString(),
    dataPoints: [
      { label: 'West win rate (QTD)',    value: 0.58 },
      { label: 'Company avg win rate',   value: 0.41 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateDailySeries(days, min, max, asFloat = false) {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10);
    const rawValue = min + Math.random() * (max - min);
    const value = asFloat
      ? Math.round(rawValue * 1000) / 1000
      : Math.round(rawValue);
    return { date, value };
  });
}

function aggregateByGranularity(dataPoints, granularity) {
  if (granularity === 'day') return dataPoints;

  const buckets = {};
  dataPoints.forEach(({ date, value }) => {
    let key;
    const d = new Date(date);
    if (granularity === 'week') {
      // ISO week: Monday as start
      const day = d.getDay() || 7;
      const monday = new Date(d);
      monday.setDate(d.getDate() - day + 1);
      key = monday.toISOString().slice(0, 10);
    } else if (granularity === 'month') {
      key = date.slice(0, 7);
    } else if (granularity === 'quarter') {
      const month = d.getMonth();
      const quarter = Math.floor(month / 3) + 1;
      key = `${d.getFullYear()}-Q${quarter}`;
    } else {
      key = date;
    }

    if (!buckets[key]) buckets[key] = { period: key, sum: 0, count: 0 };
    buckets[key].sum += value;
    buckets[key].count += 1;
  });

  return Object.values(buckets).map((b) => ({
    period: b.period,
    value: Math.round(b.sum * 100) / 100,
    dataPointCount: b.count,
  }));
}

function computeChangePercent(dataPoints) {
  if (!dataPoints || dataPoints.length < 2) return null;
  const first = dataPoints[0].value || dataPoints[0].sum || 0;
  const last = dataPoints[dataPoints.length - 1].value || dataPoints[dataPoints.length - 1].sum || 0;
  if (first === 0) return null;
  return Math.round(((last - first) / first) * 10000) / 100;
}

function filterByDateRange(dataPoints, startDate, endDate) {
  return dataPoints.filter(({ date, period }) => {
    const key = date || period;
    if (startDate && key < startDate) return false;
    if (endDate && key > endDate) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Exported service functions
// ---------------------------------------------------------------------------

/**
 * Get trend data for a given domain and metric.
 *
 * @param {object} params
 * @param {string} params.domain    - 'opportunity' | 'activity' | 'campaign' | 'contact' | 'revenue'
 * @param {string} params.metric    - metric key within the domain
 * @param {string} params.startDate - ISO date string
 * @param {string} params.endDate   - ISO date string
 * @param {string} params.granularity - 'day' | 'week' | 'month' | 'quarter'
 */
async function getTrends({ domain, metric, startDate, endDate, granularity = 'day' } = {}) {
  const validDomains = Object.keys(TREND_SERIES);
  if (domain && !validDomains.includes(domain)) {
    const err = new Error(`Invalid domain "${domain}". Allowed: ${validDomains.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const resolvedDomain = domain || 'opportunity';
  const domainSeries = TREND_SERIES[resolvedDomain];
  const validMetrics = Object.keys(domainSeries);

  if (metric && !validMetrics.includes(metric)) {
    const err = new Error(`Invalid metric "${metric}" for domain "${resolvedDomain}". Allowed: ${validMetrics.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const resolvedMetric = metric || validMetrics[0];
  let rawPoints = domainSeries[resolvedMetric];

  // Apply date range filter
  rawPoints = filterByDateRange(rawPoints, startDate, endDate);

  // Aggregate by granularity
  const aggregated = aggregateByGranularity(rawPoints, granularity);

  // Compute overall change %
  const changePercent = computeChangePercent(aggregated);

  // Surface relevant insights for this domain
  const relevantInsights = discoveredInsights
    .filter((i) => i.domain === resolvedDomain)
    .map((i) => i.description);

  return {
    trendId: uuidv4(),
    generatedAt: new Date().toISOString(),
    domain: resolvedDomain,
    metric: resolvedMetric,
    granularity,
    dateRange: { startDate: startDate || null, endDate: endDate || null },
    dataPoints: aggregated,
    summary: {
      pointCount: aggregated.length,
      changePercent,
      trend: changePercent === null ? 'neutral' : changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'flat',
    },
    insights: relevantInsights,
  };
}

/**
 * List all currently discovered insights.
 */
async function getInsights({ domain, severity } = {}) {
  let insights = discoveredInsights;
  if (domain) insights = insights.filter((i) => i.domain === domain);
  if (severity) insights = insights.filter((i) => i.severity === severity);
  return insights;
}

/**
 * Record a newly discovered insight (called by analytics engine / event consumers).
 */
async function recordInsight({ domain, metric, description, severity, dataPoints = [] }) {
  const insight = {
    insightId: uuidv4(),
    domain,
    metric,
    description,
    severity: severity || 'info',
    discoveredAt: new Date().toISOString(),
    dataPoints,
  };
  discoveredInsights.push(insight);
  return insight;
}

/**
 * Get available metrics for each domain (discovery endpoint helper).
 */
async function getAvailableMetrics() {
  const result = {};
  Object.entries(TREND_SERIES).forEach(([domain, metrics]) => {
    result[domain] = Object.keys(metrics);
  });
  return result;
}

module.exports = {
  getTrends,
  getInsights,
  recordInsight,
  getAvailableMetrics,
};
