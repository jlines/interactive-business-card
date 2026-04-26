# API Drift Report: `mac` vs `statn`

Date: 2026-04-26  
Compared refs:
- `mac` @ `095f93f`
- `origin/statn` @ `495f944`
- merge base: `d0ede27`

Use this as a working todo list for alignment.

---

## 1) `/api/session` drift

### Request shape
- `mac`: tolerant/manual parse of body and token
- `statn`: strict `zod` schema (`token: string().min(1)`)

### Failure semantics
- `mac`: invalid token -> `401` with generic fail-closed message from validator
- `statn`: schema fail -> `400`; invalid token -> `404` with explicit message

### Success payload
- `mac`:
```json
{ "ok": true, "sessionId": "...", "openingContext": { "opener": "...", "label": "...", "audienceHint": "..." } }
```
- `statn`:
```json
{ "ok": true, "sessionId": "...", "tokenId": "...", "messages": [], "tokenRecord": {} }
```

### Session boot path
- `mac`: page validates token and renders; session created via `/api/session`
- `statn`: page validates token and creates session server-side before render

---

## 2) `/api/chat` drift

### Request shape
- `mac`: `{ sessionId, messages: ChatMessage[] }` (uses last user message)
- `statn`: `{ sessionId, message: string }`

### Failure semantics
- `mac`: missing/unauthorized session -> `401`, generic
- `statn`: schema fail -> `400`; unknown session -> `404`; other errors -> `500`

### Success payload
- `mac`:
```json
{ "ok": true, "sessionId": "...", "message": { ... } }
```
- `statn`:
```json
{ "ok": true, "sessionId": "...", "message": { ... }, "messages": [ ... ] }
```

---

## 3) Type-contract drift

### `src/types/chat.ts`
- `mac`: richer types (`TokenValidationFailureReason`, `TokenValidationResult` with `publicMessage`, session access/auth types, optional `createdAt` on messages)
- `statn`: minimal token/session result types (`{ valid: false }` only), slimmer message type

### Effect
- Route contracts are implicit and inconsistent between branches.

---

## 4) Caller/UI drift

### Session response usage
- `mac` UI expects `openingContext`
- `statn` UI path currently uses `initialSession` (`messages`, `tokenRecord`) from server-created session

### Chat response usage
- `mac` currently scaffold/static shell
- `statn` client chat expects `payload.messages` to replace transcript

---

## 5) Drift checklist (todo)

## Session contract alignment (current priority)
- [x] Enforce canonical `POST /api/session` request: `{ token: string }`
- [x] Use safe JSON parse + `zod` for token field
- [x] Trim token before validation
- [x] Return **uniform fail-closed** response body for parse/schema/token failures
- [x] Return **uniform status code** for all above failures (`401`)
- [x] Return **minimal success payload**: `ok`, `sessionId`, `openingContext`
- [x] Ensure no response leaks token internals (`tokenHash`, reasons, raw token)
- [ ] Update tests to lock all above behaviors

## Follow-up alignment (next phase)
- [x] Pick one `/api/chat` request shape (`message` vs `messages[]`)
- [x] Pick one status policy for unknown session (`401` vs `404`)
- [x] Pick one success payload shape (`message` only vs include `messages`)
- [ ] Implement explicit inactive/closed session authorization semantics in chat auth boundary
- [ ] Make route contracts explicit in docs (`docs/api-contract-v1.md`)
- [ ] Add contract tests for both routes to prevent future drift

---

## Notes
- `statn` is operationally ahead (infra/deploy/live chat).
- `mac` is stricter on fail-closed semantics and domain boundaries.
- Recommended strategy: keep `statn` runtime progress, port `mac` fail-closed contract discipline.
