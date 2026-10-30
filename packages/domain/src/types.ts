/**
 * Domain entity types and definitions for Mivra.
 */

export type EntityStatus = 'active' | 'suspended' | 'disabled' | 'deleted' | 'pending';

export interface Tenant {
  id: string; // UUIDv7
  name: string;
  status: 'active' | 'suspended' | 'deleted';
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface User {
  id: string; // UUIDv7
  oidcIssuer: string;
  oidcSubject: string;
  email: string;
  name?: string;
  status: 'active' | 'suspended' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

export interface Domain {
  id: string; // UUIDv7
  tenantId: string;
  domain: string;
  status: 'pending' | 'verified' | 'failed' | 'disabled';
  verificationToken?: string;
  dkimVerified: boolean;
  dmarcVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Mailbox {
  id: string; // UUIDv7
  tenantId: string;
  domainId: string;
  address: string;
  quotaBytes: number;
  usedBytes: number;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

export type MailboxRole = 'owner' | 'member' | 'viewer';

export interface MailboxMember {
  id: string;
  mailboxId: string;
  userId: string;
  role: MailboxRole;
  createdAt: string;
}

export interface Alias {
  id: string;
  tenantId: string;
  sourceAddress: string;
  mailboxId: string;
  createdAt: string;
}

export type ParseStatus = 'receiving' | 'stored' | 'parsing' | 'ready' | 'parse_failed';

export interface Message {
  id: string; // UUIDv7
  tenantId: string;
  r2RawKey: string;
  messageIdHeader?: string;
  subject?: string;
  sizeBytes: number;
  parseStatus: ParseStatus;
  createdAt: string;
}

export type MailboxFolder = 'inbox' | 'sent' | 'drafts' | 'trash' | 'junk' | 'archive';

export interface MailboxMessage {
  id: string; // UUIDv7
  mailboxId: string;
  messageId: string;
  folder: MailboxFolder;
  isRead: boolean;
  isStarred: boolean;
  deletedAt?: string | null;
  createdAt: string;
}

export type AddressType = 'from' | 'to' | 'cc' | 'bcc' | 'reply_to';

export interface MessageAddress {
  id: string;
  messageId: string;
  type: AddressType;
  address: string;
  displayName?: string | null;
}

export interface Attachment {
  id: string; // UUIDv7
  messageId: string;
  r2Key: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  contentId?: string | null;
  isInline: boolean;
  createdAt: string;
}

export type SendJobStatus =
  | 'draft'
  | 'queued'
  | 'sending'
  | 'accepted_by_ses'
  | 'retry_wait'
  | 'failed'
  | 'unknown';

export interface SendJob {
  id: string; // UUIDv7
  tenantId: string;
  mailboxId: string;
  clientRequestId?: string | null;
  status: SendJobStatus;
  sesMessageId?: string | null;
  retryCount: number;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DeliveryEventType =
  | 'delivered'
  | 'bounced'
  | 'complained'
  | 'reject'
  | 'open'
  | 'click';

export interface DeliveryEvent {
  id: string; // UUIDv7
  sendJobId: string;
  type: DeliveryEventType;
  payloadJson?: string | null;
  occurredAt: string;
  createdAt: string;
}

// Queue message payloads
export interface ReceiveQueueMessage {
  messageId: string;
  tenantId: string;
  mailboxIds: string[];
  r2RawKey: string;
  receivedAt: string;
}

export interface SendQueueMessage {
  sendJobId: string;
  tenantId: string;
  mailboxId: string;
  clientRequestId?: string | null;
  queuedAt: string;
}
