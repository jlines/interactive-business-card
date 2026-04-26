# CDK Edge + App Response Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add CloudFront/custom-domain support, cleaner provider/runtime configuration, and a deployed app flow that responds end-to-end.

**Architecture:** Keep Lambda Web Adapter + Lambda container as the app runtime. Put CloudFront in front of the Function URL, optionally attach an ACM certificate and Route53 alias record when domain inputs are provided, and keep synth-time vs runtime configuration separate. For app behavior, implement a minimal local-first chat flow with in-memory sessions and a provider adapter that can use OpenRouter or Bedrock when configured, while falling back to a grounded deterministic responder.

**Tech Stack:** Next.js App Router, TypeScript, Node test runner, AWS CDK v2, CloudFront, Lambda Function URL, Route53, ACM, Secrets Manager.

---

### Task 1: Add failing tests for deployment config parsing
- Cover optional CloudFront/custom-domain inputs.
- Cover provider fallback/runtime requirements.

### Task 2: Implement deployment/runtime config helpers
- Extend `infra/lib/config.ts`.
- Add app-side provider/runtime config helper.

### Task 3: Add failing tests for CDK stack outputs/resources
- Verify CloudFront distribution creation.
- Verify optional aliases/cert usage when env inputs exist.

### Task 4: Implement CloudFront + optional custom domain wiring
- Update stack to front Lambda URL with CloudFront.
- Add optional Route53 alias record support.
- Output distribution URL/domain.

### Task 5: Add failing tests for session + chat flow
- Validate token session creation.
- Validate grounded chat response behavior.

### Task 6: Implement minimal end-to-end app behavior
- Add in-memory session store.
- Implement `/api/session` and `/api/chat`.
- Add local grounded responder with optional OpenRouter/Bedrock usage.

### Task 7: Verify everything
- `npm run test`
- `npm run typecheck`
- `npm run build`
- `npm run cdk:synth`
