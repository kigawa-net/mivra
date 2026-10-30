/**
 * Domain errors hierarchy for Mivra.
 */

export class DomainError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code = 'INTERNAL_ERROR', statusCode = 500, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, identifier?: string) {
    const msg = identifier ? `${resource} with identifier '${identifier}' was not found.` : `${resource} was not found.`;
    super(msg, 'NOT_FOUND', 404, { resource, identifier });
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Authentication is required.') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Access is forbidden.') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, validationErrors?: Record<string, string[]>) {
    super(message, 'VALIDATION_ERROR', 400, { validationErrors });
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, conflictKey?: string) {
    super(message, 'CONFLICT', 409, { conflictKey });
  }
}

export class QuotaExceededError extends DomainError {
  constructor(message = 'Mailbox storage quota exceeded.') {
    super(message, 'QUOTA_EXCEEDED', 413);
  }
}

export class ServiceUnavailableError extends DomainError {
  constructor(message = 'Service temporarily unavailable. Please retry later.') {
    super(message, 'SERVICE_UNAVAILABLE', 503);
  }
}
