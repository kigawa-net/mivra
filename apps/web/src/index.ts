import { handleApiRequest, type Env } from './routes.js';
import { corsHeaders } from '@mivra/api';

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get('Origin') ?? '*';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    const response = await handleApiRequest(request, env);

    // Attach CORS headers to response
    const headers = new Headers(response.headers);
    const cors = corsHeaders(origin);
    for (const [key, value] of Object.entries(cors)) {
      if (!headers.has(key)) {
        headers.set(key, value);
      }
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
