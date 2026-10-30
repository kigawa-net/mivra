# Mivra

Mivra is a modern, high-reliability, multi-domain and multi-tenant webmail platform built on Cloudflare edge infrastructure and Amazon SES.

## Overview & Architecture

- **Web & API Worker (`apps/web`)**: Serves web static assets and REST API endpoints (`/api/v1/*`), with Keycloak OIDC authentication.
- **Receiver Worker (`apps/receiver`)**: Receives incoming emails from Cloudflare Email Routing, validates recipient and mailbox quotas, saves raw MIME `.eml` to Cloudflare R2, and enqueues parsing jobs.
- **Parser Worker (`apps/parser`)**: Consumes incoming mail events from Cloudflare Queues, parses MIME headers and body parts, stores attachments in Cloudflare R2, and commits metadata to Cloudflare D1.
- **Sender Worker (`apps/sender`)**: Consumes outbound mail jobs from Cloudflare Queues and reliably delivers raw MIME messages via Amazon SES API v2.

## Monorepo Structure

```
.
├── apps/
│   ├── web/          # Web frontend & API Worker
│   ├── receiver/     # Email Routing receiver Worker
│   ├── parser/       # MIME parser & queue consumer Worker
│   └── sender/       # Outbound email sender Worker (Amazon SES)
├── packages/
│   ├── api/          # Shared HTTP response, pagination, and error utilities
│   ├── auth/         # Keycloak OIDC authentication & session management
│   ├── database/     # Cloudflare D1 schemas, queries, and migrations
│   ├── domain/       # Domain types, UUIDv7 generation, and domain errors
│   ├── mail/         # Email address parsing and Message-ID generation
│   ├── storage/      # Cloudflare R2 key path builders and storage helpers
│   └── ui/           # Shared UI components (placeholder)
├── migrations/       # Cloudflare D1 SQL schema migrations
└── docs/             # Architecture, API, and Operations documentation
```

## Getting Started

### Prerequisites

- Node.js (>= 22.x)
- pnpm (>= 9.x / 10.x)
- Cloudflare Wrangler CLI

### Installation

```bash
pnpm install
```

### Development & Verification

```bash
# Typecheck all packages and apps
pnpm typecheck

# Run linter
pnpm lint

# Run unit tests
pnpm test

# Build all packages and apps
pnpm build
```
