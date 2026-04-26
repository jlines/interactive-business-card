import { validateEntryToken } from '@/lib/auth/token';
import { buildOpeningContext } from '@/lib/session/opening';
import { createChatSessionStore } from '@/lib/session/store';

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
 * The route validates the token before creating durable session state. Invalid
 * tokens all receive the same public response so lookup details stay private.
 */
export async function POST(request: Request) {
  const { token } = await readSessionRequest(request);
  const tokenResult = await validateEntryToken(token);

  if (!tokenResult.valid) {
    return Response.json({ ok: false, message: tokenResult.publicMessage }, { status: 401 });
  }

  const session = await createChatSessionStore().createForToken({ tokenId: tokenResult.record.id });

  return Response.json({
    ok: true,
    sessionId: session.id,
    openingContext: buildOpeningContext(tokenResult.record),
  });
}
