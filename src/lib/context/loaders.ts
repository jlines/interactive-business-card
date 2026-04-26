import { readFile } from 'node:fs/promises';
import path from 'node:path';

const contextRoot = path.join(process.cwd(), 'context');

export type ContextDocumentName = 'contracting-services.md' | 'system-prompt.md' | 'token-personalization.md';

export type BusinessContextDocuments = {
  systemPrompt: string;
  businessContext: string;
  tokenPersonalizationNotes: string;
};

/**
 * Reads a versioned context document from /context.
 *
 * Context files are the human-editable source of truth for assistant grounding.
 * They are loaded server-side during prompt assembly and should not be replaced
 * with model-memory assumptions.
 */
async function readContextFile(fileName: ContextDocumentName) {
  return readFile(path.join(contextRoot, fileName), 'utf8');
}

export function loadBusinessContext() {
  return readContextFile('contracting-services.md');
}

export function loadSystemPrompt() {
  return readContextFile('system-prompt.md');
}

export function loadTokenPersonalizationNotes() {
  return readContextFile('token-personalization.md');
}

export async function loadBusinessContextDocuments(): Promise<BusinessContextDocuments> {
  const [systemPrompt, businessContext, tokenPersonalizationNotes] = await Promise.all([
    loadSystemPrompt(),
    loadBusinessContext(),
    loadTokenPersonalizationNotes(),
  ]);

  return { systemPrompt, businessContext, tokenPersonalizationNotes };
}
