# Architecture Overview

This project is a **production‑oriented REST API** built with **Node.js, TypeScript (ESM)** and **TypeORM**, designed around **clear boundaries, testability, and operational realism**.

The architecture intentionally favors **clarity and correctness over premature abstraction**, while remaining scalable.

---

## High‑Level Principles

* **Layered architecture** with strict dependency direction
* **Environment‑driven behavior** (dev / test / prod)
* **Explicit error handling** and failure modeling
* **Testability as a first‑class concern**
* **Operational awareness** (observability, retries, isolation)

---

## Layered Design

```text
src/
 ├─ api/            → HTTP layer (controllers, middlewares)
 ├─ application/    → Use cases / services
 ├─ domain/         → Business rules, entities, invariants
 ├─ infrastructure/→ DB, persistence, observability, external IO
 └─ main.ts         → Application bootstrap
```

### Dependency Rule

```text
api → application → domain
            ↓
      infrastructure
```

* Inner layers **never depend** on outer layers
* Infrastructure is **replaceable** (DB, observability, adapters)

---

## Environment Strategy

The system behaves differently depending on the environment, by design.

| Environment | Database | Purpose                               |
| ----------- | -------- | ------------------------------------- |
| `dev`       | SQLite   | Fast local development, zero setup    |
| `test`      | MySQL    | Integration tests, prod‑like behavior |
| `prod`      | MySQL    | Production                            |

Configuration is **explicit** and environment‑driven via `.env.*` files.

SQLite is **dev‑only** and never used as a production reference.

---

## Persistence & Database

* **TypeORM** is used as the ORM layer
* Entities live in `domain`
* Repositories and DB wiring live in `infrastructure`

### Design Goals

* Strong consistency for write operations
* Explicit transaction boundaries
* Retry logic for transient failures
* Deterministic behavior in tests

---

## Error Handling Philosophy

Errors are treated as **domain and API contracts**, not just exceptions.

* Domain errors express business invariants
* Application errors add context
* Infrastructure errors are wrapped, logged, and rethrown
* HTTP layer translates errors into API responses

This enables:

* Clear debugging
* Meaningful logs
* Stable API behavior

---

## Testing Strategy

Testing is intentionally multi‑layered:

### Unit Tests

* Domain and application logic
* No IO, no database
* Fast and deterministic

### Integration Tests

* Real MySQL via containers
* Full HTTP stack
* Environment isolation enforced

### Performance Tests

* Autocannon‑based
* Real containerized app

Tests are designed to validate **failure paths**, not only happy paths.

---

## Observability & Operations

The architecture is observability‑ready:

* Structured logging
* Metrics hooks
* Tracing‑friendly boundaries
* Clear startup and failure signals

Operational concerns are considered **part of the architecture**, not an afterthought.

---

## Non‑Goals

* Premature microservices
* Over‑abstracted frameworks
* Multi‑region complexity
* Hidden magic or implicit behavior

---

## Summary

This architecture is designed to:

* Scale in **complexity before scale in size**
* Be easy to reason about
* Make failures visible
* Support long‑term maintenance

It favors **boring, explicit, and testable** design choices over cleverness.
