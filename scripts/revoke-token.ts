import { getConfiguredTokenStore, resetTokenStoreForTests } from '../src/lib/auth/token';
import { hashEntryToken } from '../src/lib/auth/token-store';

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
  const rawToken = args.token;
  const explicitHash = args['token-hash'];
  const pepper = process.env.TOKEN_PEPPER?.trim() || 'local-dev-token-pepper';

  if (!rawToken && !explicitHash) {
    throw new Error('Provide --token <raw-token> or --token-hash <sha256>.');
  }

  const tokenHash = explicitHash || await hashEntryToken(rawToken!, pepper);
  const store = getConfiguredTokenStore();
  await store.revoke(tokenHash);

  console.log(JSON.stringify({ ok: true, tokenHash }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
