-- Slice 4: Health, Photos, Haircare, Skincare

create table vitals_logs (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  logged_at timestamptz not null default now(),
  systolic_bp integer,
  diastolic_bp integer,
  heart_rate_bpm integer,
  blood_sugar_mgdl numeric,
  spo2_percent numeric,
  body_temp_celsius numeric,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

create table medical_records (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  record_date date not null,
  record_type text not null,
  title text not null,
  description text,
  doctor_name text,
  clinic_name text,
  attachments text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

create table symptoms_logs (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  logged_date date not null,
  symptom text not null,
  severity integer check (severity between 1 and 5),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

alter table vitals_logs enable row level security;
alter table medical_records enable row level security;
alter table symptoms_logs enable row level security;

create policy "vitals_logs_user" on vitals_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "medical_records_user" on medical_records for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "symptoms_logs_user" on symptoms_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table progress_photos (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  taken_date date not null,
  angle text not null,
  storage_path text not null,
  weight_kg numeric,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

alter table progress_photos enable row level security;
create policy "progress_photos_user" on progress_photos for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table haircare_logs (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  logged_date date not null,
  log_type text not null,
  products_used text[],
  duration_minutes integer,
  scalp_condition integer check (scalp_condition between 1 and 5),
  hair_condition integer check (hair_condition between 1 and 5),
  shedding_level integer check (shedding_level between 1 and 5),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

create table haircare_products (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  type text,
  brand text,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

alter table haircare_logs enable row level security;
alter table haircare_products enable row level security;
create policy "haircare_logs_user" on haircare_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "haircare_products_user" on haircare_products for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table skincare_logs (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  logged_date date not null,
  routine_type text not null,
  products_used text[],
  skin_hydration integer check (skin_hydration between 1 and 5),
  skin_oiliness integer check (skin_oiliness between 1 and 5),
  skin_clarity integer check (skin_clarity between 1 and 5),
  sensitivity integer check (sensitivity between 1 and 5),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

create table breakout_logs (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  logged_date date not null,
  location text,
  severity integer check (severity between 1 and 5),
  suspected_cause text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

create table skincare_products (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  brand text,
  category text,
  key_ingredients text[],
  routine_step text,
  is_active boolean default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

alter table skincare_logs enable row level security;
alter table breakout_logs enable row level security;
alter table skincare_products enable row level security;
create policy "skincare_logs_user" on skincare_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "breakout_logs_user" on breakout_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "skincare_products_user" on skincare_products for all using (user_id = auth.uid()) with check (user_id = auth.uid());
