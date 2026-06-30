import { resolveConflict, shouldApplyRemote, nextLocalVersion } from '../conflict';

describe('shouldApplyRemote', () => {
  const base = {
    id: 'a',
    updated_at: '2026-01-01T00:00:00.000Z',
    sync_version: 1,
  };

  it('prefers higher sync_version', () => {
    const local = { ...base, sync_version: 2, updated_at: '2026-01-02T00:00:00.000Z' };
    const remote = { ...base, sync_version: 3, updated_at: '2026-01-01T00:00:00.000Z' };
    expect(shouldApplyRemote(local, remote)).toBe(true);
  });

  it('tie-breaks on updated_at when sync_version matches', () => {
    const local = { ...base, sync_version: 2, updated_at: '2026-01-01T00:00:00.000Z' };
    const remote = { ...base, sync_version: 2, updated_at: '2026-01-02T00:00:00.000Z' };
    expect(shouldApplyRemote(local, remote)).toBe(true);
  });

  it('keeps local when remote is older', () => {
    const local = { ...base, sync_version: 5, updated_at: '2026-06-01T00:00:00.000Z' };
    const remote = { ...base, sync_version: 3, updated_at: '2026-06-02T00:00:00.000Z' };
    expect(shouldApplyRemote(local, remote)).toBe(false);
  });
});

describe('resolveConflict', () => {
  it('returns remote when remote wins', () => {
    const local = { id: '1', sync_version: 1, updated_at: '2026-01-01T00:00:00.000Z' };
    const remote = { id: '1', sync_version: 2, updated_at: '2026-01-01T00:00:00.000Z' };
    expect(resolveConflict(local, remote)).toEqual(remote);
  });
});

describe('nextLocalVersion', () => {
  it('increments sync_version and sets updated_at', () => {
    const now = new Date('2026-07-01T12:00:00.000Z');
    const next = nextLocalVersion({ sync_version: 4, updated_at: '2026-01-01T00:00:00.000Z' }, now);
    expect(next.sync_version).toBe(5);
    expect(next.updated_at).toBe(now.toISOString());
  });
});
