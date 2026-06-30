-- 002_water_logs.sql
-- Pilot table for Slice 0 offline sync spike

create table water_logs (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  logged_at timestamptz not null default now(),
  amount_ml integer not null check (amount_ml > 0),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

create index water_logs_user_logged_at_idx
  on water_logs (user_id, logged_at desc)
  where deleted_at is null;

create index water_logs_updated_at_idx
  on water_logs (user_id, updated_at);

alter table water_logs enable row level security;

create policy "water_logs_user_isolation" on water_logs
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table water_goals (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  daily_target_ml integer not null default 3000,
  effective_from date not null default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

alter table water_goals enable row level security;

create policy "water_goals_user_isolation" on water_goals
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());
