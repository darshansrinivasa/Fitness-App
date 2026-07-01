-- Slice 3: Sleep, Habits, Supplements, Goals

create table sleep_logs (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  sleep_date date not null,
  bedtime timestamptz,
  wake_time timestamptz,
  duration_minutes integer,
  quality_rating integer check (quality_rating between 1 and 5),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

alter table sleep_logs enable row level security;
create policy "sleep_logs_user_isolation" on sleep_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table habits (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  description text,
  icon text,
  color text,
  frequency text not null default 'daily',
  frequency_days integer[],
  target_count integer default 1,
  category text,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

create table habit_logs (
  id uuid primary key,
  habit_id uuid references habits(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  logged_date date not null,
  count integer default 1,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

create unique index habit_logs_habit_date_active
  on habit_logs (habit_id, logged_date) where deleted_at is null;

alter table habits enable row level security;
alter table habit_logs enable row level security;
create policy "habits_user_isolation" on habits
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "habit_logs_user_isolation" on habit_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table supplements (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  brand text,
  dose_amount numeric not null,
  dose_unit text not null,
  frequency text not null default 'daily',
  times_of_day text[],
  notes text,
  is_active boolean default true,
  stock_quantity integer,
  low_stock_threshold integer default 7,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

create table supplement_logs (
  id uuid primary key,
  supplement_id uuid references supplements(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  taken_at timestamptz not null default now(),
  dose_amount numeric,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

alter table supplements enable row level security;
alter table supplement_logs enable row level security;
create policy "supplements_user_isolation" on supplements
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "supplement_logs_user_isolation" on supplement_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table goals (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  title text not null,
  description text,
  category text not null,
  metric text,
  start_value numeric,
  target_value numeric,
  current_value numeric,
  unit text,
  deadline date,
  status text default 'active',
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

create table goal_check_ins (
  id uuid primary key,
  goal_id uuid references goals(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  checked_in_at timestamptz not null default now(),
  value numeric,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

alter table goals enable row level security;
alter table goal_check_ins enable row level security;
create policy "goals_user_isolation" on goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "goal_check_ins_user_isolation" on goal_check_ins
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
