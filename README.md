# interactive-business-card

A private, token-gated chat app that works like an interactive business card for Jason's contracting services.

## What this scaffold optimizes for
- **Private entry only**: traffic begins at `/c/<token>` and should fail closed without a valid QR token.
- **Personalized first impression**: each token can carry its own audience hint and custom opener.
- **Simple inference layer**: start with one provider route and switch between OpenRouter, Bedrock, or local Ollama.
- **Long-lived structure**: docs, context, app code, scripts, and tests each have a stable home from day one.

## Proposed stack
- Next.js App Router
- TypeScript
- token/session storage behind a small server-side adapter (memory locally, DynamoDB in AWS)
- provider adapter behind one app-owned API route (OpenRouter, Bedrock, or local Ollama)
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

## Routes and API contract
- `/` — operator landing page / project stub
- `/c/[token]` — private QR entrypoint for the personalized chat experience
- `POST /api/session` — validates an entry token and creates a server-backed session
- `POST /api/chat` — accepts one chat turn for an authorized session and returns the updated transcript

The canonical route contract lives in [`docs/api-contract-v1.md`](docs/api-contract-v1.md). Public API responses intentionally avoid raw tokens, token hashes, token record internals, authorization reason codes, and provider internals.

### `POST /api/session`

Request:

```json
{ "token": "raw-entry-token" }
```

Success (`200`):

```json
{
  "ok": true,
  "sessionId": "sess_123",
  "openingContext": {
    "label": "Ops lead",
    "audienceHint": "operations",
    "opener": "Glad you scanned this..."
  }
}
```

All malformed, missing, invalid, revoked, or expired token failures return the same fail-closed response (`401`):

```json
{ "ok": false, "message": "This entry link is unavailable." }
```

### `POST /api/chat`

Request:

```json
{
  "sessionId": "sess_123",
  "message": "What kinds of projects are a good fit?"
}
```

Success (`200`):

```json
{
  "ok": true,
  "sessionId": "sess_123",
  "message": {
    "id": "msg_assistant_123",
    "role": "assistant",
    "content": "Jason is usually a strong fit for pragmatic product and platform work..."
  },
  "messages": [
    {
      "id": "msg_user_123",
      "role": "user",
      "content": "What kinds of projects are a good fit?"
    },
    {
      "id": "msg_assistant_123",
      "role": "assistant",
      "content": "Jason is usually a strong fit for pragmatic product and platform work..."
    }
  ]
}
```

Failure responses:
- Invalid JSON, schema failures, or empty messages: `400` with `{ "ok": false, "message": "Expected a sessionId and message." }`
- Well-formed requests whose session is missing from server state, unknown, inactive, or closed: `401` with `{ "ok": false, "message": "A valid session is required." }`
- Provider/runtime failures: `502` with `{ "ok": false, "message": "The chat service is unavailable." }`

## Provider selection (including local Ollama)
Set `MODEL_PROVIDER` to one of:
- `openrouter` (requires `OPENROUTER_API_KEY`)
- `bedrock` (requires `BEDROCK_REGION` and `BEDROCK_MODEL_ID`)
- `ollama` (local, requires running Ollama at `OLLAMA_BASE_URL`, default `http://127.0.0.1:11434`)

Example local Ollama config:

```env
MODEL_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1:8b
```

And ensure the model is available:

```bash
ollama serve
ollama pull llama3.1:8b
```

## First implementation slices
1. Define the token record format and validation flow.
2. Add a local token store and one seed token.
3. Render the gated chat shell at `/c/[token]`.
4. Wire `/api/chat` to a cloud inference provider using repo context files.

## Deployment
- AWS CDK deployment scaffolding lives under `infra/`.
- The current setup packages the Next.js app as a Lambda container image, fronts it with CloudFront, provisions DynamoDB tables for tokens/sessions, and can attach WAF + origin protection.
- Use `yarn tokens:seed`, `yarn tokens:generate`, and `yarn tokens:revoke` to manage entry tokens against the configured backend.
- See `docs/deployment/aws-cdk.md` for required Secrets Manager keys, synth-time env vars, and deploy commands.
