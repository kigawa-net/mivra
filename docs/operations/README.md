# Mivra Operations & Runbook

## GitHub Actions deployment credentials

The deploy workflow sends every branch push (`main` and `develop`) to the `staging` GitHub environment. A manual `workflow_dispatch` run deploys the selected ref to `production`. It authenticates to OpenBao with the GitHub Actions OIDC token, then reads the environment's Cloudflare API token from KV v2. No Cloudflare API token is stored in GitHub Secrets.

Configure these GitHub repository **Variables**:

| Variable | Meaning |
| --- | --- |
| Variable (set per GitHub environment) | Meaning |
| --- | --- |
| `OPENBAO_ADDR` | OpenBao base URL reachable by the runner, without `/v1` |
| `OPENBAO_JWT_AUDIENCE` | Exact audience configured in the OpenBao JWT role |
| `OPENBAO_AUTH_PATH` | JWT auth mount path; defaults to `jwt` |
| `OPENBAO_ROLE` | Environment-specific role, bound to repository and GitHub environment |
| `OPENBAO_SECRET_PATH` | KV v2 API path, e.g. `kv/data/applications/mivra/production/cloudflare` |
| `OPENBAO_SECRET_KEY` | Token field; defaults to `api_token` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID used by Wrangler |

Configure OpenBao JWT auth to trust `https://token.actions.githubusercontent.com`, validate the fixed `OPENBAO_JWT_AUDIENCE`, and create separate `production` and `staging` roles. Per the infra repository's OpenBao design, bind each role's `bound_claims` to `repository=kigawa-net/mivra` and its exact `environment` claim (and `ref` where appropriate); do not use a broad `sub` glob. Give each role a read-only policy for only its own KV v2 path under `kv/data/applications/mivra/<environment>/*`. Store a least-privilege Cloudflare Workers API token in the configured KV v2 field.

The infra design documents OpenBao endpoints as `bao-0N.kigawa.net:8200`, with names resolved on the private network and no public DNS record. A standard GitHub-hosted runner will not be able to reach those endpoints. Run this deploy job on a self-hosted runner connected to the infra WireGuard/EasyTier network, or provide a deliberately secured, reachable endpoint before enabling deployment; do not expose port 8200 publicly just to make the hosted runner connect.

The deploy job requests GitHub's `id-token: write` permission. Its OIDC token and OpenBao client token are used to load the Cloudflare token, which Wrangler uses for remote D1 migrations and Worker deployments.

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
