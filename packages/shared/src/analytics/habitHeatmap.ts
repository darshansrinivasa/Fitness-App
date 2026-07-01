import type { HabitHeatmapCell, HabitHeatmapRow } from '../export/types';

export function buildHabitHeatmap(
  habits: Array<{ id: string; name: string }>,
  completedDatesByHabit: Map<string, Set<string>>,
  dates: string[],
): HabitHeatmapRow[] {
  return habits.map((habit) => {
    const completed = completedDatesByHabit.get(habit.id) ?? new Set<string>();
    const cells: HabitHeatmapCell[] = dates.map((date) => ({
      date,
      completed: completed.has(date),
    }));
    return { habit_id: habit.id, name: habit.name, cells };
  });
}

export function dateSequence(from: string, to: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
