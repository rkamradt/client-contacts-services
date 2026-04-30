# UserService — Service Specification

## Purpose

UserService manages user profiles, sales territory assignments, team hierarchies, role-based permissions, and broader business context for authenticated users within the Client Contacts CRM ecosystem. It is a root-level service with no upstream dependencies and acts as the authoritative source of truth for user and territory data.

## Tech Stack

- **Runtime:** Node.js >= 20
- **Framework:** Express 4
- **Validation:** express-validator
- **Logging:** morgan
- **ID generation:** uuid
- **Persistence:** In-memory store (swap for a database adapter in production)

## Archetype

HTTP — standard REST service with domain routes and business logic.

---

## API Endpoints

| Method | Path                        | Description                                              | Request Body                                                                 | Response Shape                                              |
|--------|-----------------------------|----------------------------------------------------------|------------------------------------------------------------------------------|-------------------------------------------------------------|
| GET    | /users                      | Search and list users with filtering by territory, role, team | —                                                                        | `{ users: User[], total: number }`                         |
| GET    | /users/:id                  | Retrieve user profile and business context               | —                                                                            | `User`                                                      |
| PUT    | /users/:id                  | Update user profile information                          | `{ firstName?, lastName?, email?, phone?, title?, managerId?, avatarUrl? }` | `User`                                                      |
| GET    | /users/:id/territory        | Get user's sales territory assignment                    | —                                                                            | `Territory`                                                 |
| PUT    | /users/:id/territory        | Assign user to a different sales territory               | `{ territoryId: string }`                                                    | `User`                                                      |
| GET    | /users/:id/subordinates     | Get list of team members reporting to this user          | —                                                                            | `{ subordinates: User[], total: number }`                  |
| PUT    | /users/:id/role             | Update user's role and permissions                       | `{ role: string, permissions?: string[] }`                                   | `User`                                                      |
| GET    | /territories/:id/users      | List all users assigned to a territory                   | —                                                                            | `{ users: User[], total: number, territory: Territory }`   |
| GET    | /health                     | Health check                                             | —                                                                            | `{ ok: true, service: "user-service" }`                    |

### User Object Shape

```json
{
  "id": "uuid",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "phone": "+1-555-0101",
  "title": "Account Executive",
  "role": "sales_rep",
  "permissions": ["read:contacts", "write:contacts"],
  "territoryId": "uuid",
  "managerId": "uuid | null",
  "avatarUrl": "https://example.com/avatar.png",
  "isActive": true,
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### Territory Object Shape

```json
{
  "id": "uuid",
  "name": "West Coast",
  "region": "North America",
  "description": "Covers CA, OR, WA states",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

---

## Events Produced

| Topic                  | Trigger                                                       | Payload Shape                                                                                      |
|------------------------|---------------------------------------------------------------|----------------------------------------------------------------------------------------------------|
| user.territory-changed | User is reassigned to a different sales territory             | `{ userId, previousTerritoryId, newTerritoryId, changedAt }`                                      |
| user.role-updated      | User's role or permissions change                             | `{ userId, previousRole, newRole, permissions, updatedAt }`                                        |
| user.profile-updated   | User profile information is modified                          | `{ userId, updatedFields: string[], updatedAt }`                                                   |
| user.team-changed      | User's manager or team assignment changes                     | `{ userId, previousManagerId, newManagerId, changedAt }`                                           |

---

## Events Consumed

_(none)_ — UserService has no event subscriptions.

---

## Dependencies and Rationale

| Dependency | Rationale                  |
|------------|----------------------------|
| none       | Root-level service; owns its data and requires no upstream data sources |

---

## Environment Variables

| Variable        | Default      | Required | Description                                                |
|-----------------|--------------|----------|------------------------------------------------------------|
| PORT            | 8080         | No       | HTTP port the service listens on                           |
| NODE_ENV        | development  | No       | Runtime environment                                        |
| EVENT_BUS_URL   | (none)       | No       | URL for publishing domain events to the message bus        |
| LOG_LEVEL       | combined     | No       | Morgan HTTP log format (combined, common, dev, tiny)       |
