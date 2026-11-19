-- Fitness templates and personal records

create table workout_templates (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  description text,
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

create table personal_records (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  exercise_name text not null,
  weight_kg numeric,
  reps integer,
  achieved_at timestamptz not null,
  workout_set_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

alter table workout_templates enable row level security;
alter table personal_records enable row level security;

create policy "workout_templates_user_isolation" on workout_templates
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "personal_records_user_isolation" on personal_records
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
