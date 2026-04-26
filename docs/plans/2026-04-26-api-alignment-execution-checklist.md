# API Alignment Execution Checklist

## Objective
Finish the session/chat API alignment work on `align/session-contract` so behavior is contract-locked by tests and documented for future contributors/subagents.

This checklist assumes the current in-branch implementation already includes:
- contract files under `src/lib/contracts/`
- shared type scaffolding under `src/types/`
- initial route alignment for `/api/session` and `/api/chat`

---

## Guardrails (do not change)
- Do **not** add OpenAI-compat endpoints in this pass.
- Do **not** redesign provider architecture in this pass.
- Do **not** change CDK/infra behavior in this pass.
- Keep fail-closed/privacy behavior: no token internals or auth reason details in public API responses.

---

## Ordered Tasks

### 1) Lock `/api/session` contract with tests
Update/add tests (prefer `tests/unit/app/routes.test.ts` and focused route tests) for:
- valid token -> `200` and `{ ok:true, sessionId, openingContext }`
- malformed JSON -> `401` + `{ ok:false, message:"This entry link is unavailable." }`
- missing token / empty token / wrong shape -> same `401` + same body
- invalid/revoked/expired token -> same `401` + same body
- response does not include `tokenHash`, raw token, or reason fields

### 2) Lock `/api/chat` contract with tests
Add/update tests for:
- malformed JSON -> `400` + `{ ok:false, message:"Expected a sessionId and message." }`
- schema fail / empty message -> same `400` + same body
- unknown/unauthorized session -> `401` + `{ ok:false, message:"A valid session is required." }`
- provider/runtime failure -> `502` + `{ ok:false, message:"The chat service is unavailable." }`
- success -> `200` + `{ ok:true, sessionId, message, messages }`
- response does not include auth reason details/token internals

### 3) Tighten chat auth boundary
In session/chat service boundary, ensure explicit authorization semantics are represented (not only unknown-session existence checks):
- session missing/invalid/closed/inactive should map to canonical `401`
- keep detailed reason internal (logs/tests), never in response body

### 4) Unify route contract usage
Verify both routes import and use:
- `src/lib/contracts/session.ts`
- `src/lib/contracts/chat.ts`
- `src/types/api.ts`

If any route has inline ad-hoc request schema/type duplication, remove it.

### 5) Caller compatibility check
Confirm UI callsites still work with aligned contracts:
- session consumer expects `openingContext` (not token internals)
- chat consumer handles `{ message, messages }`
- no caller depends on old `/api/session` payload fields (`tokenId`, `tokenRecord`, etc.)

### 6) Docs pass
Update docs with final contract examples:
- `README.md` route snippets
- any API examples in `docs/deployment/aws-cdk.md`
- optionally add `docs/api-contract-v1.md` as canonical route contract doc

---

## File-by-file focus list
- `src/app/api/session/route.ts`
- `src/app/api/chat/route.ts`
- `src/lib/chat/service.ts`
- `src/lib/session/store.ts` (if auth semantics are tightened here)
- `tests/unit/app/routes.test.ts`
- add/update route-focused tests under `tests/unit/app/`
- `README.md`
- `docs/deployment/aws-cdk.md`
- optional: `docs/api-contract-v1.md`

---

## Verification commands
Run in order:
```bash
npm run typecheck
npm run test
npm run build
```
If infra tests are in scope for your environment:
```bash
npm run cdk:synth
```

---

## Definition of Done
- Both route contracts are enforced by tests for happy path + failure matrix.
- Failure status/body mapping matches plan docs exactly.
- No token/auth internals leak in responses.
- Docs reflect current canonical API behavior.
- Branch is ready for PR review with a clear summary of contract changes.
