/** Extract a readable message from Supabase / network errors in React Native. */
export function formatError(err: unknown): string {
  if (err && typeof err === 'object') {
    const record = err as Record<string, unknown>;
    const parts = [record.message, record.details, record.hint, record.code]
      .filter((part) => typeof part === 'string' && part.length > 0)
      .map(String);
    if (parts.length > 0) return parts.join(' — ');
  }
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}
