import type { LifestyleExport } from './types';

function stripEmpty(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value)) {
    const items = value.map(stripEmpty).filter((v) => v !== undefined);
    return items.length > 0 ? items : undefined;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = stripEmpty(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
  return value;
}

/** Compressed JSON with schema hints for Custom GPT context window. */
export function exportToChatGpt(data: LifestyleExport): string {
  const cleaned = stripEmpty(data) as Record<string, unknown> | undefined;
  const payload = {
    _schema: 'lifestyle-os-export-v1',
    _instructions:
      'Analyse this lifestyle dataset. Units: weight kg, water ml, sleep hours, ratings 1-5.',
    ...(cleaned ?? {}),
  };
  return JSON.stringify(payload);
}
