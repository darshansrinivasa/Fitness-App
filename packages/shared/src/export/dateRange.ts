import type { DateRange, DateRangePreset, ReportPeriod } from './types';

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function daysInRange(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return Math.max(diff + 1, 1);
}

export function resolveDateRange(
  preset: DateRangePreset,
  customFrom?: string,
  customTo?: string,
): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const to = toDateString(today);

  if (preset === 'custom' && customFrom && customTo) {
    return { from: customFrom, to: customTo, preset };
  }

  const fromDate = new Date(today);
  if (preset === 'today') {
    // from = to
  } else if (preset === 'week') {
    fromDate.setDate(fromDate.getDate() - 6);
  } else if (preset === 'month') {
    fromDate.setDate(fromDate.getDate() - 29);
  } else if (preset === 'quarter') {
    fromDate.setDate(fromDate.getDate() - 89);
  } else {
    fromDate.setDate(fromDate.getDate() - 6);
  }

  return { from: toDateString(fromDate), to, preset };
}

export function periodToPreset(period: ReportPeriod): DateRangePreset {
  if (period === 'daily') return 'today';
  if (period === 'weekly') return 'week';
  return 'month';
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}
