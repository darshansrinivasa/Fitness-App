import { WATER_GOALS_TABLE } from '../schemas/waterGoal';
import { WATER_LOGS_TABLE } from '../schemas/waterLog';
import {
  BODY_MEASUREMENTS_TABLE,
  FOODS_TABLE,
  MEAL_LOGS_TABLE,
  NUTRITION_GOALS_TABLE,
  WEIGHT_LOGS_TABLE,
  WORKOUT_EXERCISES_TABLE,
  WORKOUT_SETS_TABLE,
  WORKOUTS_TABLE,
} from '../schemas/slice2';

/** All tables synced in the mobile offline-first app (Slices 0–2). */
export const SYNC_TABLES = [
  WATER_LOGS_TABLE,
  WATER_GOALS_TABLE,
  WORKOUTS_TABLE,
  WORKOUT_EXERCISES_TABLE,
  WORKOUT_SETS_TABLE,
  FOODS_TABLE,
  MEAL_LOGS_TABLE,
  NUTRITION_GOALS_TABLE,
  WEIGHT_LOGS_TABLE,
  BODY_MEASUREMENTS_TABLE,
] as const;

export type SyncTableName = (typeof SYNC_TABLES)[number];

/** @deprecated Use SYNC_TABLES */
export const PILOT_SYNC_TABLES = SYNC_TABLES;
