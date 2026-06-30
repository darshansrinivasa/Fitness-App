export type ISODateTime = string;

/** Row fields required for sync conflict resolution. */
export interface SyncableRecord {
  id: string;
  updated_at: ISODateTime;
  sync_version: number;
  deleted_at?: ISODateTime | null;
}

export type SyncOperation = 'insert' | 'update' | 'delete';

export interface SyncQueueItem {
  id: string;
  table_name: string;
  record_id: string;
  operation: SyncOperation;
  payload: string;
  created_at: ISODateTime;
  attempts: number;
}

export interface SyncMetadata {
  table_name: string;
  last_synced_at: ISODateTime | null;
}

export type SyncPullResult<T extends SyncableRecord> = {
  applied: T[];
  skipped: T[];
};

export interface RemoteSyncClient {
  upsert(table: string, rows: Record<string, unknown>[]): Promise<void>;
  fetchDelta<T extends SyncableRecord>(
    table: string,
    since: ISODateTime | null,
  ): Promise<T[]>;
}

export interface LocalSyncStore {
  getSyncMetadata(table: string): Promise<SyncMetadata | null>;
  setSyncMetadata(table: string, lastSyncedAt: ISODateTime): Promise<void>;
  dequeueBatch(limit: number): Promise<SyncQueueItem[]>;
  markQueueItemDone(id: string): Promise<void>;
  markQueueItemFailed(id: string): Promise<void>;
  getLocalRecord<T extends SyncableRecord>(
    table: string,
    id: string,
  ): Promise<T | null>;
  upsertLocal<T extends SyncableRecord>(table: string, row: T): Promise<void>;
}

export interface SyncRunResult {
  pushed: number;
  pulled: number;
  failed: number;
  last_synced_at: ISODateTime;
}
