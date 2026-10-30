import { parseSessionCookie, verifySessionToken, type SessionData } from '@mivra/auth';
import { UnauthorizedError } from '@mivra/domain';

export interface AuthenticatedContext {
  session: SessionData;
}

export async function requireAuth(
  request: Request,
  cookieName: string,
  sessionSecret?: string
): Promise<SessionData> {
  const secret = sessionSecret ?? 'dev-default-session-secret-key-mivra';
  const cookieHeader = request.headers.get('Cookie');
  const token = parseSessionCookie(cookieHeader, cookieName);

  if (!token) {
    throw new UnauthorizedError('Session cookie is missing or invalid.');
  }

  const session = await verifySessionToken(token, secret);
  if (!session) {
    throw new UnauthorizedError('Session has expired or signature is invalid.');
  }

  return session;
}
