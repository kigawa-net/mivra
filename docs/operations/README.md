# Mivra Operations & Runbook

## Database Migrations

D1 schema migrations are managed through SQL files in the `migrations/` directory.

```bash
# Apply migrations to local development D1 database
pnpm wrangler d1 migrations apply mivra-db --local

# Apply migrations to remote staging / production
pnpm wrangler d1 migrations apply mivra-db-staging --remote
pnpm wrangler d1 migrations apply mivra-db-production --remote
```

## Secret Management

Secrets must never be committed to git. Configure via Wrangler CLI or GitHub Secrets:

```bash
# Set session secret key
pnpm wrangler secret put SESSION_SECRET --env production

# Set AWS SES credentials on sender worker
pnpm wrangler secret put AWS_ACCESS_KEY_ID --env production
pnpm wrangler secret put AWS_SECRET_ACCESS_KEY --env production
```

## Monitoring & Observability

- Workers observability logs and distributed traces are enabled in `wrangler.toml` for all Workers.
- View live stream logs using `wrangler tail`:
  ```bash
  pnpm --filter mivra-web exec wrangler tail
  pnpm --filter mivra-receiver exec wrangler tail
  pnpm --filter mivra-parser exec wrangler tail
  pnpm --filter mivra-sender exec wrangler tail
  ```
