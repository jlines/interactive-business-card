import type { TokenRecord } from '@/types/chat';

export function buildInitialOpener(tokenRecord: TokenRecord) {
  return (
    tokenRecord.customOpener ||
    `Glad you scanned this. I can help you figure out whether Jason is a fit for ${tokenRecord.audienceHint || 'your project'}.`
  );
}
