# Deployment Documentation

This document describes the deployment process and operational strategy for the project.

## 1. Environment Requirements

- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Node.js**: Version 24+ (for local development/builds)

## 2. Infrastructure Overview

The application is containerized and designed to run in a clustered environment.

- **App Server**: Node.js (ESM) managed by **PM2** for process monitoring and clustering.
- **Database**: MySQL 8.
- **Cache**: Redis (integration-ready).
- **Process Manager**: PM2 (running in `pm2-runtime` mode within the container).

## 3. Deployment Pipeline (CI/CD)

We use **GitHub Actions** for our CI/CD pipeline (`.github/workflows/ci.yml`):

1. **Validate**: Linting and Security Scans (Trivy, OWASP ZAP).
2. **Test**: Runs Unit and Integration tests.
3. **Build**: Creates a production Docker image.
4. **Push**: Pushes the image to **Docker Hub** (`gary003/rest_api_nodejs_typescript_esm:latest`).

## 4. Manual Deployment

To deploy manually using Docker Compose:

```bash
# Pull the latest image
docker compose pull app

# Start the stack in detached mode
docker compose up -d
```

To reconstruct the environment from scratch:

```bash
npm run start
```

## 5. Configuration (Environment Variables)

All configuration is handled via environment variables. Key variables include:

- `NODE_ENV`: `production`, `development`, or `test`.
- `DB_URI`: Fully qualified MySQL connection string.
- `JWT_SECRET_KEY`: Secret for signing access tokens.
- `CRYPTO_SECRET_KEY`: Secret for data encryption at rest.

## 6. Monitoring & Logs

- **Logs**: PM2 logs are piped to stdout/stderr and captured by Docker's logging driver.
  - Access logs: `docker compose logs -f app`
- **Health Checks**: The application exposes a health endpoint at `/api/v1/health`.
- **Metrics/Tracing**: OpenTelemetry hooks are integrated and can be pointed to an OTLP collector.

## 7. Scaling

The application is stateless and can be scaled horizontally.

- In Docker Compose: `docker compose up -d --scale app=3`
- PM2 handles internal clustering within each container instance based on `ecosystem.config.js`.
