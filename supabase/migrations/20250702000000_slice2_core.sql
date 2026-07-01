-- Slice 2: Fitness, Nutrition, Body

-- Fitness
create table workouts (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  template_id uuid,
  started_at timestamptz not null,
  ended_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

create table workout_exercises (
  id uuid primary key,
  workout_id uuid references workouts(id) on delete cascade not null,
  exercise_name text not null,
  exercise_category text,
  order_index integer not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

create table workout_sets (
  id uuid primary key,
  workout_exercise_id uuid references workout_exercises(id) on delete cascade not null,
  set_number integer not null,
  reps integer,
  weight_kg numeric,
  duration_seconds integer,
  distance_km numeric,
  notes text,
  is_pr boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

alter table workouts enable row level security;
alter table workout_exercises enable row level security;
alter table workout_sets enable row level security;

create policy "workouts_user_isolation" on workouts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "workout_exercises_user_isolation" on workout_exercises
  for all using (
    workout_id in (select id from workouts where user_id = auth.uid())
  ) with check (
    workout_id in (select id from workouts where user_id = auth.uid())
  );

create policy "workout_sets_user_isolation" on workout_sets
  for all using (
    workout_exercise_id in (
      select we.id from workout_exercises we
      join workouts w on w.id = we.workout_id
      where w.user_id = auth.uid()
    )
  ) with check (
    workout_exercise_id in (
      select we.id from workout_exercises we
      join workouts w on w.id = we.workout_id
      where w.user_id = auth.uid()
    )
  );

-- Nutrition
create table foods (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  brand text,
  serving_size_g numeric not null default 100,
  calories_per_serving numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  fiber_g numeric,
  sugar_g numeric,
  sodium_mg numeric,
  barcode text,
  is_favourite boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

create table meal_logs (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  logged_date date not null,
  meal_type text not null,
  food_id uuid references foods(id),
  food_name text not null,
  quantity_g numeric not null,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

create table nutrition_goals (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  calories integer,
  protein_g integer,
  carbs_g integer,
  fat_g integer,
  effective_from date not null default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

alter table foods enable row level security;
alter table meal_logs enable row level security;
alter table nutrition_goals enable row level security;

create policy "foods_user_isolation" on foods
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "meal_logs_user_isolation" on meal_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "nutrition_goals_user_isolation" on nutrition_goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Body
create table weight_logs (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  logged_date date not null,
  weight_kg numeric not null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

create table body_measurements (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  logged_date date not null,
  chest_cm numeric,
  waist_cm numeric,
  hips_cm numeric,
  left_arm_cm numeric,
  right_arm_cm numeric,
  left_thigh_cm numeric,
  right_thigh_cm numeric,
  left_calf_cm numeric,
  right_calf_cm numeric,
  neck_cm numeric,
  shoulders_cm numeric,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

alter table weight_logs enable row level security;
alter table body_measurements enable row level security;

create policy "weight_logs_user_isolation" on weight_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "body_measurements_user_isolation" on body_measurements
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
