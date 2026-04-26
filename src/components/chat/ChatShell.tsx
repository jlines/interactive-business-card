import type { ChatMessage, PersonalizedOpeningContext, TokenRecord } from '@/types/chat';
import { Composer } from './Composer';
import { MessageList } from './MessageList';

type ChatShellProps = {
  openingContext: PersonalizedOpeningContext;
  messages?: ChatMessage[];
  tokenRecord: TokenRecord;
};

export function ChatShell({ openingContext, messages = [], tokenRecord }: ChatShellProps) {
  return (
    <section style={{ border: '1px solid var(--panel-border)', borderRadius: 16, background: 'var(--panel)', padding: 20 }}>
      <header style={{ marginBottom: 16 }}>
        <p style={{ color: 'var(--muted)', margin: 0 }}>Entry: {openingContext.label}</p>
        <h2 style={{ margin: '0.35rem 0' }}>Start here</h2>
        <p style={{ margin: 0 }}>{openingContext.opener}</p>
        <p style={{ color: 'var(--muted)', marginTop: 12 }}>
          Session will be bound to token record <code>{tokenRecord.id}</code>; this is not a public chat endpoint.
        </p>
      </header>
      <MessageList messages={messages} />
      <Composer />
    </section>
  );
}
