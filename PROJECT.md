# Project Bootstrap

## Product shape
A local-first interactive business card for Jason's contracting services.

## Core behaviors
- QR-code entrypoints map to tokenized landing URLs.
- Invalid, expired, or revoked tokens fail closed.
- Valid tokens create a personalized opener and chat context.
- The assistant answers from business context, not generic sales fluff.
- The app starts with cloud inference for speed of setup.

## Architecture boundaries
- **UI layer**: Next.js app routes and React chat components.
- **Application layer**: token validation, session creation, prompt assembly, chat orchestration.
- **Context layer**: in-repo markdown files describing services, tone, and personalization rules.
- **Provider layer**: one adapter for OpenRouter or Bedrock.
- **Operations layer**: scripts for token generation, revocation, and seed/demo data.

## Repository conventions
- `context/` holds human-edited grounding documents.
- `docs/` holds architecture and persistent decisions.
- `src/app/` holds route handlers and pages only.
- `src/lib/` holds non-visual logic.
- `scripts/` holds operational entrypoints that can be run from the terminal.
- `tests/` mirrors `src/` at unit/integration level.

## Near-term milestones
1. Implement token storage and validation.
2. Implement session bootstrap from `/c/[token]`.
3. Implement prompt assembly from token + business context.
4. Connect chat inference through one provider adapter.
5. Add admin scripts for token lifecycle.
