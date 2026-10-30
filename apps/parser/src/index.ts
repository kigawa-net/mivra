import { queries } from '@mivra/database';
import type { ReceiveQueueMessage } from '@mivra/domain';
import { StorageKeys, getR2ObjectText, putR2Object } from '@mivra/storage';

export interface Env {
  DB: D1Database;
  MAIL_STORAGE: R2Bucket;
  ENVIRONMENT: string;
}

export default {
  async queue(
    batch: MessageBatch<ReceiveQueueMessage>,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    for (const msg of batch.messages) {
      const { messageId, tenantId, r2RawKey } = msg.body;

      try {
        // Mark message status as parsing
        await queries.updateMessageParseStatus(env.DB, messageId, 'parsing');

        // Fetch raw email from R2
        const rawEml = await getR2ObjectText(env.MAIL_STORAGE, r2RawKey);
        if (!rawEml) {
          throw new Error(`Raw EML not found at key: ${r2RawKey}`);
        }

        // Basic MIME header/body extraction (Phase 1 skeleton)
        const headerEndIdx = rawEml.indexOf('\r\n\r\n');
        const headersSection = headerEndIdx !== -1 ? rawEml.slice(0, headerEndIdx) : rawEml.slice(0, rawEml.indexOf('\n\n'));
        const bodySection = headerEndIdx !== -1 ? rawEml.slice(headerEndIdx + 4) : rawEml.slice(rawEml.indexOf('\n\n') + 2);

        // Extract subject if available
        const subjectMatch = headersSection.match(/^subject:\s*(.+)$/im);
        const subject = subjectMatch ? subjectMatch[1].trim() : 'No Subject';

        // Save extracted body text & HTML to R2
        const bodyTxtKey = StorageKeys.messageBodyText(tenantId, messageId);
        const bodyHtmlKey = StorageKeys.messageBodyHtml(tenantId, messageId);

        await Promise.all([
          putR2Object(env.MAIL_STORAGE, bodyTxtKey, bodySection, { contentType: 'text/plain; charset=utf-8' }),
          putR2Object(env.MAIL_STORAGE, bodyHtmlKey, `<pre>${escapeHtml(bodySection)}</pre>`, { contentType: 'text/html; charset=utf-8' }),
        ]);

        // Commit parsed metadata and mark message status as ready
        await queries.updateMessageParseStatus(env.DB, messageId, 'ready', subject, rawEml.length);

        msg.ack();
      } catch (error) {
        console.error(`Failed to parse message ${messageId}:`, error);
        await queries.updateMessageParseStatus(env.DB, messageId, 'parse_failed');
        msg.retry();
      }
    }
  },
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
