/**
 * Role-based authorization policies and helpers for Mivra.
 */

export type UserRole =
  | 'platform_admin'
  | 'tenant_admin'
  | 'mailbox_owner'
  | 'mailbox_member'
  | 'viewer';

export type MailboxRole = 'owner' | 'member' | 'viewer';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  platform_admin: 50,
  tenant_admin: 40,
  mailbox_owner: 30,
  mailbox_member: 20,
  viewer: 10,
};

/**
 * Checks if a user has at least the required role level globally.
 */
export function hasGlobalRoleAtLeast(currentRole: UserRole, requiredRole: UserRole): boolean {
  return (ROLE_HIERARCHY[currentRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

/**
 * Checks if a user can manage the platform.
 */
export function canManagePlatform(userRole: UserRole): boolean {
  return userRole === 'platform_admin';
}

/**
 * Checks if a user can manage tenant resources (domains, users).
 */
export function canManageTenant(userRole: UserRole): boolean {
  return userRole === 'platform_admin' || userRole === 'tenant_admin';
}

/**
 * Checks if a user can read emails from a mailbox given global role and mailbox member role.
 */
export function canReadMailbox(globalRole: UserRole, mailboxRole: MailboxRole | null): boolean {
  if (globalRole === 'platform_admin' || globalRole === 'tenant_admin') {
    return true;
  }
  return mailboxRole !== null;
}

/**
 * Checks if a user can send emails from a mailbox given global role and mailbox member role.
 */
export function canSendMailbox(globalRole: UserRole, mailboxRole: MailboxRole | null): boolean {
  if (globalRole === 'platform_admin') return true;
  if (mailboxRole === 'owner' || mailboxRole === 'member') return true;
  return false;
}

/**
 * Checks if a user can manage a mailbox (settings, delegates, deletion).
 */
export function canManageMailbox(globalRole: UserRole, mailboxRole: MailboxRole | null): boolean {
  if (globalRole === 'platform_admin' || globalRole === 'tenant_admin') return true;
  return mailboxRole === 'owner';
}
