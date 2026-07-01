import type { LifestyleExport } from './types';

export function exportToJson(data: LifestyleExport, pretty = true): string {
  return JSON.stringify(data, null, pretty ? 2 : 0);
}
