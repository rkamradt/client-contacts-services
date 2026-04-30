# NotificationService — Claude Code Context

## Role in the Client Contacts Ecosystem

NotificationService is a **messaging-archetype** service in the Client Contacts CRM platform. It is the central hub for all user-facing alerts, transactional emails, in-app notifications, and real-time communication. It reacts to domain events produced by other services and delivers timely, contextual messages to users through multiple channels.

It does NOT own authoritative CRM data — it is purely reactive and delivery-focused.

## API Surface

This service exposes **no HTTP domain routes**. The only HTTP endpoint is:

- `GET /health` — liveness probe returning `{ ok: true, service: "notification-service" }`

All notification and alert management (creation, retrieval, preferences, read-status) is handled internally in response to Kafka events, with in-memory state for demonstration purposes.

## Event Contracts

### Produces

| Topic                 | Trigger                                                              |
|-----------------------|----------------------------------------------------------------------|
| `notification.sent`   | Emitted when any notification is successfully delivered              |
| `notification.failed` | Emitted when notification delivery fails                             |
| `alert.triggered`     | Emitted when system alert conditions are met                         |

### Consumes

| Topic                       | Action                                                              |
|-----------------------------|---------------------------------------------------------------------|
| `opportunity.stage-changed` | Sends notifications for pipeline updates and milestone alerts       |
| `opportunity.won`           | Sends congratulations and next-step notifications                   |
| `opportunity.lost`          | Sends follow-up reminders and analysis prompts                      |
| `activity.logged`           | Sends notifications for task assignments and meeting reminders      |
| `campaign.contact-engaged`  | Sends real-time alerts when high-value prospects engage             |
| `contact.created`           | Sends welcome notifications and onboarding alerts                   |
| `user.territory-changed`    | Sends notifications about territory reassignments and handoffs      |

## Dependencies

- **UserService** (`user-service`) — Consulted to resolve user profiles, preferences, and territory assignments when building notification content and determining delivery targets.

## Tech Stack and Environment Variables

**Tech Stack:**
- Runtime: Node.js 20 (Alpine)
- Framework: Express.js
- Messaging: KafkaJS
- Unique IDs: uuid

**Environment Variables:**

| Variable        | Default            | Description                                      |
|-----------------|--------------------|--------------------------------------------------|
| `PORT`          | `8080`             | HTTP port for the health endpoint                |
| `KAFKA_BROKERS` | `localhost:9092`   | Comma-separated list of Kafka broker addresses   |
| `USER_SERVICE_URL` | `http://user-service:8080` | Base URL for the UserService HTTP API |
| `NODE_ENV`      | `development`      | Runtime environment                              |

## Archetype Constraints — Messaging service

This service IS responsible for:
- Consuming events from every topic listed in its "consumes" contracts
- Running business logic in response to those events
- Publishing to every topic listed in its "produces" contracts
- Managing its own consumer group offset

This service is NOT responsible for:
- Exposing HTTP domain routes — /health is the only HTTP endpoint
- Owning a persistent authoritative data store
- Wrapping external APIs or accepting foreign-format payloads
