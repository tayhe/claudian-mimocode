import { mkdtempSync, rmSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import type { Conversation } from '../../../../src/core/types';
import { MimocodeConversationHistoryService } from '../../../../src/providers/mimocode/history/MimocodeConversationHistoryService';

describe('MimocodeConversationHistoryService', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(path.join(os.tmpdir(), 'claudian-mimocode-conversation-history-'));
  });

  afterEach(() => {
    rmSync(tmpRoot, { force: true, recursive: true });
  });

  it('retries after a session-level hydration diagnostic', async () => {
    const dbPath = path.join(tmpRoot, 'mimocode.db');
    const sessionId = 'session-retry';
    const conversation = createConversation(sessionId, dbPath);
    const service = new MimocodeConversationHistoryService();

    const db = new DatabaseSync(dbPath);
    try {
      db.exec(`
        create table message (
          id text primary key,
          session_id text not null,
          time_created integer not null,
          data text not null
        );
      `);
      db.prepare('insert into message (id, session_id, time_created, data) values (?, ?, ?, ?)').run(
        'msg-user',
        sessionId,
        1_000,
        JSON.stringify({
          role: 'user',
          time: { created: 1_000 },
        }),
      );
    } finally {
      db.close();
    }

    await service.hydrateConversationHistory(conversation, null);

    expect(conversation.messages).toHaveLength(1);
    expect(conversation.messages[0]).toMatchObject({
      id: 'mimocode-hydration-error-session-session-retry',
      role: 'assistant',
    });

    const repairedDb = new DatabaseSync(dbPath);
    try {
      repairedDb.exec(`
        create table part (
          id text primary key,
          session_id text not null,
          message_id text not null,
          data text not null
        );
      `);
      repairedDb.prepare('insert into part (id, session_id, message_id, data) values (?, ?, ?, ?)').run(
        'part-user',
        sessionId,
        'msg-user',
        JSON.stringify({ text: 'Recovered prompt', type: 'text' }),
      );
    } finally {
      repairedDb.close();
    }

    await service.hydrateConversationHistory(conversation, null);

    expect(conversation.messages).toEqual([
      {
        assistantMessageId: undefined,
        content: 'Recovered prompt',
        id: 'msg-user',
        role: 'user',
        timestamp: 1_000,
        userMessageId: 'msg-user',
      },
    ]);
  });
});

function createConversation(sessionId: string, databasePath: string): Conversation {
  return {
    createdAt: 1,
    id: 'conv-mimocode',
    messages: [],
    providerId: 'mimocode',
    providerState: { databasePath },
    sessionId,
    title: 'OpenCode conversation',
    updatedAt: 1,
  };
}
