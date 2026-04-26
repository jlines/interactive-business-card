import { randomUUID } from 'node:crypto';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { buildInitialOpener } from '@/lib/session/opening';
import { createDynamoSessionRepository, createFileSessionRepository, createMemorySessionRepository, type SessionRepository } from '@/lib/session/repository';
import type { ChatSession } from '@/lib/session/types';
import type { ChatMessage, TokenRecord } from '@/types/chat';

let sessionRepository: SessionRepository | null = null;

export async function createSession(tokenRecord: TokenRecord): Promise<ChatSession> {
  const openerMessage: ChatMessage = {
    id: randomUUID(),
    role: 'assistant',
    content: buildInitialOpener(tokenRecord),
  };

  return getSessionRepository().create({
    id: randomUUID(),
    tokenId: tokenRecord.id,
    tokenRecord,
    messages: [openerMessage],
  });
}

export async function getSession(sessionId: string): Promise<ChatSession | null> {
  return getSessionRepository().get(sessionId);
}

export async function appendMessages(sessionId: string, nextMessages: ChatMessage[]): Promise<ChatSession> {
  return getSessionRepository().appendMessages(sessionId, nextMessages);
}

export function resetSessions() {
  sessionRepository = createMemorySessionRepository();
}

export function setSessionRepositoryForTests(repository: SessionRepository | null) {
  sessionRepository = repository;
}

function getSessionRepository(): SessionRepository {
  if (sessionRepository) {
    return sessionRepository;
  }

  const tableName = process.env.SESSION_TABLE_NAME?.trim();

  const ttlHours = Number(process.env.SESSION_TTL_HOURS ?? '168');

  if (!tableName) {
    const localFilePath = process.env.LOCAL_SESSION_FILE?.trim() || 'runtime/interactive-business-card-sessions.json';
    sessionRepository = createFileSessionRepository({ filePath: localFilePath, ttlHours });
    return sessionRepository;
  }

  const client = DynamoDBDocumentClient.from(new DynamoDBClient({
    region: process.env.AWS_REGION ?? process.env.BEDROCK_REGION ?? 'us-east-1',
  }));

  sessionRepository = createDynamoSessionRepository({ client, tableName, ttlHours });
  return sessionRepository;
}

export type { ChatSession } from '@/lib/session/types';
