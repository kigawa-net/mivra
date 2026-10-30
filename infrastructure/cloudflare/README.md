# Cloudflare Infrastructure Configuration

This directory contains configuration guidelines and resources for Cloudflare edge services used by Mivra.

## Resource Layout

- **D1 Database**: `mivra-db` (dev), `mivra-db-staging` (staging), `mivra-db-production` (production)
- **R2 Storage**: `mivra-mail-data` (dev), `mivra-mail-data-staging` (staging), `mivra-mail-data-prod` (production)
- **Queues**:
  - `mivra-receive-queue`: Incoming email parsing queue
  - `mivra-send-queue`: Outbound email delivery queue

## Provisioning via Wrangler CLI

```bash
# Create D1 database
pnpm wrangler d1 create mivra-db

# Create R2 bucket
pnpm wrangler r2 bucket create mivra-mail-data

# Create Queues
pnpm wrangler queues create mivra-receive-queue
pnpm wrangler queues create mivra-send-queue
```
