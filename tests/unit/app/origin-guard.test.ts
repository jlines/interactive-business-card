import test from 'node:test';
import assert from 'node:assert/strict';

import { enforceOriginProtection } from '../../../src/lib/edge/origin-guard';

test('enforceOriginProtection allows requests when protection is disabled', () => {
  const result = enforceOriginProtection({
    pathname: '/c/demo-card',
    headers: new Headers(),
    env: {},
  });

  assert.equal(result.allowed, true);
});

test('enforceOriginProtection rejects direct origin requests without the expected header', () => {
  const result = enforceOriginProtection({
    pathname: '/api/chat',
    headers: new Headers(),
    env: {
      ORIGIN_VERIFY_TOKEN: 'shared-secret',
      ORIGIN_VERIFY_HEADER: 'x-origin-verify',
    },
  });

  assert.equal(result.allowed, false);
  assert.equal(result.status, 403);
});

test('enforceOriginProtection allows requests carrying the expected CloudFront origin header', () => {
  const headers = new Headers({ 'x-origin-verify': 'shared-secret' });
  const result = enforceOriginProtection({
    pathname: '/api/chat',
    headers,
    env: {
      ORIGIN_VERIFY_TOKEN: 'shared-secret',
      ORIGIN_VERIFY_HEADER: 'x-origin-verify',
    },
  });

  assert.equal(result.allowed, true);
});
