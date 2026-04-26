# UI Caller Alignment Plan (Session + Chat Contracts)

## Goal
Align the token entry UI flow to the canonical API contracts so callers stop bypassing route boundaries and drift is reduced.

Primary target:
- UI should bootstrap sessions through `POST /api/session` contract
- UI should continue sending chat turns through `POST /api/chat`

---

## Current drift (branch: `align/session-contract`)
- `/c/[token]` currently validates token and creates session server-side directly (`createSession(...)`), bypassing `/api/session`.
- `/api/session` now returns canonical `{ ok, sessionId, openingContext }`, but UI opener currently comes from `initialMessages[0]`.
- Session bootstrap logic is duplicated across page/service layers.

---

## Decisions (locked)
1. **Session bootstrap owner:** `/api/session` is the canonical session-creation boundary for callers.
2. **Entry page responsibility:** `/c/[token]` may validate token for fail-closed rendering, but should not create session directly.
3. **UI opener source:** use `openingContext` from `/api/session` response (not first message inference).
4. **Chat turn source:** continue using `/api/chat` canonical request/response shape.
5. **Privacy rule:** UI should never depend on token internals in API responses.

---

## Implementation plan

### Task 1 — Move session bootstrap to API contract
Update `/c/[token]` and entry UI composition so session creation happens through `POST /api/session`.

Suggested shape:
- Server page validates token for closed/open render gate.
- Client bootstrap action calls `/api/session` with the token.
- On success, hydrate UI with `{ sessionId, openingContext }`.
- On failure, show fail-closed message.

### Task 2 — Update UI prop contract
Refactor `PersonalizedWelcome` / `ChatShell` props toward a caller view model:
- required: `sessionId`, `openingContext`
- optional: initial `messages` if needed
- avoid requiring full `tokenRecord` for rendering opener

### Task 3 — Keep chat contract unchanged
Ensure `ChatShell` continues to call:
- `POST /api/chat` with `{ sessionId, message }`
- handles success `{ ok, sessionId, message, messages }`
- handles canonical error messages/status semantics

### Task 4 — Remove dead/bypass code paths
- Remove direct session-creation path from page-level entry flow.
- Remove opener derivation from `initialMessages[0]` if no longer needed.

### Task 5 — Add tests
Add/update focused UI/route interaction tests for:
- entry flow uses `/api/session` contract (not direct `createSession` path)
- opener renders from `openingContext`
- chat flow still sends/receives canonical `/api/chat` payloads
- fail-closed rendering on session bootstrap failure

### Task 6 — Docs update
Update README route descriptions/examples to reflect caller behavior:
- `/c/[token]` performs token-gated entry then bootstraps session via `/api/session`
- `/api/chat` remains the only chat turn API

---

## File focus list
- `src/app/c/[token]/page.tsx`
- `src/components/entry/PersonalizedWelcome.tsx`
- `src/components/chat/ChatShell.tsx`
- (optional) new client bootstrap helper/component under `src/components/entry/`
- relevant tests under `tests/unit/app/`
- `README.md`

---

## Acceptance criteria
- UI no longer bypasses `/api/session` for session creation.
- Opener text comes from `openingContext` contract.
- `/api/chat` caller behavior remains stable.
- Tests enforce caller-to-route contract adherence.
- No UI dependency on token internals is introduced.
