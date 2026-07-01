import type { SQLiteDatabase } from 'expo-sqlite';
import {
  createGoal,
  createGoalCheckIn,
  enqueueGoal,
  enqueueGoalCheckIn,
  goalProgressPct,
  updateGoal,
  type Goal,
} from '@lifestyle-os/shared/sync';

import { newId } from '../lib/id';
import { insertRow, makeSyncQueue, parseFromSqlite, updateRow } from './helpers';

export interface GoalWithProgress extends Goal {
  progress_pct: number;
}

export async function getActiveGoals(
  db: SQLiteDatabase,
  userId: string,
): Promise<GoalWithProgress[]> {
  const rows = await db.getAllAsync<Goal>(
    `SELECT * FROM goals WHERE user_id = ? AND deleted_at IS NULL AND status = 'active'
     ORDER BY deadline ASC, title ASC`,
    [userId],
  );
  return rows.map((r) => {
    const goal = parseFromSqlite(r);
    return { ...goal, progress_pct: goalProgressPct(goal) };
  });
}

export async function addGoal(
  db: SQLiteDatabase,
  userId: string,
  input: {
    title: string;
    category: string;
    start_value: number;
    target_value: number;
    unit?: string;
  },
): Promise<Goal> {
  const queue = makeSyncQueue(db);
  const row = createGoal({ id: newId(), user_id: userId, ...input });
  await insertRow(db, 'goals', row);
  await enqueueGoal(queue, 'insert', row);
  return row;
}

export async function checkInGoal(
  db: SQLiteDatabase,
  userId: string,
  goal: Goal,
  value: number,
): Promise<Goal> {
  const queue = makeSyncQueue(db);
  const checkIn = createGoalCheckIn({
    id: newId(),
    goal_id: goal.id,
    user_id: userId,
    value,
  });
  await insertRow(db, 'goal_check_ins', checkIn);
  await enqueueGoalCheckIn(queue, 'insert', checkIn);

  const parsed = parseFromSqlite(goal);
  const updated = updateGoal(parsed, { current_value: value });
  const target = updated.target_value ?? value;
  const completed =
    updated.start_value != null && updated.target_value != null
      ? (updated.start_value < updated.target_value
          ? value >= target
          : value <= target)
      : false;

  const finalGoal = completed
    ? updateGoal(updated, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
    : updated;

  await updateRow(db, 'goals', finalGoal);
  await enqueueGoal(queue, 'update', finalGoal);
  return finalGoal;
}

export async function getActiveGoalsCount(
  db: SQLiteDatabase,
  userId: string,
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM goals
     WHERE user_id = ? AND deleted_at IS NULL AND status = 'active'`,
    [userId],
  );
  return row?.count ?? 0;
}
