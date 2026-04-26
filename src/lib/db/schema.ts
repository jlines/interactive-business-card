export const tokenRecordSchema = {
  id: 'string',
  tokenHash: 'string',
  label: 'string',
  audienceHint: 'string?',
  customOpener: 'string?',
  notes: 'string?',
  createdAt: 'date',
  expiresAt: 'date?',
  revokedAt: 'date?',
} as const;
