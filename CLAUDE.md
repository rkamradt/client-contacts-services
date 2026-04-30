# Client Contacts — Platform Architecture Context

## Services in this platform

- **ContactService** (contact-service) [http] — Owns all contact, lead, and account data with full CRUD operations and relationship management
- **ActivityService** (activity-service) [http] — Manages all customer interactions including calls, emails, meetings, and notes with timeline tracking
- **OpportunityService** (opportunity-service) [http] — Manages sales pipeline and deals from prospect through close, tracking stages, values, and forecasting
- **UserService** (user-service) [http] — Manages user profiles, territories, team assignments, roles, and business context for authenticated users
- **CampaignService** (campaign-service) [http] — Manages marketing campaigns, email sequences, contact segmentation, and tracks engagement metrics
- **NotificationService** (notification-service) [messaging] — Manages system notifications, alerts, transactional emails, and real-time communication channels
- **AnalyticsService** (analytics-service) [http] — Provides business intelligence, reporting, dashboards, and data analytics across all CRM domains

## Mono-repo layout

One directory per service, each with its own Dockerfile and CI workflow.

Directories ending in -mock are test scaffolding — never deploy them to production.

## Architecture principles

- **No shared databases.** Cross-domain communication via Kafka. Same-domain communication via direct API calls.
- **Provider and adaptor services contain NO business logic** — they are translation layers only.
- **Business logic lives exclusively in http and messaging services.**

## Three AI operations

- **Forward** — scaffold/implement a service from its spec
- **Reverse** — walk existing code, reconstruct spec, write back to spec.md
- **Delta** — `git diff HEAD~1 -- spec.md > spec.diff`, implement only changed sections

## Adding a new service

1. Architect it in ArchitectAI → push updated spec and ecosystem.json
2. In the service repo: `claude "Scaffold this service per @../root/CLAUDE.md#<service-id>"`
3. Place the generated service CLAUDE.md at the repo root
