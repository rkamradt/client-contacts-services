# OpportunityService — Claude Code Context

## Role in the Client Contacts Ecosystem

OpportunityService is a core domain service in the **Client Contacts** CRM ecosystem. It owns and manages the entire sales pipeline lifecycle — from initial prospect creation through deal closure. It tracks stages, deal values, probabilities, and forecasted revenue, and is the authoritative source of truth for all opportunity data.

## API Surface

| Method | Path | Description |
|--------|------|-------------|
| POST | /opportunities | Create a new sales opportunity |
| GET | /opportunities/:id | Retrieve opportunity details |
| PUT | /opportunities/:id/stage | Update opportunity stage in the sales pipeline |
| GET | /opportunities | Query opportunities with filtering by stage, owner, account, date range |
| PUT | /opportunities/:id | Update opportunity details (value, close date, probability) |
| GET | /opportunities/:id/forecast | Calculate weighted revenue forecast for opportunity |
| GET | /accounts/:accountId/opportunities | List all opportunities for a specific account |
| GET | /health | Health check |

## Event Contracts

### Produced

| Topic | Trigger |
|-------|---------|
| `opportunity.created` | Emitted when a new sales opportunity is created |
| `opportunity.stage-changed` | Emitted when opportunity moves through pipeline stages |
| `opportunity.won` | Emitted when opportunity is closed as won |
| `opportunity.lost` | Emitted when opportunity is closed as lost |
| `opportunity.value-updated` | Emitted when deal value or probability changes |

### Consumed

| Topic | Handler | Action |
|-------|---------|--------|
| `contact.created` | contactCreatedHandler | May auto-create opportunities for qualified leads |
| `activity.logged` | activityLoggedHandler | Links relevant activities to opportunities for context |

## Dependencies

- **contact-service** — Validates contact and account references when creating or querying opportunities
- **activity-service** — Receives activity.logged events to associate activities with pipeline opportunities

## Tech Stack

- **Runtime**: Node.js >= 20
- **Framework**: Express 4
- **Validation**: express-validator
- **ID generation**: uuid
- **Storage**: In-memory (no external database required for development)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP port the service listens on |
| `CONTACT_SERVICE_URL` | `http://contact-service:8080` | Base URL for ContactService |
| `ACTIVITY_SERVICE_URL` | `http://activity-service:8080` | Base URL for ActivityService |
| `NODE_ENV` | `development` | Runtime environment |

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
