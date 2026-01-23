# API Documentation

This project provides a robust REST API for managing users and wallet transactions.

## 1. General Information

- **Base URL**: `/api/v1`
- **Format**: All requests and responses use `application/json`.
- **Versioning**: Incremental versioning in the URL path (current: `v1`).

## 2. Global Endpoints

- **Health Check**: `GET /api/v1/health`
  - Returns the status of the API and its dependencies (DB, Redis).
- **Documentation**: `GET /api/v1/apiDocumentation`
  - Interactive Swagger UI documentation.

## 3. Core Resources

### User Management

- `GET /user/`: List all users.
- `GET /user/stream`: Stream users (NDJSON).
- `GET /user/:id`: Get specific user details.
- `POST /user/`: Create a new user.
- `DELETE /user/:id`: Remove a user (Admin only).

### Financial Transactions

- `POST /user/transfer`: Transfer money between two users.
  - Requires: `senderId`, `receiverId`, `amount`, `currency`.

## 4. Authentication

The API uses **JWT (JSON Web Tokens)** for protected routes.

- Format: `Authorization: Bearer <token>`
- Tokens are generated upon login/registration.

## 5. Standard Responses

{
"status": "error",
"message": "Human readable error message",
"code": "ERROR_CODE"
}

## 6. Error Codes

- `BAD_REQUEST`: Invalid input parameters.
- `UNAUTHORIZED`: Missing or invalid token.
- `FORBIDDEN`: User does not have required permissions (e.g., non-admin trying to delete).
- `NOT_FOUND`: Resource does not exist.
- `INTERNAL_ERROR`: Unexpected server error.

---

_Note: For detailed parameter definitions and schemas, refer to the [Swagger Documentation](http://localhost:8080)._
