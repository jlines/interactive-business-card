# Architecture

## Goal
Keep the app small while giving it stable seams for token gating, context assembly, session authorization, provider swapping, and low-traffic AWS deployment.

This is a private interactive business card for Jason's contracting services. It is not a public chat product and should fail closed whenever token or session state is missing or invalid.

## Primary runtime direction
- **Cloud:** AWS
- **Runtime:** Lambda container image running the Next.js app
- **Persistence:** DynamoDB on-demand
- **Secrets:** AWS Secrets Manager feeding environment variables at runtime
- **Inference:** OpenRouter first through the app-owned `InferenceClient`; Bedrock later behind the same interface

The application does not depend on Lambda event shapes, DynamoDB request shapes, or provider SDK payloads in route handlers. Those details stay behind small app-owned seams.

## Request flow
1. Visitor opens `/c/[token]` from a QR code.
2. `src/lib/auth/token.ts` validates the opaque token on the server.
3. The token store hashes the raw token with `TOKEN_PEPPER` before lookup. Raw QR token values are never persisted.
4. Invalid, missing, malformed, expired, or revoked tokens render only the closed error state.
5. A valid token yields a safe `TokenRecord` and `PersonalizedOpeningContext`.
6. `/api/session` validates the submitted token again, then creates a durable DynamoDB-backed session through `src/lib/session/store.ts`.
7. The session response returns a server-owned session id plus opening context. It does not expose raw token internals.
8. Chat requests hit `/api/chat` with a server-tracked session reference; the route authorizes the session before prompt assembly or provider calls.
9. Prompt assembly combines explicit layers:
   - base system instruction from `context/system-prompt.md`
   - contracting services context from `context/contracting-services.md`
   - token personalization policy from `context/token-personalization.md`
   - token metadata from the validated token record
   - recent conversation history from the authorized session
10. The provider adapter sends assembled messages through the app-owned `InferenceClient` interface.
11. The user and assistant messages are appended to durable session history.

## Core seams
- **Token gate:** `src/lib/auth/token.ts` returns a discriminated `TokenValidationResult`. Only the `valid: true` branch may open UI or sessions.
- **Token store:** `src/lib/db/client.ts` owns token hashing with `TOKEN_PEPPER`, token create/lookup/revoke operations, and persistence adapters. Raw tokens do not leave this boundary except as operator input to lifecycle scripts.
- **Token metadata:** `TokenRecord` in `src/types/chat.ts` carries safe personalization fields and lifecycle status. Raw token values should not leave the gate/store path.
- **Opening context:** `src/lib/session/opening.ts` derives the first visible assistant message from validated metadata.
- **Session state:** `src/lib/session/store.ts` owns session creation and authorization. `/api/chat` never creates sessions.
- **Prompt assembly:** `src/lib/ai/prompt.ts` keeps prompt layers named and ordered so grounding remains inspectable.
- **Inference provider:** `src/lib/ai/client.ts` defines the provider-agnostic interface. `src/lib/ai/providers/openrouter.ts` is the first adapter seam; Bedrock is a later adapter.
- **Business context:** `context/` holds human-edited markdown truth loaded by `src/lib/context/loaders.ts`.
- **Persistence contract:** `src/lib/db/schema.ts` documents the DynamoDB single-table records expected by the stores.

## DynamoDB shape
The low-traffic production adapter uses one DynamoDB table named by `DYNAMODB_TABLE_NAME`:

- Token item: `PK=TOKEN#<tokenHash>`, `SK=TOKEN`
- Session item: `PK=SESSION#<sessionId>`, `SK=SESSION`
- Message item: `PK=SESSION#<sessionId>`, `SK=MESSAGE#<createdAt>#<messageId>`

The current adapter scans by token id during session authorization. That is acceptable for the expected tiny token set and can be replaced with a GSI later if operational volume changes.

A file adapter exists for local development and scripts so the app can be exercised without SQLite or AWS credentials. Production should use `PERSISTENCE_ADAPTER=dynamodb`.

## Route responsibilities
- `/` — operator/project stub only; not a public assistant.
- `/c/[token]` — token-gated entry experience. It validates before rendering personalized UI.
- `/api/session` — validates a QR token and creates a server-backed session.
- `/api/chat` — accepts chat turns only for an authorized token-backed session.

## Provider strategy
OpenRouter is the first provider because it keeps setup lightweight and cloud-hosted. Bedrock remains explicitly represented as a later adapter behind the same `InferenceClient` interface, but the scaffold should not grow a generic provider framework until there is a concrete need.

## Non-goals right now
- public access
- generic multi-tenant chat productization
- auth beyond the QR-token gate
- vector search or large retrieval systems
- generic agent frameworks
- deep workflow automation inside the chat
- Terraform/CDK deployment stack

## Next implementation phases
1. Add deployment packaging/infrastructure for the Lambda container, DynamoDB table, and Secrets Manager wiring.
2. Connect the chat UI to `/api/session` and `/api/chat` with safe pending/error states.
3. Add operational runbooks for token generation, revocation, DynamoDB backups, and secret rotation.
4. Add the Bedrock adapter only when there is a concrete need to move inference onto AWS-native models.
