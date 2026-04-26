import type { CreateSessionResponse } from '@/types/api';
import type { OpeningContext } from '@/types/domain';

export type EntrySessionBootstrap = {
  sessionId: string;
  openingContext: OpeningContext;
};

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function bootstrapEntrySession(token: string, fetcher: Fetcher = fetch): Promise<EntrySessionBootstrap> {
  const response = await fetcher('/api/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  const payload = (await response.json().catch(() => null)) as CreateSessionResponse | null;

  if (payload === null) {
    throw new Error('This entry link is unavailable.');
  }

  if (!payload.ok) {
    throw new Error(payload.message);
  }

  if (!response.ok) {
    throw new Error('This entry link is unavailable.');
  }

  return {
    sessionId: payload.sessionId,
    openingContext: payload.openingContext,
  };
}
