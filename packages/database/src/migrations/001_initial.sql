-- ==============================================================================
-- Mivra Initial Database Schema (Phase 1)
-- Multi-tenant Webmail platform schema for Cloudflare D1 (SQLite)
-- All primary identifiers use UUIDv7 strings for time-ordered index efficiency.
-- ==============================================================================

-- 1. Tenants (Organizations or accounts)
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 2. Users (Authenticated users mapped to Keycloak OIDC)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    oidc_issuer TEXT NOT NULL,
    oidc_subject TEXT NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'mailbox_member' CHECK (role IN ('platform_admin', 'tenant_admin', 'mailbox_owner', 'mailbox_member', 'viewer')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (oidc_issuer, oidc_subject)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_oidc ON users (oidc_issuer, oidc_subject);

-- 3. Domains (Managed mail domains belonging to tenants)
CREATE TABLE IF NOT EXISTS domains (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    domain TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'disabled')),
    verification_token TEXT,
    dkim_verified INTEGER NOT NULL DEFAULT 0,
    dmarc_verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_domains_tenant ON domains (tenant_id);

-- 4. Mailboxes (User / organizational inboxes with quotas)
CREATE TABLE IF NOT EXISTS mailboxes (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    address TEXT NOT NULL UNIQUE,
    quota_bytes INTEGER NOT NULL DEFAULT 10737418240, -- 10 GiB default
    used_bytes INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mailboxes_tenant ON mailboxes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mailboxes_address ON mailboxes (address);

-- 5. Mailbox Members (Access permissions linking users to mailboxes)
CREATE TABLE IF NOT EXISTS mailbox_members (
    id TEXT PRIMARY KEY,
    mailbox_id TEXT NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member', 'viewer')),
    created_at TEXT NOT NULL,
    UNIQUE (mailbox_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_mailbox_members_user ON mailbox_members (user_id);

-- 6. Aliases (Email aliases routing to target mailboxes)
CREATE TABLE IF NOT EXISTS aliases (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_address TEXT NOT NULL UNIQUE,
    mailbox_id TEXT NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aliases_source ON aliases (source_address);

-- 7. Messages (Immutable raw email records & parsed summary)
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    r2_raw_key TEXT NOT NULL,
    message_id_header TEXT,
    subject TEXT,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    parse_status TEXT NOT NULL DEFAULT 'receiving' CHECK (parse_status IN ('receiving', 'stored', 'parsing', 'ready', 'parse_failed')),
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages (tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages (parse_status);

-- 8. Mailbox Messages (Per-mailbox folder placement, read & star states)
CREATE TABLE IF NOT EXISTS mailbox_messages (
    id TEXT PRIMARY KEY,
    mailbox_id TEXT NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    folder TEXT NOT NULL DEFAULT 'inbox' CHECK (folder IN ('inbox', 'sent', 'drafts', 'trash', 'junk', 'archive')),
    is_read INTEGER NOT NULL DEFAULT 0,
    is_starred INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    UNIQUE (mailbox_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_mailbox_messages_list ON mailbox_messages (mailbox_id, folder, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mailbox_messages_message ON mailbox_messages (message_id);

-- 9. Message Addresses (Structured From/To/Cc/Bcc address records)
CREATE TABLE IF NOT EXISTS message_addresses (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('from', 'to', 'cc', 'bcc', 'reply_to')),
    address TEXT NOT NULL,
    display_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_message_addresses_msg ON message_addresses (message_id);
CREATE INDEX IF NOT EXISTS idx_message_addresses_search ON message_addresses (address);

-- 10. Attachments (Extracted attachment metadata pointing to R2 keys)
CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    r2_key TEXT NOT NULL,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    content_id TEXT,
    is_inline INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attachments_msg ON attachments (message_id);

-- 11. Send Jobs (Outbound delivery lifecycle via Amazon SES)
CREATE TABLE IF NOT EXISTS send_jobs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    mailbox_id TEXT NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
    client_request_id TEXT,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('draft', 'queued', 'sending', 'accepted_by_ses', 'retry_wait', 'failed', 'unknown')),
    ses_message_id TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_send_jobs_status ON send_jobs (status, created_at);
CREATE INDEX IF NOT EXISTS idx_send_jobs_client_req ON send_jobs (mailbox_id, client_request_id);

-- 12. Delivery Events (SES webhook delivery, bounce, and complaint telemetry)
CREATE TABLE IF NOT EXISTS delivery_events (
    id TEXT PRIMARY KEY,
    send_job_id TEXT NOT NULL REFERENCES send_jobs(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('delivered', 'bounced', 'complained', 'reject', 'open', 'click')),
    payload_json TEXT,
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_delivery_events_job ON delivery_events (send_job_id);
