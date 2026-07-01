import { EXPORT_VERSION } from './types';
import type { LifestyleExport, LifestyleExportInput } from './types';

export function buildLifestyleExport(input: LifestyleExportInput): LifestyleExport {
  return {
    ...input,
    export_version: EXPORT_VERSION,
  };
}

export function createEmptyExport(
  dateRange: { from: string; to: string },
  user: LifestyleExport['user'],
): LifestyleExport {
  const now = new Date().toISOString();
  return buildLifestyleExport({
    export_version: EXPORT_VERSION,
    exported_at: now,
    date_range: dateRange,
    user,
    goals: [],
    body: { weight_logs: [], measurements: [] },
    fitness: { workout_count: 0, workouts: [] },
    nutrition: { average_calories: 0, average_protein_g: 0, daily_logs: [] },
    water: { average_daily_ml: 0, goal_ml: 3000, daily_logs: [] },
    sleep: { average_duration_hours: 0, average_quality: 0, daily_logs: [] },
    habits: { habits: [] },
    supplements: { active: [] },
    haircare: { oil_applications: 0, wash_sessions: 0, avg_condition_score: null },
    skincare: { routine_adherence_pct: 0, avg_skin_clarity: null, breakouts: 0 },
    health: { vitals: [], symptoms: [] },
    progress_photos: { count: 0, dates: [] },
  });
}
