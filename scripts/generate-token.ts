import { randomBytes } from 'node:crypto';

import { getConfiguredTokenStore, resetTokenStoreForTests } from '../src/lib/auth/token';

function parseArgs(argv: string[]) {
  const parsed: Record<string, string> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current?.startsWith('--')) continue;
    const key = current.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) continue;
    parsed[key] = value;
    index += 1;
  }

  return parsed;
}

async function main() {
  resetTokenStoreForTests();
  const args = parseArgs(process.argv.slice(2));
  const rawToken = args.token || randomBytes(12).toString('base64url');
  const label = args.label || 'interactive business card';
  const audienceHint = args.audience || args['audience-hint'];
  const customOpener = args.opener;
  const notes = args.notes;
  const appBaseUrl = process.env.APP_BASE_URL?.trim() || 'http://localhost:3000';

  const store = getConfiguredTokenStore();
  const created = await store.create({
    rawToken,
    label,
    audienceHint,
    customOpener,
    notes,
  });

  console.log(JSON.stringify({
    ok: true,
    token: rawToken,
    tokenHash: created.tokenHash,
    landingUrl: `${appBaseUrl.replace(/\/$/, '')}/c/${rawToken}`,
    record: created,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
