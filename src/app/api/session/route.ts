import { z } from 'zod';

import { createSession } from '@/lib/session/store';
import { validateEntryToken } from '@/lib/auth/token';

const createSessionSchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = createSessionSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ ok: false, message: 'Expected a token.' }, { status: 400 });
  }

  const tokenResult = await validateEntryToken(parsed.data.token);

  if (!tokenResult.valid) {
    return Response.json({ ok: false, message: 'This entry token is invalid, expired, or revoked.' }, { status: 404 });
  }

  const session = await createSession(tokenResult.record);

  return Response.json({
    ok: true,
    sessionId: session.id,
    tokenId: session.tokenId,
    messages: session.messages,
    tokenRecord: session.tokenRecord,
  });
}
