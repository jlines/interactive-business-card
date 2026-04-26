'use client';

import { useEffect, useState } from 'react';

import { ChatShell } from '@/components/chat/ChatShell';
import type { OpeningContext } from '@/types/domain';
import { bootstrapEntrySession } from './sessionBootstrap';

type BootstrapState =
  | { status: 'loading' }
  | { status: 'ready'; sessionId: string; openingContext: OpeningContext }
  | { status: 'error'; message: string };

export function PersonalizedWelcome({ token }: { token: string }) {
  const [bootstrap, setBootstrap] = useState<BootstrapState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSession() {
      setBootstrap({ status: 'loading' });

      try {
        const session = await bootstrapEntrySession(token);

        if (!cancelled) {
          setBootstrap({
            status: 'ready',
            sessionId: session.sessionId,
            openingContext: session.openingContext,
          });
        }
      } catch (caught) {
        if (!cancelled) {
          setBootstrap({
            status: 'error',
            message: caught instanceof Error ? caught.message : 'This entry link is unavailable.',
          });
        }
      }
    }

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main style={{ padding: '3rem 1.5rem' }}>
      <div style={{ maxWidth: 840, margin: '0 auto', display: 'grid', gap: 20 }}>
        <header>
          <p style={{ color: 'var(--muted)' }}>Private QR entry</p>
          <h1 style={{ margin: '0.35rem 0' }}>Jason&apos;s interactive business card</h1>
          <p style={{ maxWidth: 680 }}>
            A focused chat about what Jason can build, automate, or clarify for your business.
          </p>
        </header>
        {bootstrap.status === 'loading' ? (
          <section style={{ border: '1px solid var(--panel-border)', borderRadius: 16, background: 'var(--panel)', padding: 20 }}>
            <p style={{ margin: 0 }}>Opening your private chat…</p>
          </section>
        ) : null}
        {bootstrap.status === 'error' ? (
          <section style={{ border: '1px solid var(--panel-border)', borderRadius: 16, background: 'var(--panel)', padding: 20 }}>
            <h2 style={{ marginTop: 0 }}>Link unavailable</h2>
            <p style={{ marginBottom: 0 }}>{bootstrap.message}</p>
          </section>
        ) : null}
        {bootstrap.status === 'ready' ? (
          <ChatShell sessionId={bootstrap.sessionId} openingContext={bootstrap.openingContext} />
        ) : null}
      </div>
    </main>
  );
}
