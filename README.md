# interactive-business-card

A private, token-gated chat app that works like an interactive business card for Jason's contracting services.

## What this scaffold optimizes for
- **Private entry only**: traffic begins at `/c/<token>` and should fail closed without a valid QR token.
- **Personalized first impression**: each token can carry its own audience hint and custom opener.
- **Simple inference layer**: start with a cloud model provider (OpenRouter or Bedrock) behind one server route.
- **Long-lived structure**: docs, context, app code, scripts, and tests each have a stable home from day one.

## Proposed stack
- Next.js App Router
- TypeScript
- local token/session storage behind a small server-side adapter
- cloud inference provider behind one app-owned API route

## Current layout
```text
.
├── context/                  # business context, system prompt, personalization notes
├── docs/                     # architecture and decision records
├── scripts/                  # operational helpers (token generation, seed data)
├── src/
│   ├── app/                  # routes and API handlers
│   ├── components/           # UI building blocks
│   ├── lib/                  # server/client utilities and adapters
│   └── types/                # shared application types
└── tests/                    # unit and integration coverage
```

## Intended routes
- `/` — operator landing page / project stub; not a public assistant
- `/c/[token]` — QR entrypoint that validates the token before rendering personalized chat UI
- `/api/session` — validates a QR token and should create/restore a server-backed session
- `/api/chat` — handles chat turns only after resolving an authorized token-backed session

## Durable scaffold seams
- `src/lib/auth/token.ts` owns the fail-closed token gate and returns `TokenValidationResult`.
- `src/lib/session/opening.ts` turns a valid token record into a personalized opening context.
- `src/lib/session/store.ts` is the future server-side session boundary.
- `src/lib/ai/prompt.ts` assembles named prompt layers from context files, token metadata, and conversation history.
- `src/lib/ai/client.ts` defines the provider-agnostic inference interface; OpenRouter is first, Bedrock is a later adapter.
- `src/lib/db/schema.ts` documents the intended local token/session/message records.

## First implementation slices
1. Implement token persistence with hashing, lifecycle checks, and seed/generate/revoke scripts.
2. Wire `/api/session` to create a durable token-backed session.
3. Wire `/api/chat` to authorize sessions, assemble prompts, and call OpenRouter.
4. Add focused tests for fail-closed access and prompt assembly.
