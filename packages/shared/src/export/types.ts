export const EXPORT_VERSION = '1.0' as const;

export const EXPORT_MODULES = [
  'water',
  'fitness',
  'nutrition',
  'body',
  'sleep',
  'habits',
  'supplements',
  'goals',
  'health',
  'haircare',
  'skincare',
  'photos',
] as const;

export type ExportModule = (typeof EXPORT_MODULES)[number];
export type DateRangePreset = 'today' | 'week' | 'month' | 'quarter' | 'custom';
export type ExportFormat = 'json' | 'markdown' | 'pdf' | 'chatgpt';
export type ReportPeriod = 'daily' | 'weekly' | 'monthly';

export interface DateRange {
  from: string;
  to: string;
  preset: DateRangePreset;
}

export interface ExportUserProfile {
  name: string | null;
  height_cm: number | null;
  weight_unit: string;
}

export interface LifestyleExport {
  export_version: typeof EXPORT_VERSION;
  exported_at: string;
  date_range: { from: string; to: string };
  user: ExportUserProfile;
  goals: Array<{ title: string; category: string; progress_pct: number }>;
  body: {
    weight_logs: Array<{ date: string; weight_kg: number }>;
    measurements: Array<{ date: string; waist_cm: number | null }>;
  };
  fitness: {
    workout_count: number;
    workouts: Array<{ date: string; name: string }>;
  };
  nutrition: {
    average_calories: number;
    average_protein_g: number;
    daily_logs: Array<{ date: string; calories: number; protein_g: number }>;
  };
  water: {
    average_daily_ml: number;
    goal_ml: number;
    daily_logs: Array<{ date: string; total_ml: number }>;
  };
  sleep: {
    average_duration_hours: number;
    average_quality: number;
    daily_logs: Array<{ date: string; duration_minutes: number; quality: number }>;
  };
  habits: {
    habits: Array<{ name: string; completion_rate_pct: number; current_streak: number }>;
  };
  supplements: {
    active: Array<{ name: string; dose: string; adherence_pct: number }>;
  };
  haircare: {
    oil_applications: number;
    wash_sessions: number;
    avg_condition_score: number | null;
  };
  skincare: {
    routine_adherence_pct: number;
    avg_skin_clarity: number | null;
    breakouts: number;
  };
  health: {
    vitals: Array<{
      date: string;
      systolic: number | null;
      diastolic: number | null;
      heart_rate_bpm: number | null;
    }>;
    symptoms: Array<{ date: string; symptom: string; severity: number | null }>;
  };
  progress_photos: {
    count: number;
    dates: string[];
  };
}

export type LifestyleExportInput = LifestyleExport;

export interface ModuleSummary {
  module: ExportModule;
  label: string;
  headline: string;
  detail: string;
}

export interface PeriodSummary {
  period: ReportPeriod;
  date_range: DateRange;
  modules: ModuleSummary[];
  totals: {
    workouts: number;
    water_avg_ml: number;
    calories_avg: number;
    sleep_avg_hours: number;
    habits_completion_pct: number;
  };
}

export interface HabitHeatmapCell {
  date: string;
  completed: boolean;
}

export interface HabitHeatmapRow {
  habit_id: string;
  name: string;
  cells: HabitHeatmapCell[];
}
