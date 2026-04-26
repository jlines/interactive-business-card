import type { ChatMessage, TokenRecord } from '@/types/chat';
import { Composer } from './Composer';
import { MessageList } from './MessageList';

export function ChatShell({ opener, messages = [], tokenRecord }: { opener: string; messages?: ChatMessage[]; tokenRecord: TokenRecord }) {
  return (
    <section style={{ border: '1px solid var(--panel-border)', borderRadius: 16, background: 'var(--panel)', padding: 20 }}>
      <header style={{ marginBottom: 16 }}>
        <p style={{ color: 'var(--muted)', margin: 0 }}>Entry: {tokenRecord.label}</p>
        <h2 style={{ margin: '0.35rem 0' }}>Start here</h2>
        <p style={{ margin: 0 }}>{opener}</p>
      </header>
      <MessageList messages={messages} />
      <Composer />
    </section>
  );
}
