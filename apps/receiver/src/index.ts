import { queries } from '@mivra/database';
import { generateUuidV7, type ReceiveQueueMessage } from '@mivra/domain';
import { StorageKeys, putR2Object } from '@mivra/storage';
import { parseEmailAddress } from '@mivra/mail';

export interface Env {
  DB: D1Database;
  MAIL_STORAGE: R2Bucket;
  RECEIVE_QUEUE: Queue<ReceiveQueueMessage>;
  ENVIRONMENT: string;
}

export default {
  async email(message: ForwardableEmailMessage, env: Env, _ctx: ExecutionContext): Promise<void> {
    const recipient = parseEmailAddress(message.to);
    if (!recipient) {
      message.setReject('Invalid recipient address format.');
      return;
    }

    // Resolve target mailbox or alias in database
    const mailbox = await queries.findMailboxByAddress(env.DB, recipient.address);
    if (!mailbox) {
      message.setReject(`Recipient address not found: ${recipient.address}`);
      return;
    }

    // Check mailbox quota
    if (mailbox.used_bytes + message.rawSize > mailbox.quota_bytes) {
      message.setReject('Recipient mailbox storage quota exceeded.');
      return;
    }

    const messageId = generateUuidV7();
    const mailboxMessageId = generateUuidV7();
    const rawKey = StorageKeys.rawMessage(mailbox.tenant_id, messageId);
    const now = new Date().toISOString();

    // 1. Persist raw RFC 5322 MIME stream to R2 storage
    await putR2Object(env.MAIL_STORAGE, rawKey, message.raw, {
      contentType: 'message/rfc822',
      customMetadata: {
        from: message.from,
        to: message.to,
        tenantId: mailbox.tenant_id,
        mailboxId: mailbox.id,
      },
    });

    // 2. Insert initial records in D1
    await queries.insertMessage(env.DB, {
      id: messageId,
      tenant_id: mailbox.tenant_id,
      r2_raw_key: rawKey,
      message_id_header: message.headers.get('message-id'),
      subject: message.headers.get('subject'),
      size_bytes: message.rawSize,
      parse_status: 'stored',
      created_at: now,
    });

    await queries.insertMailboxMessage(env.DB, {
      id: mailboxMessageId,
      mailbox_id: mailbox.id,
      message_id: messageId,
      folder: 'inbox',
      is_read: 0,
      is_starred: 0,
      deleted_at: null,
      created_at: now,
    });

    // 3. Enqueue parsing task for non-blocking asynchronous MIME analysis
    const queuePayload: ReceiveQueueMessage = {
      messageId,
      tenantId: mailbox.tenant_id,
      mailboxIds: [mailbox.id],
      r2RawKey: rawKey,
      receivedAt: now,
    };

    await env.RECEIVE_QUEUE.send(queuePayload);
  },
};
