# ActivityService — Claude Code Context

## Role in the Client Contacts Ecosystem

ActivityService is the central hub for all customer interaction tracking within the Client Contacts CRM platform. It records and retrieves every touchpoint between sales reps and contacts — including calls, emails, meetings, and notes — providing a chronological timeline view per contact. It serves both operational needs (what happened with this contact?) and feeds downstream analytics and notification flows.

## API Surface

| Method | Path | Description |
|--------|------|-------------|
| POST | /activities | Log a new activity (call, email, meeting, note) |
| GET | /activities | Retrieve activities with filtering by contact, type, date range |
| GET | /contacts/:contactId/timeline | Get chronological activity timeline for a contact |
| PUT | /activities/:id | Update activity details or completion status |
| GET | /health | Health check |

## Event Contracts

### Produces

| Topic | Trigger |
|-------|---------|
| `activity.logged` | Emitted when any new activity is recorded |
| `activity.completed` | Emitted when a scheduled activity is marked complete |

### Consumes

| Topic | Handler | Action |
|-------|---------|--------|
| `contact.created` | contactCreatedHandler | Creates an initial "contact created" activity entry for new contacts |

## Dependencies

- **contact-service** — ActivityService references contactId values owned by ContactService. When a contact is created, this service receives the event and logs an initial activity for that contact.

## Tech Stack and Environment Variables

- **Runtime**: Node.js >= 20
- **Framework**: Express 4
- **Validation**: express-validator
- **ID generation**: uuid v4
- **Storage**: In-memory (suitable for development; replace with a persistent store for production)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Port the HTTP server listens on |
| `CONTACT_SERVICE_URL` | `http://contact-service:8080` | Base URL of the ContactService |
| `MESSAGE_BROKER_URL` | — | URL of the message broker for event publishing/consuming |
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
