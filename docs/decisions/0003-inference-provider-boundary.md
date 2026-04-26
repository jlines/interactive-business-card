# ADR 0003: Inference provider boundary

## Status
Accepted

## Decision
Expose model calls through an app-owned `InferenceClient` interface in `src/lib/ai/client.ts`.

OpenRouter is the first provider path and lives under `src/lib/ai/providers/openrouter.ts`. AWS Bedrock is represented in configuration and types as a later adapter, but it should not add implementation complexity until there is a concrete need.

## Why
- The app needs cloud inference, but route handlers should not depend on provider SDK shapes.
- OpenRouter provides a lightweight first integration path.
- Bedrock may be useful later, so the seam should be durable without becoming a provider framework.
- Keeping provider details behind one interface makes prompt assembly and session authorization easier to test.

## Consequences
- `/api/chat` must authorize the token-backed session before constructing an `InferenceClient`.
- Prompt assembly returns app-owned `ChatMessage` values that adapters map to provider-specific payloads.
- Provider configuration is converted from environment variables in `src/lib/config/env.ts`.
- The first real provider implementation should fill in the OpenRouter adapter, not add another abstraction layer.
