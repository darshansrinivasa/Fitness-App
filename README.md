# Lifestyle OS

Personal health and lifestyle management — offline-first mobile app with Supabase sync.

## Monorepo structure

```
apps/mobile     Expo React Native (Android primary, offline-first)
apps/web        React + Vite (online-only v1)
packages/shared Types, Zod schemas, sync engine
packages/supabase SQL migrations
docs/           SYNC.md and planning docs
PLAN.md         Master product plan
```

## Prerequisites

Install **pnpm 9** (the repo pins `pnpm@9.15.0`):

```bash
# Option A — recommended (global install)
npm install -g pnpm@9.15.0

# Option B — Node built-in (if corepack is available)
corepack enable
corepack prepare pnpm@9.15.0 --activate

# Option C — no global install (prefix every command with npx)
npx pnpm@9.15.0 install
```

## Quick start

```bash
pnpm install
pnpm test          # shared package unit tests
pnpm mobile        # Expo dev server
pnpm web           # Vite dev server
```

## Environment

Copy the example env files and add your Supabase credentials:

```bash
cp apps/mobile/.env.example apps/mobile/.env
cp apps/web/.env.example apps/web/.env
```

**Mobile** (`apps/mobile/.env`):

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Web** (`apps/web/.env`):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Apply database migrations:

```bash
cd packages/supabase && supabase db push
```

See [docs/AUTH.md](./docs/AUTH.md) for **Google sign-in** setup (Supabase + Google Cloud).

### Test on device (Slice 0)

```bash
pnpm mobile
```

1. Sign up or sign in
2. Tap **+200 ml** / **+350 ml** / **+500 ml** — writes to local SQLite and syncs
3. Check **Sync** card: pending count drops, last synced updates
4. Verify rows in Supabase Dashboard → Table Editor → `water_logs`

## Current slice

**Slice 5 — Analytics & export:** Insights tab with daily/weekly/monthly reports, charts, habit heatmap, photo comparison, and multi-format export (JSON, Markdown, PDF, ChatGPT).

See [docs/EXPORT_FORMAT.md](./docs/EXPORT_FORMAT.md) for the export schema.

See [PLAN.md](./PLAN.md) for the full roadmap and [docs/SYNC.md](./docs/SYNC.md) for sync architecture.
