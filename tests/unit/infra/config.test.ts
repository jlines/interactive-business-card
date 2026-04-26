import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveDeploymentConfig } from '../../../infra/lib/config';

test('resolveDeploymentConfig applies defaults for optional deployment settings', () => {
  const config = resolveDeploymentConfig({
    CDK_DEFAULT_ACCOUNT: '123456789012',
    CDK_DEFAULT_REGION: 'us-east-1',
    APP_CONFIG_SECRET_NAME: 'interactive-business-card/runtime',
  });

  assert.deepEqual(config, {
    account: '123456789012',
    region: 'us-east-1',
    stage: 'dev',
    appName: 'interactive-business-card',
    secretName: 'interactive-business-card/runtime',
    modelProvider: 'openrouter',
    openRouterModel: 'openai/gpt-4.1-mini',
    bedrockRegion: 'us-east-1',
    bedrockModelId: undefined,
    memorySize: 1536,
    timeoutSeconds: 30,
    domainName: undefined,
    hostedZoneName: undefined,
    certificateArn: undefined,
    sessionTableName: 'interactive-business-card-dev-sessions',
    tokenTableName: 'interactive-business-card-dev-tokens',
    sessionTtlHours: 168,
    wafEnabled: true,
    originProtectionEnabled: true,
  });
});

test('resolveDeploymentConfig accepts bedrock deployments and explicit sizing', () => {
  const config = resolveDeploymentConfig({
    CDK_DEFAULT_ACCOUNT: '123456789012',
    CDK_DEFAULT_REGION: 'us-west-2',
    APP_CONFIG_SECRET_NAME: 'interactive-business-card/runtime',
    MODEL_PROVIDER: 'bedrock',
    BEDROCK_REGION: 'us-west-2',
    BEDROCK_MODEL_ID: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
    DEPLOYMENT_STAGE: 'prod',
    APP_NAME: 'contracting-card',
    LAMBDA_MEMORY_SIZE: '2048',
    LAMBDA_TIMEOUT_SECONDS: '45',
  });

  assert.equal(config.modelProvider, 'bedrock');
  assert.equal(config.bedrockRegion, 'us-west-2');
  assert.equal(config.bedrockModelId, 'anthropic.claude-3-5-sonnet-20240620-v1:0');
  assert.equal(config.stage, 'prod');
  assert.equal(config.appName, 'contracting-card');
  assert.equal(config.memorySize, 2048);
  assert.equal(config.timeoutSeconds, 45);
  assert.equal(config.sessionTableName, 'contracting-card-prod-sessions');
  assert.equal(config.tokenTableName, 'contracting-card-prod-tokens');
  assert.equal(config.wafEnabled, true);
  assert.equal(config.originProtectionEnabled, true);
});

test('resolveDeploymentConfig includes optional domain settings when provided', () => {
  const config = resolveDeploymentConfig({
    CDK_DEFAULT_ACCOUNT: '123456789012',
    CDK_DEFAULT_REGION: 'us-east-1',
    APP_CONFIG_SECRET_NAME: 'interactive-business-card/runtime',
    CUSTOM_DOMAIN_NAME: 'card.example.com',
    HOSTED_ZONE_NAME: 'example.com',
    ACM_CERTIFICATE_ARN: 'arn:aws:acm:us-east-1:123456789012:certificate/abc',
  });

  assert.equal(config.domainName, 'card.example.com');
  assert.equal(config.hostedZoneName, 'example.com');
  assert.equal(config.certificateArn, 'arn:aws:acm:us-east-1:123456789012:certificate/abc');
});
