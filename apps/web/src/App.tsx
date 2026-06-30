import { WATER_LOGS_TABLE } from '@lifestyle-os/shared/sync';
import './App.css';

export default function App() {
  return (
    <main className="app">
      <h1>Lifestyle OS</h1>
      <p className="subtitle">Web v1 — online-only (Supabase direct)</p>
      <p className="meta">
        Offline SQLite WASM deferred to Slice 6. Pilot table: {WATER_LOGS_TABLE}
      </p>
    </main>
  );
}
