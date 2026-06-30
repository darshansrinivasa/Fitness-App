# Supabase setup

If the **Table Editor is empty**, migrations have not been applied yet.

## Option A — Supabase CLI (recommended)

From the repo root (project is already linked):

```bash
supabase db push
```

## Option B — SQL Editor (no CLI)

1. Open your project in [Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor**
2. Run `packages/supabase/migrations/001_profiles.sql`
3. Run `packages/supabase/migrations/002_water_logs.sql`

After migrations, you should see `profiles`, `water_logs`, and `water_goals` in Table Editor.

## Existing users

If you signed up **before** running migrations, the auto-profile trigger did not run. Either sign up again with a new email, or in SQL Editor:

```sql
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
```
