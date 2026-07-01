import type { LifestyleExport } from './types';

export function exportToMarkdown(data: LifestyleExport): string {
  const lines: string[] = [
    '# Lifestyle OS Export',
    '',
    `**Exported:** ${data.exported_at}`,
    `**Period:** ${data.date_range.from} → ${data.date_range.to}`,
    '',
    '## Profile',
    `- Name: ${data.user.name ?? '—'}`,
    `- Height: ${data.user.height_cm ?? '—'} cm`,
    '',
    '## Summary',
    `- Workouts: ${data.fitness.workout_count}`,
    `- Avg water: ${data.water.average_daily_ml} ml/day (goal ${data.water.goal_ml} ml)`,
    `- Avg calories: ${data.nutrition.average_calories} kcal`,
    `- Avg sleep: ${data.sleep.average_duration_hours} h (quality ${data.sleep.average_quality}/5)`,
    '',
  ];

  if (data.goals.length > 0) {
    lines.push('## Goals', '');
    for (const g of data.goals) {
      lines.push(`- **${g.title}** (${g.category}): ${g.progress_pct}%`);
    }
    lines.push('');
  }

  if (data.habits.habits.length > 0) {
    lines.push('## Habits', '');
    for (const h of data.habits.habits) {
      lines.push(
        `- ${h.name}: ${h.completion_rate_pct}% completion, streak ${h.current_streak} days`,
      );
    }
    lines.push('');
  }

  if (data.body.weight_logs.length > 0) {
    lines.push('## Weight', '');
    for (const w of data.body.weight_logs) {
      lines.push(`- ${w.date}: ${w.weight_kg} kg`);
    }
    lines.push('');
  }

  if (data.health.vitals.length > 0) {
    lines.push('## Vitals', '');
    for (const v of data.health.vitals) {
      lines.push(
        `- ${v.date}: BP ${v.systolic ?? '—'}/${v.diastolic ?? '—'}, HR ${v.heart_rate_bpm ?? '—'}`,
      );
    }
    lines.push('');
  }

  lines.push(
    '## Haircare & Skincare',
    `- Oil applications: ${data.haircare.oil_applications}`,
    `- Wash sessions: ${data.haircare.wash_sessions}`,
    `- Skincare routine adherence: ${data.skincare.routine_adherence_pct}%`,
    `- Breakouts logged: ${data.skincare.breakouts}`,
    `- Progress photos: ${data.progress_photos.count}`,
    '',
    `*Export schema v${data.export_version}*`,
  );

  return lines.join('\n');
}
