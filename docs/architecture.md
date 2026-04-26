# Architecture

## Goal
Keep the app small while giving it stable seams for token gating, context assembly, session authorization, and provider swapping.

This is a private interactive business card for Jason's contracting services. It is not a public chat product and should fail closed whenever token or session state is missing or invalid.

## Request flow
1. Visitor opens `/c/[token]` from a QR code.
2. `src/lib/auth/token.ts` validates the opaque token on the server.
3. Invalid, missing, malformed, expired, or revoked tokens render only the closed error state.
4. A valid token yields a safe `TokenRecord` and `PersonalizedOpeningContext`.
5. `/api/session` is the boundary that should create or restore a server-backed chat session from that validated token.
6. Chat requests hit `/api/chat` with a server-tracked session reference; the route must authorize the session before prompt assembly or provider calls.
7. Prompt assembly combines explicit layers:
   - base system instruction from `context/system-prompt.md`
   - contracting services context from `context/contracting-services.md`
   - token personalization policy from `context/token-personalization.md`
   - token metadata from the validated token record
   - recent conversation history from the authorized session
8. The provider adapter sends assembled messages through the app-owned `InferenceClient` interface.

## Core seams
- **Token gate**: `src/lib/auth/token.ts` returns a discriminated `TokenValidationResult`. Only the `valid: true` branch may open UI or sessions.
- **Token metadata**: `TokenRecord` in `src/types/chat.ts` carries safe personalization fields and lifecycle status. Raw token values should not leave the gate.
- **Opening context**: `src/lib/session/opening.ts` derives the first visible assistant message from validated metadata.
- **Session state**: `src/lib/session/store.ts` owns future session creation and authorization. `/api/chat` should never create sessions.
- **Prompt assembly**: `src/lib/ai/prompt.ts` keeps prompt layers named and ordered so grounding remains inspectable.
- **Inference provider**: `src/lib/ai/client.ts` defines the provider-agnostic interface. `src/lib/ai/providers/openrouter.ts` is the first adapter seam; Bedrock is a later adapter.
- **Business context**: `context/` holds human-edited markdown truth loaded by `src/lib/context/loaders.ts`.
- **Persistence contract**: `src/lib/db/schema.ts` documents the SQLite-oriented token, session, and message records before migrations exist.

## Route responsibilities
- `/` — operator/project stub only; not a public assistant.
- `/c/[token]` — token-gated entry experience. It validates before rendering personalized UI.
- `/api/session` — validates a QR token and, once persistence exists, creates/restores a server-backed session.
- `/api/chat` — accepts chat turns only for an authorized token-backed session.

## Provider strategy
OpenRouter is the first intended provider because it keeps setup lightweight and cloud-hosted. Bedrock remains explicitly represented as a later adapter behind the same `InferenceClient` interface, but the scaffold should not grow a generic provider framework until there is a concrete need.

## Non-goals right now
- public access
- generic multi-tenant chat productization
- auth beyond the QR-token gate
- vector search or large retrieval systems
- generic agent frameworks
- deep workflow automation inside the chat

## Next implementation phases
1. Implement local token persistence: hashing with `TOKEN_PEPPER`, seed/generate/revoke scripts, and token lifecycle checks.
2. Implement session persistence and wire `/api/session` to return a server-backed session id.
3. Wire `/api/chat` to authorize sessions, assemble prompts, call the OpenRouter adapter, and persist messages.
4. Add focused tests for fail-closed token/session behavior and prompt layer assembly.
