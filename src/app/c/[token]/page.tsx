import { PersonalizedWelcome } from '@/components/entry/PersonalizedWelcome';
import { validateEntryToken } from '@/lib/auth/token';

export default async function TokenEntryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await validateEntryToken(token);

  if (!result.valid) {
    return (
      <main style={{ display: 'grid', placeItems: 'center', padding: '4rem 1.5rem' }}>
        <div style={{ maxWidth: 720 }}>
          <h1>Link unavailable</h1>
          <p>This entry token is invalid, expired, or revoked.</p>
        </div>
      </main>
    );
  }

  return <PersonalizedWelcome tokenRecord={result.record} />;
}
