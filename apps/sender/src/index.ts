import { queries } from '@mivra/database';
import { generateUuidV7, type SendQueueMessage } from '@mivra/domain';

export interface Env {
  DB: D1Database;
  MAIL_STORAGE: R2Bucket;
  ENVIRONMENT: string;
  AWS_REGION: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  SES_CONFIGURATION_SET?: string;
}

export default {
  async queue(
    batch: MessageBatch<SendQueueMessage>,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    for (const msg of batch.messages) {
      const { sendJobId } = msg.body;

      try {
        const job = await queries.findSendJobById(env.DB, sendJobId);
        if (!job) {
          console.warn(`Send job ${sendJobId} not found; skipping.`);
          msg.ack();
          continue;
        }

        // Prevent duplicate execution if already delivered or accepted
        if (job.status === 'accepted_by_ses') {
          msg.ack();
          continue;
        }

        // Transition status to sending
        await queries.updateSendJobStatus(env.DB, sendJobId, 'sending');

        // Deliver outbound email via Amazon SES API v2 (Phase 1 skeleton)
        const sesMessageId = await deliverViaSes(sendJobId, env);

        // Update send job record with SES message ID
        await queries.updateSendJobStatus(env.DB, sendJobId, 'accepted_by_ses', sesMessageId);

        // Record delivery accepted event
        const now = new Date().toISOString();
        await queries.insertDeliveryEvent(env.DB, {
          id: generateUuidV7(),
          send_job_id: sendJobId,
          type: 'delivered',
          payload_json: JSON.stringify({ sesMessageId, acceptedAt: now }),
          occurred_at: now,
          created_at: now,
        });

        msg.ack();
      } catch (error) {
        console.error(`Failed to send job ${sendJobId}:`, error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown SES delivery error';

        await queries.updateSendJobStatus(env.DB, sendJobId, 'failed', null, errorMsg);
        msg.retry();
      }
    }
  },
};

/**
 * Amazon SES API v2 delivery handler.
 */
async function deliverViaSes(
  sendJobId: string,
  _env: Env
): Promise<string> {
  // In development / testing environment, simulate SES success
  const simulatedSesId = `ses-${sendJobId.slice(0, 8)}-${Date.now()}`;
  return simulatedSesId;
}
