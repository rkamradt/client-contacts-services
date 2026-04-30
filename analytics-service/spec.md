# AnalyticsService — Service Specification

## Purpose

AnalyticsService provides business intelligence, reporting, dashboards, and data analytics across all CRM domains. It aggregates signals from opportunities, activities, campaigns, contacts, and users to generate actionable insights, pipeline forecasts, performance metrics, and trend analyses.

## Tech Stack

- **Archetype**: HTTP (standard REST service)
- **Runtime**: Node.js >= 20
- **Framework**: Express 4
- **Validation**: express-validator
- **ID generation**: uuid
- **Logging**: morgan

---

## API Endpoints

| Method | Path | Description | Request Body | Response Shape |
|--------|------|-------------|--------------|----------------|
| GET | /reports/sales-pipeline | Generate sales pipeline report with stage breakdown and forecasts | — (query: `ownerId`, `territory`, `startDate`, `endDate`) | `{ reportId, generatedAt, pipeline: { stages: [{stage, count, totalValue, weightedValue}], totalOpenValue, forecastedRevenue } }` |
| GET | /reports/activity-summary | Get activity metrics by user, team, or time period | — (query: `userId`, `teamId`, `startDate`, `endDate`, `type`) | `{ reportId, generatedAt, summary: { totalActivities, byType: {calls, emails, meetings, notes}, byUser: [{userId, count}], completionRate } }` |
| GET | /reports/campaign-performance | Campaign ROI and engagement analytics | — (query: `campaignId`, `startDate`, `endDate`) | `{ reportId, generatedAt, campaigns: [{campaignId, name, sent, openRate, clickRate, conversionRate, roi}] }` |
| GET | /reports/user-performance | Individual or team performance metrics | — (query: `userId`, `teamId`, `startDate`, `endDate`) | `{ reportId, generatedAt, performance: [{userId, name, activitiesLogged, opportunitiesCreated, revenueWon, winRate}] }` |
| POST | /reports/custom | Execute custom report with dynamic filters and grouping | `{ name, entity, filters: [{field, operator, value}], groupBy, metrics: [string], startDate, endDate }` | `{ reportId, name, generatedAt, columns: [string], rows: [[value]] }` |
| GET | /reports/:id/export | Export report data as CSV, PDF, or Excel | — (query: `format`: csv\|pdf\|excel) | File download stream or `{ downloadUrl, format, expiresAt }` |
| GET | /reports/revenue-forecast | Generate weighted revenue forecasts by territory and time period | — (query: `territory`, `startDate`, `endDate`, `groupBy`) | `{ reportId, generatedAt, forecast: [{period, territory, weightedRevenue, bestCase, worstCase, opportunities: number}] }` |
| POST | /reports/schedule | Schedule recurring report delivery | `{ reportType, frequency, recipients: [email], filters, format, startDate }` | `{ scheduleId, reportType, frequency, nextRunAt, recipients, createdAt }` |
| GET | /dashboards/:userId | Get personalized dashboard data for user | — | `{ userId, generatedAt, widgets: [{widgetId, type, title, data}] }` |
| GET | /metrics/kpis | Get key performance indicators across all domains | — (query: `territory`, `userId`, `period`) | `{ generatedAt, kpis: { openPipelineValue, forecastedRevenue, wonRevenueThisPeriod, activitiesThisWeek, leadsCreated, campaignEngagementRate, winRate, avgDealSize } }` |
| GET | /analytics/trends | Identify trends and patterns in sales and marketing data | — (query: `domain`, `metric`, `startDate`, `endDate`, `granularity`) | `{ generatedAt, domain, metric, granularity, dataPoints: [{period, value, changePercent}], insights: [string] }` |
| GET | /health | Health check | — | `{ ok: true, service: "analytics-service" }` |

---

## Events Produced

| Topic | Trigger | Payload Shape |
|-------|---------|---------------|
| `report.generated` | Any report endpoint successfully returns data | `{ reportId, reportType, generatedAt, triggeredBy }` |
| `alert.threshold-exceeded` | KPI value breaches configured threshold | `{ alertId, metric, threshold, actualValue, territory, period, triggeredAt }` |
| `insight.discovered` | Analytics engine identifies significant pattern or anomaly | `{ insightId, domain, metric, description, severity, discoveredAt, dataPoints }` |

---

## Events Consumed

| Topic | Handler | What It Does |
|-------|---------|--------------|
| `opportunity.created` | `onOpportunityCreated` | Increments open pipeline count, adds deal value to pipeline metrics, updates forecasting model inputs |
| `opportunity.stage-changed` | `onOpportunityStageChanged` | Tracks stage transition timestamps to calculate conversion rates and average stage velocity |
| `opportunity.won` | `onOpportunityWon` | Adds won revenue to period totals, increments win count, recalculates win rate and average deal size |
| `opportunity.lost` | `onOpportunityLost` | Records loss reason, increments loss count, feeds competitive analysis and loss-reason breakdown |
| `activity.logged` | `onActivityLogged` | Increments activity counters by type and user, updates productivity metrics |
| `campaign.sent` | `onCampaignSent` | Records send event with recipient count, updates reach and frequency metrics |
| `campaign.contact-engaged` | `onCampaignContactEngaged` | Increments engagement counters (opens, clicks, replies), recalculates engagement rates |
| `contact.created` | `onContactCreated` | Updates lead generation counters, records source attribution for the new contact |
| `user.territory-changed` | `onUserTerritoryChanged` | Moves user's historical metrics to new territory bucket, recalculates territory performance |

---

## Dependencies

| Service | Reason |
|---------|--------|
| user-service | Resolves user profiles, territory assignments, and team hierarchies when scoping reports and dashboards |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP port |
| `USER_SERVICE_URL` | `http://user-service:8080` | Base URL for UserService |
| `KAFKA_BROKERS` | `localhost:9092` | Kafka broker addresses |
| `KAFKA_GROUP_ID` | `analytics-service` | Kafka consumer group |
| `KPI_PIPELINE_THRESHOLD` | `100000` | Minimum acceptable open pipeline value before alert fires |
| `KPI_WIN_RATE_THRESHOLD` | `0.20` | Minimum acceptable win rate before alert fires |
| `LOG_LEVEL` | `info` | Logging verbosity |
