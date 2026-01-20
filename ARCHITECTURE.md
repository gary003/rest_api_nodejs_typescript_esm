# Architecture Overview

This project is a **production‑oriented REST API** built with **Node.js, TypeScript (ESM)** and **TypeORM**, designed around **clear boundaries, testability, and operational realism**.

The architecture intentionally favors **clarity and correctness over premature abstraction**, while remaining scalable.

---

## High‑Level Principles

- **Layered architecture** with strict dependency direction
- **Environment‑driven behavior** (dev / test / prod)
- **Explicit error handling** and failure modeling
- **Testability as a first‑class concern**
- **Operational awareness** (observability, retries, isolation)

---

## Clean Architecture Layers

src/v1/
 ├─ presentation/   → HTTP layer (Controllers, Routes, DTOs, Middlewares)
 ├─ services/       → Pure Business Logic
 ├─ domain/         → Entities, Value Objects, Aggregates
 └─ infrastructure/ → External Tools (Database, Redis, Logger, Observability)

1. **Domain**: The core of the application. Contains entities and business rules. No dependencies on frameworks or libraries.
2. **Application**: Coordinates tasks and delegates work to the domain.
3. **Presentation**: Handles HTTP requests/responses. Translates API contracts to application calls.
4. **Infrastructure**: Implementation of interfaces defined by outer layers (e.g., TypeORM repositories, Redis caching).

---

## Environment Strategy

The system behaves differently depending on the environment, by design.

| Environment | Database | Driver | Purpose |
| :--- | :--- | :--- | :--- |
| `dev` | SQLite | `sqlite3` | Fast local development, zero setup |
| `test` | MySQL | `mysql2` | Integration tests in Docker containers |
| `prod` | MySQL | `mysql2` | Production environment |

---

## Persistence & Database

- **TypeORM** is used as the ORM layer.
- **Entities** live in `domain`.
- **Repositories** and DB wiring live in `infrastructure`.

---

## Testing Strategy (The "Senior Pro" Approach)

Testing is a first-class citizen in this architecture.

### 1. Unit Tests

- Focused on `domain` and `application` layers.
- Fast, zero IO, zero database.

### 2. Integration Tests (Black-Box)

- Runs against a **real containerized MySQL** using `testcontainers`.
- Uses a **V8-Bind Coverage** strategy:
  - The app runs in a real Docker container.
  - Coverage is collected natively by the V8 engine inside the container.
  - Files are synced back to the host via volumes.
  - This ensures 100% realistic coverage of the **Infrastructure** layer (drivers, middleware, etc.).

### 3. Load Tests

- Load testing using **Autocannon**.
- Validates the system under stress (locking, pool limits).

---

## Observability & Operations

The architecture is observability‑ready:

- **Structured logging** via Winston.
- **OpenTelemetry** integration (ready for traces/metrics).
- **PM2** for process management in production.
- **Health checks** for container orchestration (Kubernetes/Docker Compose ready).

---

## Summary

This architecture is designed to:

- Be easy to reason about.
- Make failures visible.
- Support long‑term maintenance.
- Scale in **complexity before scale in size**.
