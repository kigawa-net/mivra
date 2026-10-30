/**
 * Standard HTTP response utilities for Mivra API endpoints.
 */

export function jsonResponse<T>(
  data: T,
  status = 200,
  headers?: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}

export function successResponse<T>(data: T, status = 200): Response {
  return jsonResponse({ success: true, data }, status);
}

export function noContentResponse(): Response {
  return new Response(null, { status: 204 });
}

export function corsHeaders(origin = '*'): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}
