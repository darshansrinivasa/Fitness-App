# Supabase migrations

Apply remote migrations with the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

## Files

| File | Purpose |
|------|---------|
| `migrations/001_profiles.sql` | User profiles + sign-up trigger |
| `migrations/002_water_logs.sql` | Pilot sync table (Slice 0) |
| `migrations/local/001_local_sync.sql` | Mobile SQLite schema (run on-device) |

Full schema reference: see [PLAN.md](../../PLAN.md) section 6 and [docs/SYNC.md](../../docs/SYNC.md).
