# Subagent Plan: AWS Low-Traffic Runtime (Lambda Container + DynamoDB)

Use this with a development agent working inside:
`/Users/jasonlines/dev/interactive-business-card`

---

You are implementing the next phase for a **private token-gated interactive business card**.

## Product + traffic assumptions
- Traffic is very low (several visits/day max).
- Cold starts are acceptable if first paint stays useful.
- The app must remain private and fail closed on invalid/missing token/session state.
- Each experience is personalized from token metadata.

## Infrastructure direction
- **Primary cloud:** AWS
- **Runtime:** Lambda (container image)
- **Persistence:** DynamoDB (on-demand)
- **Secrets:** AWS Secrets Manager
- **Inference:** OpenRouter first via existing app-owned provider seam (`InferenceClient`), Bedrock later
- **GCP:** optional for specific external APIs later, not core hosting

---

## Goal of this pass
Move the current scaffold from SQLite-oriented intent to a low-traffic AWS-ready shape, while preserving existing boundaries:
- token gate
- token/session authorization
- prompt layer assembly
- provider-agnostic inference seam

Do not overbuild. Prefer clear seams and working fail-closed behavior.

---

## Required reading before edits
- `README.md`
- `docs/architecture.md`
- `docs/decisions/*`
- `docs/plans/next-steps.md`
- `src/lib/auth/token.ts`
- `src/lib/session/store.ts`
- `src/lib/db/schema.ts`
- `src/lib/db/client.ts`
- `src/app/api/session/route.ts`
- `src/app/api/chat/route.ts`
- `src/lib/ai/client.ts`
- `src/lib/ai/prompt.ts`
- `src/lib/config/env.ts`

---

## Scope (implement)

### 1) Document and lock cloud direction
- Add ADR: **AWS primary low-traffic runtime**.
- Update architecture docs for Lambda + DynamoDB request flow.
- Keep this explicit: app logic remains provider-agnostic and app-owned.

### 2) Replace SQLite-oriented persistence seams with Dynamo-ready seams
- Keep module boundaries small and explicit.
- Prefer repository/store interfaces over SDK leakage into route handlers.
- Ensure token/session/message records still map to current domain types.

Expected seam shape (names can vary if equivalent and clear):
- token store: get by raw token (internally hash+pepper), create, revoke
- session store: create for token, authorize session, append/read messages
- no raw token persistence

### 3) Implement real token lifecycle for low-traffic ops
- Implement hashing with `TOKEN_PEPPER`.
- Implement scripts:
  - `scripts/seed-demo-token.ts`
  - `scripts/generate-token.ts`
  - `scripts/revoke-token.ts`
- Scripts should operate against the same persistence boundary the app uses.

### 4) Wire durable session creation + authorization
- `/api/session`:
  - validate token fail-closed
  - create/restore server-owned session
  - return durable session id + opening context
- `/api/chat`:
  - require session id
  - authorize through store (fail closed)
  - assemble prompt layers
  - call provider client seam
  - append user/assistant messages

### 5) Keep cold-start UX acceptable
- Ensure entry experience has useful copy while session opens.
- Do not expose token/session internals in error responses.

### 6) Add focused tests
Minimum coverage:
- invalid/missing/malformed/expired/revoked token behavior fails closed
- `/api/chat` rejects missing or unauthorized session id
- prompt layer assembly preserves required ordering

---

## Out of scope (do NOT do now)
- Full Terraform/CDK deployment stack
- Full Bedrock implementation
- Multi-cloud runtime split
- Generic plugin/provider framework
- Public/open chat mode
- Admin UI

---

## Suggested implementation order
1. Docs/ADR updates (cloud direction + architecture flow).
2. Persistence interfaces + Dynamo adapter.
3. Token hashing + lifecycle scripts.
4. `/api/session` durable behavior.
5. `/api/chat` authorization + prompt + inference + persistence.
6. Tests and final typecheck/build pass.

---

## Acceptance criteria
- No hardcoded token-only path in production flow (demo token should come from persistence/scripts).
- `validateEntryToken` resolves token metadata via persistent store and fails closed.
- `/api/session` returns durable session id for valid token.
- `/api/chat` authorizes session before prompt assembly/provider calls.
- Prompt assembly remains layered and explicit.
- Tests for fail-closed behavior + prompt ordering pass.
- `npm run typecheck`, `npm run test`, and build pass with required env vars.

---

## Deliverables from the dev agent
1. Concise change summary.
2. File list changed.
3. Validation commands + results.
4. Known risks/open questions.
5. A short **“Next subagent should implement:”** list (3–5 items).
