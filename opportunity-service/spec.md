# OpportunityService — Service Specification

## Purpose

OpportunityService manages the full sales pipeline for the Client Contacts CRM. It tracks deals from initial prospect qualification through closed-won or closed-lost outcomes. Core responsibilities include stage management, deal value tracking, win probability calculation, and weighted revenue forecasting.

## Tech Stack

- **Runtime**: Node.js >= 20
- **Framework**: Express 4
- **Validation**: express-validator
- **ID generation**: uuid v4
- **Storage**: In-memory store (map-based, suitable for development; swap with a database adapter for production)
- **Archetype**: HTTP — standard REST service with domain routes and business logic

---

## API Endpoints

| Method | Path | Description | Request Body | Response Shape |
|--------|------|-------------|--------------|----------------|
| POST | /opportunities | Create a new sales opportunity | `{ title, accountId, contactId, ownerId, value, currency, stage, probability, expectedCloseDate, description }` | `201 { id, title, accountId, contactId, ownerId, value, currency, stage, probability, expectedCloseDate, description, createdAt, updatedAt }` |
| GET | /opportunities/:id | Retrieve opportunity details | — | `200 { id, title, accountId, contactId, ownerId, value, currency, stage, probability, expectedCloseDate, description, linkedActivityIds, createdAt, updatedAt }` |
| PUT | /opportunities/:id/stage | Update opportunity stage in the pipeline | `{ stage }` | `200 { id, stage, previousStage, updatedAt }` |
| GET | /opportunities | Query opportunities with filtering | Query: `?stage=&ownerId=&accountId=&fromDate=&toDate=&page=&limit=` | `200 { data: [...], total, page, limit }` |
| PUT | /opportunities/:id | Update opportunity details | `{ title?, value?, currency?, expectedCloseDate?, probability?, description? }` | `200 { id, title, accountId, contactId, ownerId, value, currency, stage, probability, expectedCloseDate, description, updatedAt }` |
| GET | /opportunities/:id/forecast | Calculate weighted revenue forecast | — | `200 { opportunityId, value, probability, weightedValue, currency, expectedCloseDate, stage }` |
| GET | /accounts/:accountId/opportunities | List all opportunities for a specific account | Query: `?stage=&page=&limit=` | `200 { data: [...], total, page, limit }` |
| GET | /health | Health check | — | `200 { ok: true, service: "opportunity-service" }` |

---

## Pipeline Stages

The following ordered stages are supported:

| Stage Key | Display Name |
|-----------|--------------|
| `prospecting` | Prospecting |
| `qualification` | Qualification |
| `needs_analysis` | Needs Analysis |
| `value_proposition` | Value Proposition |
| `decision_makers` | Decision Makers |
| `proposal` | Proposal / Price Quote |
| `negotiation` | Negotiation / Review |
| `closed_won` | Closed Won |
| `closed_lost` | Closed Lost |

---

## Events Produced

| Topic | Trigger | Payload Shape |
|-------|---------|---------------|
| `opportunity.created` | New opportunity successfully created | `{ opportunityId, title, accountId, contactId, ownerId, stage, value, currency, createdAt }` |
| `opportunity.stage-changed` | Stage updated via PUT /opportunities/:id/stage | `{ opportunityId, previousStage, newStage, ownerId, accountId, updatedAt }` |
| `opportunity.won` | Stage changed to `closed_won` | `{ opportunityId, title, accountId, ownerId, value, currency, closedAt }` |
| `opportunity.lost` | Stage changed to `closed_lost` | `{ opportunityId, title, accountId, ownerId, value, currency, closedAt, lossReason }` |
| `opportunity.value-updated` | Value or probability changed via PUT /opportunities/:id | `{ opportunityId, previousValue, newValue, previousProbability, newProbability, currency, updatedAt }` |

---

## Events Consumed

| Topic | Handler | What It Does |
|-------|---------|--------------|
| `contact.created` | `contactCreatedHandler` | Inspects contact lead score / type; if contact is a qualified lead, auto-creates a prospecting-stage opportunity linked to that contact |
| `activity.logged` | `activityLoggedHandler` | If the activity references an `opportunityId`, adds the activity ID to the opportunity's `linkedActivityIds` list for contextual timeline enrichment |

---

## Dependencies

| Service | Rationale |
|---------|-----------|
| contact-service | Source of truth for contacts and accounts; opportunity creation references contactId and accountId |
| activity-service | Source of activity.logged events; activities are associated to opportunities for full deal context |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP port the service listens on |
| `CONTACT_SERVICE_URL` | `http://contact-service:8080` | Base URL for ContactService REST calls |
| `ACTIVITY_SERVICE_URL` | `http://activity-service:8080` | Base URL for ActivityService REST calls |
| `NODE_ENV` | `development` | Runtime environment (`development` / `production` / `test`) |
