import type { SyncOperation } from '../types/sync';
import {
  personalRecordSchema,
  workoutExerciseSchema,
  workoutSchema,
  workoutSetSchema,
  workoutTemplateSchema,
  PERSONAL_RECORDS_TABLE,
  WORKOUT_EXERCISES_TABLE,
  WORKOUT_SETS_TABLE,
  WORKOUT_TEMPLATES_TABLE,
  WORKOUTS_TABLE,
  type PersonalRecord,
  type TemplateExercise,
  type Workout,
  type WorkoutExercise,
  type WorkoutSet,
  type WorkoutTemplate,
} from '../schemas/slice2';

export interface EnqueueChange {
  enqueue(
    table: string,
    recordId: string,
    operation: SyncOperation,
    payload: string,
    createdAt: string,
  ): Promise<void>;
}

function baseFields(now: Date) {
  const ts = now.toISOString();
  return {
    created_at: ts,
    updated_at: ts,
    deleted_at: null,
    sync_version: 1,
  };
}

export function createWorkout(
  input: {
    id: string;
    user_id: string;
    name: string;
    started_at?: string;
    notes?: string | null;
    template_id?: string | null;
  },
  now: Date = new Date(),
): Workout {
  return workoutSchema.parse({
    ...input,
    started_at: input.started_at ?? now.toISOString(),
    ended_at: now.toISOString(),
    template_id: input.template_id ?? null,
    notes: input.notes ?? null,
    ...baseFields(now),
  });
}

export function createWorkoutExercise(
  input: {
    id: string;
    workout_id: string;
    exercise_name: string;
    order_index?: number;
    exercise_category?: string | null;
  },
  now: Date = new Date(),
): WorkoutExercise {
  return workoutExerciseSchema.parse({
    ...input,
    order_index: input.order_index ?? 0,
    exercise_category: input.exercise_category ?? 'strength',
    ...baseFields(now),
  });
}

export function createWorkoutSet(
  input: {
    id: string;
    workout_exercise_id: string;
    set_number: number;
    reps?: number | null;
    weight_kg?: number | null;
    is_pr?: boolean;
  },
  now: Date = new Date(),
): WorkoutSet {
  return workoutSetSchema.parse({
    ...input,
    duration_seconds: null,
    distance_km: null,
    notes: null,
    is_pr: input.is_pr ?? false,
    ...baseFields(now),
  });
}

export async function enqueueWorkout(
  queue: EnqueueChange,
  operation: SyncOperation,
  row: Workout,
  now: Date = new Date(),
): Promise<void> {
  await queue.enqueue(WORKOUTS_TABLE, row.id, operation, JSON.stringify(row), now.toISOString());
}

export async function enqueueWorkoutExercise(
  queue: EnqueueChange,
  operation: SyncOperation,
  row: WorkoutExercise,
  now: Date = new Date(),
): Promise<void> {
  await queue.enqueue(
    WORKOUT_EXERCISES_TABLE,
    row.id,
    operation,
    JSON.stringify(row),
    now.toISOString(),
  );
}

export async function enqueueWorkoutSet(
  queue: EnqueueChange,
  operation: SyncOperation,
  row: WorkoutSet,
  now: Date = new Date(),
): Promise<void> {
  await queue.enqueue(
    WORKOUT_SETS_TABLE,
    row.id,
    operation,
    JSON.stringify(row),
    now.toISOString(),
  );
}

export function createWorkoutTemplate(
  input: {
    id: string;
    user_id: string;
    name: string;
    exercises: TemplateExercise[];
    description?: string | null;
  },
  now: Date = new Date(),
): WorkoutTemplate {
  return workoutTemplateSchema.parse({
    ...input,
    description: input.description ?? null,
    ...baseFields(now),
  });
}

export function createPersonalRecord(
  input: {
    id: string;
    user_id: string;
    exercise_name: string;
    weight_kg?: number | null;
    reps?: number | null;
    achieved_at?: string;
    workout_set_id?: string | null;
  },
  now: Date = new Date(),
): PersonalRecord {
  return personalRecordSchema.parse({
    ...input,
    weight_kg: input.weight_kg ?? null,
    reps: input.reps ?? null,
    achieved_at: input.achieved_at ?? now.toISOString(),
    workout_set_id: input.workout_set_id ?? null,
    ...baseFields(now),
  });
}

export function updatePersonalRecord(
  existing: PersonalRecord,
  patch: Partial<Pick<PersonalRecord, 'weight_kg' | 'reps' | 'achieved_at' | 'workout_set_id'>>,
  now: Date = new Date(),
): PersonalRecord {
  return personalRecordSchema.parse({
    ...existing,
    ...patch,
    updated_at: now.toISOString(),
    sync_version: existing.sync_version + 1,
  });
}

export async function enqueueWorkoutTemplate(
  queue: EnqueueChange,
  operation: SyncOperation,
  row: WorkoutTemplate,
  now: Date = new Date(),
): Promise<void> {
  await queue.enqueue(
    WORKOUT_TEMPLATES_TABLE,
    row.id,
    operation,
    JSON.stringify(row),
    now.toISOString(),
  );
}

export async function enqueuePersonalRecord(
  queue: EnqueueChange,
  operation: SyncOperation,
  row: PersonalRecord,
  now: Date = new Date(),
): Promise<void> {
  await queue.enqueue(
    PERSONAL_RECORDS_TABLE,
    row.id,
    operation,
    JSON.stringify(row),
    now.toISOString(),
  );
}

export {
  WORKOUTS_TABLE,
  WORKOUT_EXERCISES_TABLE,
  WORKOUT_SETS_TABLE,
  WORKOUT_TEMPLATES_TABLE,
  PERSONAL_RECORDS_TABLE,
};
