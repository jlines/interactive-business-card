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
- token/session storage behind a small server-side adapter (memory locally, DynamoDB in AWS)
- cloud inference provider behind one app-owned API route (OpenRouter or Bedrock)
- CloudFront in front of a Lambda container deployment, with optional WAF and origin protection

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
- `/` — operator landing page / project stub
- `/c/[token]` — QR entrypoint, validates token and opens the personalized chat
- `/api/session` — validates QR token and creates a server-backed session
- `/api/chat` — handles chat turns and provider calls

## First implementation slices
1. Define the token record format and validation flow.
2. Add a local token store and one seed token.
3. Render the gated chat shell at `/c/[token]`.
4. Wire `/api/chat` to a cloud inference provider using repo context files.

## Deployment
- AWS CDK deployment scaffolding lives under `infra/`.
- The current setup packages the Next.js app as a Lambda container image, fronts it with CloudFront, provisions DynamoDB tables for tokens/sessions, and can attach WAF + origin protection.
- Use `npm run tokens:seed`, `npm run tokens:generate`, and `npm run tokens:revoke` to manage entry tokens against the configured backend.
- See `docs/deployment/aws-cdk.md` for required Secrets Manager keys, synth-time env vars, and deploy commands.
