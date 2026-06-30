import { SyncOrchestrator } from '../orchestrator';
import type {
  LocalSyncStore,
  RemoteSyncClient,
  SyncMetadata,
  SyncQueueItem,
  SyncableRecord,
} from '../../types/sync';

function makeRecord(
  id: string,
  syncVersion: number,
  updatedAt: string,
): SyncableRecord {
  return { id, sync_version: syncVersion, updated_at: updatedAt };
}

describe('SyncOrchestrator', () => {
  it('pushes queued rows and pulls remote deltas', async () => {
    const queue: SyncQueueItem[] = [
      {
        id: 'q1',
        table_name: 'water_logs',
        record_id: 'w1',
        operation: 'insert',
        payload: JSON.stringify(
          makeRecord('w1', 1, '2026-07-01T10:00:00.000Z'),
        ),
        created_at: '2026-07-01T10:00:00.000Z',
        attempts: 0,
      },
    ];
    const metadata = new Map<string, SyncMetadata>();
    const localRows = new Map<string, SyncableRecord>();
    const pushed: Record<string, unknown>[][] = [];

    const local: LocalSyncStore = {
      getSyncMetadata: async (table) => metadata.get(table) ?? null,
      setSyncMetadata: async (table, lastSyncedAt) => {
        metadata.set(table, { table_name: table, last_synced_at: lastSyncedAt });
      },
      dequeueBatch: async (limit) => queue.splice(0, limit),
      markQueueItemDone: async () => undefined,
      markQueueItemFailed: async () => undefined,
      getLocalRecord: async <T extends SyncableRecord>(table: string, id: string) =>
        (localRows.get(`${table}:${id}`) as T | undefined) ?? null,
      upsertLocal: async (table, row) => {
        localRows.set(`${table}:${row.id}`, row);
      },
    };

    const remote: RemoteSyncClient = {
      upsert: async (table, rows) => {
        pushed.push(rows);
      },
      fetchDelta: async <T extends SyncableRecord>() =>
        [makeRecord('w2', 1, '2026-07-01T11:00:00.000Z')] as T[],
    };

    const orchestrator = new SyncOrchestrator(local, remote, ['water_logs']);
    const result = await orchestrator.runFullSync(
      new Date('2026-07-01T12:00:00.000Z'),
    );

    expect(pushed).toHaveLength(1);
    expect(result.pushed).toBe(1);
    expect(result.pulled).toBe(1);
    expect(localRows.get('water_logs:w2')).toBeDefined();
  });
});
