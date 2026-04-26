import { randomBytes } from 'node:crypto';
import { createTokenStore } from '@/lib/db/client';

function argValue(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function randomToken() {
  return randomBytes(32).toString('base64url');
}

async function main() {
  const rawToken = argValue('--token') || randomToken();
  const label = argValue('--label') || 'interactive business card lead';
  const audienceHint = argValue('--audience');
  const customOpener = argValue('--opener');
  const notes = argValue('--notes');
  const expiresAt = argValue('--expires-at');

  const record = await createTokenStore().create({
    rawToken,
    label,
    audienceHint,
    customOpener,
    notes,
    expiresAt,
  });

  console.log('Generated entry token. Store this raw token securely; it is not persisted.');
  console.log(`Token id: ${record.id}`);
  console.log(`Raw token: ${rawToken}`);
  console.log(`Landing path: /c/${rawToken}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
