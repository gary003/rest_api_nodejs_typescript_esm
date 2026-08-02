# REST API Node.js - TypeScript

## Table of Contents

- [REST API Node.js - TypeScript](#rest-api-nodejs---typescript)
  - [Table of Contents](#table-of-contents)
  - [Skills](#skills)
  - [Documentation Index](#documentation-index)
  - [Description](#description)
  - [Prerequisites](#prerequisites)
  - [Installation (git)](#installation-git)
  - [Start API with Docker](#start-api-with-docker)
  - [Start API on Local Machine](#start-api-on-local-machine)
  - [Available Docker Services](#available-docker-services)
  - [Tests + Coverage](#tests--coverage)
  - [Developer](#developer)
  - [License](#license)

## Skills

- Languages: **Node.js v24**, **Typescript v5**, Markdown, JSON
- **Clean architecture** (onion architecture)
- CI/CD pipeline with **GitHub Actions** && **Docker**
  - docker-compose.yaml
  - Dockerfile
  - Test, build docker images, deploy docker images to **DockerHub**
- Testing using **vitest**
  - Mocks
  - Coverage
  - Unit tests
  - Integration tests with **Testcontainers** && **Docker V8-Bind Coverage**
- Persistence with **Typeorm** && **MySQL** && **Redis**
  - Entities handling
  - Table join
  - Table lock
  - Transactions (rollback and commit)
- Observability & Monitoring with **Opentelemetry**
  - Logs with **Promtail** && **Loki**
  - Metrics with **Prometheus**
  - Traces with **Tempo**
  - Dashboard with **Grafana**, **CloudBeaver** && **Portainer**
- Streams
  - Pipeline handling
  - Transformation
  - Async generators
- Authentication with **JWT**
- Documentation with **Swagger**
- Logging with **Winston**
- Validation using **Zod**

## Documentation Index

Explore the detailed project documentation:

- [**Architecture**](./ARCHITECTURE.md) - Clean architecture, layers, and design patterns.
- [**Testing Strategy**](./TESTING.md) - Unit, Integration (V8-bind), and Load testing.
- [**Security**](./SECURITY.md) - SAST/DAST, encryption, and protection practices.
- [**API Guide**](./API.md) - Endpoint overview, request/response formats.
- [**Deployment**](./DEPLOYMENT.md) - Docker Hub, CI/CD, and production operations.

## Description

This repository is a backend REST API portfolio that has a few routes (CRUD) aiming to keep at hand backend development techniques and show off development skills.
To make things easier for GitHub users, there is no need for a .env file, making it easy to test and deploy for external users who want to try it.

## Prerequisites

**For running via Docker only:**

- Docker (v27+) && docker-compose
- Git

**For local development, testing, and scripts:**

- Node.js v24 (use nvm if needed)
- npm (v6+) & npx

**Important Notes:**

!! A docker group must be created, then your user (as a sudoer) must be added to it.
Otherwise you'll have trouble launching the tests !!

Link to install and configure docker properly : <https://medium.com/devops-technical-notes-and-manuals/how-to-run-docker-commands-without-sudo-28019814198f>

Don't forget to restart your computer or session for the changes to be available on all shells

## Installation (git)

In a shell:

- Clone the project

  ```bash
    git clone https://github.com/gary003/rest_api_nodejs_typescript_esm.git
  ```

- Go into the project directory

  ```bash
    cd rest_api_nodejs_typescript_esm
  ```

- Install the dependencies

  ```bash
    npm install
  ```

## Start API with Docker

- Launch the app & DB (mysql)
  In a shell, at the root directory of the project, type:

  ```bash
    npm run start
  ```

  or

  ```bash
    docker compose up -d
  ```

## Start API on Local Machine

- Launch the app & DB (sqlite)
  In a shell, at the root directory of the project, type

  ```bash
    npm run dev:start
  ```

## Available Docker Services

When you run the project via Docker (`npm run start`), several helpful dashboards and management interfaces are exposed on your local machine:

- **API & Swagger Setup:** `http://localhost:8080`
- **CloudBeaver (Database Manager):** `http://localhost:8978`
  - _Tip: Create a new connection using the hostname `db` to inspect your MySQL database._
- **Portainer (Docker Manager):** `http://localhost:9000`
  - _Credentials: Username `admin` / Password `admin`_

## Tests + Coverage

Detailed testing guide available in [TESTING.md](./TESTING.md).

- Launch all tests

  ```bash
    npm run test
  ```

## Developer

- Gary Johnson
  - Mail: <gary.johnson.top@gmail.com>
  - Github: <https://github.com/gary003>
  - LinkedIn: <https://www.linkedin.com/in/gary-johnson-0168b985/>
  - Malt: <https://www.malt.fr/profile/garyjohnson1>

## License

[MIT]
