# ADR 0004: AWS primary low-traffic runtime

## Status
Accepted

## Decision
Run the private interactive business card primarily on AWS for the low-traffic production path:

- **Runtime:** AWS Lambda using a container image for the Next.js app.
- **Persistence:** DynamoDB on-demand capacity for entry tokens, chat sessions, and chat messages.
- **Secrets:** AWS Secrets Manager for app secrets such as `TOKEN_PEPPER`, `SESSION_SECRET`, and provider API keys.
- **Inference:** OpenRouter first through the app-owned `InferenceClient`; Bedrock remains a later AWS-native adapter behind the same interface.

The application code remains provider-agnostic at the route and domain layers. AWS and OpenRouter details stay behind explicit adapters/repositories.

## Why
- Expected traffic is only several visits per day, so Lambda cold starts are acceptable if the entry page has useful server-rendered copy.
- DynamoDB on-demand avoids managing a database server and fits the small key-value/session workload.
- A Lambda container keeps deployment simple without making app code depend on Lambda event shapes.
- Keeping inference behind `InferenceClient` avoids coupling chat authorization and prompt assembly to any provider SDK.

## Consequences
- Token validation must resolve token metadata through the persistence boundary and fail closed for missing, malformed, expired, revoked, or unknown tokens.
- Raw QR tokens must never be persisted; stores hash with `TOKEN_PEPPER` before lookup or create.
- `/api/session` owns durable session creation after token validation.
- `/api/chat` must authorize an existing session before prompt assembly or provider calls.
- Infrastructure-as-code is intentionally deferred; this ADR locks direction, not deployment implementation.
