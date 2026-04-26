import { createTokenStore } from '@/lib/db/client';

function rawTokenArg() {
  const flagIndex = process.argv.indexOf('--token');
  return flagIndex >= 0 ? process.argv[flagIndex + 1] : process.argv[2];
}

async function main() {
  const rawToken = rawTokenArg();

  if (!rawToken) {
    throw new Error('Usage: npm run tokens:revoke -- --token <raw-token>');
  }

  const record = await createTokenStore().revokeByRawToken(rawToken);

  if (!record) {
    console.log('No matching token found.');
    process.exitCode = 1;
    return;
  }

  console.log(`Revoked token id: ${record.id}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
