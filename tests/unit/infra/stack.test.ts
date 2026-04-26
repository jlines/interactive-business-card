import test from 'node:test';
import assert from 'node:assert/strict';

import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

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
    sessionTableName: 'interactive-business-card-dev-sessions',
    tokenTableName: 'interactive-business-card-dev-tokens',
    sessionTtlHours: 168,
    wafEnabled: true,
    originProtectionEnabled: true,
    ...overrides,
  };
}

test('stack creates a CloudFront distribution in front of the Lambda URL', () => {
  const app = new cdk.App();
  const stack = new InteractiveBusinessCardStack(app, 'TestStack', {
    env: { account: '123456789012', region: 'us-east-1' },
    deploymentConfig: buildConfig(),
  });

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::CloudFront::Distribution', 1);
  template.hasOutput('DistributionDomainName', {});
  template.hasOutput('AppUrl', {});
});

test('stack wires custom domain and route53 when domain settings are provided', () => {
  const app = new cdk.App();
  const stack = new InteractiveBusinessCardStack(app, 'TestDomainStack', {
    env: { account: '123456789012', region: 'us-east-1' },
    deploymentConfig: buildConfig({
      domainName: 'card.example.com',
      hostedZoneName: 'example.com',
      certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/abc',
    }),
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      Aliases: ['card.example.com'],
    },
  });
  template.resourceCountIs('AWS::Route53::RecordSet', 1);
  template.hasOutput('AppUrl', {
    Value: 'https://card.example.com',
  });

  assert.ok(template.toJSON().Outputs.DistributionDomainName);
});
