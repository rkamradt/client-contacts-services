# ContactService — Claude Code Context

## Role in the Client Contacts Ecosystem

ContactService is the authoritative source of truth for all contact, lead, and account data within the Client Contacts CRM ecosystem. It provides full CRUD operations and relationship management for contacts and accounts. All other services that need contact or account data depend on this service either directly via HTTP or indirectly through the events it emits.

## API Surface

| Method | Path | Description |
|--------|------|-------------|
| POST   | /contacts | Create a new contact |
| GET    | /contacts/:id | Retrieve contact details by ID |
| PUT    | /contacts/:id | Update contact information |
| GET    | /contacts | Search and list contacts with filtering |
| POST   | /accounts | Create a new account/company |
| GET    | /accounts/:id/contacts | List all contacts for a given account |
| GET    | /health | Health check endpoint |

## Event Contracts

### Produces

| Topic | Trigger | Payload Shape |
|-------|---------|---------------|
| contact.created | New contact successfully created | `{ eventType, contactId, firstName, lastName, email, accountId, type, createdAt }` |
| contact.updated | Contact record updated | `{ eventType, contactId, updatedFields, updatedAt }` |
| contact.converted | Lead converted to contact | `{ eventType, contactId, previousType, convertedAt }` |
| account.created | New account/company created | `{ eventType, accountId, name, industry, createdAt }` |

### Consumes

_(none)_

## Dependencies

This service has **no upstream service dependencies**. It is a foundational service in the ecosystem.

## Tech Stack and Environment Variables

**Tech Stack:**
- Runtime: Node.js >= 20
- Framework: Express 4.x
- Validation: express-validator
- Logging: morgan
- CORS: cors
- ID generation: uuid
- Storage: In-memory (Map-based store; swap for a real DB in production)

**Environment Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 8080 | HTTP port the service listens on |
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
