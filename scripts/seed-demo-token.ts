import { getConfiguredTokenStore, resetTokenStoreForTests } from '../src/lib/auth/token';

async function main() {
  resetTokenStoreForTests();
  const store = getConfiguredTokenStore();
  const existing = await store.getByToken('demo-card');

  if (existing) {
    console.log(JSON.stringify({ ok: true, reused: true, token: 'demo-card', record: existing }, null, 2));
    return;
  }

  const created = await store.create({
    rawToken: 'demo-card',
    label: 'demo business card',
    audienceHint: 'general warm lead',
    customOpener: 'Glad you scanned this — tell me a little about what you are trying to build or simplify.',
  });

  console.log(JSON.stringify({ ok: true, reused: false, token: 'demo-card', record: created }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
