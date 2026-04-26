# Chat API Alignment Plan (mac + statn)

## Goal
Align `POST /api/chat` to one explicit contract and restore fail-closed session authorization semantics.

This plan is intentionally chat-only.

## Decisions (locked)
1. **Endpoint** stays `POST /api/chat` with JSON body:
   - `{ "sessionId": "...", "message": "..." }`
2. **Validation** uses safe JSON parsing plus Zod schema:
   - `sessionId: z.string().min(1)`
   - `message: z.string().min(1)`
3. **Normalization** trims `message` server-side before processing.
4. **Input failure policy** (malformed JSON/schema/empty message):
   - status `400`
   - body `{ "ok": false, "message": "Expected a sessionId and message." }`
5. **Authorization failure policy** (missing/unknown/closed/inactive session):
   - status `401`
   - body `{ "ok": false, "message": "A valid session is required." }`
6. **Success payload**:
   - `{ "ok": true, "sessionId": "...", "message": { ... }, "messages": [ ... ] }`
7. **Provider/runtime failure policy**:
   - status `502`
   - body `{ "ok": false, "message": "The chat service is unavailable." }`
8. **Privacy rule**: do not return auth reason codes, token internals, raw token data, or provider internals.

## Why this shape
- Keeps request ergonomics simple for UI (`sessionId + message`).
- Keeps transcript hydration simple by returning `messages`.
- Restores fail-closed semantics for session authorization.
- Normalizes error handling and reduces route drift risk.

## Current status (branch: `align/session-contract`)
- ✅ **Task 3 mostly implemented** in `src/app/api/chat/route.ts` and `src/lib/chat/service.ts`:
  - canonical request shape: `{ sessionId, message }`
  - safe JSON parse + zod validation (`src/lib/contracts/chat.ts`)
  - message trimming
  - canonical success shape: `{ ok, sessionId, message, messages }`
  - canonical failure mapping: `400` input, `401` auth, `502` unavailable
- ✅ **Shared API/domain types introduced** (`src/types/api.ts`, `src/types/domain.ts`).
- ⚠️ **Task 2 partially complete**: unknown session maps to `401`, but explicit inactive/closed session authorization semantics are not fully modeled yet.
- ⏳ **Task 1 partially complete**: only limited route-test updates landed; full contract test matrix is still pending.
- ⏳ **Task 4/5 pending**: caller/docs cleanup still needs a full pass.

## Implementation plan

### Task 1 — Contract tests first
Add/update route tests to lock behavior:
- malformed JSON and schema failures -> `400` + canonical input-failure body
- unknown/invalid session states -> `401` + canonical auth-failure body
- valid chat turn -> `200` with `sessionId`, `message`, and `messages`
- provider/runtime error -> `502` + canonical service-unavailable body
- response does not include token internals or reason codes

### Task 2 — Authorization boundary
Ensure chat route/service performs explicit session authorization before prompt assembly/provider call.
- Unknown or inactive session paths must map to canonical `401` output.

### Task 3 — Route and service alignment
Update `src/app/api/chat/route.ts` and chat orchestration service to:
- accept only canonical request shape
- trim message prior to append/prompt assembly
- return canonical success payload
- map failures to the locked status/body policy

### Task 4 — Caller compatibility
Update UI callsites to rely on canonical response (`payload.messages` + `payload.message`) and canonical error semantics.

### Task 5 — Docs and examples
Update README and any docs that show `/api/chat` examples.

## Out of scope
- `/api/session` contract alignment (handled in separate plan)
- OpenAI-compatible API surface
- provider architecture redesign
- infra changes (CDK/CloudFront/WAF)

## Acceptance criteria
- `POST /api/chat` behavior matches all locked decisions above.
- Tests enforce input/auth/provider failure mapping and payload shape.
- No response leaks auth reason details or token/provider internals.
- Existing UI can send turns and render updated transcript reliably.
