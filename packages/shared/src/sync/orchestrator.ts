import { resolveConflict } from './conflict';
import type {
  LocalSyncStore,
  RemoteSyncClient,
  SyncPullResult,
  SyncRunResult,
  SyncableRecord,
} from '../types/sync';

const DEFAULT_BATCH_SIZE = 50;

/**
 * Queue-only push + delta pull orchestrator (v1).
 * Realtime should call runPull only — never write around the queue.
 */
export class SyncOrchestrator {
  constructor(
    private readonly local: LocalSyncStore,
    private readonly remote: RemoteSyncClient,
    private readonly tables: string[],
    private readonly batchSize = DEFAULT_BATCH_SIZE,
  ) {}

  async runFullSync(now: Date = new Date()): Promise<SyncRunResult> {
    const push = await this.runPush();
    const pull = await this.runPull();
    return {
      pushed: push.pushed,
      pulled: pull.pulled,
      failed: push.failed,
      last_synced_at: now.toISOString(),
    };
  }

  async runPush(): Promise<{ pushed: number; failed: number }> {
    let pushed = 0;
    let failed = 0;

    for (;;) {
      const batch = await this.local.dequeueBatch(this.batchSize);
      if (batch.length === 0) break;

      const byTable = new Map<string, Record<string, unknown>[]>();
      for (const item of batch) {
        const rows = byTable.get(item.table_name) ?? [];
        rows.push(JSON.parse(item.payload) as Record<string, unknown>);
        byTable.set(item.table_name, rows);
      }

      for (const [table, rows] of byTable) {
        try {
          await this.remote.upsert(table, rows);
          for (const item of batch.filter((i) => i.table_name === table)) {
            await this.local.markQueueItemDone(item.id);
            pushed += 1;
          }
        } catch {
          for (const item of batch.filter((i) => i.table_name === table)) {
            await this.local.markQueueItemFailed(item.id);
            failed += 1;
          }
        }
      }
    }

    return { pushed, failed };
  }

  async runPull(): Promise<{ pulled: number }> {
    let pulled = 0;

    for (const table of this.tables) {
      const meta = await this.local.getSyncMetadata(table);
      const delta = await this.remote.fetchDelta<SyncableRecord>(
        table,
        meta?.last_synced_at ?? null,
      );
      const result = await this.applyPull(table, delta);
      pulled += result.applied.length;

      if (delta.length > 0) {
        const latest = delta.reduce((a, b) =>
          shouldBeLatest(a, b) ? a : b,
        );
        await this.local.setSyncMetadata(table, latest.updated_at);
      }
    }

    return { pulled };
  }

  async applyPull<T extends SyncableRecord>(
    table: string,
    rows: T[],
  ): Promise<SyncPullResult<T>> {
    const applied: T[] = [];
    const skipped: T[] = [];

    for (const remote of rows) {
      const local = await this.local.getLocalRecord<T>(table, remote.id);
      if (!local) {
        await this.local.upsertLocal(table, remote);
        applied.push(remote);
        continue;
      }

      const merged = resolveConflict(local, remote);
      if (merged === remote) {
        await this.local.upsertLocal(table, remote);
        applied.push(remote);
      } else {
        skipped.push(remote);
      }
    }

    return { applied, skipped };
  }
}

function shouldBeLatest(a: SyncableRecord, b: SyncableRecord): boolean {
  if (a.sync_version !== b.sync_version) {
    return a.sync_version > b.sync_version;
  }
  return new Date(a.updated_at) > new Date(b.updated_at);
}
