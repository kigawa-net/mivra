import { jsonResponse, successResponse, paginateResults, formatErrorResponse } from '@mivra/api';
import { queries } from '@mivra/database';
import { generateUuidV7, NotFoundError, ForbiddenError, ValidationError } from '@mivra/domain';
import { canReadMailbox, canSendMailbox, serializeSessionCookie } from '@mivra/auth';
import { StorageKeys, getR2ObjectText } from '@mivra/storage';
import { requireAuth } from './middleware/auth.js';

export interface Env {
  DB: D1Database;
  MAIL_STORAGE: R2Bucket;
  SEND_QUEUE: Queue;
  ENVIRONMENT: string;
  KEYCLOAK_ISSUER_URL: string;
  KEYCLOAK_CLIENT_ID: string;
  COOKIE_NAME: string;
  SESSION_SECRET?: string;
  KEYCLOAK_CLIENT_SECRET?: string;
}

export async function handleApiRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // Health check
    if (path === '/health' || path === '/api/v1/health') {
      return jsonResponse({
        status: 'healthy',
        service: 'mivra-web',
        environment: env.ENVIRONMENT,
        timestamp: new Date().toISOString(),
      });
    }

    // 1. Current user profile: GET /api/v1/me
    if (path === '/api/v1/me' && method === 'GET') {
      const session = await requireAuth(request, env.COOKIE_NAME, env.SESSION_SECRET);
      const user = await queries.findUserById(env.DB, session.userId);
      if (!user) {
        throw new NotFoundError('User', session.userId);
      }
      return successResponse({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      });
    }

    // 2. User accessible mailboxes: GET /api/v1/mailboxes
    if (path === '/api/v1/mailboxes' && method === 'GET') {
      const session = await requireAuth(request, env.COOKIE_NAME, env.SESSION_SECRET);
      const mailboxes = await queries.getMailboxesForUser(env.DB, session.userId);
      return successResponse(mailboxes);
    }

    // 3. Mailbox messages list: GET /api/v1/mailboxes/:id/messages
    const mailboxMessagesMatch = path.match(/^\/api\/v1\/mailboxes\/([^/]+)\/messages$/);
    if (mailboxMessagesMatch && method === 'GET') {
      const session = await requireAuth(request, env.COOKIE_NAME, env.SESSION_SECRET);
      const mailboxId = mailboxMessagesMatch[1];

      const memberRole = await queries.verifyUserMailboxAccess(env.DB, session.userId, mailboxId);
      if (!canReadMailbox(session.role, memberRole)) {
        throw new ForbiddenError('You do not have access to this mailbox.');
      }

      const folder = url.searchParams.get('folder') ?? 'inbox';
      const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 100);
      const before = url.searchParams.get('before') ?? undefined;

      const items = await queries.listMailboxMessages(env.DB, mailboxId, folder, limit + 1, before);
      const paginated = paginateResults(items, limit);

      return successResponse(paginated);
    }

    // 4. Message details: GET /api/v1/messages/:id
    const messageDetailsMatch = path.match(/^\/api\/v1\/messages\/([^/]+)$/);
    if (messageDetailsMatch && method === 'GET') {
      const session = await requireAuth(request, env.COOKIE_NAME, env.SESSION_SECRET);
      const messageId = messageDetailsMatch[1];

      const details = await queries.getMessageDetails(env.DB, messageId);
      if (!details) {
        throw new NotFoundError('Message', messageId);
      }

      if (session.role !== 'platform_admin' && session.tenantId && session.tenantId !== details.message.tenant_id) {
        throw new ForbiddenError('You do not have access to this message.');
      }

      return successResponse(details);
    }

    // 5. Message body text / HTML: GET /api/v1/messages/:id/body
    const messageBodyMatch = path.match(/^\/api\/v1\/messages\/([^/]+)\/body$/);
    if (messageBodyMatch && method === 'GET') {
      const session = await requireAuth(request, env.COOKIE_NAME, env.SESSION_SECRET);
      const messageId = messageBodyMatch[1];

      const details = await queries.getMessageDetails(env.DB, messageId);
      if (!details) {
        throw new NotFoundError('Message', messageId);
      }

      if (session.role !== 'platform_admin' && session.tenantId && session.tenantId !== details.message.tenant_id) {
        throw new ForbiddenError('You do not have access to this message.');
      }

      const format = url.searchParams.get('format') === 'text' ? 'text' : 'html';
      const key = format === 'text'
        ? StorageKeys.messageBodyText(details.message.tenant_id, messageId)
        : StorageKeys.messageBodyHtml(details.message.tenant_id, messageId);

      const content = await getR2ObjectText(env.MAIL_STORAGE, key);
      return successResponse({
        messageId,
        format,
        content: content ?? '',
      });
    }

    // 6. Send email request: POST /api/v1/messages/send
    if (path === '/api/v1/messages/send' && method === 'POST') {
      const session = await requireAuth(request, env.COOKIE_NAME, env.SESSION_SECRET);
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

      const mailboxId = body.mailboxId as string;
      if (!mailboxId) {
        throw new ValidationError('Missing required field: mailboxId');
      }

      const memberRole = await queries.verifyUserMailboxAccess(env.DB, session.userId, mailboxId);
      if (!canSendMailbox(session.role, memberRole)) {
        throw new ForbiddenError('You do not have permission to send mail from this mailbox.');
      }

      const mailbox = await queries.findMailboxById(env.DB, mailboxId);
      if (!mailbox) {
        throw new NotFoundError('Mailbox', mailboxId);
      }

      const sendJobId = generateUuidV7();
      const clientRequestId = (body.clientRequestId as string) ?? null;
      const now = new Date().toISOString();

      await queries.insertSendJob(env.DB, {
        id: sendJobId,
        tenant_id: mailbox.tenant_id,
        mailbox_id: mailbox.id,
        client_request_id: clientRequestId,
        status: 'queued',
        ses_message_id: null,
        retry_count: 0,
        error_message: null,
        created_at: now,
        updated_at: now,
      });

      await env.SEND_QUEUE.send({
        sendJobId,
        tenantId: mailbox.tenant_id,
        mailboxId: mailbox.id,
        clientRequestId,
        queuedAt: now,
      });

      return jsonResponse(
        {
          success: true,
          data: {
            sendJobId,
            status: 'queued',
          },
        },
        202
      );
    }

    // 7. Logout: POST /api/v1/auth/logout
    if (path === '/api/v1/auth/logout' && method === 'POST') {
      const expiredCookie = serializeSessionCookie(env.COOKIE_NAME, '', 0);
      return new Response(JSON.stringify({ success: true, message: 'Logged out successfully' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': expiredCookie,
        },
      });
    }

    // 404 for unmatched API routes
    return jsonResponse(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Endpoint ${method} ${path} does not exist.`,
        },
      },
      404
    );
  } catch (err) {
    return formatErrorResponse(err);
  }
}
