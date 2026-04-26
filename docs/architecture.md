# Architecture

## Goal
Keep the app small while giving it stable seams for token gating, context assembly, and provider swapping.

## Request flow
1. Visitor opens `/c/[token]` from a QR code.
2. Server validates the token via `src/lib/auth/token.ts`.
3. Valid token creates or restores a small chat session.
4. Chat requests hit `/api/chat` with a server-tracked session reference.
5. Prompt assembly combines:
   - system prompt
   - contracting services context
   - token personalization metadata
   - recent conversation messages
6. Provider adapter sends the request to OpenRouter or Bedrock.

## Structural decisions
- **App Router** for route-local server code.
- **`src/lib`** for logic that should survive UI rewrites.
- **`context/`** for promptable business truth edited by humans.
- **`scripts/`** for operational helpers that are not app routes.
- **`docs/decisions/`** for long-lived architecture calls.

## Non-goals right now
- public access
- generic multi-tenant chat productization
- vector search or large retrieval systems
- deep workflow automation inside the chat
