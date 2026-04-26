import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveDeploymentConfig } from '../../../infra/lib/config';

test('resolveDeploymentConfig applies durable-state and hardening defaults', () => {
  const config = resolveDeploymentConfig({
    CDK_DEFAULT_ACCOUNT: '123456789012',
    CDK_DEFAULT_REGION: 'us-east-1',
    APP_CONFIG_SECRET_NAME: 'interactive-business-card/runtime',
  });

  assert.equal(config.sessionTableName, 'interactive-business-card-dev-sessions');
  assert.equal(config.tokenTableName, 'interactive-business-card-dev-tokens');
  assert.equal(config.sessionTtlHours, 168);
  assert.equal(config.wafEnabled, true);
  assert.equal(config.originProtectionEnabled, true);
});
