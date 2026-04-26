import { readFile } from 'node:fs/promises';
import path from 'node:path';

const contextRoot = path.join(process.cwd(), 'context');

async function readContextFile(fileName: string) {
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
