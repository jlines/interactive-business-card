import type { PersonalizedOpeningContext, TokenRecord } from '@/types/chat';

/**
 * Builds the first visible assistant context from validated token metadata.
 *
 * This function deliberately accepts a TokenRecord, not a raw token. Invalid or
 * unknown tokens must never reach this layer.
 */
export function buildOpeningContext(tokenRecord: TokenRecord): PersonalizedOpeningContext {
  const opener =
    tokenRecord.customOpener ||
    `Glad you scanned this. I can help you figure out whether Jason is a fit for ${
      tokenRecord.audienceHint || 'your project'
    }.`;

  return {
    tokenId: tokenRecord.id,
    label: tokenRecord.label,
    audienceHint: tokenRecord.audienceHint,
    opener,
    notes: tokenRecord.notes,
  };
}

export function buildInitialOpener(tokenRecord: TokenRecord) {
  return buildOpeningContext(tokenRecord).opener;
}
