# CampaignService — Service Specification

## Purpose

CampaignService manages marketing campaigns, email sequences, contact segmentation, and engagement metrics within the Client Contacts CRM ecosystem. It enables marketing teams to create targeted campaigns, enroll contacts (manually or via smart segments), execute sends, and analyze results through open rates, click-through rates, and conversions.

## Tech Stack

- **Runtime:** Node.js 20
- **Framework:** Express 4
- **Validation:** express-validator
- **Storage:** In-memory (replaceable with a database)
- **Archetype:** HTTP — standard REST service with domain routes and business logic

---

## API Endpoints

| Method | Path | Description | Request Body | Response Shape |
|--------|------|-------------|--------------|----------------|
| POST | /campaigns | Create a new marketing campaign | `{ name, type, ownerId, description?, status?, schedule?, settings? }` | `201 { campaign }` |
| GET | /campaigns/:id | Retrieve campaign details and metrics | — | `200 { campaign }` |
| PUT | /campaigns/:id | Update campaign settings or status | `{ name?, type?, status?, description?, schedule?, settings? }` | `200 { campaign }` |
| GET | /campaigns | List campaigns with filtering | query: `status`, `type`, `ownerId`, `page`, `limit` | `200 { campaigns[], total, page, limit }` |
| POST | /campaigns/:id/contacts | Add contacts to a campaign manually or via segment | `{ contactIds?, segmentId? }` | `200 { enrolled[], skipped[] }` |
| DELETE | /campaigns/:id/contacts/:contactId | Remove contact from campaign | — | `200 { message }` |
| GET | /campaigns/:id/contacts | List all contacts enrolled in campaign | query: `page`, `limit` | `200 { contacts[], total, page, limit }` |
| POST | /campaigns/:id/send | Execute campaign send | `{ sendAt? }` | `200 { campaignId, recipientCount, status, sentAt }` |
| GET | /campaigns/:id/analytics | Get campaign performance metrics | — | `200 { analytics }` |
| POST | /segments | Create contact segment based on criteria | `{ name, criteria, description? }` | `201 { segment }` |
| GET | /segments/:id/contacts | Preview contacts matching segment criteria | query: `page`, `limit` | `200 { contacts[], total, segmentId }` |
| GET | /health | Health check | — | `200 { ok: true, service: "campaign-service" }` |

### Campaign Object Shape

```json
{
  "id": "uuid",
  "name": "Q1 Onboarding",
  "type": "email_blast | drip_sequence | newsletter | promotional",
  "status": "draft | scheduled | active | paused | completed | cancelled",
  "ownerId": "uuid",
  "description": "string",
  "schedule": {
    "startAt": "ISO8601",
    "endAt": "ISO8601",
    "timezone": "America/New_York"
  },
  "settings": {
    "fromName": "string",
    "fromEmail": "string",
    "replyTo": "string",
    "subject": "string",
    "templateId": "string"
  },
  "metrics": {
    "totalEnrolled": 0,
    "sent": 0,
    "delivered": 0,
    "opened": 0,
    "clicked": 0,
    "converted": 0,
    "unsubscribed": 0,
    "bounced": 0
  },
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### Segment Object Shape

```json
{
  "id": "uuid",
  "name": "Enterprise Leads",
  "description": "string",
  "criteria": {
    "filters": [
      { "field": "industry", "operator": "eq", "value": "Technology" },
      { "field": "leadScore", "operator": "gte", "value": 80 }
    ],
    "logic": "AND"
  },
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

---

## Events Produced

| Topic | Trigger | Payload Shape |
|-------|---------|---------------|
| `campaign.created` | New campaign is created via POST /campaigns | `{ campaignId, name, type, ownerId, createdAt }` |
| `campaign.sent` | Campaign is executed via POST /campaigns/:id/send | `{ campaignId, name, recipientCount, sentAt }` |
| `campaign.contact-added` | Contact is enrolled via POST /campaigns/:id/contacts | `{ campaignId, contactId, enrolledAt, enrollmentSource }` |
| `campaign.contact-engaged` | Contact engagement event is recorded | `{ campaignId, contactId, engagementType, engagedAt }` |
| `campaign.completed` | All contacts finish campaign sequence | `{ campaignId, name, completedAt, totalRecipients }` |

---

## Events Consumed

| Topic | Handler | What It Does |
|-------|---------|--------------|
| `contact.created` | `onContactCreated` | Checks for active onboarding campaigns with `autoEnroll: true` and enrolls the new contact |
| `contact.updated` | `onContactUpdated` | Re-evaluates dynamic segment criteria to add or remove the contact from relevant campaigns |
| `opportunity.won` | `onOpportunityWon` | Checks for post-sale or upsell campaign templates and auto-triggers them for the associated contact |

---

## Dependencies

| Service | Reason |
|---------|--------|
| contact-service | Validates contactIds exist before enrollment; resolves contact attributes for segment criteria evaluation |

---

## Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| PORT | 8080 | No | HTTP port the service listens on |
| CONTACT_SERVICE_URL | http://contact-service:8080 | No | Base URL for the ContactService |
| NODE_ENV | development | No | Runtime environment (development / production / test) |
