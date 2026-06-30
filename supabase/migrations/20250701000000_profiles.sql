-- 001_profiles.sql
-- User profile (id comes from auth.users on sign-up)

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  date_of_birth date,
  gender text,
  height_cm numeric,
  height_unit text default 'cm',
  weight_unit text default 'kg',
  water_unit text default 'ml',
  timezone text default 'UTC',
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  sync_version integer not null default 1
);

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());

create policy "profiles_insert_own" on profiles
  for insert with check (id = auth.uid());

create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
