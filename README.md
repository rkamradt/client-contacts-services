# Client Contacts

A comprehensive CRM platform ecosystem built on event-driven architecture with Spring Boot microservices. The system manages contacts, accounts, sales opportunities, activities, campaigns, and provides real-time notifications and analytics across the entire customer lifecycle.

## Services Overview

| Service | Archetype | Port | Health Endpoint | Description |
|---------|-----------|------|-----------------|-------------|
| contact-service | http | 8001 | `GET /actuator/health` | Contact, lead, and account data management with full CRUD operations |
| activity-service | http | 8002 | `GET /actuator/health` | Customer interaction tracking (calls, emails, meetings, notes) |
| opportunity-service | http | 8003 | `GET /actuator/health` | Sales pipeline and deal management with forecasting |
| user-service | http | 8004 | `GET /actuator/health` | User profiles, territories, teams, roles, and permissions |
| campaign-service | http | 8005 | `GET /actuator/health` | Marketing campaigns, email sequences, and contact segmentation |
| notification-service | messaging | N/A | N/A | System notifications, alerts, and real-time communication |
| analytics-service | http | 8007 | `GET /actuator/health` | Business intelligence, reporting, dashboards, and analytics |

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Java 11+
- Maven
- Kafka (see docker-compose.yml for local setup)

### Running Services Locally

Each service can be run independently:

```bash
# contact-service
cd contact-service
export PORT=8001
mvn clean spring-boot:run

# activity-service
cd activity-service
export PORT=8002
mvn clean spring-boot:run

# opportunity-service
cd opportunity-service
export PORT=8003
mvn clean spring-boot:run

# user-service
cd user-service
export PORT=8004
mvn clean spring-boot:run

# campaign-service
cd campaign-service
export PORT=8005
mvn clean spring-boot:run

# notification-service
cd notification-service
export KAFKA_BROKERS=localhost:9092
mvn clean spring-boot:run

# analytics-service
cd analytics-service
export PORT=8007
mvn clean spring-boot:run
```

### Environment Variables

**All services:**
- `PORT` — HTTP service port (not applicable to messaging services)
- `KAFKA_BROKERS` — Comma-separated Kafka broker addresses (default: `localhost:9092`)

**Messaging services (notification-service):**
- `KAFKA_BROKERS` — Required for Kafka consumer/producer connectivity

### Health Checks

```bash
# Check any service health
curl http://localhost:8001/actuator/health
curl http://localhost:8002/actuator/health
curl http://localhost:8003/actuator/health
curl http://localhost:8004/actuator/health
curl http://localhost:8005/actuator/health
curl http://localhost:8007/actuator/health
```

## Mock Services (Dev/Stage Only)

Mock services provide test scaffolding and simulators for development and integration testing. They are **never deployed to production**.

- **contact-service-mock** — Simulates contact and account data with pre-populated fixtures
- **activity-service-mock** — Mock activity logging and timeline endpoints for testing
- **opportunity-service-mock** — Mock sales pipeline data and forecast calculations
- **user-service-mock** — Mock user profiles, territories, and team hierarchies
- **campaign-service-mock** — Mock campaign operations and engagement metrics
- **notification-service-mock** — Mock notification delivery and preference storage
- **analytics-service-mock** — Mock report generation and KPI calculations

### Running Mock Services

```bash
cd {service}-mock
export PORT=8001  # Adjust as needed for the specific mock
mvn clean spring-boot:run
```

Mock services expose the same endpoints as their production counterparts, allowing you to develop and test against stable, predictable data.

## ⚠️ Production Deployment

**Mock service directories must NEVER be deployed to production.** Exclude all `-mock` directories from container builds and deployments.

The CI/CD pipeline is configured to build and push only production service images (those without the `-mock` suffix) to the container registry.
