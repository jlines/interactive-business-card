import { buildInitialOpener } from '@/lib/session/opening';
import type { TokenRecord } from '@/types/chat';
import { ChatShell } from '@/components/chat/ChatShell';

export function PersonalizedWelcome({ tokenRecord }: { tokenRecord: TokenRecord }) {
  const opener = buildInitialOpener(tokenRecord);

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
        <ChatShell opener={opener} tokenRecord={tokenRecord} />
      </div>
    </main>
  );
}
