import test from 'node:test';
import assert from 'node:assert/strict';

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';

import { InteractiveBusinessCardStack } from '../../../infra/lib/interactive-business-card-stack';
import type { DeploymentConfig } from '../../../infra/lib/config';

function buildConfig(overrides: Partial<DeploymentConfig> = {}): DeploymentConfig {
  return {
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
    sessionTableName: 'interactive-business-card-sessions',
    tokenTableName: 'interactive-business-card-tokens',
    sessionTtlHours: 168,
    wafEnabled: true,
    originProtectionEnabled: true,
    ...overrides,
  };
}

test('stack provisions durable token and session tables plus WAF', () => {
  const app = new cdk.App();
  const stack = new InteractiveBusinessCardStack(app, 'TestHardeningStack', {
    env: { account: '123456789012', region: 'us-east-1' },
    deploymentConfig: buildConfig(),
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::DynamoDB::Table', 2);
  template.resourceCountIs('AWS::WAFv2::WebACL', 1);
  template.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      DefaultCacheBehavior: Match.objectLike({
        ViewerProtocolPolicy: 'redirect-to-https',
      }),
    },
  });
});

test('stack injects an origin verification header into the CloudFront origin', () => {
  const app = new cdk.App();
  const stack = new InteractiveBusinessCardStack(app, 'TestOriginHeaderStack', {
    env: { account: '123456789012', region: 'us-east-1' },
    deploymentConfig: buildConfig(),
  });

  const template = Template.fromStack(stack);
  const distribution = template.findResources('AWS::CloudFront::Distribution');
  const distributionConfig = Object.values(distribution)[0] as { Properties?: { DistributionConfig?: { Origins?: Array<Record<string, unknown>> } } };
  const origin = distributionConfig.Properties?.DistributionConfig?.Origins?.[0];

  assert.ok(origin);
  assert.ok(Array.isArray(origin?.OriginCustomHeaders));
  assert.equal(origin?.OriginCustomHeaders?.[0]?.HeaderName, 'X-Origin-Verify');
});
