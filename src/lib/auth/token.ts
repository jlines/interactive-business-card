import type { TokenRecord, TokenValidationResult } from '@/types/chat';

const demoToken: TokenRecord = {
  id: 'demo-token',
  label: 'demo business card',
  audienceHint: 'general warm lead',
  customOpener: 'Glad you scanned this — tell me a little about what you are trying to build or simplify.',
  status: 'active',
};

export async function validateEntryToken(token: string): Promise<TokenValidationResult> {
  if (token === 'demo-card') {
    return { valid: true, record: demoToken };
  }

  return { valid: false };
}
