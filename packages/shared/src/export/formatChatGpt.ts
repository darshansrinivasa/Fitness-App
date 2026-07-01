import type { LifestyleExport } from './types';
import { GPT_COACHING_INSTRUCTIONS, GPT_EXPORT_SCHEMA_ID, GPT_FIELD_GUIDE } from './gptSchema';

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
    _schema: GPT_EXPORT_SCHEMA_ID,
    _instructions: GPT_COACHING_INSTRUCTIONS,
    _field_guide: GPT_FIELD_GUIDE,
    _analysis_prompts: [
      'Summarise wins and gaps for this period.',
      'Which 3 habits or routines have the strongest correlation with better sleep or energy proxies?',
      'What single change would improve consistency next week?',
    ],
    ...(cleaned ?? {}),
  };
  return JSON.stringify(payload, null, 2);
}
