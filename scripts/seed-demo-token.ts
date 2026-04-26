import { createTokenStore } from '@/lib/db/client';

const demoToken = process.env.DEMO_TOKEN || 'demo-card';

async function main() {
  const record = await createTokenStore().create({
    rawToken: demoToken,
    id: 'demo-token',
    label: 'demo business card',
    audienceHint: 'general warm lead',
    customOpener: 'Glad you scanned this — tell me a little about what you are trying to build or simplify.',
    notes: 'Seeded demo token for local/private testing.',
  });

  console.log('Seeded demo token.');
  console.log(`Token id: ${record.id}`);
  console.log(`Landing path: /c/${demoToken}`);
  console.log('Raw token is shown once here for operator use and is not persisted.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
