import { createHash, createHmac, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { ChatMessage } from '@/types/chat';
import type { ChatMessageRow, ChatSessionRow, EntryTokenRow } from '@/lib/db/schema';

export type TokenStoreRecord = EntryTokenRow;

export type CreateTokenInput = {
  rawToken: string;
  id?: string;
  label: string;
  audienceHint?: string;
  customOpener?: string;
  notes?: string;
  status?: EntryTokenRow['status'];
  expiresAt?: string;
};

export interface TokenStore {
  /** Looks up a token by its raw QR value. Implementations hash with TOKEN_PEPPER before comparing. */
  getByRawToken(rawToken: string): Promise<TokenStoreRecord | null>;
  /** Looks up a token by safe server-owned id for session authorization. */
  getById(id: string): Promise<TokenStoreRecord | null>;
  /** Creates a token record from a raw token, persisting only the hashed value. */
  create(input: CreateTokenInput): Promise<TokenStoreRecord>;
  /** Revokes a token by raw QR value, persisting only status/hash metadata. */
  revokeByRawToken(rawToken: string): Promise<TokenStoreRecord | null>;
}

export type SessionStoreRecord = ChatSessionRow;

export type CreateSessionRecordInput = {
  tokenId: string;
};

export interface SessionPersistenceStore {
  createSession(input: CreateSessionRecordInput): Promise<SessionStoreRecord>;
  getSession(id: string): Promise<SessionStoreRecord | null>;
  updateSessionLastSeen(id: string, lastSeenAt: string): Promise<void>;
  appendMessages(sessionId: string, messages: ChatMessage[]): Promise<void>;
  readMessages(sessionId: string): Promise<ChatMessage[]>;
}

type PersistenceAdapter = 'dynamodb' | 'file' | 'memory';

type LocalDatabase = {
  tokens: EntryTokenRow[];
  sessions: ChatSessionRow[];
  messages: ChatMessageRow[];
};

const emptyDatabase = (): LocalDatabase => ({ tokens: [], sessions: [], messages: [] });

let memoryDatabase = emptyDatabase();

export function resetMemoryPersistenceForTests() {
  memoryDatabase = emptyDatabase();
}

function getPersistenceAdapter(): PersistenceAdapter {
  const configured = process.env.PERSISTENCE_ADAPTER;

  if (configured === 'dynamodb' || configured === 'file' || configured === 'memory') {
    return configured;
  }

  if (process.env.DYNAMODB_TABLE_NAME) {
    return 'dynamodb';
  }

  return process.env.NODE_ENV === 'production' ? 'dynamodb' : 'file';
}

function requireTokenPepper() {
  const pepper = process.env.TOKEN_PEPPER;

  if (!pepper) {
    throw new Error('TOKEN_PEPPER is required before token persistence can be used.');
  }

  return pepper;
}

export function hashEntryToken(rawToken: string) {
  return createHmac('sha256', requireTokenPepper()).update(rawToken).digest('base64url');
}

function nowIso() {
  return new Date().toISOString();
}

function localDataFilePath() {
  return resolve(process.env.LOCAL_DATA_FILE || '.data/interactive-business-card-store.json');
}

async function readLocalDatabase(): Promise<LocalDatabase> {
  if (getPersistenceAdapter() === 'memory') {
    return memoryDatabase;
  }

  try {
    const raw = await readFile(localDataFilePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<LocalDatabase>;

    return {
      tokens: Array.isArray(parsed.tokens) ? parsed.tokens : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return emptyDatabase();
    }

    throw error;
  }
}

async function writeLocalDatabase(database: LocalDatabase): Promise<void> {
  if (getPersistenceAdapter() === 'memory') {
    memoryDatabase = database;
    return;
  }

  const filePath = localDataFilePath();
  await mkdir(dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(database, null, 2)}\n`, 'utf8');
  await rename(tempPath, filePath);
}

class LocalTokenStore implements TokenStore {
  async getByRawToken(rawToken: string): Promise<TokenStoreRecord | null> {
    const tokenHash = hashEntryToken(rawToken);
    const database = await readLocalDatabase();
    return database.tokens.find((token) => token.tokenHash === tokenHash) ?? null;
  }

  async getById(id: string): Promise<TokenStoreRecord | null> {
    const database = await readLocalDatabase();
    return database.tokens.find((token) => token.id === id) ?? null;
  }

  async create(input: CreateTokenInput): Promise<TokenStoreRecord> {
    const database = await readLocalDatabase();
    const tokenHash = hashEntryToken(input.rawToken);
    const existingIndex = database.tokens.findIndex((token) => token.tokenHash === tokenHash);
    const existingByIdIndex = input.id ? database.tokens.findIndex((token) => token.id === input.id) : -1;
    const record: EntryTokenRow = {
      id: input.id || randomUUID(),
      tokenHash,
      label: input.label,
      audienceHint: input.audienceHint,
      customOpener: input.customOpener,
      notes: input.notes,
      status: input.status || 'active',
      createdAt: existingIndex >= 0 ? database.tokens[existingIndex].createdAt : nowIso(),
      expiresAt: input.expiresAt,
    };

    if (existingIndex >= 0) {
      database.tokens[existingIndex] = { ...database.tokens[existingIndex], ...record };
    } else if (existingByIdIndex >= 0) {
      database.tokens[existingByIdIndex] = { ...database.tokens[existingByIdIndex], ...record };
    } else {
      database.tokens.push(record);
    }

    await writeLocalDatabase(database);
    return record;
  }

  async revokeByRawToken(rawToken: string): Promise<TokenStoreRecord | null> {
    const tokenHash = hashEntryToken(rawToken);
    const database = await readLocalDatabase();
    const index = database.tokens.findIndex((token) => token.tokenHash === tokenHash);

    if (index < 0) {
      return null;
    }

    const revoked: EntryTokenRow = {
      ...database.tokens[index],
      status: 'revoked',
      revokedAt: nowIso(),
    };
    database.tokens[index] = revoked;
    await writeLocalDatabase(database);
    return revoked;
  }
}

class LocalSessionPersistenceStore implements SessionPersistenceStore {
  async createSession(input: CreateSessionRecordInput): Promise<SessionStoreRecord> {
    const database = await readLocalDatabase();
    const timestamp = nowIso();
    const session: ChatSessionRow = {
      id: randomUUID(),
      tokenId: input.tokenId,
      status: 'active',
      createdAt: timestamp,
      lastSeenAt: timestamp,
    };

    database.sessions.push(session);
    await writeLocalDatabase(database);
    return session;
  }

  async getSession(id: string): Promise<SessionStoreRecord | null> {
    const database = await readLocalDatabase();
    return database.sessions.find((session) => session.id === id) ?? null;
  }

  async updateSessionLastSeen(id: string, lastSeenAt: string): Promise<void> {
    const database = await readLocalDatabase();
    const index = database.sessions.findIndex((session) => session.id === id);

    if (index >= 0) {
      database.sessions[index] = { ...database.sessions[index], lastSeenAt };
      await writeLocalDatabase(database);
    }
  }

  async appendMessages(sessionId: string, messages: ChatMessage[]): Promise<void> {
    const database = await readLocalDatabase();
    const timestamp = nowIso();
    const rows = messages.map((message, index): ChatMessageRow => ({
      id: message.id || randomUUID(),
      sessionId,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt || new Date(Date.parse(timestamp) + index).toISOString(),
    }));

    database.messages.push(...rows);
    await writeLocalDatabase(database);
  }

  async readMessages(sessionId: string): Promise<ChatMessage[]> {
    const database = await readLocalDatabase();
    return database.messages
      .filter((message) => message.sessionId === sessionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      }));
  }
}

type AttributeValue = { S?: string; N?: string };
type DynamoItem = Record<string, AttributeValue>;

type DynamoResponse<T> = T & {
  Item?: DynamoItem;
  Items?: DynamoItem[];
  Attributes?: DynamoItem;
};

function requireDynamoTableName() {
  const tableName = process.env.DYNAMODB_TABLE_NAME;

  if (!tableName) {
    throw new Error('DYNAMODB_TABLE_NAME is required when PERSISTENCE_ADAPTER=dynamodb.');
  }

  return tableName;
}

function requireAwsRegion() {
  const region = process.env.DYNAMODB_REGION || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;

  if (!region) {
    throw new Error('AWS_REGION or DYNAMODB_REGION is required when PERSISTENCE_ADAPTER=dynamodb.');
  }

  return region;
}

function requireAwsCredentials() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials are required for DynamoDB persistence.');
  }

  return {
    accessKeyId,
    secretAccessKey,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  };
}

function sha256Hex(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function hmac(key: Buffer | string, value: string) {
  return createHmac('sha256', key).update(value).digest();
}

function hmacHex(key: Buffer | string, value: string) {
  return createHmac('sha256', key).update(value).digest('hex');
}

class DynamoJsonClient {
  private readonly tableName = requireDynamoTableName();
  private readonly region = requireAwsRegion();
  private readonly credentials = requireAwsCredentials();

  async send<T>(target: string, body: Record<string, unknown>): Promise<DynamoResponse<T>> {
    const host = `dynamodb.${this.region}.amazonaws.com`;
    const endpoint = `https://${host}/`;
    const payload = JSON.stringify({ TableName: this.tableName, ...body });
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const contentHash = sha256Hex(payload);
    const headers: Record<string, string> = {
      'content-type': 'application/x-amz-json-1.0',
      host,
      'x-amz-date': amzDate,
      'x-amz-target': `DynamoDB_20120810.${target}`,
    };

    if (this.credentials.sessionToken) {
      headers['x-amz-security-token'] = this.credentials.sessionToken;
    }

    const signedHeaderNames = Object.keys(headers).sort();
    const canonicalHeaders = signedHeaderNames.map((name) => `${name}:${headers[name]}\n`).join('');
    const signedHeaders = signedHeaderNames.join(';');
    const canonicalRequest = ['POST', '/', '', canonicalHeaders, signedHeaders, contentHash].join('\n');
    const credentialScope = `${dateStamp}/${this.region}/dynamodb/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join('\n');
    const signingKey = hmac(
      hmac(hmac(hmac(`AWS4${this.credentials.secretAccessKey}`, dateStamp), this.region), 'dynamodb'),
      'aws4_request',
    );
    const signature = hmacHex(signingKey, stringToSign);
    headers.authorization = `AWS4-HMAC-SHA256 Credential=${this.credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: payload,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DynamoDB ${target} failed with status ${response.status}: ${text}`);
    }

    return (await response.json()) as DynamoResponse<T>;
  }
}

function itemString(item: DynamoItem | undefined, key: string): string | undefined {
  return item?.[key]?.S;
}

function stripUndefined(value: Record<string, AttributeValue | undefined>): DynamoItem {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as DynamoItem;
}

function tokenItem(record: EntryTokenRow): DynamoItem {
  return stripUndefined({
    PK: { S: `TOKEN#${record.tokenHash}` },
    SK: { S: 'TOKEN' },
    entityType: { S: 'ENTRY_TOKEN' },
    id: { S: record.id },
    tokenHash: { S: record.tokenHash },
    label: { S: record.label },
    audienceHint: record.audienceHint ? { S: record.audienceHint } : undefined,
    customOpener: record.customOpener ? { S: record.customOpener } : undefined,
    notes: record.notes ? { S: record.notes } : undefined,
    status: { S: record.status },
    createdAt: { S: record.createdAt },
    expiresAt: record.expiresAt ? { S: record.expiresAt } : undefined,
    revokedAt: record.revokedAt ? { S: record.revokedAt } : undefined,
  });
}

function tokenFromItem(item: DynamoItem | undefined): EntryTokenRow | null {
  if (!item) {
    return null;
  }

  const id = itemString(item, 'id');
  const tokenHash = itemString(item, 'tokenHash');
  const label = itemString(item, 'label');
  const status = itemString(item, 'status') as EntryTokenRow['status'] | undefined;
  const createdAt = itemString(item, 'createdAt');

  if (!id || !tokenHash || !label || !status || !createdAt) {
    return null;
  }

  return {
    id,
    tokenHash,
    label,
    audienceHint: itemString(item, 'audienceHint'),
    customOpener: itemString(item, 'customOpener'),
    notes: itemString(item, 'notes'),
    status,
    createdAt,
    expiresAt: itemString(item, 'expiresAt'),
    revokedAt: itemString(item, 'revokedAt'),
  };
}

function sessionItem(record: ChatSessionRow): DynamoItem {
  return stripUndefined({
    PK: { S: `SESSION#${record.id}` },
    SK: { S: 'SESSION' },
    entityType: { S: 'CHAT_SESSION' },
    id: { S: record.id },
    tokenId: { S: record.tokenId },
    status: { S: record.status },
    createdAt: { S: record.createdAt },
    lastSeenAt: record.lastSeenAt ? { S: record.lastSeenAt } : undefined,
  });
}

function sessionFromItem(item: DynamoItem | undefined): ChatSessionRow | null {
  if (!item) {
    return null;
  }

  const id = itemString(item, 'id');
  const tokenId = itemString(item, 'tokenId');
  const status = itemString(item, 'status') as ChatSessionRow['status'] | undefined;
  const createdAt = itemString(item, 'createdAt');

  if (!id || !tokenId || !status || !createdAt) {
    return null;
  }

  return {
    id,
    tokenId,
    status,
    createdAt,
    lastSeenAt: itemString(item, 'lastSeenAt'),
  };
}

function messageItem(sessionId: string, message: ChatMessage, index: number): DynamoItem {
  const createdAt = message.createdAt || new Date(Date.now() + index).toISOString();
  const id = message.id || randomUUID();

  return {
    PK: { S: `SESSION#${sessionId}` },
    SK: { S: `MESSAGE#${createdAt}#${id}` },
    entityType: { S: 'CHAT_MESSAGE' },
    id: { S: id },
    sessionId: { S: sessionId },
    role: { S: message.role },
    content: { S: message.content },
    createdAt: { S: createdAt },
  };
}

function messageFromItem(item: DynamoItem): ChatMessage | null {
  const id = itemString(item, 'id');
  const role = itemString(item, 'role') as ChatMessage['role'] | undefined;
  const content = itemString(item, 'content');
  const createdAt = itemString(item, 'createdAt');

  if (!id || !role || !content || !createdAt) {
    return null;
  }

  return { id, role, content, createdAt };
}

class DynamoTokenStore implements TokenStore {
  private readonly client = new DynamoJsonClient();

  async getByRawToken(rawToken: string): Promise<TokenStoreRecord | null> {
    const tokenHash = hashEntryToken(rawToken);
    const response = await this.client.send('GetItem', {
      Key: {
        PK: { S: `TOKEN#${tokenHash}` },
        SK: { S: 'TOKEN' },
      },
    });

    return tokenFromItem(response.Item);
  }

  async getById(id: string): Promise<TokenStoreRecord | null> {
    const response = await this.client.send('Scan', {
      FilterExpression: '#entityType = :entityType AND #id = :id',
      ExpressionAttributeNames: {
        '#entityType': 'entityType',
        '#id': 'id',
      },
      ExpressionAttributeValues: {
        ':entityType': { S: 'ENTRY_TOKEN' },
        ':id': { S: id },
      },
      Limit: 1,
    });

    return tokenFromItem(response.Items?.[0]);
  }

  async create(input: CreateTokenInput): Promise<TokenStoreRecord> {
    const tokenHash = hashEntryToken(input.rawToken);
    const existing = await this.getByRawToken(input.rawToken);
    const record: EntryTokenRow = {
      id: input.id || existing?.id || randomUUID(),
      tokenHash,
      label: input.label,
      audienceHint: input.audienceHint,
      customOpener: input.customOpener,
      notes: input.notes,
      status: input.status || 'active',
      createdAt: existing?.createdAt || nowIso(),
      expiresAt: input.expiresAt,
    };

    await this.client.send('PutItem', {
      Item: tokenItem(record),
    });

    return record;
  }

  async revokeByRawToken(rawToken: string): Promise<TokenStoreRecord | null> {
    const existing = await this.getByRawToken(rawToken);

    if (!existing) {
      return null;
    }

    const response = await this.client.send('UpdateItem', {
      Key: {
        PK: { S: `TOKEN#${existing.tokenHash}` },
        SK: { S: 'TOKEN' },
      },
      UpdateExpression: 'SET #status = :status, revokedAt = :revokedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': { S: 'revoked' },
        ':revokedAt': { S: nowIso() },
      },
      ReturnValues: 'ALL_NEW',
    });

    return tokenFromItem(response.Attributes);
  }
}

class DynamoSessionPersistenceStore implements SessionPersistenceStore {
  private readonly client = new DynamoJsonClient();

  async createSession(input: CreateSessionRecordInput): Promise<SessionStoreRecord> {
    const timestamp = nowIso();
    const session: ChatSessionRow = {
      id: randomUUID(),
      tokenId: input.tokenId,
      status: 'active',
      createdAt: timestamp,
      lastSeenAt: timestamp,
    };

    await this.client.send('PutItem', {
      Item: sessionItem(session),
    });

    return session;
  }

  async getSession(id: string): Promise<SessionStoreRecord | null> {
    const response = await this.client.send('GetItem', {
      Key: {
        PK: { S: `SESSION#${id}` },
        SK: { S: 'SESSION' },
      },
    });

    return sessionFromItem(response.Item);
  }

  async updateSessionLastSeen(id: string, lastSeenAt: string): Promise<void> {
    await this.client.send('UpdateItem', {
      Key: {
        PK: { S: `SESSION#${id}` },
        SK: { S: 'SESSION' },
      },
      UpdateExpression: 'SET lastSeenAt = :lastSeenAt',
      ExpressionAttributeValues: {
        ':lastSeenAt': { S: lastSeenAt },
      },
    });
  }

  async appendMessages(sessionId: string, messages: ChatMessage[]): Promise<void> {
    await Promise.all(
      messages.map((message, index) =>
        this.client.send('PutItem', {
          Item: messageItem(sessionId, message, index),
        }),
      ),
    );
  }

  async readMessages(sessionId: string): Promise<ChatMessage[]> {
    const response = await this.client.send('Query', {
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :messagePrefix)',
      ExpressionAttributeValues: {
        ':pk': { S: `SESSION#${sessionId}` },
        ':messagePrefix': { S: 'MESSAGE#' },
      },
      ScanIndexForward: true,
    });

    return (response.Items || [])
      .map(messageFromItem)
      .filter((message): message is ChatMessage => message !== null);
  }
}

/**
 * Token persistence factory.
 *
 * Production should run with DynamoDB (PERSISTENCE_ADAPTER=dynamodb and
 * DYNAMODB_TABLE_NAME). The file adapter keeps local low-traffic operations and
 * scripts usable without reintroducing a SQLite dependency.
 */
export function createTokenStore(): TokenStore {
  return getPersistenceAdapter() === 'dynamodb' ? new DynamoTokenStore() : new LocalTokenStore();
}

export function createSessionPersistenceStore(): SessionPersistenceStore {
  return getPersistenceAdapter() === 'dynamodb'
    ? new DynamoSessionPersistenceStore()
    : new LocalSessionPersistenceStore();
}
