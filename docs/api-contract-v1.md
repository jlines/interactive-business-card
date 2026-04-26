# API Contract v1

This document is the canonical public API contract for the app-owned routes used by the interactive business card UI. The routes are intentionally small, private, and fail closed. Public responses must not expose raw entry tokens, token hashes, token record internals, authorization reason codes, or model-provider internals.

## Shared shapes

### Error

All error responses use the same envelope shape:

```json
{ "ok": false, "message": "Human-readable public message." }
```

The `message` is safe to show to the user and is intentionally generic for authorization/token failures.

### Chat message

```json
{
  "id": "msg_123",
  "role": "assistant",
  "content": "Message text",
  "createdAt": "2026-04-26T12:00:00.000Z"
}
```

Fields:
- `id`: server-generated message identifier
- `role`: one of `system`, `user`, or `assistant`
- `content`: message text
- `createdAt`: optional ISO timestamp

### Opening context

```json
{
  "label": "Ops lead",
  "audienceHint": "operations",
  "opener": "Glad you scanned this..."
}
```

Fields:
- `label`: public label for the entry token audience
- `audienceHint`: optional public audience hint
- `opener`: personalized opener to render before the chat continues

## `POST /api/session`

Creates a server-backed chat session from a raw QR/entry token.

### Request

```http
POST /api/session
Content-Type: application/json
```

```json
{ "token": "raw-entry-token" }
```

Validation and normalization:
- The body must be valid JSON.
- `token` must be a non-empty string.
- The server trims the token before lookup.

### Success response

Status: `200`

```json
{
  "ok": true,
  "sessionId": "sess_123",
  "openingContext": {
    "label": "Ops lead",
    "audienceHint": "operations",
    "opener": "Glad you scanned this. I can help you figure out whether Jason is a fit for operations."
  }
}
```

The success payload is intentionally minimal. Callers should use `sessionId` for later chat turns and render `openingContext` for the initial personalized experience.

### Failure responses

Malformed JSON, schema failures, missing/empty tokens, invalid tokens, revoked tokens, and expired tokens all return the same fail-closed response.

Status: `401`

```json
{ "ok": false, "message": "This entry link is unavailable." }
```

### Privacy rules

`/api/session` responses must not include:
- the raw token
- token hashes
- token record internals
- `tokenId`
- transcript `messages`
- validation or failure reason codes

## `POST /api/chat`

Sends one user chat turn for an existing authorized session.

### Request

```http
POST /api/chat
Content-Type: application/json
```

```json
{
  "sessionId": "sess_123",
  "message": "What kinds of projects are a good fit?"
}
```

Validation and normalization:
- The body must be valid JSON.
- `sessionId` must be a non-empty string.
- `message` must be a non-empty string.
- The server trims `message` before appending it to the transcript and calling the provider.

### Success response

Status: `200`

```json
{
  "ok": true,
  "sessionId": "sess_123",
  "message": {
    "id": "msg_assistant_123",
    "role": "assistant",
    "content": "Jason is usually a strong fit for pragmatic product and platform work...",
    "createdAt": "2026-04-26T12:00:00.000Z"
  },
  "messages": [
    {
      "id": "msg_opener_123",
      "role": "assistant",
      "content": "Glad you scanned this...",
      "createdAt": "2026-04-26T11:59:00.000Z"
    },
    {
      "id": "msg_user_123",
      "role": "user",
      "content": "What kinds of projects are a good fit?",
      "createdAt": "2026-04-26T12:00:00.000Z"
    },
    {
      "id": "msg_assistant_123",
      "role": "assistant",
      "content": "Jason is usually a strong fit for pragmatic product and platform work...",
      "createdAt": "2026-04-26T12:00:00.000Z"
    }
  ]
}
```

The `message` field contains the new assistant reply. The `messages` field contains the updated transcript and is the caller's source of truth for rendering after a successful turn.

### Input failure responses

Malformed JSON, missing fields, wrong-shaped fields, and empty messages return:

Status: `400`

```json
{ "ok": false, "message": "Expected a sessionId and message." }
```

### Authorization failure responses

Well-formed requests whose session is missing from server state, unknown, inactive, or closed return:

Status: `401`

```json
{ "ok": false, "message": "A valid session is required." }
```

### Provider/runtime failure responses

Model-provider failures and other chat runtime errors return:

Status: `502`

```json
{ "ok": false, "message": "The chat service is unavailable." }
```

### Privacy rules

`/api/chat` responses must not include:
- raw entry tokens or token hashes
- token record internals
- authorization failure reason codes
- provider request/response internals
- stack traces or implementation details

## Caller flow

1. Visitor opens `/c/[token]` from a private QR or entry link.
2. The UI calls `POST /api/session` with `{ "token": "..." }`.
3. On success, the UI stores `sessionId` and renders `openingContext`.
4. For each chat turn, the UI calls `POST /api/chat` with `{ "sessionId": "...", "message": "..." }`.
5. On chat success, the UI replaces the rendered transcript with `payload.messages`.

## TypeScript sources

The implementation contract is mirrored in:
- `src/lib/contracts/session.ts`
- `src/lib/contracts/chat.ts`
- `src/types/api.ts`
- `src/types/domain.ts`
