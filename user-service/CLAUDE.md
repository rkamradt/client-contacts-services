# UserService — Claude Code Context

## Role in the Client Contacts Ecosystem

UserService is a foundational service in the Client Contacts CRM ecosystem. It manages user profiles, sales territory assignments, team hierarchies, role-based permissions, and broader business context for authenticated users. Because it has no upstream service dependencies, it serves as a root-level data owner that other services (NotificationService, AnalyticsService) rely on for user and territory information.

## API Surface

| Method | Path                          | Description                                           |
|--------|-------------------------------|-------------------------------------------------------|
| GET    | /users                        | Search and list users with filtering by territory, role, team |
| GET    | /users/:id                    | Retrieve user profile and business context            |
| PUT    | /users/:id                    | Update user profile information                       |
| GET    | /users/:id/territory          | Get user's sales territory assignment                 |
| PUT    | /users/:id/territory          | Assign user to a different sales territory            |
| GET    | /users/:id/subordinates       | Get list of team members reporting to this user       |
| PUT    | /users/:id/role               | Update user's role and permissions                    |
| GET    | /territories/:id/users        | List all users assigned to a territory                |
| GET    | /health                       | Health check                                          |

## Event Contracts

### Produces

| Topic                   | Trigger                                                    |
|-------------------------|------------------------------------------------------------|
| user.territory-changed  | Emitted when a user is reassigned to a different sales territory |
| user.role-updated       | Emitted when a user's role or permissions change           |
| user.profile-updated    | Emitted when user profile information is modified          |
| user.team-changed       | Emitted when a user's manager or team assignment changes   |

### Consumes

_(none)_

## Dependencies

- **none** — UserService is a root-level service with no upstream service dependencies.

## Tech Stack and Environment Variables

**Tech Stack:**
- Runtime: Node.js >= 20
- Framework: Express 4
- Validation: express-validator
- Logging: morgan
- ID generation: uuid
- In-memory data store (no external database required by default)

**Environment Variables:**

| Variable        | Default         | Description                                         |
|-----------------|-----------------|-----------------------------------------------------|
| PORT            | 8080            | HTTP port the service listens on                    |
| NODE_ENV        | development     | Runtime environment (development / production)      |
| EVENT_BUS_URL   | (none)          | Optional URL for publishing domain events           |
| LOG_LEVEL       | combined        | Morgan log format                                   |

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
