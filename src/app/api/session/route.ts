import { createSessionRequestSchema } from '@/lib/contracts/session';
import { validateEntryToken } from '@/lib/auth/token';
import { buildOpeningContext } from '@/lib/session/opening';
import { createSession } from '@/lib/session/store';
import type { ApiError, CreateSessionResponse } from '@/types/api';

const failClosedResponse: ApiError = {
  ok: false,
  message: 'This entry link is unavailable.',
};

async function parseJsonSafely(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const payload = await parseJsonSafely(request);

  if (payload === null) {
    return Response.json(failClosedResponse, { status: 401 });
  }

  const parsed = createSessionRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(failClosedResponse, { status: 401 });
  }

  const token = parsed.data.token.trim();

  if (!token) {
    return Response.json(failClosedResponse, { status: 401 });
  }

  const tokenResult = await validateEntryToken(token);

  if (!tokenResult.valid) {
    return Response.json(failClosedResponse, { status: 401 });
  }

  const session = await createSession(tokenResult.record);
  const response: CreateSessionResponse = {
    ok: true,
    sessionId: session.id,
    openingContext: buildOpeningContext(tokenResult.record),
  };

  return Response.json(response);
}
