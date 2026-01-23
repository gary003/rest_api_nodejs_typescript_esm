# Security Practices

## Data Protection

- **All inputs sanitized**: Using **Zod** for schema validation and TypeORM for parameterized SQL queries to prevent injection.
- **Secrets management**:
  - Never hardcoded - used GitHub Actions secrets for CI/CD.
  - Environment variables are used for all sensitive configuration (`.env` files).
- **Encryption**:
  - TLS 1.2+ recommended (handled at infrastructure level).
  - Sensitive data encrypted at rest where applicable.

## API Security

The application uses **Helmet** to set secure HTTP headers:

- Content Security Policy (CSP)
- HSTS
- X-Frame-Options
- X-Powered-By disabled

```typescript
app.use(helmet())
```

## CI/CD Security Scanning (DevSecOps)

Our pipeline includes automated security checks on every push to `master`:

1. **Static Analysis (SAST)**:
   - **Trivy FS Scan**: Scans source code for vulnerabilities and misconfigurations.
   - **Linting**: ESLint enforces code quality and security best practices.
2. **Container Security**:
   - **Trivy Container Scan**: Scans the built Docker image for OS-level vulnerabilities.
3. **Dynamic Analysis (DAST)**:
   - **OWASP ZAP**: Performs a baseline scan on the running application in the CI environment to detect runtime vulnerabilities (XSS, SQLi, etc.).
4. **Reporting**: All security scan results are uploaded to the GitHub "Security" tab.

## Reporting a Vulnerability

If you find a security issue, please do not open a public issue. Instead, send an email to the maintainer or use the GitHub Security Advisory feature.
