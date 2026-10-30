import { DomainError } from '@mivra/domain';
import { jsonResponse } from './response.js';

export interface ApiErrorPayload {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Serializes standard DomainErrors or uncaught exceptions into an HTTP JSON response.
 */
export function formatErrorResponse(error: unknown): Response {
  if (error instanceof DomainError) {
    const payload: ApiErrorPayload = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
    return jsonResponse(payload, error.statusCode);
  }

  if (error instanceof Error) {
    const payload: ApiErrorPayload = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'An unexpected internal error occurred.',
      },
    };
    return jsonResponse(payload, 500);
  }

  const payload: ApiErrorPayload = {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred.',
    },
  };
  return jsonResponse(payload, 500);
}
