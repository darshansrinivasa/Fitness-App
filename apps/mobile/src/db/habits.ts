import type { SQLiteDatabase } from 'expo-sqlite';
import {
  createHabit,
  createHabitLog,
  enqueueHabit,
  enqueueHabitLog,
  todayDateString,
  updateHabitLog,
  type Habit,
  type HabitLog,
} from '@lifestyle-os/shared/sync';

import { newId } from '../lib/id';
import { insertRow, makeSyncQueue, parseFromSqlite, updateRow } from './helpers';

export interface HabitWithStatus extends Habit {
  completed_today: boolean;
  log_id: string | null;
  streak: number;
}

export async function getActiveHabits(
  db: SQLiteDatabase,
  userId: string,
): Promise<Habit[]> {
  const rows = await db.getAllAsync<Habit>(
    `SELECT * FROM habits WHERE user_id = ? AND deleted_at IS NULL AND is_active = 1
     ORDER BY sort_order ASC, name ASC`,
    [userId],
  );
  return rows.map(parseFromSqlite);
}

export async function addHabit(
  db: SQLiteDatabase,
  userId: string,
  name: string,
  category = 'wellness',
): Promise<Habit> {
  const queue = makeSyncQueue(db);
  const row = createHabit({ id: newId(), user_id: userId, name, category });
  await insertRow(db, 'habits', row);
  await enqueueHabit(queue, 'insert', row);
  return row;
}

async function getHabitLogForToday(
  db: SQLiteDatabase,
  habitId: string,
  userId: string,
): Promise<HabitLog | null> {
  const today = todayDateString();
  const row = await db.getFirstAsync<HabitLog>(
    `SELECT * FROM habit_logs WHERE habit_id = ? AND user_id = ? AND logged_date = ?
     AND deleted_at IS NULL`,
    [habitId, userId, today],
  );
  return row ? parseFromSqlite(row) : null;
}

export async function computeStreak(
  db: SQLiteDatabase,
  habitId: string,
  userId: string,
): Promise<number> {
  const rows = await db.getAllAsync<{ logged_date: string }>(
    `SELECT logged_date FROM habit_logs
     WHERE habit_id = ? AND user_id = ? AND deleted_at IS NULL
     ORDER BY logged_date DESC LIMIT 60`,
    [habitId, userId],
  );
  if (rows.length === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const dates = new Set(rows.map((r) => r.logged_date));

  for (let i = 0; i < 60; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (!dates.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function getHabitsWithStatus(
  db: SQLiteDatabase,
  userId: string,
): Promise<HabitWithStatus[]> {
  const habits = await getActiveHabits(db, userId);
  const result: HabitWithStatus[] = [];
  for (const habit of habits) {
    const log = await getHabitLogForToday(db, habit.id, userId);
    const streak = await computeStreak(db, habit.id, userId);
    result.push({
      ...habit,
      completed_today: !!log,
      log_id: log?.id ?? null,
      streak,
    });
  }
  return result;
}

export async function toggleHabitToday(
  db: SQLiteDatabase,
  userId: string,
  habitId: string,
): Promise<boolean> {
  const queue = makeSyncQueue(db);
  const existing = await getHabitLogForToday(db, habitId, userId);

  if (existing) {
    const row = updateHabitLog(existing);
    await updateRow(db, 'habit_logs', row);
    await enqueueHabitLog(queue, 'update', row);
    return false;
  }

  const row = createHabitLog({ id: newId(), habit_id: habitId, user_id: userId });
  await insertRow(db, 'habit_logs', row);
  await enqueueHabitLog(queue, 'insert', row);
  return true;
}

export async function getTodayHabitsCompletedCount(
  db: SQLiteDatabase,
  userId: string,
): Promise<{ done: number; total: number }> {
  const habits = await getActiveHabits(db, userId);
  if (habits.length === 0) return { done: 0, total: 0 };
  const today = todayDateString();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM habit_logs
     WHERE user_id = ? AND logged_date = ? AND deleted_at IS NULL
       AND habit_id IN (${habits.map(() => '?').join(',')})`,
    [userId, today, ...habits.map((h) => h.id)],
  );
  return { done: row?.count ?? 0, total: habits.length };
}
