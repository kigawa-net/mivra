/**
 * D1 Database schema row types for all 12 tables in Mivra.
 * Column names follow snake_case convention matching SQLite / D1 columns.
 */

export interface TenantRow {
  id: string; // UUIDv7
  name: string;
  status: 'active' | 'suspended' | 'deleted';
  created_at: string;
  updated_at: string;
}

export interface UserRow {
  id: string; // UUIDv7
  oidc_issuer: string;
  oidc_subject: string;
  email: string;
  name: string | null;
  role: 'platform_admin' | 'tenant_admin' | 'mailbox_owner' | 'mailbox_member' | 'viewer';
  status: 'active' | 'suspended' | 'deleted';
  created_at: string;
  updated_at: string;
}

export interface DomainRow {
  id: string; // UUIDv7
  tenant_id: string;
  domain: string;
  status: 'pending' | 'verified' | 'failed' | 'disabled';
  verification_token: string | null;
  dkim_verified: number; // 0 or 1
  dmarc_verified: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface MailboxRow {
  id: string; // UUIDv7
  tenant_id: string;
  domain_id: string;
  address: string;
  quota_bytes: number;
  used_bytes: number;
  status: 'active' | 'disabled';
  created_at: string;
  updated_at: string;
}

export interface MailboxMemberRow {
  id: string; // UUIDv7
  mailbox_id: string;
  user_id: string;
  role: 'owner' | 'member' | 'viewer';
  created_at: string;
}

export interface AliasRow {
  id: string; // UUIDv7
  tenant_id: string;
  source_address: string;
  mailbox_id: string;
  created_at: string;
}

export interface MessageRow {
  id: string; // UUIDv7
  tenant_id: string;
  r2_raw_key: string;
  message_id_header: string | null;
  subject: string | null;
  size_bytes: number;
  parse_status: 'receiving' | 'stored' | 'parsing' | 'ready' | 'parse_failed';
  created_at: string;
}

export interface MailboxMessageRow {
  id: string; // UUIDv7
  mailbox_id: string;
  message_id: string;
  folder: 'inbox' | 'sent' | 'drafts' | 'trash' | 'junk' | 'archive';
  is_read: number; // 0 or 1
  is_starred: number; // 0 or 1
  deleted_at: string | null;
  created_at: string;
}

export interface MessageAddressRow {
  id: string; // UUIDv7
  message_id: string;
  type: 'from' | 'to' | 'cc' | 'bcc' | 'reply_to';
  address: string;
  display_name: string | null;
}

export interface AttachmentRow {
  id: string; // UUIDv7
  message_id: string;
  r2_key: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  content_id: string | null;
  is_inline: number; // 0 or 1
  created_at: string;
}

export interface SendJobRow {
  id: string; // UUIDv7
  tenant_id: string;
  mailbox_id: string;
  client_request_id: string | null;
  status: 'draft' | 'queued' | 'sending' | 'accepted_by_ses' | 'retry_wait' | 'failed' | 'unknown';
  ses_message_id: string | null;
  retry_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryEventRow {
  id: string; // UUIDv7
  send_job_id: string;
  type: 'delivered' | 'bounced' | 'complained' | 'reject' | 'open' | 'click';
  payload_json: string | null;
  occurred_at: string;
  created_at: string;
}
