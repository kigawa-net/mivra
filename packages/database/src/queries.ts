import type {
  TenantRow,
  UserRow,
  DomainRow,
  MailboxRow,
  MailboxMemberRow,
  MessageRow,
  MailboxMessageRow,
  MessageAddressRow,
  AttachmentRow,
  SendJobRow,
  DeliveryEventRow,
} from './schema.js';

/**
 * Type-safe query helper functions for Cloudflare D1 Database operations.
 */

export interface QueryResult<T> {
  results: T[];
  success: boolean;
  error?: string;
}

export const queries = {
  // Tenant queries
  async findTenantById(db: D1Database, id: string): Promise<TenantRow | null> {
    return await db.prepare('SELECT * FROM tenants WHERE id = ?').bind(id).first<TenantRow>();
  },

  async insertTenant(db: D1Database, tenant: TenantRow): Promise<void> {
    await db
      .prepare('INSERT INTO tenants (id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .bind(tenant.id, tenant.name, tenant.status, tenant.created_at, tenant.updated_at)
      .run();
  },

  // User queries
  async findUserByOidc(db: D1Database, oidcIssuer: string, oidcSubject: string): Promise<UserRow | null> {
    return await db
      .prepare('SELECT * FROM users WHERE oidc_issuer = ? AND oidc_subject = ?')
      .bind(oidcIssuer, oidcSubject)
      .first<UserRow>();
  },

  async findUserById(db: D1Database, id: string): Promise<UserRow | null> {
    return await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
  },

  async insertUser(db: D1Database, user: UserRow): Promise<void> {
    await db
      .prepare(
        'INSERT INTO users (id, oidc_issuer, oidc_subject, email, name, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        user.id,
        user.oidc_issuer,
        user.oidc_subject,
        user.email,
        user.name,
        user.role,
        user.status,
        user.created_at,
        user.updated_at
      )
      .run();
  },

  // Domain queries
  async findDomainByName(db: D1Database, domain: string): Promise<DomainRow | null> {
    return await db.prepare('SELECT * FROM domains WHERE domain = ?').bind(domain).first<DomainRow>();
  },

  // Mailbox queries
  async findMailboxByAddress(db: D1Database, address: string): Promise<MailboxRow | null> {
    const direct = await db.prepare('SELECT * FROM mailboxes WHERE address = ?').bind(address).first<MailboxRow>();
    if (direct) return direct;

    // Check alias
    const alias = await db
      .prepare(
        `SELECT m.* FROM mailboxes m
         INNER JOIN aliases a ON a.mailbox_id = m.id
         WHERE a.source_address = ?`
      )
      .bind(address)
      .first<MailboxRow>();

    return alias ?? null;
  },

  async findMailboxById(db: D1Database, id: string): Promise<MailboxRow | null> {
    return await db.prepare('SELECT * FROM mailboxes WHERE id = ?').bind(id).first<MailboxRow>();
  },

  async getMailboxesForUser(
    db: D1Database,
    userId: string
  ): Promise<(MailboxRow & { member_role: MailboxMemberRow['role'] })[]> {
    const res = await db
      .prepare(
        `SELECT m.*, mm.role as member_role
         FROM mailboxes m
         INNER JOIN mailbox_members mm ON mm.mailbox_id = m.id
         WHERE mm.user_id = ? AND m.status = 'active'`
      )
      .bind(userId)
      .all<MailboxRow & { member_role: MailboxMemberRow['role'] }>();

    return res.results;
  },

  async verifyUserMailboxAccess(
    db: D1Database,
    userId: string,
    mailboxId: string
  ): Promise<MailboxMemberRow['role'] | null> {
    const res = await db
      .prepare('SELECT role FROM mailbox_members WHERE user_id = ? AND mailbox_id = ?')
      .bind(userId, mailboxId)
      .first<{ role: MailboxMemberRow['role'] }>();

    return res ? res.role : null;
  },

  // Message & MailboxMessage queries
  async listMailboxMessages(
    db: D1Database,
    mailboxId: string,
    folder: string,
    limit = 50,
    beforeCreatedAt?: string
  ): Promise<
    (MailboxMessageRow & {
      subject: string | null;
      size_bytes: number;
      parse_status: MessageRow['parse_status'];
    })[]
  > {
    let sql = `
      SELECT mm.*, m.subject, m.size_bytes, m.parse_status
      FROM mailbox_messages mm
      INNER JOIN messages m ON m.id = mm.message_id
      WHERE mm.mailbox_id = ? AND mm.folder = ? AND mm.deleted_at IS NULL
    `;
    const params: (string | number)[] = [mailboxId, folder];

    if (beforeCreatedAt) {
      sql += ' AND mm.created_at < ?';
      params.push(beforeCreatedAt);
    }

    sql += ' ORDER BY mm.created_at DESC LIMIT ?';
    params.push(limit);

    const res = await db
      .prepare(sql)
      .bind(...params)
      .all<
        MailboxMessageRow & {
          subject: string | null;
          size_bytes: number;
          parse_status: MessageRow['parse_status'];
        }
      >();

    return res.results;
  },

  async getMessageDetails(
    db: D1Database,
    messageId: string
  ): Promise<{
    message: MessageRow;
    addresses: MessageAddressRow[];
    attachments: AttachmentRow[];
  } | null> {
    const message = await db.prepare('SELECT * FROM messages WHERE id = ?').bind(messageId).first<MessageRow>();
    if (!message) return null;

    const [addrRes, attachRes] = await Promise.all([
      db.prepare('SELECT * FROM message_addresses WHERE message_id = ?').bind(messageId).all<MessageAddressRow>(),
      db.prepare('SELECT * FROM attachments WHERE message_id = ?').bind(messageId).all<AttachmentRow>(),
    ]);

    return {
      message,
      addresses: addrRes.results,
      attachments: attachRes.results,
    };
  },

  async insertMessage(db: D1Database, message: MessageRow): Promise<void> {
    await db
      .prepare(
        'INSERT INTO messages (id, tenant_id, r2_raw_key, message_id_header, subject, size_bytes, parse_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        message.id,
        message.tenant_id,
        message.r2_raw_key,
        message.message_id_header,
        message.subject,
        message.size_bytes,
        message.parse_status,
        message.created_at
      )
      .run();
  },

  async insertMailboxMessage(db: D1Database, mailboxMessage: MailboxMessageRow): Promise<void> {
    await db
      .prepare(
        'INSERT INTO mailbox_messages (id, mailbox_id, message_id, folder, is_read, is_starred, deleted_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        mailboxMessage.id,
        mailboxMessage.mailbox_id,
        mailboxMessage.message_id,
        mailboxMessage.folder,
        mailboxMessage.is_read,
        mailboxMessage.is_starred,
        mailboxMessage.deleted_at,
        mailboxMessage.created_at
      )
      .run();
  },

  async updateMessageParseStatus(
    db: D1Database,
    messageId: string,
    status: MessageRow['parse_status'],
    subject?: string,
    sizeBytes?: number
  ): Promise<void> {
    if (subject !== undefined && sizeBytes !== undefined) {
      await db
        .prepare('UPDATE messages SET parse_status = ?, subject = ?, size_bytes = ? WHERE id = ?')
        .bind(status, subject, sizeBytes, messageId)
        .run();
    } else {
      await db.prepare('UPDATE messages SET parse_status = ? WHERE id = ?').bind(status, messageId).run();
    }
  },

  // Send Job queries
  async findSendJobById(db: D1Database, jobId: string): Promise<SendJobRow | null> {
    return await db.prepare('SELECT * FROM send_jobs WHERE id = ?').bind(jobId).first<SendJobRow>();
  },

  async findSendJobByClientRequestId(
    db: D1Database,
    mailboxId: string,
    clientRequestId: string
  ): Promise<SendJobRow | null> {
    return await db
      .prepare('SELECT * FROM send_jobs WHERE mailbox_id = ? AND client_request_id = ?')
      .bind(mailboxId, clientRequestId)
      .first<SendJobRow>();
  },

  async insertSendJob(db: D1Database, job: SendJobRow): Promise<void> {
    await db
      .prepare(
        'INSERT INTO send_jobs (id, tenant_id, mailbox_id, client_request_id, status, ses_message_id, retry_count, error_message, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        job.id,
        job.tenant_id,
        job.mailbox_id,
        job.client_request_id,
        job.status,
        job.ses_message_id,
        job.retry_count,
        job.error_message,
        job.created_at,
        job.updated_at
      )
      .run();
  },

  async updateSendJobStatus(
    db: D1Database,
    jobId: string,
    status: SendJobRow['status'],
    sesMessageId?: string | null,
    errorMessage?: string | null
  ): Promise<void> {
    const now = new Date().toISOString();
    await db
      .prepare(
        'UPDATE send_jobs SET status = ?, ses_message_id = COALESCE(?, ses_message_id), error_message = ?, updated_at = ? WHERE id = ?'
      )
      .bind(status, sesMessageId ?? null, errorMessage ?? null, now, jobId)
      .run();
  },

  // Delivery Event queries
  async insertDeliveryEvent(db: D1Database, event: DeliveryEventRow): Promise<void> {
    await db
      .prepare(
        'INSERT INTO delivery_events (id, send_job_id, type, payload_json, occurred_at, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .bind(event.id, event.send_job_id, event.type, event.payload_json, event.occurred_at, event.created_at)
      .run();
  },
};
