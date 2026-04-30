'use strict';

// ---------------------------------------------------------------------------
// In-memory KPI store — updated by event consumers in reports.js
// ---------------------------------------------------------------------------

const KPI_THRESHOLDS = {
  openPipelineValue:       parseFloat(process.env.KPI_PIPELINE_THRESHOLD || '100000'),
  winRate:                 parseFloat(process.env.KPI_WIN_RATE_THRESHOLD  || '0.20'),
  activityCompletionRate:  0.75,
  campaignEngagementRate:  0.10,
};

/**
 * Core KPI snapshot.  In production these would be materialised from an
 * analytical database; here we use realistic hard-coded values that the
 * event handlers in reports.js can mutate.
 */
const kpiSnapshot = {
  openPipelineValue:        1325000,
  forecastedRevenue:         612500,
  wonRevenueMtd:             392000,
  wonRevenueQtd:             810000,
  wonRevenueYtd:            1960000,
  activitiesThisWeek:            74,
  activitiesThisMonth:          298,
  leadsCreatedThisMonth:         63,
  leadsCreatedThisQuarter:      187,
  campaignEngagementRate:      0.34,
  winRate:                     0.41,
  avgDealSizeUsd:             52300,
  avgSalesCycleDays:             42,
  pipelineCoverage:             3.4,   // ratio of pipeline to quota
  openOpportunitiesCount:        33,
  overdueActivitiesCount:        11,
  lastUpdatedAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function checkThresholds(kpis) {
  const breaches = [];

  if (kpis.openPipelineValue < KPI_THRESHOLDS.openPipelineValue) {
    breaches.push({
      metric: 'openPipelineValue',
      threshold: KPI_THRESHOLDS.openPipelineValue,
      actualValue: kpis.openPipelineValue,
      severity: 'critical',
    });
  }

  if (kpis.winRate < KPI_THRESHOLDS.winRate) {
    breaches.push({
      metric: 'winRate',
      threshold: KPI_THRESHOLDS.winRate,
      actualValue: kpis.winRate,
      severity: 'warning',
    });
  }

  if (kpis.campaignEngagementRate < KPI_THRESHOLDS.campaignEngagementRate) {
    breaches.push({
      metric: 'campaignEngagementRate',
      threshold: KPI_THRESHOLDS.campaignEngagementRate,
      actualValue: kpis.campaignEngagementRate,
      severity: 'warning',
    });
  }

  return breaches;
}

// ---------------------------------------------------------------------------
// Exported service functions
// ---------------------------------------------------------------------------

/**
 * Get key performance indicators across all domains.
 */
async function getKpis({ territory, userId, period } = {}) {
  // Apply optional territory / user scoping (simplified — in production
  // this would query pre-aggregated territory buckets)
  const scopedKpis = { ...kpiSnapshot };

  if (territory) {
    // Simulate territory-scoped subset (~20% of global)
    Object.keys(scopedKpis).forEach((k) => {
      if (typeof scopedKpis[k] === 'number' && k !== 'lastUpdatedAt') {
        scopedKpis[k] = Math.round(scopedKpis[k] * 0.22 * 100) / 100;
      }
    });
  } else if (userId) {
    // Simulate user-scoped subset (~5%)
    Object.keys(scopedKpis).forEach((k) => {
      if (typeof scopedKpis[k] === 'number' && k !== 'lastUpdatedAt') {
        scopedKpis[k] = Math.round(scopedKpis[k] * 0.05 * 100) / 100;
      }
    });
  }

  const thresholdBreaches = checkThresholds(scopedKpis);

  return {
    generatedAt: new Date().toISOString(),
    scope: { territory: territory || null, userId: userId || null, period: period || 'current' },
    kpis: scopedKpis,
    thresholdBreaches,
    thresholds: KPI_THRESHOLDS,
  };
}

/**
 * Update a specific KPI value (called by event consumer layer).
 */
function updateKpi(metricName, value) {
  if (kpiSnapshot[metricName] !== undefined) {
    kpiSnapshot[metricName] = value;
    kpiSnapshot.lastUpdatedAt = new Date().toISOString();
  }
}

/**
 * Increment a numeric KPI by delta (called by event consumer layer).
 */
function incrementKpi(metricName, delta = 1) {
  if (typeof kpiSnapshot[metricName] === 'number') {
    kpiSnapshot[metricName] = Math.round((kpiSnapshot[metricName] + delta) * 1000) / 1000;
    kpiSnapshot.lastUpdatedAt = new Date().toISOString();
  }
}

/**
 * Get raw KPI snapshot (for internal use by other services).
 */
async function getRawKpiSnapshot() {
  return { ...kpiSnapshot };
}

module.exports = {
  getKpis,
  updateKpi,
  incrementKpi,
  getRawKpiSnapshot,
};
