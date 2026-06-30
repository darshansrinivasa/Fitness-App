# Lifestyle OS — Master Plan

> A complete personal health and lifestyle management system. Cross-platform, offline-first, cloud-synced, and AI-export-ready.

---

## Table of Contents

1. [Vision](#1-vision)
2. [Platform Strategy](#2-platform-strategy)
3. [Tech Stack](#3-tech-stack)
4. [Architecture](#4-architecture)
5. [Authentication](#5-authentication)
6. [Database Schema](#6-database-schema)
7. [Modules & Features](#7-modules--features)
8. [Navigation Structure](#8-navigation-structure)
9. [Offline Support](#9-offline-support)
10. [Notifications](#10-notifications)
11. [Reports & Analytics](#11-reports--analytics)
12. [Export System](#12-export-system)
13. [AI Strategy — Custom GPT](#13-ai-strategy--custom-gpt)
14. [Storage](#14-storage)
15. [Security](#15-security)
16. [Development Roadmap](#16-development-roadmap)
17. [Folder Structure](#17-folder-structure)
18. [Environment Variables](#18-environment-variables)
19. [Key Design Principles](#19-key-design-principles)

---

## 1. Vision

The Lifestyle OS is a personal, all-in-one health and lifestyle management app — the equivalent of a Finance Tracker app but for everything related to the body, habits, and daily routines.

**Core goals:**

- Log every health and lifestyle activity in one place
- Work across Android, Web, and Desktop with full sync
- Work completely offline with automatic cloud backup
- Generate structured exports that can be analysed by a Custom GPT
- Replace the need for 8–10 separate apps (MyFitnessPal, WaterMinder, Sleep Cycle, habit trackers, etc.)

**Non-goals (initially):**

- No real-time AI integration inside the app
- No social features or sharing with other users
- No wearable device integration (future consideration)

---

## 2. Platform Strategy

| Platform | Framework | Status |
|---|---|---|
| Android | React Native + Expo | Primary — Slice 0–2 |
| Web | React (Vite) | Online-only v1 — Slice 6 |
| iOS | React Native + Expo | Future |
| Desktop | Electron | Future — Slice 6 |

**Shared across all platforms:**

- Same Supabase backend
- Same authentication
- Same data schema
- Shared business logic (TypeScript utilities)
- Shared types and validation schemas (Zod)

### Web offline strategy

**Decision: online-only web v1 (Slice 0–5), SQLite WASM in Slice 6.**

| Phase | Web behaviour |
|---|---|
| Slice 0–5 | Reads/writes go directly to Supabase; no local DB; requires network |
| Slice 6 | Add SQLite WASM + shared query layer for offline parity with mobile |

Rationale: mobile is the primary offline-first client. Shipping web as a dashboard that talks to Supabase avoids duplicating the sync engine twice before the mobile loop is proven. IndexedDB was rejected to prevent a second data-access layer diverging from mobile SQL.

**Platform-specific:**

- Navigation: React Navigation (mobile) vs React Router (web)
- Local storage: SQLite via expo-sqlite (mobile) vs Supabase direct reads (web v1, online-only; SQLite WASM deferred to Slice 6)
- Notifications: Expo Notifications (mobile) vs Web Push API (web)
- Camera: Expo ImagePicker (mobile) vs File input (web)

---

## 3. Tech Stack

### Mobile (Android primary)

| Layer | Technology |
|---|---|
| Framework | React Native 0.74+ |
| Build tool | Expo SDK 51+ |
| Language | TypeScript |
| Navigation | React Navigation v6 |
| Local DB | expo-sqlite |
| State management | Zustand |
| Server state | TanStack Query (React Query) v5 |
| Forms | React Hook Form + Zod |
| UI components | Custom design system (no third-party UI lib) |
| Charts | Victory Native |
| Animations | React Native Reanimated |
| Camera | expo-image-picker |
| Notifications | expo-notifications |
| Secure storage | expo-secure-store |

### Web

| Layer | Technology |
|---|---|
| Framework | React 18 |
| Build tool | Vite |
| Language | TypeScript |
| Routing | React Router v6 |
| Local DB | None in v1 (online-only, reads/writes via Supabase); SQLite WASM in Slice 6 for offline parity |
| State management | Zustand |
| Server state | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |

### Backend

| Layer | Technology |
|---|---|
| Platform | Supabase (hosted) |
| Database | PostgreSQL 15 |
| Auth | Supabase Auth (email + OAuth) |
| Storage | Supabase Storage |
| Realtime | Supabase Realtime (Postgres Changes) |
| Security | Row Level Security (RLS) |
| Functions | Supabase Edge Functions (Deno) — for scheduled jobs |

### Shared

| Tool | Purpose |
|---|---|
| TypeScript | Type safety everywhere |
| Zod | Runtime schema validation and type inference |
| date-fns | Date manipulation |
| ESLint + Prettier | Code quality |
| Jest | Unit testing |
| Supabase CLI | DB migrations and local dev |

---

## 4. Architecture

### High-level diagram

```
┌──────────────────────────────────────────────┐
│               Frontend clients                │
│  ┌───────────────┐    ┌──────────────────┐   │
│  │  Android app  │    │    Web app       │   │
│  │ RN + Expo     │    │  React + Vite    │   │
│  └───────┬───────┘    └────────┬─────────┘   │
└──────────┼──────────────────────┼─────────────┘
           │                      │
           ▼                      ▼
┌─────────────────────────────────────────────┐
│            Offline / sync layer              │
│   SQLite (local)  ←──auto-sync──→  Supabase │
└─────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│              Supabase backend                 │
│  ┌──────┐ ┌──────────┐ ┌─────────┐ ┌──────┐ │
│  │ Auth │ │PostgreSQL│ │ Storage │ │Realtime│ │
│  │  RLS │ │  + RLS   │ │ Photos  │ │ sync  │ │
│  └──────┘ └──────────┘ └─────────┘ └──────┘ │
└──────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│                Export layer                   │
│   JSON · Markdown · PDF · Custom GPT export   │
└──────────────────────────────────────────────┘
```

### Data flow

1. User logs data → writes to local SQLite immediately (instant UI feedback)
2. Background sync service pushes changes to Supabase when online
3. Supabase Realtime pushes changes from other devices back to the local DB
4. All reads come from local SQLite → fast and offline-capable

### Sync conflict resolution

Strategy: **Last write wins based on `sync_version`, then `updated_at`**

- Every syncable table has `updated_at` (timestamptz) and `sync_version` (integer, incremented on every local write)
- On sync, compare `(sync_version, updated_at)` — higher `sync_version` wins; tie-break on `updated_at`
- Soft deletes (`deleted_at`) to avoid delete/update conflicts
- Upserts are idempotent — keyed by client-generated `id`, never re-insert

**Known v1 limitations (personal use):**

- Two devices editing the same row offline → one edit is silently lost
- Clock skew between devices can cause wrong winner if `sync_version` is equal

### Sync orchestration (v1)

Queue-only push is the source of truth for local changes. Realtime is a **hint** to trigger a delta pull — not a second write path.

1. Local write → enqueue in `sync_queue` → increment row `sync_version`
2. On foreground / reconnect → drain queue (push upserts to Supabase)
3. Realtime event (or periodic poll) → delta pull rows where `updated_at > last_synced_at`
4. Apply pulled rows through conflict resolver before writing to SQLite

---

## 5. Authentication

- Provider: Supabase Auth
- Methods: Email + password (primary), Google OAuth (optional future)
- Session storage: expo-secure-store (mobile), localStorage (web)
- All data is scoped to `auth.uid()` via RLS — no user can access another user's data
- JWT refresh handled automatically by Supabase client

### User profile table

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  date_of_birth date,
  gender text,
  height_cm numeric,
  height_unit text default 'cm',          -- 'cm' or 'ft'
  weight_unit text default 'kg',          -- 'kg' or 'lbs'
  water_unit text default 'ml',           -- 'ml' or 'oz'
  timezone text default 'UTC',
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  sync_version integer not null default 1
);
```

---

## 6. Database Schema

All tables follow these conventions:

- `id` — UUID primary key (**client-generated** with `crypto.randomUUID()` for offline support; no server `default`)
- `user_id` — references `auth.users(id)`, enforced by RLS (except `profiles`, where `id` is the auth user id)
- `created_at`, `updated_at` — timestamptz for sync
- `sync_version` — integer, incremented on every local write; primary conflict tie-breaker
- `deleted_at` — soft delete support (nullable timestamptz)
- RLS policy: `user_id = auth.uid()`

**Child tables** (e.g. `workout_sets`, `habit_logs`) follow the same sync columns so every row can sync independently.

**Exception:** `profiles.id` is set from `auth.uid()` on sign-up, not random UUID.

---

### 6.1 Fitness

```sql
-- Reusable workout templates (defined before workouts for FK order)
create table workout_templates (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  description text,
  exercises jsonb,                          -- ordered list of exercise names + default sets
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

-- Workout sessions
create table workouts (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,                        -- e.g. "Push Day"
  template_id uuid references workout_templates(id),
  started_at timestamptz not null,
  ended_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

-- Individual exercises within a workout
create table workout_exercises (
  id uuid primary key,
  workout_id uuid references workouts(id) on delete cascade not null,
  exercise_name text not null,
  exercise_category text,                   -- 'strength', 'cardio', 'flexibility'
  order_index integer not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

-- Sets within an exercise
create table workout_sets (
  id uuid primary key,
  workout_exercise_id uuid references workout_exercises(id) on delete cascade not null,
  set_number integer not null,
  reps integer,
  weight_kg numeric,
  duration_seconds integer,                 -- for cardio / timed sets
  distance_km numeric,                      -- for cardio
  notes text,
  is_pr boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

-- Personal records per exercise
create table personal_records (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  exercise_name text not null,
  weight_kg numeric,
  reps integer,
  achieved_at timestamptz not null,
  workout_set_id uuid references workout_sets(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);
```

---

### 6.2 Nutrition

```sql
-- Food database (custom user foods)
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

-- Daily meal logs
create table meal_logs (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  logged_date date not null,
  meal_type text not null,                  -- 'breakfast', 'lunch', 'dinner', 'snack'
  food_id uuid references foods(id),
  food_name text not null,                  -- denormalised for history
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

-- Daily nutrition goals
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
```

---

### 6.3 Water Intake

```sql
create table water_logs (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  logged_at timestamptz not null default now(),
  amount_ml integer not null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);

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
```

---

### 6.4 Sleep

```sql
create table sleep_logs (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  sleep_date date not null,                 -- the date the night belongs to
  bedtime timestamptz,
  wake_time timestamptz,
  duration_minutes integer,                 -- calculated: wake_time - bedtime
  quality_rating integer check (quality_rating between 1 and 5),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);
```

---

### 6.5 Habits

```sql
create table habits (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  description text,
  icon text,                               -- Tabler icon name
  color text,                              -- hex color
  frequency text not null default 'daily', -- 'daily', 'weekly', 'custom'
  frequency_days integer[],               -- for weekly: [1,3,5] = Mon/Wed/Fri
  target_count integer default 1,         -- times per frequency period
  category text,                          -- 'health', 'fitness', 'wellness', etc.
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

-- One active log per habit per day (soft-deleted rows excluded)
create unique index habit_logs_habit_date_active
  on habit_logs (habit_id, logged_date)
  where deleted_at is null;
```

---

### 6.6 Body Measurements

```sql
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
```

---

### 6.7 Progress Photos

```sql
create table progress_photos (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  taken_date date not null,
  angle text not null,                     -- 'front', 'side', 'back', 'custom'
  storage_path text not null,              -- Supabase Storage path; signed URL derived at read time
  weight_kg numeric,                       -- optional snapshot of weight on that day
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);
```

---

### 6.8 Haircare

```sql
create table haircare_logs (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  logged_date date not null,
  log_type text not null,                  -- 'oil', 'wash', 'treatment', 'trim', 'note'
  products_used text[],
  duration_minutes integer,               -- e.g. oil left in for 60 mins
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
  type text,                               -- 'oil', 'shampoo', 'conditioner', 'mask'
  brand text,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);
```

---

### 6.9 Skincare

```sql
create table skincare_logs (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  logged_date date not null,
  routine_type text not null,              -- 'morning', 'night'
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
  location text,                           -- 'forehead', 'chin', 'cheeks', etc.
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
  category text,                           -- 'cleanser', 'toner', 'serum', 'moisturiser', 'spf'
  key_ingredients text[],
  routine_step text,                       -- 'step 1', 'step 2', etc.
  is_active boolean default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version integer not null default 1
);
```

---

### 6.10 Supplements

```sql
create table supplements (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  brand text,
  dose_amount numeric not null,
  dose_unit text not null,                 -- 'mg', 'g', 'ml', 'capsule', 'tablet'
  frequency text not null default 'daily',
  times_of_day text[],                     -- ['morning', 'evening']
  notes text,
  is_active boolean default true,
  stock_quantity integer,                  -- current units remaining
  low_stock_threshold integer default 7,  -- alert when below this
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
```

---

### 6.11 Goals

```sql
create table goals (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  title text not null,
  description text,
  category text not null,                 -- 'fitness', 'body', 'nutrition', 'habit', 'health', 'other'
  metric text,                            -- what is being tracked, e.g. 'weight_kg', 'workout_count'
  start_value numeric,
  target_value numeric,
  current_value numeric,
  unit text,
  deadline date,
  status text default 'active',           -- 'active', 'completed', 'paused', 'abandoned'
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
```

---

### 6.12 Health Records

```sql
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
  record_type text not null,               -- 'visit', 'diagnosis', 'prescription', 'lab_result', 'vaccination'
  title text not null,
  description text,
  doctor_name text,
  clinic_name text,
  attachments text[],                      -- Supabase Storage paths
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
```

---

## 7. Modules & Features

### 7.1 Fitness

| Feature | Description |
|---|---|
| Log workout | Add exercises, sets, reps, weight, cardio duration/distance |
| Workout templates | Save and reuse routines (Push/Pull/Legs, Full Body, etc.) |
| Rest timer | Built-in countdown timer between sets |
| Personal records | Auto-detect PRs per exercise; celebrate milestones |
| Strength progress charts | 1RM or max weight trend per exercise over time |
| Workout history | Calendar heatmap of training days |
| Volume tracker | Total volume (sets × reps × weight) per session and per week |
| Muscle group log | Tag exercises with muscle groups for split analysis |

### 7.2 Nutrition

| Feature | Description |
|---|---|
| Log meals | Search food database, log by meal type |
| Barcode scanner | Scan packaged food to auto-fill nutrition data |
| Macro tracker | Daily totals: calories, protein, carbs, fat, fibre |
| Calorie goal | Set target based on TDEE; see remaining calories live |
| Custom foods | Create foods/recipes with custom macro data |
| Meal favourites | Star frequently used meals for one-tap re-logging |
| Weekly averages | Average macros across the week; best and worst days |
| Calorie surplus/deficit | Daily and weekly energy balance trend |

### 7.3 Water Intake

| Feature | Description |
|---|---|
| Quick log | Tap to add preset amounts (200 ml, 350 ml, 500 ml) or custom |
| Daily goal | Set personal hydration target |
| Daily progress | Visual ring or progress bar towards daily goal |
| Day timeline | Intake spread across the day as a bar chart |
| Reminders | Scheduled nudges throughout the day |
| 30-day history | Daily totals and streak counter |

### 7.4 Sleep

| Feature | Description |
|---|---|
| Log sleep | Record bedtime and wake time; auto-calculate duration |
| Quality rating | 1–5 star rating for how rested you felt |
| Sleep trend | Average duration per week over time |
| Bedtime reminder | Notification at chosen wind-down time |
| Sleep notes | Log influencing factors (stress, caffeine, late meals) |
| Weekly average | Average sleep hours and quality score for the week |

### 7.5 Habits

| Feature | Description |
|---|---|
| Create habit | Name, icon, colour, frequency, category, target count |
| Daily checklist | One-tap completion for all habits |
| Streak tracking | Current streak, longest streak, total completions |
| Habit calendar | GitHub-style contribution grid showing consistency |
| Completion rate | Weekly and monthly % per habit |
| Habit categories | Group habits by category (health, fitness, wellness, etc.) |
| Pause habit | Temporarily deactivate a habit without deleting history |

### 7.6 Body Measurements

| Feature | Description |
|---|---|
| Weight log | Log weight with date; trend line; supports kg and lbs |
| Measurements | Chest, waist, hips, arms, thighs, calves, neck, shoulders |
| Progress charts | Trend chart per measurement with date range filter |
| BMI calculator | Auto-calculated from height (profile) + latest weight |
| Body fat estimate | Navy method or YMCA formula from measurements |
| Measurement history | Full table of all logged entries |

### 7.7 Progress Photos

| Feature | Description |
|---|---|
| Capture / upload | Take or upload photo tagged with date, weight, angle |
| Angles | Front, side (L/R), back, custom |
| Timeline | Swipe through photos chronologically |
| Side-by-side compare | Pick any two dates; split-view comparison |
| Weight snapshot | Snapshot of logged weight on photo date |
| Private & secure | Stored in Supabase Storage; accessible only to the user |

### 7.8 Haircare

| Feature | Description |
|---|---|
| Oil log | Log oil type, amount, duration left in |
| Wash log | Record shampoo, conditioner, treatments used |
| Hair condition log | Scalp health, shedding level, moisture, texture (1–5 scale) |
| Product library | Manage your haircare products |
| Routine reminders | Oil reminder every N days; wash day reminder |
| Hair health timeline | Condition scores over months |
| Trim log | Record trim/cut dates and length cut |

### 7.9 Skincare

| Feature | Description |
|---|---|
| Morning & night routine | Log each product used AM and PM |
| Skin condition log | Hydration, oiliness, clarity, sensitivity (1–5 scale) |
| Breakout tracker | Log location, severity, suspected cause |
| Product library | Manage products with ingredients and routine order |
| Skin trend chart | Condition scores over time |
| Product effectiveness | Correlate product introductions with skin score changes |

### 7.10 Supplements

| Feature | Description |
|---|---|
| Add supplement | Name, dose, unit, frequency, time of day |
| Daily checklist | Tick off each supplement as taken |
| Dose reminders | Timed notification per supplement |
| Intake history | Log of when each supplement was taken |
| Stock tracker | Track quantity remaining; low-stock alert |
| Supplement notes | Notes on effects, side effects, brands |

### 7.11 Goals

| Feature | Description |
|---|---|
| Create goal | Title, category, metric, start value, target, deadline |
| Progress bar | Visual progress from start to target |
| Check-ins | Log progress updates at any point |
| Goal completion | Mark done; archive for motivation history |
| Goals dashboard | All active goals with progress %; sort by deadline |
| Goal categories | Body, fitness, nutrition, habit, health, other |

### 7.12 Health Records

| Feature | Description |
|---|---|
| Vitals log | Blood pressure, heart rate, blood sugar, SpO2, temperature |
| Vitals trend | See how BP or heart rate changes over months |
| Medical notes | Doctor visits, diagnoses, prescriptions |
| Symptoms log | Log symptoms with severity and date |
| Lab results | Store and reference lab report values over time |
| Vaccinations | Log vaccination dates and names |

---

## 8. Navigation Structure

### Mobile (Bottom Tab Navigation)

```
Bottom Tab Bar
├── Home          (dashboard / quick log)
├── Modules       (grid of all 12 modules)
├── Analytics     (reports and charts)
└── Export        (export data)
    └── Profile   (accessible from top-right avatar)
```

### Module drill-down (Stack Navigation)

```
Modules
├── Fitness
│   ├── Today's workout
│   ├── Log workout (modal)
│   ├── Workout history
│   ├── Templates
│   └── Personal records
├── Nutrition
│   ├── Today's meals
│   ├── Log meal (modal)
│   ├── Food search
│   └── Weekly report
├── Water
│   ├── Today's intake
│   └── History
├── Sleep
│   ├── Log sleep (modal)
│   └── Sleep history
├── Habits
│   ├── Today's checklist
│   ├── Manage habits
│   └── Streaks
├── Body Measurements
│   ├── Weight log
│   ├── Measurements
│   └── Charts
├── Progress Photos
│   ├── Gallery
│   └── Compare
├── Haircare
│   ├── Log entry
│   └── History
├── Skincare
│   ├── Today's routine
│   ├── Log skin condition
│   └── Product library
├── Supplements
│   ├── Today's checklist
│   ├── Manage supplements
│   └── History
├── Goals
│   ├── Active goals
│   ├── Create goal
│   └── Completed
└── Health Records
    ├── Vitals
    ├── Medical notes
    └── Symptoms
```

---

## 9. Offline Support

### Architecture

```
User action
    │
    ▼
Local SQLite write (immediate — zero latency)
    │
    ▼
UI updates from local state
    │
    ▼  (background, when online)
Sync service
    │
    ├── Push: drain sync_queue → Supabase upsert (idempotent by client id)
    └── Pull: delta fetch where updated_at > last_synced_at → conflict resolve → SQLite
```

### Sync service design

- Runs on app foreground resume and on network reconnect
- Uses a `sync_queue` local table to track pending local changes
- Each record has `synced_at` (local metadata) to know what has been pushed
- **Push:** queue-only — drain `sync_queue` and upsert to Supabase by client `id`
- **Pull:** Realtime events trigger a delta pull (`updated_at > last_synced_at`); Realtime is a hint, not a second write path
- Conflict resolution: higher `sync_version` wins; tie-break on `updated_at`
- Local SQLite schema versioning via `PRAGMA user_version` + migration runner
- Sync status UX: pending queue count, last synced timestamp, manual retry

### Sync queue table (local SQLite only)

```sql
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL,    -- 'insert', 'update', 'delete'
  payload TEXT NOT NULL,      -- JSON
  created_at TEXT NOT NULL,
  attempts INTEGER DEFAULT 0
);
```

---

## 10. Notifications

All notifications are scheduled locally via Expo Notifications. No server-side push required for reminders.

| Notification | Trigger | Default time |
|---|---|---|
| Log weight | Daily | 8:00 AM |
| Drink water | Every 2 hours | 9 AM – 9 PM |
| Workout reminder | User-configured days | 6:00 PM |
| Bedtime reminder | Daily | 10:00 PM |
| Hair oil reminder | Every N days (user-set) | 7:00 PM |
| Skincare reminder | Daily (AM + PM) | 7:30 AM / 9:30 PM |
| Supplement reminder | Per supplement, per time of day | User-set |
| Low supplement stock | When stock < threshold | On app open |
| Habit streak at risk | If not completed by evening | 8:00 PM |
| Daily summary | Daily | 9:00 PM |

All notification schedules are configurable per-notification in Settings.

---

## 11. Reports & Analytics

Reports are generated entirely from the local database using SQL queries and application logic — no AI required.

### Available reports

| Report | Contents |
|---|---|
| Daily summary | All modules logged today at a glance |
| Weekly summary | Averages and totals for the week across all modules |
| Monthly summary | Trends, streaks, PRs, goal progress for the month |
| Workout report | Volume, frequency, exercises, PRs set |
| Nutrition report | Macro averages, calorie balance, most logged foods |
| Sleep report | Average duration, average quality, consistency score |
| Habit report | Completion rates, streaks, most/least consistent habits |
| Body report | Weight change, measurement changes, BMI change |
| Skincare report | Skin condition trends, product introductions |
| Haircare report | Wash/oil schedule adherence, condition trend |
| Health report | Vitals trend, symptoms frequency |

### Key analytics

- **Streaks**: calculated per habit, per workout frequency, per water goal achievement
- **Averages**: rolling 7-day and 30-day averages for weight, sleep, macros, water
- **Trends**: slope of change over a selected period using linear regression (simple JS implementation)
- **Heatmaps**: calendar grid showing activity presence per day
- **Correlations**: sleep quality vs workout day, skin condition vs skincare consistency (no AI needed — computed via Pearson correlation in JS)

---

## 12. Export System

The export system generates structured, consistent reports that can be uploaded to the Custom GPT for AI analysis.

### Export formats

| Format | Use case |
|---|---|
| JSON | Machine-readable; primary format for Custom GPT |
| Markdown | Human-readable; can be read in any notes app |
| PDF | Printable; shareable with a doctor or trainer |
| "Export for ChatGPT" | Compressed, annotated JSON optimised for GPT context window |

### JSON export schema

```json
{
  "export_version": "1.0",
  "exported_at": "2026-06-25T10:00:00Z",
  "date_range": { "from": "2026-06-01", "to": "2026-06-25" },
  "user": {
    "name": "...",
    "dob": "...",
    "height_cm": 175,
    "weight_unit": "kg"
  },
  "goals": [ { "title": "...", "category": "...", "progress_pct": 68 } ],
  "body": {
    "weight_logs": [ { "date": "...", "weight_kg": 78.5 } ],
    "measurements": [ { "date": "...", "waist_cm": 82 } ]
  },
  "fitness": {
    "workout_count": 12,
    "total_volume_kg": 18420,
    "workouts": [ { "date": "...", "name": "...", "exercises": [] } ]
  },
  "nutrition": {
    "average_calories": 1950,
    "average_protein_g": 145,
    "daily_logs": []
  },
  "water": {
    "average_daily_ml": 2400,
    "goal_ml": 3000,
    "daily_logs": []
  },
  "sleep": {
    "average_duration_hours": 7.2,
    "average_quality": 3.8,
    "daily_logs": []
  },
  "habits": {
    "habits": [ { "name": "...", "completion_rate_pct": 85, "current_streak": 12 } ]
  },
  "supplements": {
    "active": [ { "name": "...", "dose": "...", "adherence_pct": 90 } ]
  },
  "haircare": {
    "oil_applications": 6,
    "wash_sessions": 3,
    "avg_condition_score": 3.8
  },
  "skincare": {
    "routine_adherence_pct": 80,
    "avg_skin_clarity": 3.5,
    "breakouts": 2
  },
  "health": {
    "vitals": [ { "date": "...", "systolic": 118, "diastolic": 76 } ]
  },
  "progress_photos": {
    "count": 4,
    "dates": []
  }
}
```

### Export settings

- Date range: Today / This week / This month / Last 3 months / Custom
- Module selection: choose which modules to include
- Photo inclusion: toggle whether to include photo metadata (not the actual images)

---

## 13. AI Strategy — Custom GPT

No AI APIs are embedded in the app. Instead:

1. User generates a structured export (JSON or Markdown)
2. User uploads it to their personal Custom GPT
3. Custom GPT analyses the data and provides coaching

### Custom GPT capabilities (future Phase 5)

- Weekly and monthly analysis summaries
- Workout suggestions based on frequency and volume
- Nutrition advice based on macro trends
- Haircare analysis based on condition scores
- Skincare analysis correlating products with skin condition
- Sleep quality improvement suggestions
- Progress comparisons across months
- Goal setting recommendations
- Health insights from vitals trends

### Custom GPT context

The GPT will be given:
- The JSON export schema definition (so it understands the format)
- A system prompt describing what each module tracks and what units are used
- Instructions to act as a personal lifestyle coach

---

## 14. Storage

Supabase Storage is used for:

| Bucket | Contents | Access |
|---|---|---|
| `progress-photos` | User progress photos | Private, RLS-protected |
| `avatars` | User profile photos | Private |
| `medical-attachments` | Medical record files | Private |
| `exports` | Generated PDF exports | Private |

### Storage RLS rules

- Each bucket uses RLS: `storage.foldername[1] = auth.uid()::text`
- Users can only read/write to their own folder
- Progress photos are stored at: `progress-photos/{user_id}/{photo_id}.jpg`

### Photo upload flow

1. User captures/selects photo on device
2. Photo compressed to JPEG, max 1200px width
3. Uploaded to Supabase Storage
4. `storage_path` saved to `progress_photos` table; signed URL generated at read time
5. Thumbnail generated for gallery view (client-side resize)

---

## 15. Security

### Row Level Security (RLS)

Every table has RLS enabled. Standard policy pattern:

```sql
-- Enable RLS
alter table <table_name> enable row level security;

-- Policy: users can only access their own rows
create policy "user_isolation" on <table_name>
  for all using (user_id = auth.uid());
```

### Other security measures

- All API calls authenticated via Supabase JWT
- JWT stored in expo-secure-store (mobile) — not AsyncStorage
- Supabase anon key is safe to expose (it is rate-limited and RLS-protected)
- Service role key is never exposed to the client
- Progress photos are not publicly accessible — served via signed URLs with expiry
- Sensitive fields (medical records) are encrypted at the database level (future consideration using pgcrypto)
- Biometric lock for the app (expo-local-authentication) — Phase 3 feature

---

## 16. Development Roadmap

Phases are **vertical slices** — each slice delivers a shippable increment. Build one module end-to-end (screen → local DB → sync → chart) before starting the next.

### Phase 1 — Planning & design
- [x] Finalise all module features
- [x] Design database schema (all tables)
- [x] Design navigation structure
- [ ] Design UI component library and design system
- [ ] Set up Supabase project and apply migrations
- [x] Set up Expo project and folder structure
- [x] Set up React web project (online-only stub)

### Slice 0 — Foundation
- [ ] Monorepo scaffold (pnpm workspaces)
- [ ] Supabase project + initial migrations (`profiles`, `water_logs`)
- [ ] Authentication (sign up, login, profile)
- [ ] Local SQLite shell + schema versioning (`user_version` PRAGMA)
- [ ] Sync skeleton: queue push + delta pull on `water_logs`
- [ ] Sync status UX (pending count, last synced, retry)
- [ ] Minimal design system tokens (`Button`, `Input`, `Card`, `ScreenLayout`)

### Slice 1 — Pilot module (Water)
- [ ] Water intake module (full): quick log, daily goal, progress ring, history
- [ ] Water module sync (prove the loop: log → SQLite → sync → read back)
- [ ] Basic 30-day water chart

### Slice 2 — Core trio (Fitness identity)
- [ ] Fitness module (full)
- [ ] Nutrition module (full) — user-created foods first; Open Food Facts barcode later
- [ ] Body measurements module (full)
- [ ] Home dashboard with quick log for core modules
- [ ] Settings screen (profile, notifications, units)

### Slice 3 — Daily lifestyle modules
- [ ] Sleep module (full)
- [ ] Habits module (full)
- [ ] Supplements module (full)
- [ ] Goals module (full)

### Slice 4 — Health + media
- [ ] Health records module (full)
- [ ] Progress photos module (full) — Supabase Storage + signed URLs
- [ ] Haircare module (full)
- [ ] Skincare module (full)

### Slice 5 — Analytics & export
- [ ] Daily / weekly / monthly summary reports
- [ ] Per-module charts, habit heatmap, photo comparison
- [ ] JSON, Markdown, PDF, and "Export for ChatGPT" formats
- [ ] Date range and module selection for exports

### Slice 6 — Platforms & AI
- [ ] Web app parity (SQLite WASM for offline, shared query layer)
- [ ] iOS support (Expo)
- [ ] Desktop app (Electron)
- [ ] Custom GPT with system prompt and schema knowledge
- [ ] Test export → GPT analysis loop
- [ ] Biometric app lock
- [ ] Wearable integration (consideration)

---

## 17. Folder Structure

```
lifestyle-os/
├── apps/
│   ├── mobile/                     # Expo React Native app
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   │   ├── Home/
│   │   │   │   ├── Fitness/
│   │   │   │   ├── Nutrition/
│   │   │   │   ├── Water/
│   │   │   │   ├── Sleep/
│   │   │   │   ├── Habits/
│   │   │   │   ├── Body/
│   │   │   │   ├── Photos/
│   │   │   │   ├── Haircare/
│   │   │   │   ├── Skincare/
│   │   │   │   ├── Supplements/
│   │   │   │   ├── Goals/
│   │   │   │   ├── Health/
│   │   │   │   ├── Analytics/
│   │   │   │   ├── Export/
│   │   │   │   └── Settings/
│   │   │   ├── components/         # Shared UI components
│   │   │   ├── navigation/         # React Navigation config
│   │   │   ├── hooks/              # Custom hooks
│   │   │   ├── stores/             # Zustand stores
│   │   │   ├── db/                 # SQLite schema + queries
│   │   │   ├── sync/               # Offline sync service
│   │   │   ├── notifications/      # Notification scheduling
│   │   │   └── utils/
│   │   ├── assets/
│   │   ├── app.json
│   │   └── package.json
│   │
│   └── web/                        # React + Vite web app
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── stores/
│       │   └── utils/
│       └── package.json
│
├── packages/
│   ├── shared/                     # Shared across platforms
│   │   ├── types/                  # TypeScript types
│   │   ├── schemas/                # Zod validation schemas
│   │   ├── utils/                  # date helpers, formatters, calculators
│   │   └── export/                 # Export generators (JSON, MD, PDF)
│   │
│   └── supabase/                   # Supabase config and migrations
│       ├── migrations/
│       │   ├── 001_profiles.sql
│       │   ├── 002_fitness.sql
│       │   ├── 003_nutrition.sql
│       │   └── ...
│       └── seed.sql
│
├── docs/
│   ├── SYNC.md                     # Sync architecture (Slice 0 pilot)
│   └── EXPORT_FORMAT.md            # Export schema for Custom GPT (Slice 5)
│
├── PLAN.md                         # Master plan (this file)
```

---

## 18. Environment Variables

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Never expose this client-side
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server/Edge Functions only

# App config
APP_ENV=development                # 'development' | 'staging' | 'production'
```

For Expo, prefix with `EXPO_PUBLIC_`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 19. Key Design Principles

1. **Offline first** — every feature must work without internet. Sync is background and non-blocking.

2. **Local reads, remote backup** — all reads come from SQLite. Supabase is the persistent backup and cross-device sync layer.

3. **User owns their data** — structured exports ensure the user can take their data anywhere. No vendor lock-in.

4. **No AI in the app** — reports and analytics are generated with SQL and JS. AI analysis is done outside the app via the Custom GPT export flow.

5. **Consistent export schema** — the JSON export format is versioned and stable so the Custom GPT can reliably parse every report.

6. **Single backend, multiple clients** — Supabase serves Android, Web, and Desktop from the same schema. No platform-specific backend code.

7. **Privacy by default** — all data is private, RLS-enforced, and never shared. Progress photos use signed URLs with expiry.

8. **One module at a time** — build each module end-to-end (screen → local DB → sync → charts) before moving to the next. No half-built modules.

9. **UUID primary keys generated client-side** — allows offline record creation before sync.

10. **Soft deletes everywhere** — `deleted_at` instead of hard deletes, so sync never creates conflicts between a local update and a remote delete.

11. **`sync_version` on every syncable row** — incremented on each local write; primary conflict tie-breaker before `updated_at`.

---

*Last updated: July 2026 — Slice 0 (Foundation)*
