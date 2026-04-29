# AWS CDK Deployment

This repo now includes a smallest-working AWS Lambda deployment path for the Next.js app.

## What it does
- builds the app in `standalone` mode
- packages it as a Lambda container image
- runs it behind a public Lambda Function URL fronted by CloudFront
- provisions DynamoDB tables for chat sessions and entry tokens
- adds WAF managed rules plus an origin-verification header between CloudFront and Lambda
- optionally attaches a custom domain and Route53 alias record
- loads runtime secrets from AWS Secrets Manager
- grants Bedrock invoke permissions and uses a real Bedrock runtime adapter when configured
- serves a minimal end-to-end chat flow instead of placeholder 501 routes

## Files
- `cdk.json` — CDK app entrypoint
- `infra/bin/app.ts` — CDK bootstrap
- `infra/lib/config.ts` — synth-time config parsing
- `infra/lib/interactive-business-card-stack.ts` — Lambda stack definition
- `infra/docker/Dockerfile` — production container image build

## 1. Create the runtime secret

Create a Secrets Manager secret named `interactive-business-card/runtime` (or whatever you set in `APP_CONFIG_SECRET_NAME`) with JSON like:

```json
{
  "SESSION_SECRET": "replace-me",
  "TOKEN_PEPPER": "replace-me",
  "OPENROUTER_API_KEY": "replace-me"
}
```

If you deploy with `MODEL_PROVIDER=bedrock`, `OPENROUTER_API_KEY` can be an empty string.

## 2. Export synth-time environment variables

```bash
export AWS_PROFILE=personal
export CDK_DEFAULT_ACCOUNT=123456789012
export CDK_DEFAULT_REGION=us-east-1
export APP_CONFIG_SECRET_NAME=intera...time
export DEPLOYMENT_STAGE=dev
export MODEL_PROVIDER=openrouter
export OPENROUTER_MODEL=openai/gpt-4.1-mini
# optional for Bedrock deployments
export BEDROCK_REGION=us-east-1
export BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0
# optional explicit table names / hardening toggles
export SESSION_TABLE_NAME=interactive-business-card-dev-sessions
export TOKEN_TABLE_NAME=interactive-business-card-dev-tokens
export SESSION_TTL_HOURS=168
export ENABLE_WAF=true
export ENABLE_ORIGIN_PROTECTION=true
# optional for custom domains
export CUSTOM_DOMAIN_NAME=card.example.com
export HOSTED_ZONE_NAME=example.com
export ACM_CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/abc
```

Optional sizing overrides:

```bash
export LAMBDA_MEMORY_SIZE=1536
export LAMBDA_TIMEOUT_SECONDS=30
```

## 3. Install dependencies

```bash
yarn install
```

## 4. Verify locally

```bash
yarn test
yarn typecheck
yarn cdk:synth
```

## 5. Deploy

```bash
yarn cdk:deploy
```

CDK outputs the CloudFront domain, Function URL, and the provisioned DynamoDB table names. The stack also injects the CloudFront-facing base URL, session/table names, and origin-protection values into the Lambda runtime.

## 6. Seed or generate entry tokens

```bash
yarn tokens:seed
yarn tokens:generate -- --label "Ops lead" --audience "operations"
yarn tokens:revoke -- --token demo-card
```

## Notes
- This is still a small-stack Lambda path, but it now has durable DynamoDB-backed state and a hardened CloudFront edge.
- CloudFront is the primary edge entrypoint; the Lambda Function URL remains the origin and is guarded with a shared origin-verification header.
- If `MODEL_PROVIDER=openrouter` and `OPENROUTER_API_KEY` is present, the app calls OpenRouter.
- If `MODEL_PROVIDER=bedrock` and `BEDROCK_REGION` + `BEDROCK_MODEL_ID` are present, the app calls Bedrock through the AWS SDK.
- If a remote provider is unavailable or errors, the app falls back to the grounded local reply built from the repo context files.
- Session TTL defaults to 7 days (`168` hours) and can be overridden with `SESSION_TTL_HOURS`.
