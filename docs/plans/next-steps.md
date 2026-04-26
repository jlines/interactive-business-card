# Next Steps

## AWS low-traffic runtime scaffold snapshot (2026-04-26)

The scaffold now aligns with the approved AWS low-traffic direction:

- AWS primary runtime direction is recorded in ADR 0004.
- Architecture docs describe Lambda container + DynamoDB request flow.
- Token validation resolves persisted token metadata and fails closed.
- Token persistence hashes with `TOKEN_PEPPER`; raw tokens are not stored.
- Token lifecycle scripts seed, generate, and revoke through the same store boundary the app uses.
- `/api/session` creates durable token-backed sessions.
- `/api/chat` authorizes sessions before prompt assembly, provider calls, and message persistence.
- Focused tests cover token fail-closed behavior, chat session authorization failures, and prompt layer ordering.

## Remaining gaps before production

1. **Deployment infrastructure is not implemented**
   - Add Lambda container packaging, DynamoDB table creation, IAM permissions, and Secrets Manager wiring.

2. **Browser chat flow is still mostly static**
   - `ChatShell` renders useful entry copy, but it does not yet open a session or send chat turns from the client.

3. **DynamoDB adapter needs AWS integration validation**
   - The adapter is implemented without an SDK to avoid leaking AWS shapes, but it should be smoke-tested against a real on-demand table.

4. **Operational runbooks are missing**
   - Document token generation/revocation, backups, secret rotation, and recovery procedures.

5. **Bedrock remains a placeholder**
   - Add only if/when there is a concrete reason to move inference to AWS-native models.

## Recommended implementation order

1. Add deployment packaging/IaC for Lambda container, DynamoDB, IAM, and Secrets Manager.
2. Wire the client chat UI to `/api/session` and `/api/chat` with pending/error states that do not expose internals.
3. Smoke-test DynamoDB persistence with seeded tokens and a real chat turn.
4. Add runbooks for token lifecycle and production operations.
