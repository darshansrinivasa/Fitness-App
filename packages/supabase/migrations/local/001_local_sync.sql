-- Local SQLite schema for mobile (Slice 0)
-- Mirrors Supabase pilot tables + sync infrastructure

create table if not exists sync_metadata (
  table_name text primary key,
  last_synced_at text
);

create table if not exists sync_queue (
  id text primary key,
  table_name text not null,
  record_id text not null,
  operation text not null check (operation in ('insert', 'update', 'delete')),
  payload text not null,
  created_at text not null,
  attempts integer not null default 0
);

create table if not exists water_logs (
  id text primary key,
  user_id text not null,
  logged_at text not null,
  amount_ml integer not null,
  notes text,
  created_at text not null,
  updated_at text not null,
  deleted_at text,
  sync_version integer not null default 1,
  synced_at text
);

create index if not exists water_logs_user_logged_at_idx
  on water_logs (user_id, logged_at);

create index if not exists sync_queue_created_at_idx
  on sync_queue (created_at);
