# ActivityService — Service Specification

## Purpose

ActivityService manages all customer interactions for the Client Contacts CRM, including calls, emails, meetings, and notes. It provides full timeline tracking per contact, supports flexible filtering, and emits events that power notifications and analytics downstream.

## Tech Stack

- **Language / Runtime**: Node.js >= 20
- **Framework**: Express 4
- **Validation**: express-validator
- **Storage**: In-memory store (production-ready interface, swap for PostgreSQL or MongoDB)
- **ID generation**: uuid v4

## Archetype

HTTP — standard REST service with domain routes and business logic.

---

## API Endpoints

| Method | Path | Description | Request Body | Response Shape |
|--------|------|-------------|--------------|----------------|
| POST | /activities | Log a new activity | `{ contactId, type, subject, description, scheduledAt?, completedAt?, durationMinutes?, outcome?, ownerId }` | `201 { id, contactId, type, subject, description, scheduledAt, completedAt, durationMinutes, outcome, ownerId, status, createdAt, updatedAt }` |
| GET | /activities | Retrieve activities with filtering | Query: `contactId`, `type`, `status`, `dateFrom`, `dateTo`, `ownerId`, `page`, `limit` | `200 { data: [Activity], total, page, limit }` |
| GET | /contacts/:contactId/timeline | Get chronological activity timeline for a contact | — | `200 { contactId, timeline: [Activity] }` |
| PUT | /activities/:id | Update activity details or completion status | `{ subject?, description?, scheduledAt?, completedAt?, durationMinutes?, outcome?, status? }` | `200 Activity` |
| GET | /health | Health check | — | `200 { ok: true, service: "activity-service" }` |

### Activity Object

```json
{
  "id": "uuid",
  "contactId": "uuid",
  "type": "call | email | meeting | note",
  "subject": "string",
  "description": "string",
  "status": "scheduled | completed | cancelled",
  "scheduledAt": "ISO8601 | null",
  "completedAt": "ISO8601 | null",
  "durationMinutes": "number | null",
  "outcome": "string | null",
  "ownerId": "uuid",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

---

## Events Produced

| Topic | Trigger | Payload Shape |
|-------|---------|---------------|
| `activity.logged` | Emitted when any new activity is recorded | `{ eventType: "activity.logged", activityId, contactId, type, subject, ownerId, status, createdAt }` |
| `activity.completed` | Emitted when a scheduled activity is marked complete (status transitions to "completed") | `{ eventType: "activity.completed", activityId, contactId, type, subject, completedAt, durationMinutes, outcome, ownerId }` |

---

## Events Consumed

| Topic | Handler | What It Does |
|-------|---------|--------------|
| `contact.created` | `handleContactCreated` | Automatically creates an initial activity entry of type `note` with subject "Contact Created" for the new contact, providing a starting point on their timeline |

---

## Dependencies

| Service | Reason |
|---------|--------|
| contact-service | ActivityService stores `contactId` references. The `contact.created` event is consumed to auto-create the first timeline entry per contact. |

---

## Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `PORT` | `8080` | No | HTTP listen port |
| `CONTACT_SERVICE_URL` | `http://contact-service:8080` | No | Base URL for ContactService REST calls |
| `MESSAGE_BROKER_URL` | — | No | Message broker connection string for event pub/sub |
| `NODE_ENV` | `development` | No | Runtime environment (`development` / `production` / `test`) |
