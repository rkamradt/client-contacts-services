# AnalyticsService — Claude Code Context

## Role in the Client Contacts Ecosystem

AnalyticsService is the business intelligence layer of the Client Contacts CRM platform. It aggregates data from across all CRM domains — contacts, opportunities, activities, campaigns, and users — to produce reports, dashboards, KPI snapshots, forecasts, and trend analyses. It is a read-heavy service that maintains its own in-memory (or database-backed) aggregation store, updated by consuming domain events from other services.

## API Surface

| Method | Path | Description |
|--------|------|-------------|
| GET | /reports/sales-pipeline | Generate sales pipeline report with stage breakdown and forecasts |
| GET | /reports/activity-summary | Get activity metrics by user, team, or time period |
| GET | /reports/campaign-performance | Campaign ROI and engagement analytics |
| GET | /reports/user-performance | Individual or team performance metrics |
| POST | /reports/custom | Execute custom report with dynamic filters and grouping |
| GET | /reports/:id/export | Export report data as CSV, PDF, or Excel |
| GET | /reports/revenue-forecast | Generate weighted revenue forecasts by territory and time period |
| POST | /reports/schedule | Schedule recurring report delivery |
| GET | /dashboards/:userId | Get personalized dashboard data for a user |
| GET | /metrics/kpis | Get key performance indicators across all domains |
| GET | /analytics/trends | Identify trends and patterns in sales and marketing data |
| GET | /health | Health check |

## Event Contracts

### Produced Events

| Topic | Trigger | Description |
|-------|---------|-------------|
| report.generated | Report is successfully created or refreshed | Notifies subscribers that fresh report data is available |
| alert.threshold-exceeded | KPI threshold breached (low pipeline, missed targets) | Alerts downstream systems (e.g. NotificationService) |
| insight.discovered | Analytics engine identifies significant patterns or anomalies | Broadcasts discovered insights for downstream consumption |

### Consumed Events

| Topic | Handler | Effect |
|-------|---------|--------|
| opportunity.created | onOpportunityCreated | Updates pipeline metrics and forecasting models |
| opportunity.stage-changed | onOpportunityStageChanged | Tracks conversion rates and stage velocity |
| opportunity.won | onOpportunityWon | Updates revenue metrics and win rate calculations |
| opportunity.lost | onOpportunityLost | Tracks loss reasons and competitive analysis |
| activity.logged | onActivityLogged | Updates activity metrics and productivity tracking |
| campaign.sent | onCampaignSent | Tracks campaign reach and frequency metrics |
| campaign.contact-engaged | onCampaignContactEngaged | Measures engagement rates and campaign effectiveness |
| contact.created | onContactCreated | Updates lead generation and source attribution metrics |
| user.territory-changed | onUserTerritoryChanged | Recalculates territory-based performance metrics |

## Dependencies

- **user-service** — Resolves user profiles, territory assignments, and team hierarchies when building user-scoped reports and dashboards

## Tech Stack

- **Runtime**: Node.js >= 20
- **Framework**: Express 4
- **Validation**: express-validator
- **ID generation**: uuid
- **Logging**: morgan (combined)
- **Storage**: In-memory store (swap for PostgreSQL/ClickHouse in production)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 8080 | HTTP port the service listens on |
| USER_SERVICE_URL | http://user-service:8080 | Base URL for UserService |
| KAFKA_BROKERS | localhost:9092 | Comma-separated Kafka broker list |
| KAFKA_GROUP_ID | analytics-service | Kafka consumer group ID |
| LOG_LEVEL | info | Logging verbosity |

---

## Archetype Constraints — HTTP service

This service IS responsible for:
- Owning and persisting its domain data (in-memory or database)
- Implementing every API endpoint declared in its spec exactly as specified
- Input validation on all mutating endpoints (POST, PUT, PATCH)
- All business logic for its bounded context

This service is NOT responsible for:
- Wrapping external third-party APIs (use a provider service for that)
- Accepting foreign-format payloads (use an adaptor service for that)
- Event-driven processing that is not declared in its event contracts
