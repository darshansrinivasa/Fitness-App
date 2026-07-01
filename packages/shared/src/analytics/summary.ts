import { average, daysInRange } from '../export/dateRange';
import type { LifestyleExport, ModuleSummary, PeriodSummary, ReportPeriod } from '../export/types';
import type { DateRange } from '../export/types';

const MODULE_LABELS: Record<string, string> = {
  water: 'Water',
  fitness: 'Fitness',
  nutrition: 'Nutrition',
  body: 'Body',
  sleep: 'Sleep',
  habits: 'Habits',
  supplements: 'Supplements',
  goals: 'Goals',
  health: 'Health',
  haircare: 'Haircare',
  skincare: 'Skincare',
  photos: 'Photos',
};

export function buildPeriodSummary(
  period: ReportPeriod,
  dateRange: DateRange,
  exportData: LifestyleExport,
): PeriodSummary {
  const habitRates = exportData.habits.habits.map((h) => h.completion_rate_pct);
  const habitsAvg =
    habitRates.length > 0
      ? Math.round(habitRates.reduce((a, b) => a + b, 0) / habitRates.length)
      : 0;

  const modules: ModuleSummary[] = [
    {
      module: 'water',
      label: MODULE_LABELS.water,
      headline: `${exportData.water.average_daily_ml} ml`,
      detail: `avg/day · goal ${exportData.water.goal_ml} ml`,
    },
    {
      module: 'fitness',
      label: MODULE_LABELS.fitness,
      headline: String(exportData.fitness.workout_count),
      detail: 'workouts',
    },
    {
      module: 'nutrition',
      label: MODULE_LABELS.nutrition,
      headline: `${exportData.nutrition.average_calories}`,
      detail: `kcal avg · ${exportData.nutrition.average_protein_g}g protein`,
    },
    {
      module: 'sleep',
      label: MODULE_LABELS.sleep,
      headline: `${exportData.sleep.average_duration_hours}h`,
      detail: `quality ${exportData.sleep.average_quality}/5`,
    },
    {
      module: 'habits',
      label: MODULE_LABELS.habits,
      headline: `${habitsAvg}%`,
      detail: 'avg completion',
    },
    {
      module: 'body',
      label: MODULE_LABELS.body,
      headline: String(exportData.body.weight_logs.length),
      detail: 'weight entries',
    },
    {
      module: 'health',
      label: MODULE_LABELS.health,
      headline: String(exportData.health.vitals.length),
      detail: 'vital readings',
    },
    {
      module: 'skincare',
      label: MODULE_LABELS.skincare,
      headline: `${exportData.skincare.routine_adherence_pct}%`,
      detail: `${exportData.skincare.breakouts} breakouts`,
    },
    {
      module: 'photos',
      label: MODULE_LABELS.photos,
      headline: String(exportData.progress_photos.count),
      detail: 'progress photos',
    },
  ];

  return {
    period,
    date_range: dateRange,
    modules,
    totals: {
      workouts: exportData.fitness.workout_count,
      water_avg_ml: exportData.water.average_daily_ml,
      calories_avg: exportData.nutrition.average_calories,
      sleep_avg_hours: exportData.sleep.average_duration_hours,
      habits_completion_pct: habitsAvg,
    },
  };
}

export function completionRate(done: number, days: number): number {
  if (days <= 0) return 0;
  return Math.min(100, Math.round((done / days) * 100));
}

export function avgFromDaily<T>(
  logs: T[],
  pick: (row: T) => number | null | undefined,
): number {
  const values = logs.map(pick).filter((v): v is number => typeof v === 'number');
  return average(values);
}

export { daysInRange, average };
