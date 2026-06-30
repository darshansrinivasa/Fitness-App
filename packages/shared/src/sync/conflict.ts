import type { SyncableRecord } from '../types/sync';

/**
 * Returns true when the remote row should replace the local row.
 * Primary tie-breaker: sync_version. Secondary: updated_at.
 */
export function shouldApplyRemote(
  local: SyncableRecord,
  remote: SyncableRecord,
): boolean {
  if (remote.sync_version !== local.sync_version) {
    return remote.sync_version > local.sync_version;
  }

  return (
    new Date(remote.updated_at).getTime() >
    new Date(local.updated_at).getTime()
  );
}

/** Merge remote into local when remote wins; otherwise keep local. */
export function resolveConflict<T extends SyncableRecord>(
  local: T,
  remote: T,
): T {
  return shouldApplyRemote(local, remote) ? remote : local;
}

/** Bump sync metadata after a local write. */
export function nextLocalVersion(
  current: Pick<SyncableRecord, 'sync_version' | 'updated_at'>,
  now: Date = new Date(),
): Pick<SyncableRecord, 'sync_version' | 'updated_at'> {
  return {
    sync_version: current.sync_version + 1,
    updated_at: now.toISOString(),
  };
}
