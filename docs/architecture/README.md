# Mivra System Architecture

Mivra is a serverless, multi-domain and multi-tenant webmail platform built on Cloudflare edge computing and Amazon SES.

## Core Design Principles

1. **Cloudflare First**: Native serverless compute (Workers), relational metadata (D1), raw mail & attachments storage (R2), and asynchronous queues (Cloudflare Queues).
2. **Separation of Metadata and Payload**: D1 stores indexable message summaries, folders, and read states; R2 stores immutable raw MIME `.eml` and parsed body/attachments.
3. **Multi-Tenant Logical Isolation**: Organization and mailbox boundaries enforced at both the API routing layer and SQL queries.
4. **Idempotent Asynchronous Pipelines**: Decoupling email ingestion, MIME parsing, and outbound SES delivery through queues.
5. **Universal Identifiers**: RFC 9562 UUIDv7 used across all entities for time-ordered index performance.

## Monorepo Service Matrix

| Service | Trigger | Responsibilities | Bindings |
|---|---|---|---|
| `mivra-web` | HTTP | SPA static asset delivery, REST API (`/api/v1/*`), Keycloak OIDC authentication | D1 (`DB`), R2 (`MAIL_STORAGE`), Queue (`SEND_QUEUE`) |
| `mivra-receiver` | Email | Recipient validation, quota enforcement, raw MIME `.eml` persistence to R2, parse job queueing | D1 (`DB`), R2 (`MAIL_STORAGE`), Queue (`RECEIVE_QUEUE`) |
| `mivra-parser` | Queue | MIME stream parsing, body extraction (text/HTML), attachment persistence, D1 metadata commit | D1 (`DB`), R2 (`MAIL_STORAGE`) |
| `mivra-sender` | Queue | Outbound delivery via Amazon SES API v2, state tracking (`accepted_by_ses`), delivery telemetry | D1 (`DB`), R2 (`MAIL_STORAGE`) |
