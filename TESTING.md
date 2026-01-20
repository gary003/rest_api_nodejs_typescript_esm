# Testing Strategy & Documentation

Internal documentation for the testing lifecycle and infrastructure of this project.

## 1. Overview

Our testing strategy follows the **Testing Pyramid**, but with a heavy focus on **Isolated Integration Tests** to ensure the "Clean Architecture" layers are correctly wired.

* **Unit Tests**: Domain logic and individual services.
* **Integration Tests**: End-to-end flow from API route to Database.
* **Performance Tests**: Load testing via `autocannon`.

## 2. Tests Infrastructure (integration & performance tests)

### The Switch from Supertest to V8-Bind

We moved away from mocking the server with `supertest` in favor of a **Dockerized V8-Bind Coverage** approach.

#### **Why?**

1. **Full-Stack Coverage**: Supertest only covers the application logic. V8-bind records coverage for *everything* running inside the target Docker container, including infrastructure drivers (MySQL, Redis), middleware, and compiled artifacts.
2. **Environment Parity**: Tests run against the exact same Docker image that is deployed to production.
3. **No Mocking**: We test against real databases (containerized), not in-memory mocks.

#### **How it works (The Lifecycle)**

1. **Setup**: `testcontainers` spins up the `app` and `db` services.
2. **Execution**: Vitest hits the containerized API via `fetch`.
3. **Collection**: The Node.js process inside the container dumps coverage logic to a mounted volume (`/app/coverage/tmp`).
4. **Teardown**:
    * **Permission Fix**: Since Docker runs as root, we use a temporary Alpine container to `chmod` the coverage files so the host user can access them.
    * **Path Mapping**: We programmatically rewrite paths in the V8 JSON files (e.g., from `/app/dist/` to your local folder) so reporting tools can map coverage back to the original `.ts` source files.

## 3. Running Tests

### Integration Tests

Run tests and generate a unified coverage report:

```bash
npm run test:integration
```

### Unit Tests

```bash
npm run test:unit:v1
```

### All Tests (CI Pipeline)

```bash
npm run test
```

## 4. Technical Details

### Key Files

* `tests/vitest.setup.ts`: Global lifecycle management (Docker Orchestration & Post-processing).
* `docker-compose.yaml`: Defensive configuration for the test environment.
* `scripts/test_integration.sh`: Coordination of the V8 coverage pipeline.

### POST-PROCESS: Path Mapping Logic

To ensure coverage tools show the correct lines in your IDE, the setup script performs a search-and-replace on the raw V8 data:

```typescript
const newContent = content.replaceAll('/app/', process.cwd() + '/')
```

## 5. Troubleshooting

* **Permission Denied**: If `coverage/tmp` is locked, the Alpine `chmod` fix in `vitest.setup.ts` usually resolves this.
* **Container Timeout**: Increase the `Wait.forHealthCheck()` timeout in `vitest.setup.ts` if your machine is under heavy load.
