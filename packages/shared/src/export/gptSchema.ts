/** Stable schema id for Custom GPT knowledge and export payloads. */
export const GPT_EXPORT_SCHEMA_ID = 'lifestyle-os-export-v1' as const;

export const GPT_COACHING_INSTRUCTIONS = `You are a personal lifestyle coach analysing a Lifestyle OS health export.

Rules:
- Use only the data in the export; do not invent metrics.
- Cite specific numbers and date ranges from the payload.
- Flag gaps (missing sleep, sparse habits, no vitals) before giving advice.
- Prefer actionable, prioritised suggestions (max 5 bullets per section).
- Units: weight kg, water ml, sleep hours in summaries / minutes in daily logs, ratings 1-5.
- Do not diagnose medical conditions; suggest seeing a clinician for concerning vitals or symptoms.`;

export const GPT_FIELD_GUIDE: Record<string, string> = {
  export_version: 'Schema version — always 1.0',
  exported_at: 'ISO timestamp when the user generated this export',
  date_range: 'Inclusive from/to dates (YYYY-MM-DD) for all module data',
  user: 'Profile snapshot: name, height_cm, weight_unit',
  goals: 'Active goals with progress_pct (0-100)',
  body: 'weight_logs (kg) and measurements (cm)',
  fitness: 'workout_count and workouts list for the period',
  nutrition: 'average_calories, average_protein_g, daily_logs',
  water: 'average_daily_ml, goal_ml, daily_logs',
  sleep: 'average_duration_hours, average_quality (1-5), daily_logs',
  habits: 'Per-habit completion_rate_pct and current_streak days',
  supplements: 'Active supplements with dose and adherence_pct',
  haircare: 'oil_applications, wash_sessions, avg_condition_score (1-5)',
  skincare: 'routine_adherence_pct, avg_skin_clarity (1-5), breakouts count',
  health: 'vitals (BP, HR) and symptoms with severity 1-5',
  progress_photos: 'Photo count and dates only — no image files',
};
