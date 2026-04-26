# Production Hardening Pass Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Move the app from scaffold-safe to deployable-safe by adding durable DynamoDB-backed state, a real Bedrock adapter, and basic edge hardening around the CloudFront/Lambda origin.

**Architecture:** Keep the current Next.js + Lambda container shape, but replace in-memory session/token assumptions with backend-selected stores. In AWS, CDK will provision DynamoDB tables and a CloudFront-to-origin shared secret header. In app code, runtime config selects OpenRouter or Bedrock, and both providers fall back to the grounded local reply only when remote execution is unavailable or fails.

**Tech Stack:** Next.js 15, TypeScript, AWS CDK, DynamoDB, AWS SDK v3, Bedrock Runtime, CloudFront, WAFv2.

---

## Task 1: Define the production-hardening contract in tests
- Add failing tests for runtime config selection, token/session persistence behavior, and CloudFront/WAF/origin-hardening synth expectations.
- Keep tests narrowly scoped so each one proves a single behavior.

## Task 2: Add deploy-time config for durable state and edge hardening
- Extend `infra/lib/config.ts` and its tests with session/token table settings, TTL defaults, and origin protection/WAF toggles.
- Keep optional inputs minimal; synth should still work with defaults.

## Task 3: Replace in-memory session storage with backend-selected persistence
- Introduce a session repository abstraction.
- Support memory fallback for tests/local development.
- Support DynamoDB when `SESSION_TABLE_NAME` is present.
- Preserve the existing `createSession`, `getSession`, and `appendMessages` API so routes/components do not churn.

## Task 4: Replace the placeholder token path with a real store adapter
- Implement token hashing + lookup via a store adapter.
- Support memory/demo fallback for local development.
- Support DynamoDB when `TOKEN_TABLE_NAME` is present.
- Make `scripts/seed-demo-token.ts`, `scripts/generate-token.ts`, and `scripts/revoke-token.ts` actually operate against the configured store.

## Task 5: Implement a real Bedrock provider adapter
- Add a Bedrock chat client using AWS SDK v3 Bedrock Runtime.
- Convert the current `PromptBundle` into Bedrock-friendly messages.
- Preserve grounded fallback behavior only for missing config or runtime failure.

## Task 6: Harden the CloudFront → Lambda origin path
- Provision a secret origin verification value.
- Configure CloudFront to send it as a custom origin header.
- Reject direct origin traffic in app middleware/guard code when origin protection is enabled.
- Add WAF managed rule coverage and security headers.
- Improve caching so static assets can cache while chat/API traffic stays dynamic.

## Task 7: Verify and document
- Run `npm run test`, `npm run typecheck`, `npm run build`, and `npm run cdk:synth`.
- Update `.env.example`, `README.md`, and `docs/deployment/aws-cdk.md` with the new runtime/deploy expectations.
