# Mivra API Specification (`/api/v1`)

All endpoints return JSON responses and require session authentication unless otherwise noted.

## Response Standards

- **Success Response**: `{ "success": true, "data": ... }`
- **Error Response**: `{ "success": false, "error": { "code": "...", "message": "...", "details": { ... } } }`
- **Cursor Pagination**: `{ "items": [...], "nextCursor": "...", "hasMore": true/false }`

## Endpoints

### System & Authentication
- `GET /health` — Service health and environment status
- `GET /api/v1/me` — Authenticated user profile and global role
- `POST /api/v1/auth/logout` — Revokes session and clears session cookie

### Mailboxes
- `GET /api/v1/mailboxes` — Lists accessible mailboxes for current user
- `GET /api/v1/mailboxes/:id/messages?folder=inbox&limit=50&before=...` — Cursor-paginated message list

### Messages
- `GET /api/v1/messages/:id` — Message summary, addresses (From/To/Cc/Bcc), and attachment metadata
- `GET /api/v1/messages/:id/body?format=html|text` — Extracted message body
- `POST /api/v1/messages/send` — Submit outbound email job for asynchronous SES delivery (Returns 202 Accepted)
