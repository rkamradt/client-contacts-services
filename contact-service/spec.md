# ContactService — Service Specification

## Purpose

ContactService is the authoritative data owner for all contacts, leads, and accounts in the Client Contacts CRM ecosystem. It exposes REST APIs for full CRUD operations and relationship management, and emits domain events when significant state changes occur.

## Tech Stack

- **Runtime:** Node.js >= 20
- **Framework:** Express 4.x
- **Validation:** express-validator
- **HTTP Logging:** morgan
- **ID Generation:** uuid
- **Storage:** In-memory Map (production: replace with a relational or document database)

## Archetype

HTTP — Standard REST service with domain routes and business logic.

---

## API Endpoints

| Method | Path | Description | Request Body | Response Shape |
|--------|------|-------------|--------------|----------------|
| POST | /contacts | Create a new contact | `{ firstName, lastName, email, phone?, title?, accountId?, type?, source?, tags? }` | `201 { id, firstName, lastName, email, phone, title, accountId, type, source, tags, createdAt, updatedAt }` |
| GET | /contacts/:id | Retrieve contact details by ID | — | `200 { id, firstName, lastName, email, phone, title, accountId, type, source, tags, createdAt, updatedAt }` |
| PUT | /contacts/:id | Update contact information | `{ firstName?, lastName?, email?, phone?, title?, accountId?, type?, source?, tags? }` | `200 { id, ...updatedFields, updatedAt }` |
| GET | /contacts | Search and list contacts with filtering | Query: `?email=&accountId=&type=&source=&search=&page=&limit=` | `200 { data: [...contacts], total, page, limit }` |
| POST | /accounts | Create a new account/company | `{ name, industry?, website?, phone?, address?, description? }` | `201 { id, name, industry, website, phone, address, description, createdAt, updatedAt }` |
| GET | /accounts/:id/contacts | List all contacts for an account | Query: `?page=&limit=` | `200 { data: [...contacts], total, page, limit }` |
| GET | /health | Health check | — | `200 { ok: true, service: "contact-service" }` |

---

## Events Produced

| Topic | Trigger | Payload Shape |
|-------|---------|---------------|
| `contact.created` | A new contact is successfully created via POST /contacts | `{ eventType: "contact.created", contactId, firstName, lastName, email, accountId, type, createdAt }` |
| `contact.updated` | A contact record is updated via PUT /contacts/:id | `{ eventType: "contact.updated", contactId, updatedFields: [...fieldNames], updatedAt }` |
| `contact.converted` | A contact's type changes from "lead" to "contact" | `{ eventType: "contact.converted", contactId, previousType: "lead", convertedAt }` |
| `account.created` | A new account is created via POST /accounts | `{ eventType: "account.created", accountId, name, industry, createdAt }` |

> **Note:** In this implementation events are logged to stdout. In production, publish to a message broker (e.g., Kafka, RabbitMQ, AWS SNS).

---

## Events Consumed

_(none — ContactService has no upstream event dependencies)_

---

## Dependencies

| Service | Reason |
|---------|--------|
| _(none)_ | ContactService is a foundational service with no upstream dependencies |

---

## Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| PORT | 8080 | No | TCP port the HTTP server binds to |
| NODE_ENV | development | No | Runtime environment (`development`, `production`, `test`) |
