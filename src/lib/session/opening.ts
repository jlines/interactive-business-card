import type { OpeningContext } from '@/types/domain';
import type { TokenRecord } from '@/types/chat';

export function buildOpeningContext(tokenRecord: TokenRecord): OpeningContext {
  return {
    label: tokenRecord.label,
    audienceHint: tokenRecord.audienceHint,
    opener:
      tokenRecord.customOpener ||
      `Glad you scanned this. I can help you figure out whether Jason is a fit for ${tokenRecord.audienceHint || 'your project'}.`,
  };
}

export function buildInitialOpener(tokenRecord: TokenRecord) {
  return buildOpeningContext(tokenRecord).opener;
}
