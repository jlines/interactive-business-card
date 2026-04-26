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
- AWS Lambda container image for low-traffic production runtime
- DynamoDB on-demand for token/session/message persistence
- AWS Secrets Manager for runtime secrets
- OpenRouter first behind the app-owned inference seam; Bedrock later behind the same interface

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
- `src/lib/db/schema.ts` documents the intended DynamoDB token/session/message records.

## Operational token scripts
Run scripts with the same persistence boundary the app uses. For local development, set `PERSISTENCE_ADAPTER=file`; for AWS, set `PERSISTENCE_ADAPTER=dynamodb` plus DynamoDB/AWS credentials.

```bash
npm run tokens:seed
npm run tokens:generate -- --label "Acme follow-up" --audience "operations lead"
npm run tokens:revoke -- --token <raw-token>
```

Raw token values are printed only for operator use and are never persisted.

## First implementation slices
1. Package/deploy the Lambda container and DynamoDB table.
2. Connect the browser chat shell to `/api/session` and `/api/chat`.
3. Add operational runbooks for tokens, backups, and secret rotation.
4. Add Bedrock only when there is a concrete need.
