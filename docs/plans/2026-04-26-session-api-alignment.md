# Session API Alignment Plan (mac + statn)

## Goal
Align `POST /api/session` to one fail-closed contract before any broader API refactor.

This plan is intentionally session-only.

## Decisions (locked)
1. **Endpoint** stays `POST /api/session` with JSON body: `{ "token": "raw-entry-token" }`.
2. **Validation** uses safe JSON parsing plus Zod schema: `token: z.string().min(1)`.
3. **Normalization** trims token server-side before lookup.
4. **Failure body is uniform** for parse/schema/token failures:
   - `{ "ok": false, "message": "This entry link is unavailable." }`
5. **Failure status is uniform** for all failures above:
   - `401`
6. **Success body is minimal**:
   - `{ "ok": true, "sessionId": "...", "openingContext": { "opener": "...", "label": "...", "audienceHint": "..." } }`
7. **Privacy rule**: do not return raw token, token hash, token record internals, or failure reason codes.

## Why this shape
- Keeps fail-closed behavior consistent with private token-gated access.
- Keeps route code maintainable with explicit schema validation.
- Avoids coupling UI to token/session internals.
- Reduces branch drift by picking one canonical response shape now.

## Current status (branch: `align/session-contract`)
- ✅ **Task 2 mostly implemented** in `src/app/api/session/route.ts`:
  - safe JSON parse
  - zod-backed request validation (`src/lib/contracts/session.ts`)
  - token trimming
  - uniform fail-closed `401` response
  - minimal success payload: `sessionId + openingContext`
- ✅ **Type-contract scaffolding added** (`src/types/api.ts`, `src/types/domain.ts`, `src/types/persistence.ts`).
- ⚠️ **Task 3 not fully complete**: token validation is enforced, but page/session boot flow is still split (`/c/[token]` creates sessions server-side directly).
- ⏳ **Task 1 partially complete**: one route test was updated, but full contract coverage is still missing.
- ⏳ **Task 4/5 pending**: caller migration and docs/examples still need a full pass.

## Implementation plan

### Task 1 — Contract tests first
Add/update route tests to lock behavior:
- valid token returns `200` and minimal success payload
- missing body, malformed JSON, missing token, empty token return `401` + uniform failure body
- invalid/expired/revoked token return `401` + same failure body
- response never includes `tokenHash`, raw token, or reason fields

### Task 2 — Session route alignment
Update `src/app/api/session/route.ts` to:
- parse JSON safely (catch malformed body)
- validate with Zod
- trim token before validation/store lookup
- map any failure branch to the uniform 401 response
- return only `sessionId` + `openingContext` on success

### Task 3 — Session creation path consistency
Ensure session creation flow still runs through token validation first and does not leak token internals in response.

### Task 4 — UI compatibility update
Update callers that currently expect `tokenId`, `messages`, or `tokenRecord` from `/api/session`.
- UI should consume `sessionId` and `openingContext` only.

### Task 5 — Docs and examples
Update README and any deployment docs that show `/api/session` response examples.

## Out of scope
- `/api/chat` request/response alignment
- OpenAI-compatible API surface
- broader token/session persistence redesign
- infra changes (CDK, CloudFront, WAF)

## Acceptance criteria
- `POST /api/session` behavior matches the locked decisions above.
- Tests explicitly cover and enforce uniform fail-closed behavior.
- No route response leaks token internals.
- Existing app flow still opens a session and renders the opener successfully.
