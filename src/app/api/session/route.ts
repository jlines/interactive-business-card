import { validateEntryToken } from '@/lib/auth/token';
import { buildOpeningContext } from '@/lib/session/opening';

async function readSessionRequest(request: Request): Promise<{ token?: string }> {
  try {
    const body = (await request.json()) as unknown;

    if (typeof body === 'object' && body !== null && 'token' in body) {
      const token = (body as { token?: unknown }).token;
      return { token: typeof token === 'string' ? token : undefined };
    }
  } catch {
    // Treat malformed JSON the same as a missing token. The route must fail
    // closed and should not disclose token lookup details.
  }

  return {};
}

/**
 * Opens the server-owned session boundary for a valid QR token.
 *
 * The route validates the token before doing anything else. Until durable session
 * persistence is implemented, valid tokens receive an explicit 501 rather than a
 * fake client-side session that could hide an authorization gap.
 */
export async function POST(request: Request) {
  const { token } = await readSessionRequest(request);
  const tokenResult = await validateEntryToken(token);

  if (!tokenResult.valid) {
    return Response.json({ ok: false, message: tokenResult.publicMessage }, { status: 401 });
  }

  return Response.json(
    {
      ok: false,
      message: 'Token is valid, but durable session creation is not implemented yet.',
      next: 'Implement src/lib/session/store.ts and return a server-backed session id here.',
      openingContext: buildOpeningContext(tokenResult.record),
    },
    { status: 501 },
  );
}
