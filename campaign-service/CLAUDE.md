# CampaignService — Claude Code Context

## Role in the Client Contacts Ecosystem

CampaignService is the marketing automation hub of the Client Contacts CRM ecosystem. It is responsible for creating and executing marketing campaigns (email blasts, drip sequences), managing contact segmentation, and tracking engagement metrics such as open rates, click-through rates, and conversions. It auto-enrolls new contacts into onboarding campaigns and triggers post-sale upsell sequences when opportunities are won.

## API Surface

| Method | Path | Description |
|--------|------|-------------|
| POST | /campaigns | Create a new marketing campaign |
| GET | /campaigns/:id | Retrieve campaign details and metrics |
| PUT | /campaigns/:id | Update campaign settings or status |
| GET | /campaigns | List campaigns with filtering by status, type, owner |
| POST | /campaigns/:id/contacts | Add contacts to a campaign manually or via segment |
| DELETE | /campaigns/:id/contacts/:contactId | Remove contact from campaign |
| GET | /campaigns/:id/contacts | List all contacts enrolled in campaign |
| POST | /campaigns/:id/send | Execute campaign send (email blast, sequence trigger) |
| GET | /campaigns/:id/analytics | Get campaign performance metrics |
| POST | /segments | Create contact segment based on criteria |
| GET | /segments/:id/contacts | Preview contacts matching segment criteria |
| GET | /health | Health check |

## Event Contracts

### Produces

| Topic | Trigger | Payload |
|-------|---------|---------|
| campaign.created | New campaign is created | `{ campaignId, name, type, ownerId, createdAt }` |
| campaign.sent | Campaign is executed/sent | `{ campaignId, name, recipientCount, sentAt }` |
| campaign.contact-added | Contact enrolled in campaign | `{ campaignId, contactId, enrolledAt, enrollmentSource }` |
| campaign.contact-engaged | Contact opens email, clicks link, or responds | `{ campaignId, contactId, engagementType, engagedAt }` |
| campaign.completed | Campaign sequence finishes for all contacts | `{ campaignId, name, completedAt, totalRecipients }` |

### Consumes

| Topic | Handler | Action |
|-------|---------|--------|
| contact.created | onContactCreated | May auto-enroll new contacts into onboarding campaigns |
| contact.updated | onContactUpdated | Re-evaluates segment criteria when contact data changes |
| opportunity.won | onOpportunityWon | May trigger post-sale campaigns or upsell sequences |

## Dependencies

- **contact-service** — Used to look up and validate contacts before enrolling them in campaigns and when evaluating segment criteria.

## Tech Stack & Environment Variables

**Tech Stack:** Node.js 20, Express 4, in-memory data store, express-validator for input validation.

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 8080 | HTTP port for the service |
| CONTACT_SERVICE_URL | http://contact-service:8080 | Base URL of the ContactService |
| NODE_ENV | development | Runtime environment |

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
