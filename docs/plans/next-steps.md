# Next Steps

## Scaffold verification snapshot (2026-04-25)

The durable scaffold pass is mostly in place and aligns with the architecture prompt in these areas:

- Token-gated entry route and fail-closed behavior (`/c/[token]`, `/api/session`, `/api/chat`).
- Durable domain types for token validation, opening context, and chat/session boundaries.
- Layered prompt assembly contract (`base system`, `business context`, `token personalization policy`, `token metadata`, `conversation history`).
- Provider-agnostic inference seam with explicit OpenRouter-first adapter path and Bedrock placeholder.
- Updated architecture docs and ADR for inference provider boundary.

## Remaining gaps before feature work

1. **Token persistence is still placeholder-only**
   - `src/lib/auth/token.ts` validates only a hardcoded `demo-card` token.
   - `src/lib/db/client.ts` is a TODO seam (no SQLite implementation yet).

2. **Session boundary is not durable yet**
   - `src/lib/session/store.ts` is a TODO seam.
   - `/api/session` returns `501` for valid tokens until session creation exists.

3. **Chat authorization/inference path is not wired**
   - `/api/chat` checks presence of `sessionId` but does not authorize via store.
   - Prompt bundle + inference client are defined but not executed in route flow.

4. **Operational token scripts are stubs**
   - `scripts/seed-demo-token.ts`
   - `scripts/generate-token.ts`
   - `scripts/revoke-token.ts`

5. **Tests are not implemented yet**
   - No coverage for fail-closed token/session behavior.
   - No coverage for prompt-layer assembly contract.

## Recommended implementation order

1. Implement local SQLite token store + token hashing (`TOKEN_PEPPER`) in `src/lib/db/client.ts`.
2. Implement token lifecycle scripts (seed/generate/revoke) against that store.
3. Implement durable session store in `src/lib/session/store.ts` and return `sessionId` from `/api/session`.
4. Update `/api/chat` to authorize session, assemble prompt, call inference client, and append messages.
5. Add focused tests for token/session fail-closed behavior and prompt-layer ordering.
