# NotificationService — Service Specification

## Purpose

NotificationService manages all system notifications, alerts, transactional emails, and real-time communication channels for the Client Contacts CRM. It acts as the delivery layer for user-facing messages, reacting to domain events emitted across the ecosystem and routing them to the appropriate channels and recipients. It tracks notification history, manages user delivery preferences, and raises system alerts when conditions warrant.

## Tech Stack

- **Runtime:** Node.js 20
- **Framework:** Express.js (health endpoint only)
- **Messaging:** KafkaJS (Kafka consumer/producer)
- **Archetype:** Messaging — event-driven, no domain HTTP routes

---

## API Endpoints

> This service is a **messaging archetype**. It exposes **no domain HTTP routes**.  
> The sole HTTP endpoint is the health probe:

| Method | Path      | Description           | Request Body | Response Shape                              |
|--------|-----------|-----------------------|--------------|---------------------------------------------|
| GET    | `/health` | Service liveness probe | —            | `{ "ok": true, "service": "notification-service" }` |

---

## Events Produced

| Topic                 | Trigger                                              | Payload Shape                                                                                                                                  |
|-----------------------|------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| `notification.sent`   | Any notification successfully delivered              | `{ notificationId, recipientUserId, channel, notificationType, subject, message, referenceId, referenceType, sentAt }`                         |
| `notification.failed` | A notification delivery attempt fails                | `{ notificationId, recipientUserId, channel, notificationType, errorMessage, failedAt }`                                                       |
| `alert.triggered`     | A system alert condition is met                      | `{ alertId, alertType, severity, title, message, affectedEntityId, affectedEntityType, triggeredAt, recipientUserIds }`                        |

---

## Events Consumed

| Topic                       | Handler File                          | What It Does                                                                                           |
|-----------------------------|---------------------------------------|--------------------------------------------------------------------------------------------------------|
| `opportunity.stage-changed` | `handlers/opportunity-stage-changed`  | Notifies the opportunity owner and relevant team members about pipeline stage transitions and milestone alerts |
| `opportunity.won`           | `handlers/opportunity-won`            | Sends congratulations notifications to the owner and manager; triggers next-step task reminders        |
| `opportunity.lost`          | `handlers/opportunity-lost`           | Sends follow-up reminders to the owner; prompts analysis of loss reason                                |
| `activity.logged`           | `handlers/activity-logged`            | Notifies assignees of new tasks; sends meeting reminders to participants                               |
| `campaign.contact-engaged`  | `handlers/campaign-contact-engaged`   | Sends real-time alerts to campaign owners when high-value prospects open, click, or respond            |
| `contact.created`           | `handlers/contact-created`            | Sends welcome notifications and onboarding alerts to the contact owner and assigned rep                |
| `user.territory-changed`    | `handlers/user-territory-changed`     | Notifies the affected user and their manager about territory reassignment and handoff requirements      |

---

## Dependencies

| Service       | Reason                                                                                      |
|---------------|---------------------------------------------------------------------------------------------|
| `user-service` | Resolve user profiles, notification preferences, manager relationships, and territory context when constructing notification content and identifying recipients |

---

## Environment Variables

| Variable           | Default                        | Required | Description                                              |
|--------------------|--------------------------------|----------|----------------------------------------------------------|
| `PORT`             | `8080`                         | No       | HTTP port for the health endpoint                        |
| `KAFKA_BROKERS`    | `localhost:9092`               | Yes      | Comma-separated list of Kafka broker hostnames/ports     |
| `USER_SERVICE_URL` | `http://user-service:8080`     | No       | Base URL for UserService API calls                       |
| `NODE_ENV`         | `development`                  | No       | Runtime environment (`development`, `production`, `test`)|
